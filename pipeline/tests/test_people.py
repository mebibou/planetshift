import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import people as P

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"
CLOUD_SHAPE = 0.01


def parameters() -> pd.DataFrame:
    columns = {f"erfari_radiative_efficiency[{s}]": [-0.002, -0.004] for s in P.ARI}
    columns |= {f"ozone_radiative_efficiency[{s}]": [0.001, 0.002] for s in P.OZONE}
    columns |= {f"aci_shape[{s}]": [CLOUD_SHAPE, CLOUD_SHAPE] for s in P.CLOUD}
    columns |= {"aci_scale": [-0.5, -1.0], f"forcing_scale[{P.SNOW}]": [1.0, 1.0]}
    return pd.DataFrame(columns)


def species() -> pd.DataFrame:
    return pd.DataFrame({"lapsi_radiative_efficiency": [0.01]}, index=["BC"])


def test_human_emissions_are_above_the_pre_industrial_level_in_kg():
    emissions = {
        "CO2 FFI": np.array([30.0]),
        "CO2 AFOLU": np.array([5.0]),
        "CH4": np.array([300.0]),
    }
    baseline = {"CO2 FFI": 0.0, "CO2 AFOLU": 1.0, "CH4": 20.0}
    assert P.human_kg(emissions, baseline, ("CO2 FFI", "CO2 AFOLU"))[0] == pytest.approx(34e12)
    assert P.human_kg(emissions, baseline, ("CH4",))[0] == pytest.approx(280e9)


def test_fossil_co2_leaves_out_farming_and_land_use_is_all_of_its_co2():
    emissions = {"CO2 FFI": np.array([30.0]), "CO2 AFOLU": np.array([5.0])}
    baseline = {"CO2 FFI": 0.0, "CO2 AFOLU": 1.0}
    fossil = {"co2": np.array([29e12]), "ch4": np.array([1e11]), "n2o": np.array([1e9])}
    farm = {"co2": np.array([2e12]), "ch4": np.array([1.4e11]), "n2o": np.array([7e9])}
    causes = P.by_cause(emissions, baseline, fossil, farm)
    assert causes["fossilIndustry"]["co2"][0] == pytest.approx(28e12)
    assert causes["fossilIndustry"]["ch4"][0] == pytest.approx(1e11)
    assert causes["landUse"]["co2"][0] == pytest.approx(4e12)


def test_ssp_population_is_in_people():
    rows = [
        {
            "model": m,
            "scenario": sc,
            "variable": "Population",
            "unit": "million",
            "year": y,
            "value": v,
        }
        for m, sc in P.ar6db.MARKERS.values()
        for y, v in ((2020, 7600.0), (2100, 9000.0))
    ]
    assert P.ssp_population(rows, "ssp245", np.array([2060])) == [8.3e9]


def test_air_pollution_forcing_is_nil_at_the_pre_industrial_level_and_its_cloud_part_a_log():
    names = sorted({*P.ARI, *P.OZONE, *P.CLOUD})
    baseline = {s: 2.0 for s in names}
    at_baseline = {s: np.array([2.0]) for s in names}
    assert P.air_pollution_erf(parameters(), species(), at_baseline, baseline) == pytest.approx(0)
    only_sulphur = at_baseline | {"Sulfur": np.array([102.0])}
    erf = P.air_pollution_erf(parameters(), species(), only_sulphur, baseline)[0]
    cloud = np.log(1 + CLOUD_SHAPE * (102 + 4)) - np.log(1 + CLOUD_SHAPE * 6)
    assert erf == pytest.approx([-0.002 * 100 - 0.5 * cloud, -0.004 * 100 - 1.0 * cloud])


@pytest.mark.skipif(not (OUT / "people.json").exists(), reason="people.json not built")
def test_built_file_has_every_species_and_the_cooling_of_air_pollution():
    data = json.loads((OUT / "people.json").read_text())
    i = data["years"].index(2025)
    for ssp in P.SSPS:
        own = data["bySsp"][ssp]
        assert set(own) == {*P.SPECIES, "erf", "byCause"}
        assert 0 < own["byCause"]["fossilIndustry"]["co2"][i] < own["co2"][i]
        assert 30e12 < own["co2"][i] < 60e12
        assert own["erf"]["median"][i] < 0
        assert 7e9 < data["population"][ssp][i] < 9e9
