"""Checks of the built seafood data against FAO's and the literature's world figures, and that
bringing seafood in changed nothing else. They need the built JSON and the FishStat download."""

import json
import subprocess
from pathlib import Path

import pytest

from planetshift_pipeline import seafood as SF
from planetshift_pipeline.build import OUT_DIR
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import fishstat

pytestmark = pytest.mark.network

GWP100 = {"co2": 1.0, "ch4": 27.0, "n2o": 273.0}
SEAFOOD = {str(c) for c in SF.ITEMS}
YEAR = 2023


def built(name: str):
    path = OUT_DIR / name
    if not path.exists():
        pytest.skip(f"not built: {name}")
    return json.loads(path.read_text())


def committed(name: str):
    """The file as last committed, or None outside a git checkout."""
    try:
        text = subprocess.run(
            ["git", "show", f"HEAD:app/public/data/{name}"],
            cwd=Path(__file__).parent,
            capture_output=True,
            check=True,
            text=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError):
        text = None
    return None if text is None else json.loads(text)


def world_production() -> dict:
    path = DEFAULT_CACHE / Path(fishstat.URL).name
    if not path.exists():
        pytest.skip("FishStat not downloaded")
    rows = fishstat.read(DEFAULT_CACHE, YEAR - 4, YEAR)
    production = SF.classified(rows[rows["year"] == YEAR], SF.load_isscaap())
    return SF.world_totals(production, SF.load_factors())


def food_and_protein():
    items = {str(i["code"]): i for i in built("items.json")}
    supply = built("supply.json")["byCountry"]

    def protein(codes) -> float:
        return sum(
            row.get(c, {}).get("food", 0) * items[c]["proteinPerTonne"]
            for row in supply.values()
            for c in codes
        )

    food = sum(row.get(c, {}).get("food", 0) for row in supply.values() for c in SEAFOOD)
    animal = [c for c, i in items.items() if i["animal"]]
    return food, protein(SEAFOOD), protein(animal), protein(items)


def test_world_seafood_supply_is_fao_s_20_kg_a_person():
    countries = built("countries.json")
    people = sum(c["population"][str(built("supply.json")["baseYear"])] for c in countries)
    food, _, _, _ = food_and_protein()
    assert 18 <= food * 1000 / people <= 23


def test_seafood_gives_about_a_seventh_of_animal_protein():
    _, fish, animal, total = food_and_protein()
    assert 0.12 <= fish / animal <= 0.18
    assert 0.05 <= fish / total <= 0.07


def test_every_country_has_both_scopes_of_every_seafood_item():
    intensities = built("intensities.json")["byCountry"]
    assert all(set(cells[c]) == set(SF.SCOPES) for cells in intensities.values() for c in SEAFOOD)


def test_capture_fuel_is_parker_s_world_fuel_use():
    totals = world_production()
    assert 30e9 <= totals["captureLitres"] <= 50e9
    assert 100e9 <= totals["captureKgCo2e"] <= 179e9


def test_aquaculture_without_feed_is_macleod_s_non_feed_share():
    totals = world_production()
    per_tonne_macleod = 263e9 * 0.43 / (74.855e6 / 0.93)
    ours = totals["aquacultureKgCo2e"] / totals["aquacultureTonnes"]
    assert ours == pytest.approx(per_tonne_macleod, rel=0.25)


def has_seafood(items: list | None) -> bool:
    return any(str(i["code"]) in SEAFOOD for i in items or [])


def test_items_and_land_are_unchanged_but_for_seafood_items():
    before = committed("items.json")
    if before is None or has_seafood(before):
        pytest.skip("no committed version without seafood")
    assert [i for i in built("items.json") if str(i["code"]) not in SEAFOOD] == before
    land = built("land.json")
    assert all(SEAFOOD.isdisjoint(items) for items in land["cropHaPerTonne"].values())
    assert land == committed("land.json")


def without_seafood(value):
    kept = (
        {k: without_seafood(v) for k, v in value.items() if k not in SEAFOOD}
        if isinstance(value, dict)
        else {}
    )
    return (
        {k: v for k, v in kept.items() if v != {} or not isinstance(value[k], dict)}
        if isinstance(value, dict)
        else value
    )


@pytest.mark.parametrize("name", ["supply.json", "intensities.json", "breakdown.json"])
def test_other_items_are_unchanged_by_seafood(name):
    """Meaningful for the change that brings seafood in: compared with the last commit while that
    has no seafood."""
    before = committed(name)
    if before is None or has_seafood(committed("items.json")):
        pytest.skip("no committed version without seafood")
    after = without_seafood(built(name))
    if name == "breakdown.json":
        after["byCountry"] = {k: v for k, v in after["byCountry"].items() if v}
    assert after == before


def test_feed_shares_are_the_old_ones_renormalised():
    before = committed("feed.json")
    if before is None or has_seafood(committed("items.json")):
        pytest.skip("no committed version without seafood")
    after = built("feed.json")["shares"]
    for method, regions in before["shares"].items():
        for region, items in regions.items():
            for code, groups in items.items():
                new = after[method][region][code]
                rest = 1 - new.get("seafood", 0.0)
                assert {g: new[g] / rest for g in groups} == pytest.approx(groups, abs=1e-3)
