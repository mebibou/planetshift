import json
from pathlib import Path

import pytest

from planetshift_pipeline import removals as R

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"

#: What a hectare can plausibly take up, t CO2/ha/yr, for the median of each practice.
PLAUSIBLE = {
    "coverCrops": (0.3, 1.5),
    "agroforestry": (1.0, 15.0),
    "biochar": (0.5, 5.0),
    "enhancedWeathering": (0.3, 5.0),
}


@pytest.fixture(scope="module")
def data():
    return R.removals_json(R.load(), R.load_zones(), set(R.load_zones()))


def test_every_practice_matches_the_contract(data):
    assert set(data) == set(R.PRACTICES)
    for removal in data.values():
        assert set(removal) == {"rate", "appliesTo", "maxShare", "years", "source"}
        assert removal["appliesTo"] in R.APPLIES_TO
        assert 0 < removal["maxShare"] <= 1
        assert isinstance(removal["years"], int) and removal["years"] > 0
        assert R.WORLD in removal["rate"]
        assert "doi:" in removal["source"]


def test_ranges_are_ordered(data):
    for removal in data.values():
        for rate in removal["rate"].values():
            assert set(rate) == {"median", "low", "high"}
            assert 0 <= rate["low"] <= rate["median"] <= rate["high"]


def test_medians_are_plausible(data):
    for practice, (low, high) in PLAUSIBLE.items():
        for rate in data[practice]["rate"].values():
            assert low <= rate["median"] <= high, practice


def test_soil_carbon_saturates_and_applied_carbon_keeps_accruing(data):
    assert data["coverCrops"]["years"] <= 50
    assert data["agroforestry"]["years"] <= 50
    assert data["biochar"]["years"] >= 75
    assert data["enhancedWeathering"]["years"] >= 75


def test_zones_expand_to_countries_with_moist_above_dry():
    rows = R.load()
    zones = {"BRA": "tropicalMoist", "ESP": "temperateDry", "XXX": "tropicalMoist"}
    rates = R.rates(
        rows[(rows["practice"] == "coverCrops") & (rows["field"] == "rate")], zones, {"BRA", "ESP"}
    )
    assert set(rates) == {"World", "BRA", "ESP"}
    assert rates["BRA"]["median"] > rates["ESP"]["median"]


def test_every_row_has_a_known_source_and_a_reason():
    rows = R.load()
    keys = {k for cell in rows["source"] for k in cell.split(";")}
    assert keys <= set(R.CITATIONS)
    assert (rows["reasoning"].str.len() > 20).all()


def test_zones_are_known():
    zones = set(R.load_zones().values())
    rows = R.load()
    assert zones <= set(rows.loc[rows["field"] == "rate", "zone"]) - {R.WORLD}


@pytest.mark.network
def test_built_file_matches_the_source_table(data):
    path = OUT / "removals.json"
    if not path.exists():
        pytest.skip("removals.json not built")
    built = json.loads(path.read_text())
    assert set(built) == set(R.PRACTICES)
    for practice, removal in built.items():
        assert removal["rate"]["World"] == data[practice]["rate"]["World"]
    assert path.stat().st_size < 1_000_000
