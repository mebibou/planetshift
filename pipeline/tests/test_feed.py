import pandas as pd
import pytest

from planetshift_pipeline import feed as F
from planetshift_pipeline.groups import ANIMAL_GROUPS

PRODUCTION = pd.DataFrame(
    {
        "iso3": ["FRA", "FRA", "FRA", "IND", "IND", "IND", "BRA"],
        "fbs_code": [2731, 2733, 2848, 2848, 2734, 2744, 2731],
        "production": [1.0, 2.0, 20.0, 200.0, 4.0, 6.0, 10.0],
    }
)
REGIONS = {
    "FRA": "Western Europe",
    "IND": "Southern Asia",
    "BRA": "South America",
    "ZZZ": "Nowhere",
}
ITEMS = pd.DataFrame(
    {"code": [2514, 2555, 2848, 2551], "group": ["cereals", "oilCrops", "dairy", "nuts"]}
)


def build():
    return F.feed_json(
        PRODUCTION,
        REGIONS,
        {"FRA"},
        ITEMS,
        F.load_species(),
        F.load_intake(),
        F.load_rations(),
    )


def test_every_share_set_sums_to_one():
    shares = build()["shares"]
    sums = [
        sum(groups.values())
        for method in shares.values()
        for region in method.values()
        for groups in region.values()
    ]
    assert sums and all(s == pytest.approx(1, abs=1e-9) for s in sums)
    assert all(
        set(groups) <= set(ANIMAL_GROUPS)
        for method in shares.values()
        for region in method.values()
        for groups in region.values()
    )


def test_species_split_at_world_level_is_the_published_split():
    world = build()["shares"]["species"]["World"]["2514"]
    split = F.load_species()[list(world)]
    assert world == pytest.approx((split / split.sum()).to_dict(), abs=1e-4)


def test_published_splits_sum_to_one():
    assert F.load_species().sum() == pytest.approx(1)
    assert F.load_fishmeal().sum() == pytest.approx(1)


AQUACULTURE = pd.Series({"IND": 50.0, "FRA": 1.0, "VNM": 30.0})
FISH_ITEMS = pd.concat(
    [ITEMS, pd.DataFrame({"code": [2763], "group": ["seafood"]})], ignore_index=True
)


def with_seafood(items=ITEMS):
    return F.feed_json(
        PRODUCTION,
        {**REGIONS, "VNM": "South-eastern Asia"},
        {"FRA"},
        items,
        F.load_species(),
        F.load_intake(),
        F.load_rations(),
        AQUACULTURE,
        F.load_fishmeal(),
    )


def test_seafood_takes_a_share_and_the_others_are_renormalised():
    before, after = build()["shares"], with_seafood()["shares"]
    for method, regions in before.items():
        for region, items in regions.items():
            for code, groups in items.items():
                new = after[method][region][code]
                rest = 1 - new.get("seafood", 0.0)
                assert {g: new[g] / rest for g in groups} == pytest.approx(groups, abs=1e-3)
    assert after["species"]["World"]["2514"]["seafood"] > 0
    assert after["gleam"]["World"]["2514"]["seafood"] > 0


def test_aquafeed_without_milk_and_fish_mostly_to_seafood():
    shares = with_seafood(FISH_ITEMS)["shares"]
    assert "seafood" not in shares["gleam"]["World"]["2848"]
    for method in ("species", "gleam"):
        fish = shares[method]["World"]["2763"]
        assert set(fish) <= {"seafood", "pigMeat", "poultryMeat"}
        assert fish["seafood"] == max(fish.values())


def test_a_region_with_only_aquaculture_feeds_it_everything():
    assert with_seafood()["shares"]["species"]["South-eastern Asia"]["2514"] == {"seafood": 1.0}


def test_species_split_follows_what_a_region_produces():
    assert build()["shares"]["species"]["South America"]["2514"] == {"ruminantMeat": 1.0}


def test_gleam_sends_milk_only_to_ruminants_and_pigs():
    milk = build()["shares"]["gleam"]["World"]["2848"]
    assert set(milk) <= {"ruminantMeat", "dairy", "pigMeat"}


def test_gleam_falls_back_to_species_for_classes_without_a_ration():
    shares = build()["shares"]
    assert shares["gleam"]["World"]["2551"] == shares["species"]["World"]["2551"]


def test_regions_without_production_are_left_out():
    assert "Nowhere" not in build()["shares"]["species"]


def test_normalised_rounding_still_sums_to_one():
    shares = F.normalised(pd.Series({"a": 1.0, "b": 1.0, "c": 1.0}))
    assert sum(shares.values()) == pytest.approx(1, abs=1e-12)
    assert F.normalised(pd.Series({"a": 0.0})) == {}
