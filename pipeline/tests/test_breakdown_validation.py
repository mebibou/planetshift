"""Checks of breakdown.json against intensities.json and FAOSTAT's world totals by process, and
that the intensities rebuilt from the cache are the committed ones. They need the downloaded
sources and the built JSON, and are skipped without them."""

import json

import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline.build import OUT_DIR, Build
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sections import intensities as intensities_section
from planetshift_pipeline.sources import faostat

pytestmark = pytest.mark.network

#: FAOSTAT GT items of the farm-gate processes, by the source the breakdown gives them.
GT_SOURCES = {
    5058: "enteric",
    5059: "manure",
    5060: "rice",
    5061: "syntheticFertiliser",
    5062: "organicFertiliser",
    5063: "organicFertiliser",
    5064: "residues",
    5066: "residues",
}
SHARE_TOLERANCE = 0.03


def built(name: str):
    path = OUT_DIR / name
    if not path.exists():
        pytest.skip(f"not built: {name}")
    return json.loads(path.read_text())


def shares_of(breakdown: dict, iso3: str, code: str, scope: str, gas: str) -> dict:
    own = breakdown["byCountry"].get(iso3, {}).get(code)
    cell = own if own is not None else breakdown["world"].get(code, {})
    return cell.get(scope, {}).get(gas, {})


def world_by_source(scope: str, gas: str) -> dict[str, float]:
    supply = built("supply.json")["byCountry"]
    intensities = built("intensities.json")["byCountry"]
    breakdown = built("breakdown.json")
    out: dict[str, float] = {}
    for iso3, rows in supply.items():
        for code, row in rows.items():
            kg = intensities[iso3][code][scope]["kgPerTonne"][gas] * max(
                row["production"] - row["processing"], 0
            )
            for source, share in shares_of(breakdown, iso3, code, scope, gas).items():
                out[source] = out.get(source, 0.0) + kg * share
    return out


def test_every_non_zero_gas_has_shares_summing_to_one():
    intensities = built("intensities.json")["byCountry"]
    breakdown = built("breakdown.json")
    for iso3, items in intensities.items():
        for code, scopes in items.items():
            for scope, cell in scopes.items():
                for gas, kg in cell["kgPerTonne"].items():
                    if kg:
                        total = sum(shares_of(breakdown, iso3, code, scope, gas).values())
                        assert total == pytest.approx(1.0, abs=1e-6), (iso3, code, scope, gas)


def test_world_methane_by_source_matches_faostat():
    year = built("meta.json")["baseYear"]
    if not (DEFAULT_CACHE / faostat.FILES["GT"]).exists():
        pytest.skip("GT not downloaded")
    gt = faostat.read(DEFAULT_CACHE, "GT", year, year)
    rows = gt[(gt["area_code"] == 5000) & (gt["element_code"] == 7225)]
    reference: dict[str, float] = {}
    for item, value in zip(rows["item_code"], rows["value"], strict=True):
        if item in GT_SOURCES:
            reference[GT_SOURCES[item]] = reference.get(GT_SOURCES[item], 0.0) + value * I.KT
    model = world_by_source("farmGate", "ch4")
    total_model, total_ref = sum(model.values()), sum(reference.values())
    print({s: (round(model.get(s, 0) / 1e9, 1), round(v / 1e9, 1)) for s, v in reference.items()})
    for source in ("enteric", "manure", "rice"):
        assert model.get(source, 0) / total_model == pytest.approx(
            reference[source] / total_ref, abs=SHARE_TOLERANCE
        ), source


def test_intensities_rebuilt_from_the_cache_are_the_committed_ones(tmp_path):
    committed = OUT_DIR / "intensities.json"
    if not committed.exists() or not (DEFAULT_CACHE / faostat.FILES["GT"]).exists():
        pytest.skip("intensities.json or the FAOSTAT cache missing")
    intensities_section.build(Build(DEFAULT_CACHE, tmp_path))
    assert (tmp_path / "intensities.json").read_bytes() == committed.read_bytes()
