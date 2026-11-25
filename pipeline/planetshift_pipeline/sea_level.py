"""Sea-level rise as a rate proportional to warming above a balance temperature, dH/dt = a·(T − T₀),
fitted to IPCC AR6 WG1 Table 9.9 against FaIR's median warming of each SSP."""

import numpy as np

# AR6 WG1 Chapter 9, Table 9.9: global mean sea-level rise in metres relative to 1995–2014, median
# and likely range (17th–83rd percentile), medium confidence.
TABLE_9_9 = {
    "ssp126": {
        2030: (0.09, 0.08, 0.12),
        2050: (0.19, 0.16, 0.25),
        2090: (0.39, 0.30, 0.54),
        2100: (0.44, 0.32, 0.62),
    },
    "ssp245": {
        2030: (0.09, 0.08, 0.12),
        2050: (0.20, 0.17, 0.26),
        2090: (0.48, 0.38, 0.65),
        2100: (0.56, 0.44, 0.76),
    },
    "ssp370": {
        2030: (0.10, 0.08, 0.12),
        2050: (0.22, 0.18, 0.27),
        2090: (0.56, 0.46, 0.74),
        2100: (0.68, 0.55, 0.90),
    },
}
BASE = (1995, 2014)
ENDS = {"median": 0, "low": 1, "high": 2}


def terms(years: np.ndarray, temperature: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """The two terms of the rise at each mid-year, each relative to its 1995–2014 mean: the
    warming summed over the years, and the years themselves, so H = a·first − a·T₀·second."""
    summed = np.cumsum(temperature) - temperature / 2
    elapsed = years - years[0] + 0.5
    base = (years >= BASE[0]) & (years <= BASE[1])
    return summed - summed[base].mean(), elapsed - elapsed[base].mean()


def fit(years: np.ndarray, temperatures: dict[str, np.ndarray], end: str) -> dict[str, float]:
    """a in m per year per °C and T₀ in °C, least squares over Table 9.9's years and SSPs at one
    end of its range: the median, or a likely end taken with the median warming."""
    rows, targets = [], []
    for ssp, levels in TABLE_9_9.items():
        warming, elapsed = terms(years, temperatures[ssp])
        for year, values in levels.items():
            i = int(np.searchsorted(years, year))
            rows.append((warming[i], -elapsed[i]))
            targets.append(values[ENDS[end]])
    (a, b), *_ = np.linalg.lstsq(np.array(rows), np.array(targets), rcond=None)
    return {"rate": float(a), "balance": float(b / a)}


def section(years: np.ndarray, temperatures: dict[str, np.ndarray]) -> dict:
    """climate.json's seaLevel: the rate in mm a year per °C and the balance temperature in °C,
    fitted to the median and to each likely end of Table 9.9."""
    fits = {end: fit(years, temperatures, end) for end in ENDS}
    return {
        "mmPerYearPerDegree": {end: round(f["rate"] * 1000, 3) for end, f in fits.items()},
        "balanceTemperature": {end: round(f["balance"], 3) for end, f in fits.items()},
    }
