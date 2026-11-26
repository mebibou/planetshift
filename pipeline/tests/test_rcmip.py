import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline.cache import DEFAULT_CACHE, fetched
from planetshift_pipeline.sources import rcmip

CORRECTED_NOX = (
    "https://raw.githubusercontent.com/chrisroadmap/fair-calibrate/v1.4.1/"
    "data/emissions/rcmip-5-1-0-corrected-nox.csv"
)


def rows(nox: float, burning: float) -> pd.DataFrame:
    variables = [("Emissions|NOx", nox)] + [(v, burning) for v in rcmip.BURNING_NOX]
    return pd.DataFrame(
        [
            {
                "Scenario": "ssp245",
                "Region": "World",
                "Variable": v,
                "Unit": "Mt NOx/yr",
                "1750": x,
                "2500": x,
            }
            for v, x in variables
        ]
    )


def test_nox_counts_its_burning_categories_as_no2():
    df = rows(nox=100.0, burning=5.0)
    nox = rcmip.fair_emissions(df, "ssp245", ["NOx"], np.array([2050]))["NOx"]
    assert nox[0] == pytest.approx(100 + 4 * 5 * (46.006 / 30.006 - 1))


@pytest.mark.network
@pytest.mark.parametrize("ssp", ["ssp126", "ssp245", "ssp370"])
def test_nox_matches_the_calibrations_corrected_series(ssp):
    corrected = pd.read_csv(fetched(DEFAULT_CACHE / "rcmip", CORRECTED_NOX))
    row = corrected[(corrected["Scenario"] == ssp) & (corrected["Variable"] == "Emissions|NOx")]
    years = np.array([2030, 2050, 2100])
    ours = rcmip.fair_emissions(rcmip.load(DEFAULT_CACHE), ssp, ["NOx"], years)["NOx"]
    assert ours == pytest.approx(row[[str(y) for y in years]].to_numpy(float)[0], rel=1e-6)
