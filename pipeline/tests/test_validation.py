"""Checks of the built data against FAOSTAT's own totals. They need the downloaded sources and
the built JSON (`python -m planetshift_pipeline.build`), and are skipped without them."""

import json
from pathlib import Path

import pytest

from planetshift_pipeline import groups as G
from planetshift_pipeline import intensities as I
from planetshift_pipeline.build import OUT_DIR
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import faostat

pytestmark = pytest.mark.network

#: Tolerances: the model leaves out non-food crops (fibres, tobacco, rubber) and
#: fish, mixes HESTIA and published intensities with FAOSTAT's, and fills a few countries from
#: older balances, so it is not expected to match FAOSTAT exactly.
CH4_TOLERANCE = 0.10
N2O_TOLERANCE = 0.20
PROTEIN_TOLERANCE = 0.05
MEANINGFUL_PRODUCTION_KT = 100


def needed(*paths: Path) -> None:
    missing = [p.name for p in paths if not p.exists()]
    if missing:
        pytest.skip(f"not built or downloaded: {', '.join(missing)}")


def built(name: str):
    needed(OUT_DIR / name)
    return json.loads((OUT_DIR / name).read_text())


def read(domain: str, year: int):
    needed(DEFAULT_CACHE / faostat.FILES[domain])
    return faostat.read(DEFAULT_CACHE, domain, year, year)


def model_world_emissions(scope: str) -> dict[str, float]:
    """kg per year: intensity x (production - processing), the processed share of a primary
    item being counted on the processed items made from it, and the animals not raised for food."""
    supply, built_intensities = built("supply.json"), built("intensities.json")
    intensities = built_intensities["byCountry"]
    return {
        gas: sum(
            intensities[iso3][code][scope]["kgPerTonne"][gas]
            * max(row["production"] - row["processing"], 0)
            for iso3, rows in supply["byCountry"].items()
            for code, row in rows.items()
        )
        + sum(kg[gas] for kg in built_intensities.get("nonFood", {}).values())
        for gas in I.GASES
    }


def faostat_world(year: int, items: tuple[int, ...]) -> dict[str, float]:
    gt = read("GT", year)
    rows = gt[(gt["area_code"] == 5000) & gt["item_code"].isin(items)]
    return {
        gas: rows.loc[rows["element_code"] == code, "value"].sum() * I.KT
        for code, gas in I.GT_GASES.items()
    }


def test_world_farm_gate_emissions_match_faostat():
    year = built("meta.json")["baseYear"]
    model = model_world_emissions("farmGate")
    reference = faostat_world(year, I.FARM_GATE_ITEMS)
    print({g: (round(model[g] / 1e9, 2), round(reference[g] / 1e9, 2)) for g in ("ch4", "n2o")})
    assert model["ch4"] == pytest.approx(reference["ch4"], rel=CH4_TOLERANCE)
    assert model["n2o"] == pytest.approx(reference["n2o"], rel=N2O_TOLERANCE)


def test_world_cradle_to_farm_gate_adds_energy_and_inputs():
    year = built("meta.json")["baseYear"]
    model = model_world_emissions("cradleToFarmGate")
    reference = faostat_world(year, (*I.FARM_GATE_ITEMS, *I.UPSTREAM))
    print({g: (round(model[g] / 1e9, 2), round(reference[g] / 1e9, 2)) for g in I.GASES})
    assert model["ch4"] == pytest.approx(reference["ch4"], rel=CH4_TOLERANCE)
    assert model["n2o"] == pytest.approx(reference["n2o"], rel=N2O_TOLERANCE)
    assert model["co2"] == pytest.approx(reference["co2"], rel=0.5)


def test_world_protein_supply_per_person_is_faos():
    year = built("meta.json")["baseYear"]
    items = {i["code"]: i for i in built("items.json")}
    supply = built("supply.json")["byCountry"]
    people = sum(c["population"][str(year)] for c in built("countries.json"))
    protein_t = sum(
        row["food"] * items[int(code)]["proteinPerTonne"]
        for rows in supply.values()
        for code, row in rows.items()
    )
    model = protein_t * 1e6 / people / 365
    fbs = read("FBS", year)
    world = fbs[(fbs["area_code"] == 5000) & (fbs["element_code"] == 674)].set_index("item_code")[
        "value"
    ]
    out = groups_out_protein(world)
    reference = world[2901] - out
    print(round(model, 1), round(reference, 1), round(world[2901], 1))
    assert model == pytest.approx(reference, rel=PROTEIN_TOLERANCE)


def groups_out_protein(world) -> float:
    """FAO's world protein (g/person/day) from the items the model leaves out."""
    out = G.load().query("group == @G.OUT")["fbs_code"]
    return float(world.reindex(out).fillna(0).sum())


def test_every_item_with_meaningful_production_has_a_group():
    year = built("meta.json")["baseYear"]
    fbs = read("FBS", year)
    world = fbs[(fbs["area_code"] == 5000) & (fbs["element_code"] == 5511)]
    produced = world[world["value"] > MEANINGFUL_PRODUCTION_KT].set_index("item_code")["value"]
    assert G.unmapped(produced, G.load()) == []


def test_every_country_and_item_has_both_scopes():
    intensities = built("intensities.json")["byCountry"]
    codes = {str(i["code"]) for i in built("items.json")}
    countries = {c["iso3"] for c in built("countries.json")}
    assert set(intensities) == countries
    assert all(set(cells) == codes for cells in intensities.values())
    assert all(set(s) == set(I.SCOPES) for cells in intensities.values() for s in cells.values())
