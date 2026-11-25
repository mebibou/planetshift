import numpy as np
import pytest

from planetshift_pipeline import sea_level as S

YEARS = np.arange(1850, 2101)


def rise(temperature: np.ndarray, rate: float, balance: float) -> np.ndarray:
    warming, elapsed = S.terms(YEARS, temperature)
    return rate * warming - rate * balance * elapsed


def test_the_rise_is_relative_to_1995_2014():
    warming, elapsed = S.terms(YEARS, np.linspace(0, 3, len(YEARS)))
    base = (YEARS >= 1995) & (YEARS <= 2014)
    assert warming[base].mean() == pytest.approx(0)
    assert elapsed[base].mean() == pytest.approx(0)


def test_the_fit_finds_the_rate_and_balance_that_made_the_rise(monkeypatch):
    temperatures = {
        ssp: np.linspace(0, k, len(YEARS)) for ssp, k in zip(S.TABLE_9_9, (2, 3, 4), strict=True)
    }
    table = {
        ssp: {y: (rise(t, 0.004, 0.3)[y - 1850],) * 3 for y in (2030, 2050, 2090, 2100)}
        for ssp, t in temperatures.items()
    }
    monkeypatch.setattr(S, "TABLE_9_9", table)
    fitted = S.fit(YEARS, temperatures, "median")
    assert fitted["rate"] == pytest.approx(0.004)
    assert fitted["balance"] == pytest.approx(0.3)
