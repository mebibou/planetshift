"""Ember's grid intensities on rows copied from the real file, and (marked `network`) the cached
release itself."""

from pathlib import Path

import pytest

from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import ember

# Real rows of the November 2026 release; Poland's 2025 intensity is blanked to stand for a
# missing value (Ember gives 590.814).
FIXTURE = Path(__file__).parent / "fixtures" / "ember-generation-yearly.csv"


@pytest.fixture
def rows():
    return ember.read(FIXTURE)


def test_reads_total_generation_rows_only(rows):
    france = rows[(rows["area"] == "France") & (rows["year"] == 2025)]
    assert len(france) == 1
    assert france["kg_per_kwh"].iloc[0] == pytest.approx(0.041224)


def test_countries_take_their_latest_year_with_a_value(rows):
    table = ember.countries(rows).set_index("iso3")
    assert table.loc["FRA", "year"] == 2025
    assert table.loc["POL", "year"] == 2024
    assert table.loc["POL", "kg_per_kwh"] == pytest.approx(0.608464)
    assert table.loc["UKR", "year"] == 2022


def test_countries_leave_out_aggregates(rows):
    assert sorted(ember.countries(rows)["iso3"]) == ["FRA", "POL", "UKR"]


def test_countries_without_iso3_are_left_out(rows):
    unmapped = rows.assign(iso3=rows["iso3"].where(rows["area"] != "Ukraine"))
    assert "UKR" not in set(ember.countries(unmapped)["iso3"])


def test_world(rows):
    assert ember.world(rows) == (2025, pytest.approx(0.45893))


def test_release_name_and_last_modified():
    assert ember.last_modified("Tue, 17 Nov 2026 18:34:40 GMT") == "2026-11-17"
    assert ember.last_modified(None) == ""
    assert ember.release_name("2026-11-17") == "release_generation_yearly_global_2026-11-17.csv"


@pytest.mark.network
def test_cached_release():
    file = ember.cached(DEFAULT_CACHE)
    if file is None:
        pytest.skip("no Ember release in the cache")
    rows = ember.read(file)
    _, value = ember.world(rows)
    assert 0.3 < value < 0.6
    assert len(ember.countries(rows)) > 150
