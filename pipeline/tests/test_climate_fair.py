import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import climate_fair


@pytest.fixture
def setup(tmp_path):
    parameters = tmp_path / "fair" / "parameters.csv"
    parameters.parent.mkdir()
    parameters.write_text("config\n1\n2\n")
    species = tmp_path / "fair" / "species.csv"
    species.write_text("CH4\n")
    return climate_fair.Setup(
        parameters=parameters,
        species_file=species,
        species=["CH4"],
        properties={"CH4": {"input_mode": "emissions"}},
        natural_forcing=pd.DataFrame({"Variable": ["Solar"], "1750": [0.0]}),
        configs=[1, 2],
    )


@pytest.fixture
def batches(monkeypatch):
    """A stand-in for FaIR that records each batch and returns its emissions as temperature."""
    seen: list[list[str]] = []

    def fake(setup, emissions, end, carbon_feedback):
        seen.append(list(emissions))
        values = np.stack([e["CH4"][: end - climate_fair.START] for e in emissions.values()], 1)
        out = np.repeat(values[:, :, None], len(setup.configs), axis=2)
        return out, out * 2, out * 3

    monkeypatch.setattr(climate_fair, "_run_batch", fake)
    monkeypatch.setenv(climate_fair.WORKERS_VARIABLE, "1")
    return seen


def scenario(value: float) -> dict[str, np.ndarray]:
    return {"CH4": np.full(5, value)}


def test_a_run_is_read_back_from_the_cache_and_only_new_scenarios_go_through_fair(setup, batches):
    first = climate_fair.run(setup, {"a": scenario(1), "b": scenario(2)}, 1755)
    second = climate_fair.run(setup, {"b": scenario(2), "c": scenario(3), "a": scenario(1)}, 1755)
    assert batches == [["a", "b"], ["c"]]
    assert second.scenarios == ["b", "c", "a"]
    assert second.temperature[:, 2, :] == pytest.approx(first.temperature[:, 0, :])
    assert second.co2[0, 1, 0] == 6.0
    assert second.temperature.shape == (5, 3, 2)


def test_the_cache_key_follows_the_emissions_the_end_the_feedback_and_the_forcing(setup):
    digest = climate_fair.setup_digest(setup)
    key = climate_fair.run_key(digest, scenario(1), ["CH4"], 1755, True)
    assert key == climate_fair.run_key(digest, scenario(1.0), ["CH4"], 1755, True)
    assert key != climate_fair.run_key(digest, scenario(1.5), ["CH4"], 1755, True)
    assert key != climate_fair.run_key(digest, scenario(1), ["CH4"], 1756, True)
    assert key != climate_fair.run_key(digest, scenario(1), ["CH4"], 1755, False)
    forced = setup.natural_forcing.assign(**{"1750": [0.1]})
    other = climate_fair.Setup(**{**setup.__dict__, "natural_forcing": forced})
    assert climate_fair.setup_digest(other) != digest


def test_workers_follow_the_environment_and_are_at_least_one(monkeypatch):
    monkeypatch.setenv(climate_fair.WORKERS_VARIABLE, "3")
    assert climate_fair.workers() == 3
    monkeypatch.setenv(climate_fair.WORKERS_VARIABLE, "0")
    assert climate_fair.workers() == 1
    monkeypatch.delenv(climate_fair.WORKERS_VARIABLE)
    assert 1 <= climate_fair.workers() <= 2


def test_a_batch_prescribes_the_land_use_forcing_for_all_its_scenarios_or_none():
    setup = climate_fair.Setup.__new__(climate_fair.Setup)
    object.__setattr__(setup, "properties", {climate_fair.LAND_USE: {"input_mode": "calculated"}})
    land = {climate_fair.LAND_USE: np.zeros(3)}
    assert climate_fair.prescribed_land(setup, {"a": {}})[climate_fair.LAND_USE]["input_mode"] == (
        "calculated"
    )
    both = climate_fair.prescribed_land(setup, {"a": land, "b": land})
    assert both[climate_fair.LAND_USE]["input_mode"] == "forcing"
    with pytest.raises(ValueError):
        climate_fair.prescribed_land(setup, {"a": land, "b": {}})


def test_the_run_key_holds_a_prescribed_land_use_forcing_and_no_other_key_changes():
    emissions = {"CH4": np.arange(5.0)}
    plain = climate_fair.run_key("d", emissions, ["CH4"], climate_fair.START + 5, True)
    with_land = emissions | {climate_fair.LAND_USE: np.full(5, -0.2)}
    other = emissions | {climate_fair.LAND_USE: np.zeros(5)}
    keys = [
        climate_fair.run_key("d", e, ["CH4"], climate_fair.START + 5, True)
        for e in (with_land, other)
    ]
    assert len({plain, *keys}) == 3


def test_annual_values_are_read_at_the_year_boundaries():
    bounds = np.array([climate_fair.START, climate_fair.START + 1.0, climate_fair.START + 2.0])
    assert climate_fair.at_bounds(np.array([0.0, 2.0]), bounds) == pytest.approx([0.0, 1.0, 2.0])
