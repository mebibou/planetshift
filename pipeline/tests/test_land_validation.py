"""Checks of land.json against FAOSTAT's totals and the literature. They need the downloaded
sources and the built JSON, and are skipped without them."""

import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline import land as L
from planetshift_pipeline.build import OUT_DIR
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import faostat

pytestmark = pytest.mark.network

#: The model's cropland is harvested area of food crops; the processed items (oils above all)
#: carry their crops' land at world extraction rates, which overshoots a little.
CROPLAND_TOLERANCE = 0.10
#: The model's countries hold nearly all the world's pasture.
PASTURE_TOLERANCE = 0.05


def needed(*paths: Path) -> None:
    missing = [p.name for p in paths if not p.exists()]
    if missing:
        pytest.skip(f"not built or downloaded: {', '.join(missing)}")


def built(name: str):
    needed(OUT_DIR / name)
    return json.loads((OUT_DIR / name).read_text())


def read(domain: str, first: int, last: int) -> pd.DataFrame:
    needed(DEFAULT_CACHE / faostat.FILES[domain])
    return faostat.read(DEFAULT_CACHE, domain, first, last)


@pytest.fixture(scope="module")
def data():
    return built("land.json"), built("supply.json"), built("countries.json")


def rows_of(supply: dict) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"iso3": iso3, "fbs_code": int(code), **row}
            for iso3, rows in supply["byCountry"].items()
            for code, row in rows.items()
        ]
    )


def ha_per_t_of(land: dict) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"iso3": iso3, "fbs_code": int(code), "ha_per_t": v}
            for iso3, items in land["cropHaPerTonne"].items()
            for code, v in items.items()
        ]
    )


def test_cropland_matches_faostat_harvested_area_of_food_crops(data):
    land, supply, countries = data
    year = supply["baseYear"]
    cake = sum(ha for by_seed in land["oilcakeHa"].values() for ha in by_seed.values())
    model = L.cropland(ha_per_t_of(land), rows_of(supply))["ha"].sum() + cake
    qcl = read("QCL", year, year)
    crops = I.load_crops().dropna(subset=["fbs_code"])
    areas = {c["fao"] for c in countries}
    harvested = qcl[(qcl["element_code"] == L.AREA_HARVESTED) & qcl["area_code"].isin(areas)]
    harvested = harvested.merge(crops, left_on="item_code", right_on="qcl_code")
    faostat_ha = (harvested["value"] * harvested["share"]).sum()
    assert model == pytest.approx(faostat_ha, rel=CROPLAND_TOLERANCE)


def test_pasture_matches_faostat_world(data):
    land, supply, _ = data
    rl = read("RL", supply["baseYear"] - 2, supply["baseYear"])
    world = L.latest(rl, L.PASTURE, supply["baseYear"])[5000]
    model = sum(p["ha"] for p in land["pasture"].values())
    assert 2.8e9 < world < 3.4e9
    assert model == pytest.approx(world, rel=PASTURE_TOLERANCE)


def test_pasture_shares_sum_to_one(data):
    land, _, _ = data
    sums = [sum(p["shares"].values()) for p in land["pasture"].values() if p["shares"]]
    assert sums and all(s == pytest.approx(1.0, abs=1e-6) for s in sums)
    assert all(set(p["shares"]) <= {"ruminantMeat", "dairy"} for p in land["pasture"].values())


@pytest.mark.parametrize(
    "code, low, high",
    [(2511, 0.25, 0.4), (2807, 0.15, 0.35), (2555, 0.3, 0.5), (2514, 0.12, 0.25)],
)
def test_world_ha_per_tonne_is_plausible(data, code, low, high):
    land, supply, _ = data
    rows = rows_of(supply)
    df = rows[rows["fbs_code"] == code].merge(ha_per_t_of(land), on=["iso3", "fbs_code"])
    world = (df["ha_per_t"] * df["production"]).sum() / df["production"].sum()
    assert low < world < high


def test_animal_products_use_most_farmland(data):
    land, supply, _ = data
    rows = rows_of(supply)
    crop_ha = L.cropland(ha_per_t_of(land), rows)
    pasture = sum(p["ha"] for p in land["pasture"].values())
    cake = sum(ha for by_seed in land["oilcakeHa"].values() for ha in by_seed.values())
    share = L.animal_share(crop_ha, rows, pasture, cake, sum(land["fodderHa"].values()))
    assert 0.65 < share["animalShare"] < 0.85


def test_temporary_meadows_match_faostat_world(data):
    land, supply, _ = data
    rl = read("RL", supply["baseYear"] - 2, supply["baseYear"])
    world = L.latest(rl, L.TEMPORARY_MEADOWS, supply["baseYear"])[5000]
    assert 1.0e8 < world < 2.0e8
    assert sum(land["fodderHa"].values()) == pytest.approx(world, rel=0.1)


def test_regrowth_is_complete_and_ordered(data):
    land, _, countries = data
    assert land["regrowthYears"] == L.REGROWTH_YEARS
    assert {c["iso3"] for c in countries} <= set(land["regrowth"])
    assert all(0 <= r["low"] <= r["median"] <= r["high"] < 40 for r in land["regrowth"].values())


def test_regrowth_on_all_pasture_is_below_the_carbon_opportunity_cost(data):
    """Hayek et al. (2021) find 332-547 Gt CO2 taken up by 2050, vegetation and soil, if land
    for animal food went back to native vegetation: 11-18 Gt CO2 a year. Regrowth here counts
    vegetation only, so freeing all pasture should take up less."""
    land, _, _ = data
    uptake = sum(p["ha"] * land["regrowth"][iso3]["median"] for iso3, p in land["pasture"].items())
    assert 3e9 < uptake < 18e9
