"""The industry build: shapes, factors, and recent totals against the inventories.

Recent totals, Gt CO₂: buildings' fossil CO₂ 2.68 in 2022 (CEDS v_2024_07_08), cement process CO₂
about 1.5–1.6 (Global Carbon Budget, Andrew v260830), iron and steel about 2.6 direct (IEA
tracking 2023; worldsteel's 3.6 includes electricity), cement process and fuel about 2.4 (IEA)."""

import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import industry as I
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.climate import SSPS

GT = 1e12
RCMIP_FILE = DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv"
CEMENT_FILE = DEFAULT_CACHE / "gcp-cement" / "GCP-CEM.csv"


def rcmip_frame(values: dict[str, dict[int, float]]) -> pd.DataFrame:
    """A frame shaped like RCMIP's, one row per scenario and sector, Mt CO₂/yr."""
    rows = [
        {"Scenario": ssp, "Region": "World", "Variable": I.RCMIP_SHAPE[sector], "Unit": "Mt CO2/yr"}
        | {str(y): points.get(y, np.nan) for y in (1750, 2015, 2050, 2100, 2500)}
        for ssp in SSPS
        for sector, points in values.items()
    ]
    return pd.DataFrame(rows)


def test_each_sector_is_its_shape_scaled_to_the_inventory():
    df = rcmip_frame(
        {
            "buildings": {2015: 3000.0, 2050: 1500.0, 2100: -100.0},
            "industry": {2015: 9000.0, 2050: 18000.0, 2100: 9000.0},
        }
    )
    years = np.arange(I.BASE_YEAR, I.END_YEAR + 1)
    co2 = I.sector_co2(df, "ssp245", years, 2.7 * GT)
    assert co2["buildings"][0] == pytest.approx(2.7 * GT * (3000 - 1500 * 8 / 35) / 2700)
    assert co2["industry"][0] == pytest.approx(9.0 * GT)
    assert co2["industry"][years == 2050][0] / co2["industry"][0] == pytest.approx(
        18000 / (9000 + 9000 * 8 / 35)
    )
    assert co2["buildings"][-1] == 0


def test_buildings_take_ceds_residential_and_commercial_fossil_fuel():
    table = pd.DataFrame(
        {
            "sector": ["1A4b_Residential", "1A4a_Commercial-institutional", "1A4b_Residential"]
            + ["1A4c_Agriculture-forestry-fishing"],
            "fuel": ["natural_gas", "light_oil", "biomass", "diesel_oil"],
            "kg": [2.0, 1.0, 5.0, 7.0],
        }
    )
    assert I.buildings_kg(table) == 3.0


def test_cement_share_comes_from_its_process_co2():
    cement = pd.DataFrame({"ISO": ["A", "B"], "2023": [1_000_000.0, np.nan]})
    process = I.cement_process(cement, 2023)
    assert process == pytest.approx(1e12)
    assert I.shares(process)["cement"] == pytest.approx(1 / 0.6 / 9)


def test_chemicals_share_leaves_ammonia_to_the_farm_side():
    share = I.shares(1e12)["chemicals"]
    assert share == pytest.approx(0.935 * 0.55 / 9)
    assert share < 0.935 / 9


def test_a_heat_pump_needs_about_one_and_a_half_kwh_per_kg_avoided():
    kwh = {k: I.heat_pump_kwh(c) for k, c in I.HEAT_PUMP.items()}
    assert kwh["median"] == pytest.approx(1.49, abs=0.01)
    assert kwh["low"] < kwh["median"] < kwh["high"] < 2


def test_parts_cut_less_than_all_and_their_ranges_hold_the_median():
    for p in I.PARTS.values():
        for r in p.values():
            assert r["low"] <= r["median"] <= r["high"]
        assert p["cut"]["high"] <= 1


def test_the_rest_of_industry_leaves_out_ammonia_and_the_three_parts():
    shares = I.shares(1.55e12)
    rest = I.rest(shares)
    ammonia = 0.935 * 0.45 / 9
    assert rest["share"] == pytest.approx(1 - sum(shares.values()) - ammonia, abs=1e-4)
    assert rest["lowHeat"] == pytest.approx(0.127 * 0.75 / rest["share"], abs=1e-3)
    for r in (rest["cut"], rest["kwhPerKgCo2"]):
        assert r["low"] <= r["median"] <= r["high"]
    assert rest["cut"]["median"] == pytest.approx(0.9)


def test_the_heat_pumps_electricity_comes_out_of_the_iea_mix():
    hp = 0.3 * 0.9 / 3
    assert I.heat_pump_ej(0.3) == pytest.approx(53.9 * hp / (hp + 0.7))
    mix = I.carriers(0.3)
    left = 53.9 - I.heat_pump_ej(0.3)
    assert mix["electricity"] == pytest.approx((35.7 - I.heat_pump_ej(0.3)) / left)
    assert mix["hydrogen"] == pytest.approx(1.3 / left)
    assert sum(mix.values()) == pytest.approx(1)
    assert I.carriers(0)["electricity"] == pytest.approx(35.7 / 53.9)


def test_the_remainder_draws_its_electricity_and_electrolytic_hydrogen():
    assert I.H2_KWH_PER_KWH == pytest.approx(1.34, abs=0.01)
    gas = I.KG_PER_KWH["gas"]
    mix = I.carriers(0.3)
    assert I.rest_kwh(0.3, 1 / 0.255, gas) == pytest.approx(
        mix["electricity"] / 0.255 + mix["hydrogen"] * I.H2_KWH_PER_KWH / gas
    )
    r = I.rest_kwh_range(0.3)
    assert r["low"] < r["median"] < r["high"]


@pytest.mark.network
def test_the_built_document_meets_the_recent_totals():
    if not (RCMIP_FILE.exists() and CEMENT_FILE.exists()):
        pytest.skip("RCMIP or the cement series not downloaded")
    doc = I.build(DEFAULT_CACHE)
    assert set(doc) == {
        "co2",
        "heatPumpKwhPerKgCo2",
        "industryParts",
        "industryRest",
        "cementProcessCo2",
        "source",
    }
    for ssp in SSPS:
        assert set(doc["co2"][ssp]) == {"buildings", "industry"}
        for s in doc["co2"][ssp].values():
            assert s["years"][0] == I.BASE_YEAR and s["years"][-1] == I.END_YEAR
            assert len(s["values"]) == len(s["years"])
            assert min(s["values"]) >= 0
        assert 2.5 * GT < doc["co2"][ssp]["buildings"]["values"][0] < 2.8 * GT
    process = doc["cementProcessCo2"]["kg"] / GT
    assert 1.4 < process < 1.7
    parts = doc["industryParts"]
    steel, cement = (parts[p]["share"] * 9.0 for p in ("steel", "cement"))
    assert 2.4 < steel < 3.0
    assert 2.2 < cement < 2.8
    assert 0.4 < parts["chemicals"]["share"] * 9.0 < 0.6
    assert sum(p["share"] for p in parts.values()) < 0.7
    ssp126, ssp370 = (doc["co2"][s]["industry"]["values"] for s in ("ssp126", "ssp370"))
    assert ssp126[-1] < ssp126[0] < ssp370[-1]
