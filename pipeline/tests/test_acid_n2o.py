"""The adipic and nitric acid N₂O build: the acid sectors, the countries, the scenario trend and
(marked `network`) the built file against CEDS.

CEDS v_2024_07_08 in 2022: adipic acid 0.397 Mt, nitric acid 0.270 Mt."""

import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import acid_n2o as A
from planetshift_pipeline import coemissions as C
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.climate import SSPS
from planetshift_pipeline.sources import ceds

MT = 1e9
ADIPIC = "2B3_Chemicals-Adipic-acid"
NITRIC = "2B2_Chemicals-Nitric-acid"
BY_COUNTRY = pd.DataFrame(
    [
        ("chn", ADIPIC, 6.0),
        ("chn", NITRIC, 2.0),
        ("usa", NITRIC, 1.0),
        ("fra", "2B_Chemical-industry", 5.0),
        ("deu", ADIPIC, 0.0),
        ("global", NITRIC, 9.0),
        ("srb (kosovo)", NITRIC, 9.0),
    ],
    columns=["country", "sector", "kg"],
)


def test_only_the_acid_sectors_count_and_the_world_keeps_ceds_global_rows():
    assert A.world_n2o(BY_COUNTRY) == {"adipic": 6.0, "nitric": 21.0}


def test_the_countries_with_acid_n2o_are_kept_by_iso3():
    assert A.country_n2o(BY_COUNTRY) == {
        "CHN": {"adipic": 6.0, "nitric": 2.0},
        "USA": {"adipic": 0.0, "nitric": 1.0},
    }


def test_the_abated_shares_are_the_ipcc_factors():
    assert A.ABATED["adipic"] == pytest.approx(0.9555, abs=1e-4)
    assert A.ABATED["nitric"] == pytest.approx(0.7222, abs=1e-4)


def test_the_world_follows_the_scenarios_industrial_n2o():
    n = len(C.YEARS)
    doc = A.document(BY_COUNTRY, dict.fromkeys(SSPS, np.linspace(1, 0.5, n)))
    assert doc["years"] == list(C.YEARS)
    assert doc["emissions"]["ssp245"]["adipic"][0] == pytest.approx(6.0)
    assert doc["emissions"]["ssp245"]["nitric"][-1] == pytest.approx(10.5)
    assert set(doc["byCountry"]) == {"CHN", "USA"}
    assert doc["abated"] == {"adipic": 0.9554, "nitric": 0.7222}


REQUIRED = [
    DEFAULT_CACHE / "ceds" / ceds.FILE,
    DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv",
]


@pytest.fixture(scope="module")
def built():
    if not all(p.exists() for p in REQUIRED):
        pytest.skip("CEDS or RCMIP not downloaded")
    return A.build(DEFAULT_CACHE)


@pytest.mark.network
def test_the_built_n2o_meets_ceds_in_its_last_year(built):
    for ssp in SSPS:
        e = built["emissions"][ssp]
        assert e["adipic"][0] / MT == pytest.approx(0.397, abs=0.001)
        assert e["nitric"][0] / MT == pytest.approx(0.270, abs=0.001)
    countries = built["byCountry"]
    assert sum(c["adipic"] + c["nitric"] for c in countries.values()) / MT == pytest.approx(
        0.667, rel=0.01
    )
    assert max(countries, key=lambda k: sum(countries[k].values())) == "CHN"
