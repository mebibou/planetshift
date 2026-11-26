"""The leaked-methane build: fugitive sectors by fuel, their share of each sector's supply methane,
the countries, and (marked `network`) the built file against CEDS and coemissions.json.

CEDS v_2024_07_08 in 2022: oil 50.3 Mt, gas production 23.5 and distribution 11.1, coal mines
46.1."""

import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import coemissions as C
from planetshift_pipeline import fossil_methane as F
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.climate import SSPS
from planetshift_pipeline.sources import ceds

MT = 1e9
ROAD = "1A3b_Road"
POWER = "1A1a_Electricity-public"


def table(rows: list[tuple[str, str, float]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["sector", "fuel", "kg"])


CO2 = table(
    [
        (ROAD, "diesel_oil", 800.0),
        (ROAD, "natural_gas", 200.0),
        (POWER, "hard_coal", 600.0),
        (POWER, "natural_gas", 400.0),
    ]
)
CH4 = table(
    [
        ("1B2_Fugitive-petr", "process", 8.0),
        ("1B2b_Fugitive-NG-prod", "process", 3.0),
        ("1B2b_Fugitive-NG-distr", "process", 3.0),
        ("1B1_Fugitive-solid-fuels", "process", 6.0),
        ("1A1bc_Other-transformation", "process", 50.0),
        (ROAD, "diesel_oil", 70.0),
    ]
)
BY_COUNTRY = pd.DataFrame(
    [
        ("usa", "1B2_Fugitive-petr", 5.0),
        ("usa", "1B1_Fugitive-solid-fuels", 1.0),
        ("chn", "1B1_Fugitive-solid-fuels", 4.0),
        ("fra", ROAD, 2.0),
        ("global", "1B2_Fugitive-petr", 9.0),
        ("srb (kosovo)", "1B1_Fugitive-solid-fuels", 9.0),
    ],
    columns=["country", "sector", "kg"],
)


def test_only_the_fugitive_sectors_count_per_kg_of_each_fuel_burnt():
    per_kg = F.leak_per_kg(CH4, CO2)
    assert per_kg == pytest.approx({"oil": 8 / 800, "gas": 6 / 600, "coal": 6 / 600})


def test_a_sector_leaks_as_its_fuels_do_and_aviations_own_emissions_leak_nothing():
    leaks = F.sector_leaks(CO2, {"oil": 0.01, "gas": 0.02, "coal": 0.03})
    assert leaks["roadPassenger"] == pytest.approx({"oilGas": 0.8 * 0.01 + 0.2 * 0.02, "coal": 0})
    assert leaks["electricity"] == pytest.approx({"oilGas": 0.4 * 0.02, "coal": 0.6 * 0.03})
    assert leaks["aviationOwn"] == {"oilGas": 0.0, "coal": 0.0}


def test_the_world_and_the_countries_count_the_leaks_by_group():
    assert F.world_leaks(CH4) == {"oilGas": 14.0, "coal": 6.0}
    assert F.country_leaks(BY_COUNTRY) == {
        "CHN": {"oilGas": 0.0, "coal": 4.0},
        "USA": {"oilGas": 5.0, "coal": 1.0},
    }


def test_the_world_follows_the_energy_methane_and_the_ratio_the_supply_trend():
    n = len(C.YEARS)
    doc = F.document(
        CH4,
        CO2,
        BY_COUNTRY,
        dict.fromkeys(SSPS, np.linspace(1, 0.5, n)),
        dict.fromkeys(SSPS, np.linspace(1, 0, n)),
    )
    assert doc["years"] == list(C.YEARS)
    assert doc["emissions"]["ssp245"]["oilGas"][0] == pytest.approx(14.0)
    assert doc["emissions"]["ssp245"]["coal"][-1] == pytest.approx(0.0, abs=1e-12)
    road = doc["perKgCo2"]["ssp126"]["roadPassenger"]["oilGas"]
    assert road[-1] == pytest.approx(road[0] / 2, rel=1e-3)
    assert doc["avoidable"] == {"oilGas": 0.75, "coal": 0.5}
    assert set(doc["byCountry"]) == {"CHN", "USA"}


REQUIRED = [
    DEFAULT_CACHE / "ceds" / ceds.FILE,
    DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv",
]


@pytest.fixture(scope="module")
def built():
    if not all(p.exists() for p in REQUIRED):
        pytest.skip("CEDS or RCMIP not downloaded")
    return F.build(DEFAULT_CACHE)


@pytest.mark.network
def test_the_built_leaks_meet_ceds_in_its_last_year(built):
    for ssp in SSPS:
        e = built["emissions"][ssp]
        assert e["oilGas"][0] / MT == pytest.approx(50.3 + 23.5 + 11.1, abs=0.2)
        assert e["coal"][0] / MT == pytest.approx(46.1, abs=0.1)
    countries = built["byCountry"].values()
    assert sum(c["oilGas"] for c in countries) / MT == pytest.approx(84.9, rel=0.01)
    assert sum(c["coal"] for c in countries) / MT == pytest.approx(46.1, rel=0.01)


@pytest.mark.network
def test_the_leaks_are_part_of_each_sectors_supply_methane(built):
    tables = C.load_tables(ceds.path(DEFAULT_CACHE))
    base = C.base_ratios(tables)
    for sector, by_group in built["perKgCo2"]["ssp245"].items():
        supply = base[sector]["supply"]["ch4"]
        leaked = by_group["oilGas"][0] + by_group["coal"][0]
        assert leaked <= supply * 1.001, sector
        assert leaked >= 0.9 * supply, sector
