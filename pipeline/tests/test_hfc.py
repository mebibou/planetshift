"""The HFC build: each HFC's gas cycle against FaIR's, how far the scenarios have gone towards
Kigali, the file's shape, and (marked `network`) the built file against fair.json."""

import json

import numpy as np
import pytest

from planetshift_pipeline import hfc as H
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.climate import DEFAULT_OUT, SSPS
from planetshift_pipeline.climate_scenarios import HFCS


def params(lifetime: float, efficiency: float) -> dict[str, float]:
    """A one-box gas whose lifetime scaling is 1: g0 = exp(-iirf0 / g1)."""
    return {
        "lifetime": lifetime,
        "iirf0": 10.0,
        "g0": float(np.exp(-10.0 / 5.0)),
        "g1": 5.0,
        "concentrationPerEmission": 0.05,
        "efficiency": efficiency,
    }


def test_a_cycle_decays_and_holds_what_a_year_s_emission_leaves():
    decay, gain = H.cycle(14.0, 1.0)
    assert decay == pytest.approx(np.exp(-1 / 14))
    assert gain == pytest.approx(14 * (1 - np.exp(-1 / 14)))
    assert gain < 1


def test_the_carrier_is_its_own_unit_and_a_long_lived_gas_decays_slower():
    cycles = H.gas_cycles(
        {
            H.CARRIER: params(14.0, 0.167),
            "HFC-23": params(228.0, 0.191),
            "HFC-32": params(5.4, 0.111),
        }
    )
    assert cycles[H.CARRIER]["relative"] == pytest.approx(1)
    assert cycles["HFC-23"]["decay"] == pytest.approx(np.exp(-1 / 228))
    assert cycles["HFC-23"]["decay"] > cycles[H.CARRIER]["decay"] > cycles["HFC-32"]["decay"]
    gain = {s: H.cycle(t, 1.0)[1] for s, t in ((H.CARRIER, 14.0), ("HFC-32", 5.4))}
    assert cycles["HFC-32"]["relative"] == pytest.approx(
        0.111 * gain["HFC-32"] / (0.167 * gain[H.CARRIER])
    )


def test_kigali_share_is_zero_on_velders_baseline_and_one_on_kigali():
    baseline, kigali = (np.mean(v) * H.AR6_OVER_WMO for v in H.VELDERS_2050.values())
    assert H.kigali_share(baseline) == pytest.approx(0)
    assert H.kigali_share(kigali) == pytest.approx(1)
    assert H.kigali_share(0.15) > 1


def test_the_document_and_summary():
    years = np.arange(2020, 2101)
    by_ssp = {ssp: {s: np.full(len(years), 1e6) for s in HFCS} for ssp in SSPS}
    doc = H.document(years, by_ssp, {s: params(14.0, 0.167) for s in HFCS})
    assert doc["years"][0] == 2020 and doc["years"][-1] == 2100
    assert doc["cut"] == 0.9 and doc["carrier"] == "HFC-134a"
    assert set(doc["cycles"]) == set(HFCS) == set(doc["gwp100"])
    assert doc["emissions"]["ssp245"]["HFC-23"][0] == 1e6
    lines = H.summary(years, by_ssp)
    assert len(lines) == len(SSPS)
    assert lines[1].startswith("ssp245 HFCs in 2050: 0.04 Gt CO2e")


@pytest.mark.network
def test_the_built_file_holds_fair_json_s_hfcs():
    if not (DEFAULT_CACHE / "rcmip").exists() or not (DEFAULT_OUT / "fair.json").exists():
        pytest.skip("RCMIP or fair.json not there")
    built = H.build(DEFAULT_CACHE)
    fair = json.loads((DEFAULT_OUT / "fair.json").read_text())
    at = built["years"].index(2050)
    for ssp in SSPS:
        for s in HFCS:
            kt = fair["ssp"][ssp]["emissions"][s][2050 - 1750]
            assert built["emissions"][ssp][s][at] / H.KG_PER_KT == pytest.approx(kt, rel=1e-3)
    fair_names = [x["name"] for x in fair["species"]]
    lifetime = fair["speciesConfigs"]["unperturbed_lifetime"]["values"]
    for s in ("HFC-23", "HFC-32"):
        tau = lifetime[fair_names.index(s)][0]
        assert built["cycles"][s]["decay"] == pytest.approx(np.exp(-1 / tau), rel=1e-3)
