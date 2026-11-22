import json
from pathlib import Path

import pytest

from planetshift_pipeline import enso as E

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"
SEASONS = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


def table(values: dict[int, list[float]]) -> str:
    """NOAA's layout: a header, then one season a line."""
    lines = [" SEAS  YR   TOTAL   ANOM"]
    for year, anomalies in values.items():
        rows = zip(SEASONS, anomalies, strict=False)
        lines += [f"  {s} {year}  26.50  {a:5.2f}" for s, a in rows]
    return "\n".join(lines) + "\n"


def test_the_table_is_read_season_by_season():
    oni = E.parse_oni(table({1950: [-1.32, -1.2]}))
    assert oni.to_dict("records") == [
        {"season": "DJF", "year": 1950, "anomaly": -1.32},
        {"season": "JFM", "year": 1950, "anomaly": -1.2},
    ]


def test_a_year_averages_the_seasons_from_the_autumn_before_to_its_own_august_october():
    oni = E.parse_oni(table({2000: [0.0] * 9 + [1.2] * 3, 2001: [0.6] * 9 + [9.0] * 3}))
    values = E.annual(oni)
    assert list(values.index) == [2001]
    assert values[2001] == pytest.approx((3 * 1.2 + 9 * 0.6) / 12)


def test_a_year_without_all_its_seasons_is_left_out():
    oni = E.parse_oni(table({2000: [0.0] * 12, 2001: [0.0] * 8}))
    assert E.annual(oni).empty


@pytest.mark.parametrize(
    ("value", "expected"),
    [(0.5, "elNino"), (1.9, "elNino"), (0.49, "neutral"), (-0.49, "neutral"), (-0.5, "laNina")],
)
def test_the_phase_follows_noaa_s_half_degree_threshold(value, expected):
    assert E.phase(value) == expected


def test_the_file_holds_years_values_and_phases():
    oni = E.parse_oni(table({2000: [-1.0] * 12, 2001: [-1.0] * 12, 2002: [0.0] * 12}))
    data = E.enso_json(oni)
    assert data["years"] == [2001, 2002]
    assert data["oni"] == [-1.0, -0.25]
    assert data["phase"] == ["laNina", "neutral"]
    assert data["threshold"] == 0.5


def test_the_built_file_marks_the_known_episodes():
    path = OUT / "enso.json"
    if not path.exists():
        pytest.skip("not built")
    data = json.loads(path.read_text())
    phase = dict(zip(data["years"], data["phase"], strict=True))
    assert data["years"][0] == 1951
    assert [phase[y] for y in (1998, 2016, 2024)] == ["elNino"] * 3
    assert [phase[y] for y in (2000, 2011, 2022)] == ["laNina"] * 3
    assert phase[2023] == "neutral"
