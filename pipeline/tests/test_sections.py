"""The list of sections, and that a rebuild of every section from the cache gives the committed
files (set PLANETSHIFT_REBUILD=1: it takes several minutes)."""

import json
import os

import pytest

from planetshift_pipeline.build import OUT_DIR, SECTIONS, main, source_modules
from planetshift_pipeline.cache import DEFAULT_CACHE


def test_each_section_has_its_own_name_and_files():
    names = [s.name for s in SECTIONS]
    outputs = [o for s in SECTIONS for o in s.outputs]
    assert len(set(names)) == len(names)
    assert len(set(outputs)) == len(outputs)
    assert names[-1] == "meta"


def test_every_committed_file_has_a_section():
    if not OUT_DIR.exists():
        pytest.skip("not built")
    outputs = {o for s in SECTIONS for o in s.outputs}
    assert {p.name for p in OUT_DIR.glob("*.json")} <= outputs


def test_meta_lists_the_sources_in_the_order_of_the_sections():
    assert source_modules()[:4] == (
        "sources.hestia",
        "sources.literature",
        "sources.fishstat",
        "seafood",
    )
    assert len(set(source_modules())) == len(source_modules())


def test_an_unknown_section_is_refused():
    with pytest.raises(SystemExit):
        main(["--only", "nowhere"])


def without_build_date(text: str) -> dict:
    meta = json.loads(text)
    return {k: v for k, v in meta.items() if k != "builtAt"}


@pytest.mark.network
@pytest.mark.rebuild
@pytest.mark.skipif(
    os.environ.get("PLANETSHIFT_REBUILD") != "1", reason="set PLANETSHIFT_REBUILD=1"
)
def test_a_rebuild_from_the_cache_gives_the_committed_files(tmp_path):
    if not DEFAULT_CACHE.exists() or not OUT_DIR.exists():
        pytest.skip("no cache or no built files")
    main(["--out", str(tmp_path)])
    for name in (o for s in SECTIONS for o in s.outputs):
        built, committed = tmp_path / name, OUT_DIR / name
        assert built.exists(), name
        if name == "meta.json":
            assert without_build_date(built.read_text()) == without_build_date(
                committed.read_text()
            )
        else:
            assert built.read_bytes() == committed.read_bytes(), name
