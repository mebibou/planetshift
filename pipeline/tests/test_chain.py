import pandas as pd
import pytest

from planetshift_pipeline import chain as C
from planetshift_pipeline.sources import food_stages

STAGES = pd.DataFrame(
    {s: [2.0, 0.5] for s in food_stages.STAGES}, index=pd.Index(["Beef", "Wheat"], name="product")
)
ITEMS = pd.DataFrame({"fbs_code": [2731, 2511], "product": ["Beef", "Wheat"], "note": ["", ""]})


def gpp(*rows):
    """rows: (area_code, item_code, element_code, year, kt)."""
    return pd.DataFrame(
        rows, columns=["area_code", "item_code", "element_code", "year", "value"]
    ).astype({"value": float})


def test_every_model_item_takes_a_food_our_world_in_data_has():
    items = C.load_items()
    assert items["fbs_code"].is_unique
    groups = pd.read_csv(C.HERE / "groups.csv")
    assert set(items["fbs_code"]) == set(groups.loc[groups["group"] != "out", "fbs_code"])


def test_weights_are_poore_and_nemeceks_stage_per_kg_and_unknown_foods_fail():
    w = C.weights(ITEMS, STAGES)
    assert w.loc[2731, "processing"] == 2.0
    with pytest.raises(ValueError, match="Lamb"):
        C.weights(pd.DataFrame({"fbs_code": [1], "product": ["Lamb"], "note": [""]}), STAGES)


def test_stage_kg_keeps_the_latest_year_and_leaves_out_farm_inputs_and_f_gases():
    rows = gpp(
        (1, 6507, 7273, 2023, 1.0),
        (1, 6507, 7273, 2024, 2.0),
        (1, 6504, 7273, 2024, 9.0),
        (1, 6998, 717815, 2024, 9.0),
        (1, 6987, 7225, 2024, 0.5),
        (1, 6990, 7225, 2024, 0.25),
    )
    kg = C.stage_kg(rows, 2024).set_index(["stage", "gas"])["kg"]
    assert kg.to_dict() == {("processing", "co2"): 2e6, ("waste", "ch4"): 0.75e6}


def test_a_shared_stage_splits_by_weight_times_production_and_a_mass_stage_by_tonnes():
    w = C.weights(ITEMS, STAGES)
    production = pd.DataFrame({"area_code": [1, 1], "fbs_code": [2731, 2511], "t": [10.0, 60.0]})
    kg = C.stage_kg(gpp((1, 6507, 7273, 2024, 1.0), (1, 6505, 7273, 2024, 0.7)), 2024)
    f = C.factors(kg, C.denominators(production, w)).set_index("stage")["per_t"]
    assert f["processing"] == pytest.approx(1e6 / (10 * 2.0 + 60 * 0.5))
    assert f["household"] == pytest.approx(0.7e6 / 70)
    beef = f["processing"] * 2.0 * 10
    wheat = f["processing"] * 0.5 * 60
    assert beef + wheat == pytest.approx(1e6)


def test_the_json_nests_stages_and_gases_and_keeps_the_world():
    w = C.weights(ITEMS, STAGES)
    f = pd.DataFrame({"area_code": [1], "stage": ["transport"], "gas": ["co2"], "per_t": [12.345]})
    data = C.chain_json(f, f.assign(area_code=0), w, {1: "FRA"}, 2024)
    assert data["byCountry"] == {"FRA": {"transport": {"co2": 12.3}}}
    assert data["world"] == {"transport": {"co2": 12.3}}
    assert data["weights"]["2731"]["processing"] == 2.0
