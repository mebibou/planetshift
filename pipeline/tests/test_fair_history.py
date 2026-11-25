import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline.sources import fair_history as H


def test_joined_keeps_the_history_then_fades_the_gap_to_the_scenario():
    years = np.arange(2020, 2040)
    past = pd.Series({2020: 5.0, 2021: 5.0, 2022: 4.0})
    scenario = np.full(len(years), 1.0)
    out = H.joined(scenario, past, 1.0, years)
    assert out[:3].tolist() == [5.0, 5.0, 4.0]
    assert out[years == 2023][0] == pytest.approx(1.0 + 3.0 * (1 - 1 / H.FADE_YEARS))
    assert out[years == 2022 + H.FADE_YEARS][0] == pytest.approx(1.0)
    assert out[-1] == pytest.approx(1.0)


def test_joined_adds_the_gap_rather_than_scaling_so_a_scenario_crossing_zero_keeps_its_sign():
    years = np.arange(2022, 2060)
    past = pd.Series({2022: 2.0})
    scenario = np.linspace(1.0, -1.0, len(years))
    out = H.joined(scenario, past, 1.0, years)
    assert out[-1] == pytest.approx(-1.0)
    assert (np.diff(out[1:]) < 0).all()
