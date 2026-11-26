"""hfc.json: the HFCs the phase-down lever cuts. Each SSP's emissions of the eleven HFCs FaIR runs
(the calibration's history to 2022, then RCMIP, as fair.json has them), and each one's gas cycle
and forcing from FaIR's calibration, which the app needs to turn a cut of all of them into the
HFC-134a stream with the same forcing. Run alone with `uv run python -m planetshift_pipeline.hfc`;
explained in docs/methodology/en/hfc.md."""

import json
import logging
from pathlib import Path

import numpy as np

from . import climate_fair
from .cache import DEFAULT_CACHE
from .climate import DEFAULT_OUT, SCENARIO_END, SSPS, rounded
from .climate_scenarios import HFCS
from .fair_app import configured
from .sources import fair_history, rcmip

log = logging.getLogger(__name__)

FIRST_YEAR = 2020
#: The share of every HFC's emissions the lever removes at 100%: En-ROADS's deepest cut.
CUT = 0.9
#: The HFC the model's `hfc` gas is, which every other HFC is counted as.
CARRIER = "HFC-134a"
KG_PER_KT = 1e6
#: GWP100 of each HFC, IPCC AR6 WGI Table 7.SM.7, for the summary's CO₂e only.
GWP100 = {
    "HFC-125": 3740,
    "HFC-134a": 1530,
    "HFC-143a": 5810,
    "HFC-152a": 164,
    "HFC-227ea": 3600,
    "HFC-23": 14600,
    "HFC-236fa": 8690,
    "HFC-245fa": 962,
    "HFC-32": 771,
    "HFC-365mfc": 914,
    "HFC-4310mee": 1600,
}
#: Velders et al. (2022), Sect. 3.4–3.5: HFC emissions in 2050 without the Kigali Amendment
#: (V-2015 baseline) and with it (KA-2022), Gt CO₂e on WMO (2018) GWPs, HFC-23 left out.
VELDERS_2050 = {"baseline": (4.0, 5.3), "kigali": (0.9, 1.0)}
#: AR6's GWPs are about 10% above WMO (2018)'s (Velders et al. 2022, Sect. 2.5).
AR6_OVER_WMO = 1.1
SOURCE = (
    "RCMIP v5.1.0 SSP emissions of each HFC after FaIR calibration 1.4.1's history to 2022; "
    "lifetimes and radiative efficiencies from FaIR's calibration"
)


def cycle(lifetime: float, alpha: float) -> tuple[float, float]:
    """A one-box gas's yearly decay and the airborne kt a kt emitted adds by the year's end, as
    FaIR steps it with a fixed lifetime scaling `alpha`."""
    decay = float(np.exp(-1 / (alpha * lifetime)))
    return decay, (1 - decay) * alpha * lifetime


def gas_cycles(params: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    """Each HFC's `decay` and `relative` forcing: what a kg emitted adds to the forcing by the
    year's end, over what a kg of the carrier adds. `params` holds FaIR's `lifetime`, `iirf0`,
    `g0`, `g1`, `concentrationPerEmission` and `efficiency` of each."""

    def own(p: dict[str, float]) -> tuple[float, float]:
        decay, gain = cycle(p["lifetime"], p["g0"] * np.exp(p["iirf0"] / p["g1"]))
        return decay, gain * p["concentrationPerEmission"] * p["efficiency"]

    carrier = own(params[CARRIER])[1]
    return {s: {"decay": own(p)[0], "relative": own(p)[1] / carrier} for s, p in params.items()}


def fair_params(cache_dir: Path) -> dict[str, dict[str, float]]:
    """FaIR's gas-cycle and forcing parameters of each HFC, the same in every member."""
    setup = climate_fair.load_setup(cache_dir, 1)
    configs = configured(setup, FIRST_YEAR).species_configs
    keys = {
        "lifetime": "unperturbed_lifetime",
        "iirf0": "iirf_0",
        "g0": "g0",
        "g1": "g1",
        "concentrationPerEmission": "concentration_per_emission",
        "efficiency": "greenhouse_gas_radiative_efficiency",
    }

    def value(key: str, specie: str) -> float:
        values = configs[key].sel(specie=specie).to_numpy()
        return float(np.ravel(values)[0])

    return {s: {k: value(v, s) for k, v in keys.items()} for s in HFCS}


def emissions(cache_dir: Path, years: np.ndarray) -> dict[str, dict[str, np.ndarray]]:
    """kg a year of each HFC under each SSP on `years`, as fair.json has them."""
    df = rcmip.load(cache_dir)
    history = fair_history.load(cache_dir)
    fair_years = np.arange(climate_fair.START, SCENARIO_END + 1)
    return {
        ssp: {
            s: v[np.isin(fair_years, years)] * KG_PER_KT
            for s, v in rcmip.fair_emissions(df, ssp, list(HFCS), fair_years, history).items()
        }
        for ssp in SSPS
    }


def co2e(by_specie: dict[str, np.ndarray]) -> np.ndarray:
    """kg CO₂e a year of all the HFCs, AR6 GWP100."""
    return sum(GWP100[s] * v for s, v in by_specie.items())


def kigali_share(gt_2050: float) -> float:
    """How much of the gap between Velders et al. (2022)'s 2050 baseline and Kigali an SSP's
    HFCs (Gt CO₂e on AR6 GWPs, HFC-23 out) have closed: 0 on the baseline, 1 on Kigali."""
    baseline, kigali = (float(np.mean(v)) * AR6_OVER_WMO for v in VELDERS_2050.values())
    return (baseline - gt_2050) / (baseline - kigali)


def document(
    years: np.ndarray,
    by_ssp: dict[str, dict[str, np.ndarray]],
    params: dict[str, dict[str, float]],
) -> dict:
    return {
        "years": [int(y) for y in years],
        "cut": CUT,
        "carrier": CARRIER,
        "species": list(HFCS),
        "cycles": {
            s: {k: rounded([v], 8)[0] for k, v in c.items()} for s, c in gas_cycles(params).items()
        },
        "gwp100": {s: GWP100[s] for s in HFCS},
        "emissions": {
            ssp: {s: rounded(v) for s, v in by_specie.items()} for ssp, by_specie in by_ssp.items()
        },
        "source": SOURCE,
    }


def summary(years: np.ndarray, by_ssp: dict[str, dict[str, np.ndarray]]) -> list[str]:
    """Each SSP's HFCs in 2050, Gt CO₂e, and the share of Kigali they already hold."""
    at = int(np.flatnonzero(years == 2050)[0])

    def line(ssp: str, by_specie: dict[str, np.ndarray]) -> str:
        total = co2e(by_specie)[at] / 1e12
        no23 = total - GWP100["HFC-23"] * by_specie["HFC-23"][at] / 1e12
        return (
            f"{ssp} HFCs in 2050: {total:.2f} Gt CO2e, {kigali_share(no23):.0%} of the way from "
            "Velders et al. (2022)'s baseline to Kigali"
        )

    return [line(ssp, by_specie) for ssp, by_specie in by_ssp.items()]


def build(cache_dir: Path) -> dict:
    years = np.arange(FIRST_YEAR, SCENARIO_END + 1)
    by_ssp = emissions(cache_dir, years)
    for line in summary(years, by_ssp):
        log.info(line)
    return document(years, by_ssp, fair_params(cache_dir))


def build_hfc(cache_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "hfc.json").write_text(
        json.dumps(build(cache_dir), ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    build_hfc(DEFAULT_CACHE, DEFAULT_OUT)
