import pandas as pd
import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline import pollination as P
from planetshift_pipeline.land import PRODUCTION

CROPS = pd.DataFrame(
    {
        "qcl_code": [15, 236, 515, 521, 619],
        "fbs_code": pd.array([2511, 2555, 2617, 2625, 2625], dtype="Int64"),
        "share": [1.0, 1.0, 1.0, 1.0, 1.0],
    }
)
CLASSES = pd.DataFrame(
    {
        "qcl_code": [15, 236, 515, 521],
        "ratio": [0.0, 0.25, 0.65, 0.65],
        "dependent": [False, True, True, True],
    }
)


def qcl(rows: list[tuple[int, int, float]]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"area_code": a, "item_code": i, "element_code": PRODUCTION, "year": 2024, "value": t}
            for a, i, t in rows
        ]
    )


def test_the_classes_are_aizen_et_al_2009s_ratios():
    assert P.RATIOS == {0: 0.0, 1: 0.05, 2: 0.25, 3: 0.65, 4: 0.95}


def test_every_classified_crop_is_a_qcl_crop_with_one_class():
    classes = pd.read_csv(P.HERE / "pollination_classes.csv")
    assert classes["qcl_code"].is_unique
    assert set(classes["class"]) <= set(P.RATIOS)
    assert set(classes["qcl_code"]) <= set(I.load_crops()["qcl_code"])


def test_the_dependent_crops_are_those_with_a_ratio_above_zero():
    classes = P.load_classes().set_index("qcl_code")
    assert classes.loc[15, "ratio"] == 0 and not classes.loc[15, "dependent"]
    assert classes.loc[661, "ratio"] == 0.95 and classes.loc[661, "dependent"]
    assert classes.loc[270, "ratio"] == 0.25


def test_a_processed_item_takes_its_primary_items_crops():
    links = P.item_crops(CROPS, P.primaries({2571: [(2555, 0.19)]}))
    oil = links[links["fbs_code"] == 2571]
    assert oil["qcl_code"].tolist() == [236]
    assert oil["share"].tolist() == [1.0]


def test_rice_bran_and_maize_germ_oils_take_rice_and_maize():
    made_from = P.primaries({})
    assert made_from[2581] == (2807,) and made_from[2582] == (2514,)


def test_an_items_ratio_is_its_classified_crops_mean_weighted_by_production():
    weights = P.crop_weights(
        qcl([(1, 521, 30.0), (1, 619, 1000.0), (1, 515, 10.0), (2, 521, 5.0), (9, 521, 99.0)]),
        P.item_crops(CROPS, {}),
        {1, 2},
    )
    out = P.ratios(weights, CLASSES, ["area_code"]).set_index(["area_code", "fbs_code"])
    assert out.loc[(1, 2625), "ratio"] == pytest.approx(0.65)
    assert out.loc[(1, 2625), "dependent"] == 1.0
    assert out.loc[(1, 2617), "ratio"] == 0.65
    assert (9, 2625) not in out.index


def test_a_mixed_item_shares_its_dependence_by_tonnes():
    crops = pd.DataFrame(
        {"qcl_code": [15, 236], "fbs_code": pd.array([2520, 2520], dtype="Int64"), "share": 1.0}
    )
    weights = P.crop_weights(qcl([(1, 15, 75.0), (1, 236, 25.0)]), P.item_crops(crops, {}), {1})
    out = P.ratios(weights, CLASSES, []).set_index("fbs_code")
    assert out.loc[2520, "ratio"] == pytest.approx(0.0625)
    assert out.loc[2520, "dependent"] == pytest.approx(0.25)


def test_the_file_keeps_a_countrys_own_values_only_where_they_differ_from_the_worlds():
    world = pd.DataFrame({"fbs_code": [2625, 2511], "ratio": [0.6, 0.0], "dependent": [1.0, 0.0]})
    country = pd.DataFrame(
        {
            "iso3": ["FRA", "FRA", "BRA"],
            "fbs_code": [2625, 2511, 2625],
            "ratio": [0.5, 0.0, 0.6],
            "dependent": [1.0, 0.0, 1.0],
        }
    )
    data = P.pollination_json(country, world)
    assert data["world"] == {"2625": [0.6, 1.0], "2511": [0.0, 0.0]}
    assert data["byCountry"] == {"FRA": {"2625": [0.5, 1.0]}}


def test_shares_weigh_each_items_ratio_and_dependence_by_its_tonnes():
    rows = pd.DataFrame({"t": [80.0, 20.0], "ratio": [0.0, 0.5], "dependent": [0.0, 1.0]})
    assert P.shares(rows) == {"dependent": pytest.approx(0.2), "attributable": pytest.approx(0.1)}
