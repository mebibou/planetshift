import pandas as pd
import pytest

from planetshift_pipeline import origins as O

ISO3 = {1: "FRA", 2: "BRA", 3: "IRL"}
ITEMS = pd.DataFrame({"tm_code": [867, 870, 236], "fbs_code": [2731, 2731, 2555]})


def imports(*rows):
    """rows: (reporter, partner, item_code, t)."""
    return pd.DataFrame(rows, columns=["reporter", "partner", "item_code", "t"]).assign(year=2024)


def test_every_traded_item_maps_to_a_model_food_once():
    items = O.load_items()
    assert items["tm_code"].is_unique
    groups = pd.read_csv(O.HERE / "groups.csv")
    assert set(items["fbs_code"]) <= set(groups.loc[groups["group"] != "out", "fbs_code"])


def test_imports_sum_over_a_foods_traded_items_and_leave_other_partners_to_the_world():
    rows = O.by_origin(
        imports(
            (1, 2, 867, 30.0),
            (1, 2, 870, 10.0),
            (1, 3, 870, 50.0),
            (1, 99, 870, 10.0),
            (1, 1, 867, 5.0),
        ),
        ITEMS,
        ISO3,
    )
    beef = rows[rows["fbs_code"] == 2731].set_index("origin")["t"].to_dict()
    assert beef == {"BRA": 40.0, "IRL": 50.0, "": 15.0}


def test_the_main_origins_are_kept_largest_first_until_they_cover_the_imports():
    group = pd.DataFrame(
        {"origin": ["IRL", "BRA", "", "DEU", "NLD"], "t": [60.0, 30.0, 5.5, 4.0, 0.4]}
    )
    assert O.top_origins(group) == [["IRL", 0.6], ["BRA", 0.3], ["DEU", 0.04]]
    tiny = pd.DataFrame({"origin": ["IRL", "BRA"], "t": [99.9, 0.0001]})
    assert O.top_origins(tiny) == [["IRL", pytest.approx(1.0)]]


def test_the_json_keeps_importers_with_known_origins():
    rows = pd.DataFrame(
        {
            "importer": ["FRA", "FRA"],
            "fbs_code": [2731, 2555],
            "origin": ["IRL", ""],
            "t": [5.0, 5.0],
        }
    )
    data = O.origins_json(rows, (2022, 2024))
    assert data == {"years": [2022, 2024], "byCountry": {"FRA": {"2731": [["IRL", 1.0]]}}}
