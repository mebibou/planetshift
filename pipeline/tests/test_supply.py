import pandas as pd
import pytest

from planetshift_pipeline import supply as S


def fbs(rows):
    return pd.DataFrame(rows, columns=["area_code", "item_code", "element_code", "year", "value"])


def test_base_year_is_the_latest_nearly_complete_year():
    rows = [(a, 2511, 5142, y, 1.0) for y in (2021, 2022) for a in range(1, 41)]
    rows += [(a, 2511, 5142, 2023, 1.0) for a in range(1, 11)]
    assert S.base_year(fbs(rows)) == 2022


def test_balance_closes_with_other():
    rows = fbs(
        [
            (1, 2511, 5511, 2023, 10.0),
            (1, 2511, 5611, 2023, 2.0),
            (1, 2511, 5911, 2023, 3.0),
            (1, 2511, 5142, 2023, 5.0),
            (1, 2511, 5521, 2023, 2.0),
        ]
    )
    row = S.balance(rows).loc[(1, 2511)]
    assert row["production"] == 10_000
    assert row["other"] == 2_000
    uses = row[["food", "feed", "losses", "processing", "seed", "other"]].sum()
    assert uses == row["production"] + row["imports"] - row["exports"]


def test_gap_fill_scales_an_older_balance_by_population():
    current = fbs([(1, 2511, 5142, 2023, 10.0), (2, 2511, 5142, 2019, 4.0)])
    historic = fbs([(3, 2805, 5142, 2013, 1.0)])
    pop = pd.DataFrame(
        {2013: [1.0, 1.0, 1.0], 2019: [1.0, 1.0, 1.0], 2023: [1.0, 2.0, 3.0]}, index=[1, 2, 3]
    )
    rows, notes = S.gap_filled(current, historic, pop, 2023, {2805: 2807})
    got = rows.set_index(["area_code", "item_code"])["value"]
    assert got[(1, 2511)] == 10.0
    assert got[(2, 2511)] == pytest.approx(8.0)
    assert got[(3, 2807)] == pytest.approx(3.0)
    assert notes == {2: "FBS 2019", 3: "historic FBS 2013"}
    assert set(rows["year"]) == {2023}


def test_a_base_year_of_zeros_is_filled_from_the_latest_year_with_a_balance():
    current = fbs(
        [(1, 2511, 5142, 2024, 0.0), (1, 2513, 5142, 2024, 0.0), (1, 2511, 5142, 2023, 5.0)]
    )
    pop = pd.DataFrame({2023: [1.0], 2024: [1.1]}, index=[1])
    rows, notes = S.gap_filled(current, fbs([]), pop, 2024, {})
    assert notes == {1: "FBS 2023"}
    assert rows.set_index(["area_code", "item_code"])["value"][(1, 2511)] == pytest.approx(5.5)


def test_supply_json_omits_empty_rows_and_items_left_out():
    rows = fbs([(1, 2511, 5142, 2023, 1.0), (1, 2761, 5142, 2023, 1.0), (1, 2513, 5142, 2023, 0.0)])
    out = S.supply_json(S.balance(rows), {1: "FRA"}, {2511, 2513})
    assert list(out["FRA"]) == ["2511"]
    assert out["FRA"]["2511"]["food"] == 1000
