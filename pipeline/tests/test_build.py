"""A source the build cannot read stops it, or with allow_missing is left out of meta.json."""

import pytest

from planetshift_pipeline.inputs import HESTIA_DEPENDENTS, Build, MissingSource
from planetshift_pipeline.sections.meta import module_sources


def failing(_cache):
    raise ConnectionError("search failed")


@pytest.fixture
def broken_hestia(monkeypatch):
    from planetshift_pipeline.sources import hestia

    monkeypatch.setattr(hestia, "fetch_intensities", failing)


def test_a_failed_fetch_stops_the_build(tmp_path, broken_hestia):
    with pytest.raises(MissingSource, match="sources.hestia"):
        Build(tmp_path, tmp_path).fetch(HESTIA_DEPENDENTS, "fetch_intensities", None)


def test_allow_missing_builds_without_the_source_and_its_dependents(tmp_path, broken_hestia):
    b = Build(tmp_path, tmp_path, allow_missing=True)
    assert b.fetch(HESTIA_DEPENDENTS, "fetch_intensities", "default") == "default"
    assert set(b.missing) == set(HESTIA_DEPENDENTS)


def test_a_missing_module_stops_the_build(tmp_path):
    with pytest.raises(MissingSource, match="nowhere.build_nowhere"):
        Build(tmp_path, tmp_path).module("nowhere", "build_nowhere")


def test_meta_lists_only_the_sources_used():
    ids = [s["id"] for s in module_sources(HESTIA_DEPENDENTS, {})]
    assert "hestia-aggregations" in ids
    left = module_sources(HESTIA_DEPENDENTS, {"sources.hestia": "search failed"})
    assert "hestia-aggregations" not in [s["id"] for s in left]


def test_a_download_records_its_date_and_hash(tmp_path, monkeypatch):
    import hashlib

    from planetshift_pipeline import cache

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def raise_for_status(self):
            pass

        def iter_content(self, chunk_size):
            return iter([b"a,b\n", b"1,2\n"])

    class Http:
        def get(self, *_, **__):
            return Response()

    monkeypatch.setattr(cache, "session", Http)
    path = cache.fetched(tmp_path, "https://example.org/data/table.csv")
    side = cache.recorded(path)
    assert path.read_bytes() == b"a,b\n1,2\n"
    assert side["sha256"] == hashlib.sha256(b"a,b\n1,2\n").hexdigest()
    assert side["downloaded"] == cache.today()


def test_a_faostat_extract_is_keyed_by_its_bulk_file(tmp_path):
    from planetshift_pipeline import cache
    from planetshift_pipeline.sources import faostat

    zip_path = tmp_path / faostat.FILES["QCL"]
    zip_path.write_bytes(b"")
    cache.record(zip_path, downloaded="2026-01-02", updated="2025-12-20")
    first = faostat.extract_path(tmp_path, "QCL", 2022, 2022)
    cache.record(zip_path, downloaded="2026-03-04", updated="2026-02-27")
    assert faostat.extract_path(tmp_path, "QCL", 2022, 2022) != first


def test_downloads_retry_server_errors():
    from planetshift_pipeline import cache

    retry = cache.session().get_adapter("https://example.org").max_retries
    assert retry.total == 5 and 503 in retry.status_forcelist
