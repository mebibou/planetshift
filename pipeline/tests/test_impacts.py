import json
from collections import Counter
from pathlib import Path

import pytest

from planetshift_pipeline import impacts as I

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"

DROUGHT = """warming_level,50th,17th,83th,5th,95th
1.0,1.70,1.02,2.38,0.68,4.08
3.0,3.23,2.04,5.44,1.36,7.68
4.0,4.08,2.38,6.30,1.70,7.21
"""
#: The other panels' files end each line with a comma.
HOT = """warming_level,50th,17th,83th,5th,95th,
1.0,2.78,2.24,3.05,1.81,3.22,
4.0,9.39,8.57,9.52,8.25,9.63,
"""


def line(group, row, level, mid="", low="", high="", unit="percent", ref="p. 1"):
    return {
        "group": group,
        "row": row,
        "unit": unit,
        "level": level,
        "mid": mid,
        "low": low,
        "high": high,
        "ref": ref,
    }


def test_an_spm6_file_gives_the_median_and_the_5_95_range():
    assert I.parse_spm6(DROUGHT) == {
        "levels": [1.0, 3.0, 4.0],
        "mid": [1.70, 3.23, 4.08],
        "low": [0.68, 1.36, 1.70],
        "high": [4.08, 7.68, 7.21],
    }


def test_a_trailing_comma_is_read_as_well():
    assert I.parse_spm6(HOT)["high"] == [3.22, 9.63]


def test_spm6_rows_name_their_panel():
    rows = I.spm6_rows({"hot10": HOT, "drought10": DROUGHT})
    assert [(r["id"], r["unit"], r["ref"]) for r in rows] == [
        ("hot10", "times", "IPCC AR6 WGI Figure SPM.6, panel a"),
        ("drought10", "times", "IPCC AR6 WGI Figure SPM.6, panel d"),
    ]


def test_a_cited_row_keeps_only_the_columns_it_fills():
    lines = [line("sr15", "coral", "1.5", low="70", high="90"), line("sr15", "coral", "2", "")]
    lines[1] |= {"low": "99", "high": "100"}
    row = I.cited_row(lines)
    assert row == {
        "id": "coral",
        "unit": "percent",
        "ref": "p. 1",
        "levels": [1.5, 2.0],
        "low": [70.0, 99.0],
        "high": [90.0, 100.0],
    }


def test_rows_keep_the_order_of_the_table():
    lines = [
        line("sr15", "b", "1.5", "1"),
        line("x", "a", "1.5", "1"),
        line("sr15", "c", "1.5", "2"),
        line("sr15", "b", "2", "3"),
    ]
    rows = I.cited_rows(lines, "sr15")
    assert [(r["id"], r["mid"]) for r in rows] == [("b", [1.0, 3.0]), ("c", [2.0])]


def test_a_group_whose_rows_were_assessed_at_different_levels_is_refused():
    rows = [{"id": "a", "levels": [1.5, 2.0]}, {"id": "b", "levels": [1.5]}]
    with pytest.raises(ValueError, match="different levels"):
        I.grouped({"id": "sr15"}, rows)


def flood(model, level, millions):
    return {"model": model, "level": level, "millions": millions}


def test_the_flood_row_is_the_models_median_and_their_range():
    lines = [
        flood("a", "1.5", "10"),
        flood("b", "1.5", "30"),
        flood("c", "1.5", "20"),
        flood("a", "3", "40"),
        flood("b", "3", "60"),
        flood("c", "3", "50"),
    ]
    assert I.flood_row(lines) == {
        "id": "riverFlood",
        "unit": "millions",
        "ref": I.FLOODS_REF,
        "levels": [1.5, 3.0],
        "mid": [20.0, 50.0],
        "low": [10.0, 40.0],
        "high": [30.0, 60.0],
    }


def test_the_flood_table_holds_nine_models_at_three_levels():
    lines = I.read_floods()
    assert set(Counter(x["model"] for x in lines).values()) == {3}
    assert len({x["model"] for x in lines}) == 9
    row = I.flood_row(lines)
    assert row["levels"] == [1.5, 2.0, 3.0]
    assert row["mid"] == [199.0, 207.0, 223.0]
    assert row["low"] == [173.0, 174.0, 177.0]
    assert row["high"] == [226.0, 230.0, 258.0]


def test_the_flood_median_at_3_c_is_the_papers_3_2_percent_of_about_7_billion_people():
    """The paper gives 3.2% of the world's people at 3 °C, its population fixed at 2015's."""
    share = I.flood_row(I.read_floods())["mid"][2] / 7.0e3
    assert share == pytest.approx(0.032, abs=0.001)


def test_the_file_holds_the_six_groups_in_order_with_their_levels():
    spm6 = {row: HOT for row in I.SPM6_FILES}
    data = I.impacts_json(spm6, I.read_cited(), I.read_floods())
    ids = ["wgi", "wgii", "sr15", "heatwave", "fire", "flood"]
    assert [g["id"] for g in data["groups"]] == ids
    levels = {g["id"]: g["levels"] for g in data["groups"]}
    assert levels["wgii"] == [1.5, 2.0, 3.0, 4.0, 5.0]
    assert levels["sr15"] == levels["heatwave"] == [1.5, 2.0]
    assert levels["fire"] == [2.0, 4.0]
    assert levels["flood"] == [1.5, 2.0, 3.0]
    assert [g["jointly"] for g in data["groups"]] == [False, False, True, True, False, True]
    assert all("levels" not in r for g in data["groups"] for r in g["rows"])


def test_the_cited_table_holds_the_published_values():
    rows = {
        r["id"]: r
        for g in ("wgii", "sr15", "heatwave", "fire")
        for r in I.cited_rows(I.read_cited(), g)
    }
    assert rows["extinction"]["high"] == [14.0, 18.0, 29.0, 39.0, 48.0]
    assert rows["extinction"]["low"] == [3.0] * 5
    assert rows["coral"]["low"] == [70.0, 99.0]
    assert rows["arctic"]["mid"] == [1.0, 10.0]
    assert rows["fishery"]["mid"] == [1.5, 3.0]
    assert rows["heatwave"]["mid"] == [13.8, 36.9]
    assert rows["burnedArea"]["low"] == [30.0, 50.0]
    assert rows["burnedArea"]["high"] == [35.0, 70.0]
    assert all(r["ref"] for r in rows.values())


def test_the_built_file_holds_spm6_s_non_monotonic_drought_range():
    path = OUT / "impacts.json"
    if not path.exists():
        pytest.skip("not built")
    wgi = json.loads(path.read_text())["groups"][0]
    drought = next(r for r in wgi["rows"] if r["id"] == "drought10")
    assert wgi["levels"] == [1.0, 1.5, 2.0, 3.0, 4.0]
    assert drought["high"][3:] == [7.68, 7.21]
