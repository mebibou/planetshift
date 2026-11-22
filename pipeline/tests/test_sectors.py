import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import climate, climate_fair, sectors

RANGE3 = {"median", "low", "high"}


def test_scaled_to_meets_the_target_in_the_year():
    years = np.arange(2020, 2025)
    scaled = sectors.scaled_to(np.array([1.0, 2, 4, 8, 16]), years, 2022, 2.0)
    assert scaled == pytest.approx([0.5, 1, 2, 4, 8])


def test_ramp_is_linear_then_flat():
    years = np.arange(2024, 2040)
    values = sectors.ramp({2024: 0.0, 2030: 6.0, 2035: 16.0}, years)
    assert values[years == 2027][0] == pytest.approx(3.0)
    assert values[years == 2033][0] == pytest.approx(12.0)
    assert values[years >= 2035] == pytest.approx(16.0)


def test_data_centres_add_only_the_growth_beyond_2024():
    years = np.arange(sectors.BASE_YEAR, 2101)
    twh = sectors.data_centres_twh(years)
    assert set(twh) == RANGE3
    assert all(v[years <= 2024] == pytest.approx(0.0) for v in twh.values())
    at = {k: v[years == 2030][0] for k, v in twh.items()}
    assert at["median"] == pytest.approx(945 - 415)
    assert at["low"] < at["median"] < at["high"]
    assert twh["median"][-1] == pytest.approx(1200 - 415)


def test_aviation_non_co2_is_lee_2021_per_kg_of_2018_co2():
    factor = sectors.aviation_non_co2()
    assert set(factor) == RANGE3
    assert factor["median"] == pytest.approx(66.6e-3 / 1034e9, rel=1e-3)
    assert factor["low"] < factor["median"] < factor["high"]


@pytest.mark.parametrize("kind", ["passenger", "freight"])
def test_ev_electricity_per_kg_is_a_plausible_ordered_range(kind):
    values = sectors.EV_KWH_PER_KG[kind]
    assert values["low"] < values["median"] < values["high"]
    assert 0.5 < values["low"] and values["high"] < 2.5


def test_grid_intensity_is_co2_over_generation_and_data_centres_follow_it():
    years = np.arange(sectors.BASE_YEAR, 2101)
    rows = [
        {
            "model": model,
            "scenario": scenario,
            "variable": variable,
            "unit": unit,
            "year": year,
            "value": value,
        }
        for model, scenario in sectors.ar6db.MARKERS.values()
        for variable, unit, values in (
            (sectors.ar6db.ELECTRICITY_CO2, "Mt CO2/yr", (14000.0, 7000.0, -1000.0)),
            (sectors.ar6db.ELECTRICITY_GENERATED, "EJ/yr", (100.0, 150.0, 200.0)),
        )
        for year, value in zip((2020, 2060, 2100), values, strict=True)
    ]
    kg, twh = sectors.electricity(rows, "ssp245", years)
    assert kg[0] == pytest.approx(sectors.INVENTORY["electricity"])
    assert twh[0] == pytest.approx(sectors.GENERATION_2023_TWH)
    assert kg[-1] == 0.0
    assert (kg >= 0).all()


def test_with_forcing_adds_one_step_at_the_closing_bound():
    natural = pd.DataFrame(
        {"Variable": ["Solar", "Volcanic"], "2035": [0.1, 0.0], "2036": [0.1, 0.0]}
    )
    setup = climate_fair.Setup(
        parameters=None,
        species_file=None,
        species=[],
        properties={},
        natural_forcing=natural,
        configs=[],
    )
    changed = sectors.with_forcing(setup, 2035, 2.0).natural_forcing
    assert changed["2035"].tolist() == [0.1, 0.0]
    assert changed["2036"].tolist() == pytest.approx([2.1, 0.0])
    assert natural["2036"].tolist() == [0.1, 0.0]


def test_permafrost_matches_the_contract_and_ar6():
    permafrost = climate.permafrost()
    assert set(permafrost) == {"kgCPerDegree", "ch4Share", "releaseYears", "source"}
    kg = permafrost["kgCPerDegree"]
    assert set(kg) == RANGE3
    assert kg["median"] == pytest.approx(18.28e12, rel=1e-3)
    assert kg["low"] < kg["median"] < kg["high"]
    assert permafrost["ch4Share"] == pytest.approx(0.0156, abs=5e-4)
    assert isinstance(permafrost["releaseYears"], int) and permafrost["releaseYears"] > 0
