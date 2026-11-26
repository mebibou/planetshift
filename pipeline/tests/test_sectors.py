import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import climate, climate_fair, sectors

RANGE3 = {"median", "low", "high"}


def test_scaled_to_meets_the_target_in_the_year():
    years = np.arange(2020, 2025)
    scaled = sectors.scaled_to(np.array([1.0, 2, 4, 8, 16]), years, 2022, 2.0)
    assert scaled == pytest.approx([0.5, 1, 2, 4, 8])


def test_road_and_shipping_are_cedss_fossil_co2_carried_by_the_ssp_shape():
    table = pd.DataFrame(
        {
            "sector": [
                "1A3b_Road",
                "1A3b_Road",
                "1A3b_Road",
                "1A3ai_International-aviation",
                "1A3di_International-shipping",
                "1A3dii_Domestic-navigation",
                "1A4c_Agriculture-forestry-fishing",
            ],
            "fuel": ["diesel_oil", "light_oil", "biomass", "light_oil", "heavy_oil"]
            + ["diesel_oil"] * 2,
            "kg": [3e12, 2e12, 0.4e12, 0.6e12, 0.8e12, 0.2e12, 0.3e12],
        }
    )
    measured = sectors.fossil_kg(table)
    assert measured == pytest.approx({"road": 5e12, "shipping": 1e12})
    variables = set(sectors.RCMIP_SHAPE.values())
    rcmip_df = pd.DataFrame(
        {
            "Scenario": "ssp245",
            "Region": "World",
            "Variable": sorted(variables),
            "1750": 0.0,
            "2022": 10.0,
            "2023": 11.0,
            "2500": 11.0,
        }
    )
    years = np.arange(2023, 2026)
    out = sectors.transport(rcmip_df, "ssp245", years, measured)
    assert out["roadPassenger"][0] == pytest.approx(5e12 * 0.6 * 1.1)
    assert out["roadFreight"][0] == pytest.approx(5e12 * 0.4 * 1.1)
    assert out["shipping"][0] == pytest.approx(1e12 * 1.1)
    assert out["aviation"][0] == pytest.approx(sectors.INVENTORY["aviation"])


def test_ramp_is_linear_then_flat():
    years = np.arange(2024, 2040)
    values = sectors.ramp({2024: 0.0, 2030: 6.0, 2035: 16.0}, years)
    assert values[years == 2027][0] == pytest.approx(3.0)
    assert values[years == 2033][0] == pytest.approx(12.0)
    assert values[years >= 2035] == pytest.approx(16.0)


def test_data_centres_add_only_the_growth_beyond_2024():
    years = np.arange(sectors.BASE_YEAR, 2101)
    twh = sectors.data_centres_twh(years)
    assert set(twh) == RANGE3
    assert all(v[years <= 2024] == pytest.approx(0.0) for v in twh.values())
    at = {k: v[years == 2030][0] for k, v in twh.items()}
    assert at["median"] == pytest.approx(945 - 415)
    assert at["low"] < at["median"] < at["high"]
    assert twh["median"][-1] == pytest.approx(1200 - 415)


def test_aviation_non_co2_is_lee_2021_per_kg_of_2018_co2():
    factor = sectors.aviation_non_co2()
    assert set(factor) == RANGE3
    assert factor["median"] == pytest.approx(66.6e-3 / 1034e9, rel=1e-3)
    assert factor["low"] < factor["median"] < factor["high"]


@pytest.mark.parametrize("kind", ["passenger", "freight"])
def test_ev_electricity_per_kg_is_a_plausible_ordered_range(kind):
    values = sectors.EV_KWH_PER_KG[kind]
    assert values["low"] < values["median"] < values["high"]
    assert 0.5 < values["low"] and values["high"] < 2.5


def test_grid_intensity_is_co2_over_generation_and_data_centres_follow_it():
    years = np.arange(sectors.BASE_YEAR, 2101)
    rows = [
        {
            "model": model,
            "scenario": scenario,
            "variable": variable,
            "unit": unit,
            "year": year,
            "value": value,
        }
        for model, scenario in sectors.ar6db.MARKERS.values()
        for variable, unit, values in (
            (sectors.ar6db.ELECTRICITY_CO2, "Mt CO2/yr", (14000.0, 7000.0, -1000.0)),
            (sectors.ar6db.ELECTRICITY_GENERATED, "EJ/yr", (100.0, 150.0, 200.0)),
        )
        for year, value in zip((2020, 2060, 2100), values, strict=True)
    ]
    kg, twh = sectors.electricity(rows, "ssp245", years)
    assert kg[0] == pytest.approx(sectors.INVENTORY["electricity"])
    assert twh[0] == pytest.approx(sectors.GENERATION_2023_TWH)
    assert kg[-1] == 0.0
    assert (kg >= 0).all()


def test_with_forcing_adds_one_step_at_the_closing_bound():
    natural = pd.DataFrame(
        {"Variable": ["Solar", "Volcanic"], "2035": [0.1, 0.0], "2036": [0.1, 0.0]}
    )
    setup = climate_fair.Setup(
        parameters=None,
        species_file=None,
        species=[],
        properties={},
        natural_forcing=natural,
        configs=[],
    )
    changed = sectors.with_forcing(setup, 2035, 2.0).natural_forcing
    assert changed["2035"].tolist() == [0.1, 0.0]
    assert changed["2036"].tolist() == pytest.approx([2.1, 0.0])
    assert natural["2036"].tolist() == [0.1, 0.0]


def test_the_shipping_sulphur_forcing_follows_each_scenarios_shipping_fuel():
    years = [str(y) for y in range(1750, 2501)]
    co2 = {"ssp126": 2.0, "ssp245": 1.0, "ssp370": 1.0}
    rows = [
        {
            "Scenario": ssp,
            "Region": "World",
            "Variable": climate.SHIPPING_CO2_RCMIP,
            "Unit": "Mt CO2/yr",
            **{y: 1000.0 * (1 if int(y) <= 2020 else co2[ssp]) for y in years},
        }
        for ssp in climate.SSPS
    ]
    out = climate.shipping_sulphur(pd.DataFrame(rows))
    assert out["years"][0] == 2020 and out["years"][-1] == 2100
    erf = out["erf"]
    assert erf["ssp245"]["median"] == [0.12] * len(out["years"])
    assert erf["ssp126"]["median"][0] == 0.12 and erf["ssp126"]["median"][-1] == 0.24
    assert erf["ssp370"]["low"][0] < erf["ssp370"]["median"][0] < erf["ssp370"]["high"][0]


def test_permafrost_matches_the_contract_and_ar6():
    permafrost = climate.permafrost()
    assert set(permafrost) == {"kgCPerDegree", "ch4Share", "releaseYears", "source"}
    kg = permafrost["kgCPerDegree"]
    assert set(kg) == RANGE3
    assert kg["median"] == pytest.approx(18.28e12, rel=1e-3)
    assert kg["low"] < kg["median"] < kg["high"]
    assert permafrost["ch4Share"] == pytest.approx(0.0156, abs=5e-4)
    assert isinstance(permafrost["releaseYears"], int) and permafrost["releaseYears"] > 0
