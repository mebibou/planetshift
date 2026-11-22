"""AGTP of CO₂, CH₄ and N₂O from the analytic expressions of IPCC AR6 WG1 Chapter 7 (7.SM.5).

Every constant is the one Chapter 7's own code used to compute Table 7.SM.7 (the
IPCC-WG1/Chapter-7 repository: `src/ar6/metrics/` and notebook
`335_chapter7_generate_metrics.ipynb`). Chapter 7 cites the sources of each: the multi-model
CO₂ impulse response (doi:10.5194/acp-13-2793-2013), the climate response of the AR6 two-layer
emulator, the SSP-era greenhouse gas forcing fits (doi:10.5194/gmd-13-3571-2020) with AR6's
rapid adjustments, CH₄'s ozone and stratospheric water vapour effects, N₂O's effect on CH₄,
and the climate-carbon feedback of doi:10.5194/esd-8-235-2017.
"""

import numpy as np
from fair.forcing.ghg import meinshausen2020

M_ATMOS = 5.1352e18
M_AIR = 28.97e-3
M_CO2 = 44.01e-3
M_C = 12.0e-3
M_CH4 = 16.043e-3
M_N2O = 44.0e-3

CO2_PPM, CH4_PPB, N2O_PPB = 409.9, 1866.3, 332.1

D = np.array([3.424102092311, 285.003477841911])
Q = np.array([0.443767728883447, 0.313998206372015])
CO2_A = np.array([0.2173, 0.2240, 0.2824, 0.2763])
CO2_TAU = np.array([np.inf, 394.4, 36.54, 4.304])
CO2_RA = 0.05

CH4_LIFETIME = 11.8
CH4_RA = -0.14
CH4_O3 = 1.4e-4
CH4_H2O = 4e-5

N2O_LIFETIME = 109.0
N2O_RA = 0.07
N2O_O3 = 5.5e-4
N2O_CH4 = -1.7

CC_A = np.array([0.6368, 0.3322, 0.0310])
CC_TAU = np.array([2.376, 30.14, 490.1])
CC_GAMMA = 3.015e12

STEPS_PER_YEAR = 10


def _forcing_change(index: int, step: float) -> float:
    """W m⁻² from raising one of (CO₂ ppm, CH₄ ppb, N₂O ppb) by `step` at AR6's 2019 levels."""
    base = np.array([[CO2_PPM, CH4_PPB, N2O_PPB]])
    raised = base.copy()
    raised[0, index] += step
    indices = [np.array([i == j for j in range(3)]) for i in range(3)]
    erf = meinshausen2020(
        raised, base, np.ones((1, 3)), np.zeros((1, 3)), *indices, np.zeros(3, dtype=bool)
    )
    return float(erf[0, index])


def _kg_per_ppb(molar_mass: float) -> float:
    return 1e-9 * (molar_mass / M_AIR) * M_ATMOS


def co2_forcing_per_kg() -> float:
    return _forcing_change(0, 1.0) * (1 + CO2_RA) / (1e3 * _kg_per_ppb(M_CO2))


def ch4_forcing_per_ppb() -> float:
    return _forcing_change(1, 1.0) * (1 + CH4_RA) + CH4_O3 + CH4_H2O


def ch4_forcing_per_kg() -> float:
    return ch4_forcing_per_ppb() / _kg_per_ppb(M_CH4)


def n2o_forcing_per_kg() -> float:
    n2o = _forcing_change(2, 1.0) * (1 + N2O_RA) + N2O_O3
    return (n2o + N2O_CH4 * ch4_forcing_per_ppb()) / _kg_per_ppb(M_N2O)


def _decay_response(t: np.ndarray, lifetime: float) -> np.ndarray:
    """Temperature per unit forcing-at-emission of a gas decaying with `lifetime` (years)."""
    if np.isinf(lifetime):
        return np.sum(Q[:, None] * (1 - np.exp(-t[None, :] / D[:, None])), axis=0)
    return np.sum(
        lifetime
        * Q[:, None]
        * (np.exp(-t[None, :] / lifetime) - np.exp(-t[None, :] / D[:, None]))
        / (lifetime - D[:, None]),
        axis=0,
    )


def agtp_co2_instant(t: np.ndarray) -> np.ndarray:
    """K per kg CO₂, `t` years after an instantaneous pulse."""
    per_box = [a * _decay_response(t, tau) for a, tau in zip(CO2_A, CO2_TAU, strict=True)]
    return co2_forcing_per_kg() * np.sum(per_box, axis=0)


def carbon_cycle_adjustment(t: np.ndarray, agtp: np.ndarray) -> np.ndarray:
    """Extra AGTP from the CO₂ the warming releases (doi:10.5194/esd-8-235-2017), regular grid."""
    step = t[1] - t[0]
    release = -np.sum((CC_A / CC_TAU)[:, None] * np.exp(-t[None, :] / CC_TAU[:, None]), axis=0)
    release[0] += CC_A.sum() / step
    co2_flux = np.convolve(agtp, release)[: len(t)] * CC_GAMMA * step
    return np.convolve(co2_flux, agtp_co2_instant(t))[: len(t)] * step * (M_CO2 / M_C)


def agtp_ch4_instant(t: np.ndarray) -> np.ndarray:
    own = ch4_forcing_per_kg() * _decay_response(t, CH4_LIFETIME)
    return own + carbon_cycle_adjustment(t, own)


def agtp_n2o_instant(t: np.ndarray) -> np.ndarray:
    own = n2o_forcing_per_kg() * _decay_response(t, N2O_LIFETIME)
    return own + carbon_cycle_adjustment(t, own)


def annualised(instant: np.ndarray, horizon: int) -> np.ndarray:
    """Annual-mean response in years 0..horizon to an emission spread evenly over year 0.

    `instant` is sampled at t = 0, 1/STEPS_PER_YEAR, … ; this matches how the FaIR curves
    and the browser's yearly convolution treat a year's emissions.
    """
    n = STEPS_PER_YEAR
    spread = np.convolve(instant, np.ones(n) / n)[: len(instant)]
    return np.array([spread[h * n + 1 : (h + 1) * n + 1].mean() for h in range(horizon + 1)])


def grid(horizon: int) -> np.ndarray:
    return np.arange((horizon + 2) * STEPS_PER_YEAR + 1) / STEPS_PER_YEAR


def agtp_curves(horizon: int) -> dict[str, np.ndarray]:
    """K per kg, annual means for horizons 0..horizon, by gas."""
    t = grid(horizon)
    return {
        "co2": annualised(agtp_co2_instant(t), horizon),
        "ch4": annualised(agtp_ch4_instant(t), horizon),
        "n2o": annualised(agtp_n2o_instant(t), horizon),
    }
