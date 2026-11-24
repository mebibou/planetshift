import pandas as pd
import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline import mammals as M

GROUP_OF = {2848: "dairy", 2731: "ruminantMeat", 2732: "ruminantMeat", 2733: "pigMeat"}


def stocks(*rows):
    """rows: (area_code, GLE species, head)."""
    return pd.DataFrame(
        [{"area_code": a, "item_code": s, "element_code": M.STOCKS, "value": v} for a, s, v in rows]
    )


def test_the_table_gives_every_species_a_positive_mass_in_every_region():
    table = pd.read_csv(M.WEIGHTS)
    weights = M.load_weights()
    assert len(weights) == len(table) * len(M.REGIONS)
    assert (weights["kg"] > 0).all()
    assert table["reason"].notna().all() and table["ref"].notna().all()
    assert table["species"].is_unique


def test_the_table_holds_ipcc_2006_typical_masses():
    w = M.load_weights().set_index(["species", "region"])["kg"]
    assert w[(960, "north_america")] == 604
    assert w[(960, "oceania")] == 500
    assert w[(961, "indian_subcontinent")] == 110
    assert w[(1051, "western_europe")] == 198
    assert w[(976, "western_europe")] == 48.5
    assert w[(976, "africa")] == 28


def test_every_species_follows_a_food_group_or_is_kept_for_work():
    species = set(pd.read_csv(M.WEIGHTS)["species"])
    assert species <= set(I.LIVESTOCK) | set(I.WORKING)


def test_countries_take_their_sub_regions_ipcc_region_but_the_overrides():
    regions = M.ipcc_regions(
        {"FRA": "Western Europe", "IND": "Southern Asia", "NPL": "Southern Asia", "XXX": "Mars"}
    )
    assert regions == {"FRA": "western_europe", "IND": "indian_subcontinent", "NPL": "asia"}


def test_every_un_sub_region_of_the_countries_has_an_ipcc_region():
    assert set(M.IPCC_REGION.values()) <= set(M.REGIONS)
    assert set(M.IPCC_REGION_OVERRIDES.values()) <= set(M.REGIONS)


def test_live_weight_is_stocks_times_the_regions_mass_in_tonnes():
    weights = pd.DataFrame(
        {"species": [960, 960], "region": ["africa", "western_europe"], "kg": [275.0, 600.0]}
    )
    gle = stocks((1, 960, 1000), (2, 960, 10), (3, 960, 5), (1, 1054, 1e6))
    out = M.live_weight(gle, weights, {1: "africa", 2: "western_europe"})
    assert out.set_index("area_code")["t"].to_dict() == pytest.approx({1: 275.0, 2: 6.0})


def test_a_mixed_herd_follows_milk_and_meat_by_protein_and_its_meat_without_output():
    production = pd.DataFrame(
        {
            "area_code": [1, 1],
            "item_code": [982, 977],
            "element_code": [I.PRODUCTION] * 2,
            "value": [100.0, 0.0],
        }
    )
    weight = pd.DataFrame({"area_code": [1, 2], "species": [976, 976], "t": [1.0, 1.0]})
    out = M.food_shares(weight, production, GROUP_OF).set_index(["area_code", "group"])["share"]
    assert out[(1, "dairy")] == pytest.approx(1.0)
    assert out[(2, "ruminantMeat")] == pytest.approx(1.0)
    assert (2, "dairy") not in out.index


def test_dairy_cows_follow_dairy_and_beef_as_their_emissions_do():
    weight = pd.DataFrame({"area_code": [1], "species": [960], "t": [1.0]})
    out = M.food_shares(weight, pd.DataFrame(columns=["area_code", "item_code", "value"]), GROUP_OF)
    shares = out.set_index("group")["share"]
    assert shares["dairy"] == pytest.approx(I.DAIRY_MILK_SHARE)
    assert shares["ruminantMeat"] == pytest.approx(1 - I.DAIRY_MILK_SHARE)


def test_herds_not_raised_for_food_and_work_animals_are_other():
    weight = pd.DataFrame(
        {"area_code": [1, 1, 1], "species": [961, 1049, 1096], "t": [100.0, 10.0, 5.0]}
    )
    food = pd.DataFrame(
        {
            "area_code": [1, 1],
            "species": [961, 1049],
            "group": ["ruminantMeat", "pigMeat"],
            "share": [1.0, 1.0],
        }
    )
    nonfood = pd.DataFrame({"area_code": [1, 1], "species": [961, 1096], "share": [0.25, 1.0]})
    out = M.by_group(weight, food, nonfood).set_index("group")["t"]
    assert out.to_dict() == pytest.approx({"ruminantMeat": 75.0, "pigMeat": 10.0, "other": 30.0})


def test_the_groups_add_up_to_the_live_weight():
    weight = pd.DataFrame({"area_code": [1, 2], "species": [946, 1107], "t": [40.0, 3.0]})
    food = pd.DataFrame(
        {
            "area_code": [1, 1],
            "species": [946, 946],
            "group": ["dairy", "ruminantMeat"],
            "share": [0.4, 0.6],
        }
    )
    nonfood = pd.DataFrame({"area_code": [1], "species": [946], "share": [0.5]})
    out = M.by_group(weight, food, nonfood)
    assert out["t"].sum() == pytest.approx(43.0)
    assert out.set_index(["area_code", "group"])["t"][(1, "dairy")] == pytest.approx(8.0)


def test_the_file_keys_countries_by_iso3_with_the_wild_figures():
    tonnes = pd.DataFrame(
        {"area_code": [2, 1, 9], "group": ["dairy", "pigMeat", "dairy"], "t": [1234.5, 2.0, 1.0]}
    )
    out = M.mammals_json(tonnes, {1: "BBB", 2: "AAA"}, 2024)
    assert list(out["byCountry"]) == ["AAA", "BBB"]
    assert out["byCountry"]["AAA"] == {"dairy": 1230.0}
    assert out["year"] == 2024
    assert out["wild"] == {"land": 22e6, "marine": 39e6}
