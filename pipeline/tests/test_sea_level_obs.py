import pandas as pd
import pytest

from planetshift_pipeline.sources import sea_level as O

NASA = "\n".join(
    ["HDR a header line", "HDR Header_End---", ""]
    + [f"{1995 + w / 52:.4f}  {1.0 + (w // 52):.2f}  0 0 99900 99900" for w in range(52 * 20)]
    + ["2026.5000 99900 1 1 30.0 0.4"]
)
AR6 = "\n".join(
    [
        "Change in GMSL in millimeters compared to 1995-2014 average",
        "Year,Central Estimate,Total Unc. (1-sigma)",
        "1900.5,-158.0,10",
        "1992.5,-36.0,3",
        "1993.5,-35.0,3",
    ]
)


def test_nasa_is_annual_in_metres_without_the_extrapolation():
    annual = O.parse_nasa(NASA)
    assert list(annual.index) == list(range(1995, 2015))
    assert annual[1995] == pytest.approx(0.01)
    assert annual[2014] == pytest.approx(0.20)


def test_ar6_is_in_metres_by_year():
    series = O.parse_ar6(AR6)
    assert series[1900] == pytest.approx(-0.158)


def test_the_tide_gauges_run_to_1992_and_the_satellites_from_1993_on_1995_2014():
    satellite = pd.Series([0.1 * i for i in range(20)], index=range(1995, 2015))
    series = O.joined(O.parse_ar6(AR6), satellite)
    assert list(series.index[:2]) == [1900, 1992]
    assert series.loc[1995:2014].mean() == pytest.approx(0)
