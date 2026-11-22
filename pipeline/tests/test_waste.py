import pandas as pd
import pytest

from planetshift_pipeline import waste as W


def row(m49, sector, kg, source=W.REPORT, year=2022, confidence="Low Confidence"):
    return {
        "geoAreaCode": m49,
        "timePeriodStart": year,
        "value": str(kg),
        "source": source,
        "footnotes": [confidence],
        "dimensions": {"Reporting Type": "G", "Food Waste Sector": sector},
    }


def test_report_table_takes_the_index_then_eurostat_in_the_index_year():
    rows = [
        row("4", "HHS", 80.0),
        row("4", "HHS", 70.0, year=2019),
        row("4", "ALL", 130.0),
        row("4", "HHS", 99.0, source="Eurostat"),
        row("276", "HHS", 75.0, source="Eurostat"),
        row("276", "HHS", 79.0, source="Eurostat", year=2021),
        row("276", "HHS", 60.0, source="Food Waste Index Report 2021", year=2019),
    ]
    table = W.report_table(rows).set_index("m49")
    assert table.loc["004", "kg"] == 80.0
    assert table.loc["004", "confidence"] == "Low Confidence"
    assert table.loc["276", "kg"] == 75.0
    assert table.loc["276", "confidence"] == "Eurostat (reported)"
    assert len(table) == 2


def test_by_iso3_pivots_sectors_and_drops_unknown_areas():
    rows = [row("4", s, kg) for s, kg in (("RTL", 1), ("OOHC", 2), ("HHS", 3))]
    wide = W.by_iso3(W.report_table([*rows, row("1", "HHS", 9)]), {"004": "AFG"})
    assert wide.loc["AFG"].to_dict() == {"retail": 1, "foodService": 2, "household": 3}
    assert list(wide.index) == ["AFG"]


def known(rows: dict[str, tuple[float, float, float]]) -> pd.DataFrame:
    return pd.DataFrame(rows, index=W.FIELDS).T


def test_region_filled_uses_the_region_median_sector_by_sector():
    data = known({"A": (1, 10, 50), "B": (3, 30, 70), "C": (5, 20, 90), "D": (100, 100, 100)})
    regions = {"A": "R", "B": "R", "C": "R", "D": "S", "E": "R"}
    rows, notes = W.region_filled(data, ["A", "B", "C", "D", "E"], regions)
    assert rows.loc["E"].to_dict() == {"retail": 3, "foodService": 20, "household": 70}
    assert rows.loc["A"].to_dict() == {"retail": 1, "foodService": 10, "household": 50}
    assert notes == {"E": "R median"}


def test_region_filled_falls_back_to_the_world_and_ignores_incomplete_rows():
    data = known({"A": (1, 10, 50), "B": (3, 30, 70), "C": (None, 5, 5)})
    rows, notes = W.region_filled(data, ["A", "B", "C", "Z"], {"A": "R", "B": "R", "C": "R"})
    assert rows.loc["Z"].to_dict() == {"retail": 2, "foodService": 20, "household": 60}
    assert rows.loc["C"].to_dict() == {"retail": 2, "foodService": 20, "household": 60}
    assert notes == {"C": "R median", "Z": "world median"}


def test_region_filled_leaves_out_areas_that_are_not_countries():
    data = known({"A": (1, 1, 1), "B": (3, 3, 3), "XX": (100, 100, 100)})
    rows, _ = W.region_filled(data, ["A", "B", "C"], {"A": "R", "B": "R", "C": "R"})
    assert list(rows.index) == ["A", "B", "C"]
    assert rows.loc["C", "retail"] == 2


def test_edible_applies_the_shares_by_income():
    data = known({"RICH": (100, 100, 100), "POOR": (100, 100, 100)})
    out = W.edible(data, {"RICH"})
    assert out.loc["RICH", "household"] == pytest.approx(100 * W.EDIBLE_SHARE[True]["household"])
    assert out.loc["POOR", "household"] == pytest.approx(100 * W.EDIBLE_SHARE[False]["household"])
    assert out.loc["POOR", "retail"] == pytest.approx(100 * W.EDIBLE_SHARE[False]["retail"])


def test_capped_scales_all_sectors_of_countries_over_the_cap():
    data = known({"A": (10, 10, 20), "B": (10, 10, 20), "C": (1, 1, 1)})
    out, capped = W.capped(data, pd.Series({"A": 50.0, "B": 400.0}), cap=0.4)
    assert out.loc["A"].sum() == pytest.approx(20)
    assert out.loc["A", "household"] == pytest.approx(10)
    assert out.loc["B"].to_dict() == data.loc["B"].to_dict()
    assert out.loc["C"].to_dict() == data.loc["C"].to_dict()
    assert capped == ["A"]


def test_waste_json_matches_the_contract():
    out = W.waste_json(known({"B": (1.234, 2, 3), "A": (4, 5, 6)}), "src")
    assert out == {
        "byCountry": {
            "A": {"retail": 4.0, "foodService": 5.0, "household": 6.0},
            "B": {"retail": 1.23, "foodService": 2.0, "household": 3.0},
        },
        "source": "src",
    }
