"""Checks of the sectors build against recent inventories and of FaIR's forcing response.

They read RCMIP and the AR6 marker runs from the cache and run FaIR on the first MEMBERS members."""

import json

import numpy as np
import pytest

from planetshift_pipeline import climate, sectors
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import ar6db, ceds

MEMBERS = 100
REQUIRED = [
    DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv",
    DEFAULT_CACHE / "ar6db" / ar6db.FILE,
    DEFAULT_CACHE / "ceds" / ceds.FILE,
]
GT = 1e12
# Recent world totals, Gt CO₂/yr, and how far the base year may sit from them: road ~6 and
# shipping ~0.98 (CEDS 2022), aviation ~0.95 (IEA tracking), electricity ~14.2 (Ember 2024).
RECENT = {
    "road": (6.0, 0.15),
    "aviation": (0.95, 0.1),
    "shipping": (0.98, 0.1),
    "electricity": (14.2, 0.1),
}

pytestmark = pytest.mark.network


@pytest.fixture(scope="module")
def built():
    if not all(p.exists() for p in REQUIRED):
        pytest.skip("RCMIP, the AR6 marker runs or CEDS not downloaded")
    return sectors.build(DEFAULT_CACHE, members=MEMBERS)


def at(series: dict, year: int) -> float:
    return series["values"][series["years"].index(year)]


def test_document_matches_the_contract(built):
    document, _ = built
    assert set(document) == {
        "co2",
        "gridIntensity",
        "evKwhPerKgCo2",
        "dataCentresTwh",
        "aviationNonCo2",
        "forcingResponse",
        "source",
    }
    for ssp in climate.SSPS:
        assert set(document["co2"][ssp]) == set(sectors.SECTORS)
        for series in [*document["co2"][ssp].values(), document["gridIntensity"][ssp]]:
            assert series["years"][0] == sectors.BASE_YEAR and series["years"][-1] == 2100
            assert len(series["values"]) == len(series["years"])
    assert set(document["evKwhPerKgCo2"]) == {"passenger", "freight"}
    centres = document["dataCentresTwh"]
    assert len(centres["median"]) == len(centres["low"]) == len(centres["years"])
    assert set(document["aviationNonCo2"]) == {"median", "low", "high"}
    response = document["forcingResponse"]
    assert len(response["median"]) == len(response["p05"]) == climate.HORIZON + 1
    assert isinstance(document["source"], str) and document["source"]


@pytest.mark.parametrize("ssp", climate.SSPS)
def test_base_year_matches_recent_inventories(built, ssp):
    co2 = built[0]["co2"][ssp]
    totals = {
        "road": at(co2["roadPassenger"], sectors.BASE_YEAR)
        + at(co2["roadFreight"], sectors.BASE_YEAR),
        "aviation": at(co2["aviation"], sectors.BASE_YEAR),
        "shipping": at(co2["shipping"], sectors.BASE_YEAR),
        "electricity": at(co2["electricity"], sectors.BASE_YEAR),
    }
    for sector, (expected, tolerance) in RECENT.items():
        assert totals[sector] / GT == pytest.approx(expected, rel=tolerance), sector
    assert at(co2["dataCentres"], sectors.BASE_YEAR) == 0.0


def test_trajectories_follow_the_scenarios(built):
    co2 = built[0]["co2"]
    road = {ssp: at(co2[ssp]["roadPassenger"], 2100) for ssp in climate.SSPS}
    assert road["ssp126"] < road["ssp245"] < road["ssp370"]
    power = {ssp: at(co2[ssp]["electricity"], 2050) for ssp in climate.SSPS}
    assert power["ssp126"] < power["ssp245"] < power["ssp370"]
    assert all(min(s["values"]) >= 0 for ssp in climate.SSPS for s in co2[ssp].values())


def test_grid_intensity_starts_at_the_observed_value_and_stays_in_range(built):
    for ssp in climate.SSPS:
        intensity = built[0]["gridIntensity"][ssp]
        assert at(intensity, sectors.BASE_YEAR) == pytest.approx(0.48, abs=0.01)
        assert 0 <= min(intensity["values"]) and max(intensity["values"]) < 0.8
    assert at(built[0]["gridIntensity"]["ssp126"], 2050) < 0.2


def test_data_centre_co2_is_their_electricity_times_the_grid(built):
    document, _ = built
    centres = document["dataCentresTwh"]
    for ssp in climate.SSPS:
        co2 = document["co2"][ssp]["dataCentres"]
        i = centres["years"].index(2030)
        expected = centres["median"][i] * 1e9 * document["gridIntensity"][ssp]["values"][i]
        assert co2["values"][i] == pytest.approx(expected, rel=2e-3)


def test_forcing_response_peaks_early_then_decays_slowly(built):
    median = np.array(built[0]["forcingResponse"]["median"])
    p05 = np.array(built[0]["forcingResponse"]["p05"])
    assert (p05 > 0).all()
    peak = int(np.argmax(median))
    assert peak <= 2
    assert 0.03 < median[peak] < 0.2
    assert median[10] < median[peak] / 3
    assert median[100] > 0 and median[100] < median[50] < median[10]
    # The response to a held forcing (the running sum) after two centuries: below equilibrium
    # (about 0.8 °C per W/m²), above the transient response's half.
    assert 0.4 < median.sum() < 1.0


def test_forcing_response_is_linear(built):
    assert sectors.linearity(built[1]["responses"]) < 0.005


def test_built_files_carry_sectors_and_permafrost():
    sectors_file = climate.DEFAULT_OUT / "sectors.json"
    climate_file = climate.DEFAULT_OUT / "climate.json"
    if not (sectors_file.exists() and climate_file.exists()):
        pytest.skip("sectors.json or climate.json not built")
    assert set(json.loads(sectors_file.read_text())["co2"]) == set(climate.SSPS)
    assert json.loads(climate_file.read_text())["permafrost"] == climate.permafrost()
