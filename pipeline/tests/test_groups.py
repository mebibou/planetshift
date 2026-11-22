import pandas as pd

from planetshift_pipeline import groups as G


def test_groups_csv_uses_only_contract_groups():
    groups = G.load()
    allowed = {*G.ANIMAL_GROUPS, *G.PLANT_GROUPS, G.OUT}
    assert set(groups["group"]) <= allowed
    assert groups["fbs_code"].is_unique


def test_animal_flag_matches_group():
    kept = G.kept(G.load())
    assert all(kept["animal"] == kept["group"].isin(G.ANIMAL_GROUPS))


def test_non_food_aquatic_plants_mammals_and_fish_oils_are_out():
    groups = G.load().set_index("fbs_code")["group"]
    assert all(groups[c] == G.OUT for c in (2659, 2768, 2775, 2781, 2782))


def test_fish_and_seafood_are_the_seafood_group():
    groups = G.load().set_index("fbs_code")
    fish = groups.loc[[2761, 2762, 2763, 2764, 2765, 2766, 2767, 2769]]
    assert set(fish["group"]) == {"seafood"} and fish["animal"].all()
    assert "seafood" in G.ANIMAL_GROUPS


def test_unmapped_ignores_totals():
    production = pd.Series({2511: 1.0, 2901: 5.0, 2501: 9.0, 2690: 1.0})
    assert G.unmapped(production, G.load()) == [2690]


def test_item_records_take_contents_from_the_world_balance():
    groups = pd.DataFrame(
        {
            "fbs_code": [2511],
            "fbs_item": ["Wheat"],
            "group": ["cereals"],
            "animal": [False],
            "note": [None],
        }
    )
    world = pd.DataFrame({"food": [100.0], "kcal": [300e6], "protein": [10.0]}, index=[2511])
    (item,) = G.item_records(groups, world, {2511: "Wheat and products"}, {2511: "Blé"})
    assert item["kcalPerTonne"] == 3_000_000
    assert item["proteinPerTonne"] == 0.1
    assert item["name"] == {"en": "Wheat and products", "fr": "Blé"}


def test_byproducts_are_the_items_counted_elsewhere():
    assert set(G.byproducts(G.load())) == {2581, 2582}
