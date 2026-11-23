"""Checks of the built waste.json, skipped when it is not built."""

import json
from statistics import quantiles

import pytest

from planetshift_pipeline import food_loss as L
from planetshift_pipeline import waste as W
from planetshift_pipeline.build import OUT_DIR

pytestmark = pytest.mark.network

#: Edible waste, kg per person per year. The Index's household estimates, all parts, are mostly
#: 40 to 150 kg, but run from under 20 (Bhutan, Mongolia, low confidence) to about 200.
RANGES = {"retail": (0, 80), "foodService": (0, 80), "household": (5, 150)}

#: The Index's world averages for 2022, all parts, kg per person per year.
WORLD_2022 = {"retail": 17, "foodService": 36, "household": 79}


def built(name: str):
    path = OUT_DIR / name
    if not path.exists():
        pytest.skip(f"not built: {name}")
    return json.loads(path.read_text())


def test_every_country_has_the_three_sectors():
    waste, countries = built("waste.json"), built("countries.json")
    assert set(waste) == {"byCountry", "lossShares", "source"}
    assert isinstance(waste["source"], str) and waste["source"]
    assert set(waste["byCountry"]) == {c["iso3"] for c in countries}
    for values in waste["byCountry"].values():
        assert set(values) == set(W.FIELDS)
        assert all(isinstance(v, int | float) for v in values.values())


def test_every_country_has_a_loss_share_for_each_group():
    waste, countries = built("waste.json"), built("countries.json")
    assert set(waste["lossShares"]) == {c["iso3"] for c in countries}
    for shares in waste["lossShares"].values():
        assert set(shares) == set(L.GROUPS.values())
        assert all(0 < v < 0.7 for v in shares.values())


def test_values_are_plausible():
    for iso3, values in built("waste.json")["byCountry"].items():
        for field, (low, high) in RANGES.items():
            assert low <= values[field] <= high, (iso3, field, values[field])


def test_waste_is_below_the_cap_of_food_supply():
    waste, countries, supply = built("waste.json"), built("countries.json"), built("supply.json")
    year = str(supply["baseYear"])
    people = {c["iso3"]: c["population"][year] for c in countries}
    shares = {
        iso3: sum(waste["byCountry"][iso3].values())
        / (sum(r["food"] for r in rows.values()) * 1000 / people[iso3])
        for iso3, rows in supply["byCountry"].items()
        if iso3 in waste["byCountry"] and people.get(iso3)
    }
    deciles = [round(q, 3) for q in quantiles(shares.values(), n=10)]
    print(
        f"waste / food supply: min {min(shares.values()):.3f}, deciles {deciles}, max "
        f"{max(shares.values()):.3f}"
    )
    assert len(shares) >= 0.95 * len(waste["byCountry"])
    assert max(shares.values()) <= W.MAX_SHARE_OF_FOOD + 1e-6


def test_all_parts_world_average_matches_the_report():
    waste, countries = built("waste.json"), built("countries.json")
    year = str(built("supply.json")["baseYear"])
    people = {c["iso3"]: c["population"][year] for c in countries}
    rich = {c["iso3"] for c in countries if c["highIncome"]}
    total = sum(people.values())
    for field, expected in WORLD_2022.items():
        all_parts = sum(
            waste["byCountry"][iso3][field] / W.EDIBLE_SHARE[iso3 in rich][field] * n
            for iso3, n in people.items()
        )
        assert all_parts / total == pytest.approx(expected, rel=0.1), field
