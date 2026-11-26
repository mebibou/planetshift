"""climate.json: observed temperature, AGTP curves, SSP temperatures, agriculture's emissions,
warming by cause and the permafrost feedback. Run alone with
`uv run python -m planetshift_pipeline.climate`."""

import argparse
import json
import logging
import time
from pathlib import Path

import numpy as np

from . import climate_ar6, climate_fair, sea_level
from .cache import DEFAULT_CACHE
from .climate_scenarios import (
    ATTRIBUTION_GASES,
    BURNING,
    CAUSES,
    GASES,
    GREENHOUSE,
    all_of_gas,
    burning_kg,
    cause_emissions,
    gas_causes,
    of_gas,
    removals,
    without,
)
from .sources import fair_history, ocean_ph, primap, rcmip, temperature
from .sources import sea_level as sea_level_obs

SOURCES = [
    {
        "id": "primap-hist",
        "name": "PRIMAP-hist national historical emissions",
        "version": primap.VERSION,
        "url": "https://doi.org/10.5281/zenodo.22876287",
        "licence": primap.LICENCE,
    },
    {
        "id": "rcmip",
        "name": "RCMIP emissions (SSP scenarios after 2022, joined to the calibration's history)",
        "version": rcmip.VERSION,
        "url": "https://doi.org/10.5281/zenodo.4589756",
        "licence": rcmip.LICENCE,
    },
    {
        "id": "fair",
        "name": "FaIR simple climate model, calibration 1.4.1",
        "version": "2.2.5",
        "url": "https://doi.org/10.5281/zenodo.10566813",
        "licence": "Apache 2.0 (model), CC BY 4.0 (calibration)",
    },
    {
        "id": "fair-history",
        "name": "FaIR calibration 1.4.1's emissions history, 1750-2022 (FaIR v2.2.5 example data)",
        "version": "2.2.5",
        "url": "https://github.com/OMS-NetZero/FAIR/tree/v2.2.5/examples/data/calibrated_constrained_ensemble",
        "licence": "CC BY 4.0",
    },
    {
        "id": "hadcrut5",
        "name": "HadCRUT5 global mean surface temperature",
        "version": temperature.HADCRUT_VERSION,
        "url": "https://www.metoffice.gov.uk/hadobs/hadcrut5/",
        "licence": temperature.HADCRUT_LICENCE,
    },
    {
        "id": "berkeley-earth",
        "name": "Berkeley Earth Land + Ocean global temperature",
        "version": "annual summary",
        "url": "https://berkeleyearth.org/data/",
        "licence": temperature.BERKELEY_LICENCE,
    },
    {
        "id": "nasa-gmsl",
        "name": "NASA global mean sea level, satellite altimetry (Willis, Hamlington, Fournier)",
        "version": sea_level_obs.NASA_VERSION,
        "url": sea_level_obs.NASA_DOI,
        "licence": sea_level_obs.LICENCE,
    },
    {
        "id": "cmems-ocean-ph",
        "name": "Copernicus Marine global mean surface ocean pH (LSCE reconstruction)",
        "version": ocean_ph.VERSION,
        "url": ocean_ph.DOI,
        "licence": ocean_ph.LICENCE,
    },
    {
        "id": "ar6-gmsl-tide-gauge",
        "name": "IPCC AR6 WG1 assessed global mean sea level, tide gauges (Box 9.1)",
        "version": "v20230523",
        "url": sea_level_obs.AR6_DOI,
        "licence": sea_level_obs.LICENCE,
    },
]

log = logging.getLogger(__name__)

SSPS = ("ssp126", "ssp245", "ssp370")
AGTP_SSP = "ssp245"
HORIZON = 200
PULSE_YEAR = 2035
PULSE_YEARS = (2025, 2035, 2045)
# Pulse sizes in FaIR's units (Gt CO₂, Mt CH₄, Mt N₂O, kt HFC-134a): small against annual
# emissions, far above rounding error. The ×10 sizes test linearity. `hfc` is HFC-134a, the
# stand-in for the food cold chain's refrigerants, which has an AGTP curve but no attribution.
PULSES = {"co2": 1.0, "ch4": 1.0, "n2o": 0.1, "hfc": 10.0}
PULSE_SPECIE = {"co2": "CO2 FFI", "ch4": "CH4", "n2o": "N2O", "hfc": "HFC-134a"}
KG_PER_UNIT = {"co2": 1e12, "ch4": 1e9, "n2o": 1e9, "hfc": 1e6}
AGTP_GASES = (*GASES, "hfc")
FIRST_YEAR = 1850
EMISSIONS_END = 2100
ATTRIBUTION_END = 2100
SCENARIO_END = 2100
LAST_HISTORY = 2023
FOOD_FUTURE_FROM = 2020
PERCENTILES = (5, 50, 95)
PERCENTILE_KEYS = ("median", "low", "high")
SIGNIFICANT = 4

DEFAULT_OUT = Path(__file__).resolve().parents[2] / "app" / "public" / "data"

# IPCC AR6 WG1 Chapter 5 (Box 5.1, Section 5.4.3, Figure 5.29): permafrost carbon released by 2100
# per °C of global warming, 18 (3.1–41) PgC as CO₂, and a methane feedback of 2.8 (0.7–7.3) PgCeq.
# PgCeq is the CO₂ carbon with the same effect; at GWP100 a kg of carbon emitted as CH₄ counts as
# about 9.8 kg of CO₂ carbon, so the methane released is about 0.28 (0.07–0.74) PgC. A degree's
# release is spread over RELEASE_YEARS, so the release by a year is about the amount for the
# warming a decade earlier (see docs/methodology/en/climate.md).
KG_PER_PGC = 1e12
CH4_GWP100 = 27.0
CH4_PER_C = 16.043 / 12.011
CO2_PER_C = 44.009 / 12.011
CEQ_PER_CH4_C = CH4_GWP100 * CH4_PER_C / CO2_PER_C
PERMAFROST_CO2_PGC = {"median": 18.0, "low": 3.1, "high": 41.0}
PERMAFROST_CH4_PGCEQ = {"median": 2.8, "low": 0.7, "high": 7.3}
PERMAFROST_CH4_PGC = {k: v / CEQ_PER_CH4_C for k, v in PERMAFROST_CH4_PGCEQ.items()}
PERMAFROST_RELEASE_YEARS = 20
PERMAFROST_SOURCE = (
    "IPCC AR6 WG1 Chapter 5, Box 5.1, Section 5.4.3 and Figure 5.29 (doi:10.1017/9781009157896.007)"
)


# The IMO's 2020 fuel sulphur limit, which FaIR's response to the world's SO₂ barely sees: its
# ERF in W/m², Gettelman et al. (2024)'s median and Forster et al. (2025)'s review range.
SHIPPING_SULPHUR_YEAR = 2020
SHIPPING_SULPHUR_ERF = {"median": 0.12, "low": 0.08, "high": 0.14}
SHIPPING_CO2_RCMIP = "Emissions|CO2|MAGICC Fossil and Industrial|International Shipping"
SHIPPING_SULPHUR_SOURCE = (
    "Gettelman et al. 2024 (doi:10.1029/2024GL109077), the range from Forster et al. 2025 "
    "(doi:10.5194/essd-17-2641-2025); scaled by each SSP's international shipping CO₂ (RCMIP)"
)


def rounded(values: np.ndarray, digits: int = SIGNIFICANT) -> list[float]:
    return [float(f"{v:.{digits}g}") for v in np.asarray(values, dtype=float)]


def anomaly(years: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Relative to the 1850–1900 mean, along the first axis."""
    window = (years >= 1850) & (years <= 1900)
    return values - values[window].mean(axis=0)


def band(values: np.ndarray) -> dict[str, np.ndarray]:
    """5th, 50th and 95th percentiles across members (last axis)."""
    p05, median, p95 = np.percentile(values, PERCENTILES, axis=-1)
    return {"median": median, "p05": p05, "p95": p95}


def band_series(years: np.ndarray, values: dict[str, np.ndarray]) -> dict:
    return {"years": [int(y) for y in years], **{k: rounded(v) for k, v in values.items()}}


def series(years: np.ndarray, values: np.ndarray) -> dict:
    return {"years": [int(y) for y in years], "values": rounded(values)}


# AGTP from FaIR pulses


def pulsed(base: dict[str, np.ndarray], gas: str, year: int, size: float) -> dict[str, np.ndarray]:
    specie = PULSE_SPECIE[gas]
    index = year - climate_fair.START
    values = base[specie].copy()
    values[index] += size
    return {**base, specie: values}


def pulse_key(gas: str, year: int, scale: float) -> str:
    return f"{gas}-{year}-x{scale:g}"


def pulse_runs(
    setup: climate_fair.Setup,
    base: dict[str, np.ndarray],
    pulses: list[tuple[str, int, float]],
    horizon: int,
) -> dict[str, np.ndarray]:
    """AGTP (K/kg) per horizon and member for each (gas, year, scale) pulse on `base`."""
    end = max(year for _, year, _ in pulses) + horizon + 1
    scenarios = {"base": base} | {
        pulse_key(gas, year, scale): pulsed(base, gas, year, PULSES[gas] * scale)
        for gas, year, scale in pulses
    }
    result = climate_fair.run(setup, scenarios, end)
    reference = result.temperature[:, 0, :]

    def agtp(i: int, gas: str, year: int, scale: float) -> np.ndarray:
        start = year - climate_fair.START
        change = (
            result.temperature[start : start + horizon + 1, i, :]
            - reference[start : start + horizon + 1]
        )
        return change / (PULSES[gas] * scale * KG_PER_UNIT[gas])

    return {
        pulse_key(gas, year, scale): agtp(i + 1, gas, year, scale)
        for i, (gas, year, scale) in enumerate(pulses)
    }


def co2_ppm_per_kg(
    setup: climate_fair.Setup, base: dict[str, np.ndarray], horizon: int
) -> np.ndarray:
    """ppm of CO₂ in the air per kg of CO₂ emitted, (horizon, member), from the same pulse as the
    AGTP: what turns a change in emissions into a change in concentration, for ocean pH."""
    pulse = pulsed(base, "co2", PULSE_YEAR, PULSES["co2"])
    result = climate_fair.run(
        setup, {"base": base, pulse_key("co2", PULSE_YEAR, 1.0): pulse}, PULSE_YEAR + horizon + 1
    )
    start = PULSE_YEAR - climate_fair.START
    window = slice(start, start + horizon + 1)
    return (result.co2[window, 1, :] - result.co2[window, 0, :]) / (
        PULSES["co2"] * KG_PER_UNIT["co2"]
    )


def scenario_co2(
    setup: climate_fair.Setup, emissions: dict[str, dict[str, np.ndarray]], end: int
) -> dict[str, np.ndarray]:
    """Each scenario's CO₂ concentration, ppm, (year, member)."""
    result = climate_fair.run(setup, emissions, end)
    return {name: result.co2[:, i, :] for i, name in enumerate(result.scenarios)}


def year_spread(pulses: dict[str, np.ndarray], gas: str) -> float:
    main = pulses[pulse_key(gas, PULSE_YEAR, 1.0)]
    return max(relative_spread(pulses[pulse_key(gas, y, 1.0)], main) for y in PULSE_YEARS)


def pulse_plan(diagnostics: bool = False) -> list[tuple[str, int, float]]:
    """The pulse each AGTP curve is read from, and with `diagnostics` those that check it does not
    depend on the year or the size of the pulse."""
    main = [(gas, PULSE_YEAR, 1.0) for gas in AGTP_GASES]
    checks = [
        (gas, year, 1.0) for gas in AGTP_GASES for year in PULSE_YEARS if year != PULSE_YEAR
    ] + [(gas, PULSE_YEAR, 10.0) for gas in AGTP_GASES]
    return main + (checks if diagnostics else [])


def relative_spread(a: np.ndarray, b: np.ndarray, start: int = 1) -> float:
    """Largest |a/b - 1| over horizons from `start`, on medians."""
    return float(np.max(np.abs(np.median(a, axis=-1)[start:] / np.median(b, axis=-1)[start:] - 1)))


# Attribution


def combined(
    taken: dict[str, dict[str, np.ndarray]], causes: tuple[str, ...]
) -> dict[str, np.ndarray]:
    return {
        specie: sum(taken[c].get(specie, 0) for c in causes)
        for specie in {s for c in causes for s in taken[c]}
    }


def gas_key(cause: str, gas: str) -> str:
    return f"{cause}:{gas}"


ALL_SOURCES = "all"
#: The full run without the land-use forcing, and the cause it measures.
NO_LAND_FORCING = "noLandForcing"
LAND_ALBEDO = "landAlbedo"


def gas_removals(
    taken: dict[str, dict[str, np.ndarray]],
    emissions: dict[str, np.ndarray],
    baseline: dict[str, float],
    burning: np.ndarray | None = None,
) -> tuple[dict[str, dict[str, np.ndarray]], dict[str, str]]:
    """What to take out for each gas: every source of it, and each greenhouse cause's part of it.
    A cause that emits that gas alone is its own run already, given as an alias."""
    alone = {
        gas_key(c, g): c
        for g in ATTRIBUTION_GASES
        for c in gas_causes(taken, g)
        if of_gas(taken[c], g).keys() == taken[c].keys()
    }
    parts = {
        gas_key(c, g): of_gas(taken[c], g)
        for g in ATTRIBUTION_GASES
        for c in gas_causes(taken, g)
        if gas_key(c, g) not in alone
    }
    totals = {
        gas_key(ALL_SOURCES, g): all_of_gas(emissions, baseline, g) for g in ATTRIBUTION_GASES
    }
    fires = {} if burning is None else {gas_key(BURNING, "ch4"): {"CH4": burning}}
    return parts | totals | fires, alone


def attribution_runs(
    setup: climate_fair.Setup,
    emissions: dict[str, np.ndarray],
    agriculture: dict[str, np.ndarray],
    fossil: dict[str, np.ndarray],
    end: int,
    diagnostics: bool = False,
    waste: dict[str, np.ndarray] | None = None,
    burning: np.ndarray | None = None,
) -> dict[str, np.ndarray]:
    """Temperature (year, member) with all emissions, each cause removed, and for each gas, all of
    it and each cause's part of it removed; with `diagnostics`, also the three greenhouse causes
    removed together and agriculture and land use removed from FOOD_FUTURE_FROM on (for the
    food-consumption study)."""
    baseline = climate_fair.baseline_emissions(setup)
    nothing = {g: np.zeros(len(emissions["CH4"])) for g in GASES}
    taken = removals(emissions, agriculture, fossil, baseline, nothing if waste is None else waste)
    years = np.arange(climate_fair.START, climate_fair.START + len(emissions["CH4"]))
    land = combined(taken, ("agriculture", "landUse"))
    later = {k: v * (years >= FOOD_FUTURE_FROM) for k, v in land.items()}
    by_gas, alone = gas_removals(taken, emissions, baseline, burning)
    land = emissions.get(climate_fair.LAND_USE)
    flat = {} if land is None else {NO_LAND_FORCING: emissions | {climate_fair.LAND_USE: 0 * land}}
    scenarios = (
        {"full": emissions}
        | flat
        | {cause: without(emissions, taken[cause]) for cause in CAUSES}
        | {name: without(emissions, removed) for name, removed in by_gas.items()}
        | (
            {
                "none": without(emissions, combined(taken, GREENHOUSE)),
                "food": without(emissions, later),
            }
            if diagnostics
            else {}
        )
    )
    result = climate_fair.run(setup, scenarios, end)
    runs = {name: result.temperature[:, i, :] for i, name in enumerate(result.scenarios)}
    return runs | {name: runs[cause] for name, cause in alone.items()}


def contributions(
    years: np.ndarray, runs: dict[str, np.ndarray], natural: np.ndarray
) -> dict[str, np.ndarray]:
    """Per member, °C vs 1850–1900: total, each cause (full − without it), the natural factors
    (the run with natural forcing only), and other: what is left, the other human emissions and
    the causes' non-additivity."""
    total = anomaly(years, runs["full"])
    causes = {c: anomaly(years, runs["full"] - runs[c]) for c in CAUSES}
    causes = causes | {LAND_ALBEDO: land_albedo(years, runs)}
    other = total - sum(causes.values()) - natural
    return {"total": total, **causes, "natural": natural, "other": other}


def land_albedo(years: np.ndarray, runs: dict[str, np.ndarray]) -> np.ndarray:
    """Per member, °C: land use's prescribed albedo forcing (and irrigation, a cooling), the full
    run less the same run without it; zero without that run."""
    return (
        anomaly(years, runs["full"] - runs[NO_LAND_FORCING])
        if NO_LAND_FORCING in runs
        else np.zeros_like(runs["full"])
    )


def gas_contributions(
    years: np.ndarray, runs: dict[str, np.ndarray]
) -> dict[str, dict[str, np.ndarray]]:
    """Per gas and member, °C vs 1850–1900: the gas's total (full − every source of it), each
    greenhouse cause's part (full − that cause's part of the gas), and other: the gas's other
    sources and the causes' non-additivity. Land use's albedo change is prescribed, so taking
    its CO₂ out leaves it in place."""

    def one(gas: str) -> dict[str, np.ndarray]:
        total = anomaly(years, runs["full"] - runs[gas_key(ALL_SOURCES, gas)])
        causes = {
            c: anomaly(years, runs["full"] - runs[gas_key(c, gas)])
            for c in (*GREENHOUSE, BURNING)
            if gas_key(c, gas) in runs
        }
        return {"total": total, **causes, "other": total - sum(causes.values())}

    return {gas: one(gas) for gas in ATTRIBUTION_GASES}


def additivity_gap(years: np.ndarray, runs: dict[str, np.ndarray]) -> np.ndarray:
    """Median of (full − the three greenhouse causes removed) − sum of their single removals, °C."""
    joint = anomaly(years, runs["full"] - runs["none"])
    single = sum(anomaly(years, runs["full"] - runs[c]) for c in GREENHOUSE)
    return np.median(joint - single, axis=-1)


def future_food_warming(years: np.ndarray, runs: dict[str, np.ndarray]) -> np.ndarray:
    """Per member, °C: warming from agriculture's and land use's emissions from FOOD_FUTURE_FROM."""
    return runs["full"] - runs["food"]


def preindustrial_offset(years: np.ndarray, runs: dict[str, np.ndarray], cause: str) -> float:
    """Median warming a cause had already caused, on average over 1850–1900, °C."""
    window = (years >= 1850) & (years <= 1900)
    return float(np.median((runs["full"] - runs[cause])[window].mean(axis=0)))


def attribution_bands(
    by_cause: dict[str, np.ndarray], named: tuple[str, ...] = (*CAUSES, LAND_ALBEDO, "natural")
) -> dict[str, dict[str, np.ndarray]]:
    """Bands per cause, with 'other''s median set so the medians add up to the total's."""
    bands = {c: band(by_cause[c]) for c in (*named, "other")}
    total_median = np.median(by_cause["total"], axis=-1)
    other_median = total_median - sum(bands[c]["median"] for c in named)
    return {**bands, "other": {**bands["other"], "median": other_median}}


def permafrost() -> dict:
    """Climate.permafrost: kg C per °C (CO₂ and CH₄ together), the CH₄ share, the release years."""
    parts = (PERMAFROST_CO2_PGC, PERMAFROST_CH4_PGC)
    total = {k: sum(p[k] for p in parts) * KG_PER_PGC for k in PERCENTILE_KEYS}
    share = PERMAFROST_CH4_PGC["median"] / sum(p["median"] for p in parts)
    return {
        "kgCPerDegree": dict(zip(total, rounded(list(total.values())), strict=True)),
        "ch4Share": rounded([share])[0],
        "releaseYears": PERMAFROST_RELEASE_YEARS,
        "source": PERMAFROST_SOURCE,
    }


def shipping_sulphur(rcmip_df) -> dict:
    """Climate.shippingSulphur2020: the forcing the 2020 sulphur rule adds, W/m², by SSP, every
    five years from 2020, following each scenario's shipping CO₂ from its 2020 level."""
    years = np.arange(SHIPPING_SULPHUR_YEAR, SCENARIO_END + 1, 5)

    def one(ssp: str) -> dict[str, list[float]]:
        co2 = rcmip.series(rcmip_df, ssp, SHIPPING_CO2_RCMIP, years)
        return {k: rounded(v * co2 / co2[0]) for k, v in SHIPPING_SULPHUR_ERF.items()}

    return {
        "years": [int(y) for y in years],
        "erf": {ssp: one(ssp) for ssp in SSPS},
        "source": SHIPPING_SULPHUR_SOURCE,
    }


def natural_only(setup: climate_fair.Setup, years: np.ndarray) -> np.ndarray:
    """Per member, °C vs 1850–1900, with every human emission held at its 1750 level, so only
    the solar and volcanic forcing change the climate."""
    held = {s: np.full(len(years), v) for s, v in climate_fair.baseline_emissions(setup).items()}
    result = climate_fair.run(setup, {"natural": held}, int(years[-1]) + 1)
    return anomaly(years, result.temperature[:, 0, :])


# Assembly


def attribution_document(
    years: np.ndarray,
    keep: np.ndarray,
    parts: dict[str, np.ndarray],
    named: tuple[str, ...] | None = None,
) -> dict[str, dict]:
    """Each named part's band series on the kept years, and other's, whose median makes them add
    up to the total's; `named` defaults to every part but the total and other."""
    names = named or tuple(k for k in parts if k not in ("total", "other"))
    return {
        name: band_series(years[keep], {k: v[keep] for k, v in values.items()})
        for name, values in attribution_bands(parts, names).items()
    }


def observed(cache_dir: Path) -> dict:
    return {
        name: series(*loader(cache_dir))
        for name, loader in (("hadcrut5", temperature.hadcrut5), ("berkeley", temperature.berkeley))
    }


def observed_sea_level(cache_dir: Path) -> dict:
    years, values, base_above_1900 = sea_level_obs.observed(cache_dir)
    return {"observed": series(years, values), "baseAbove1900": round(base_above_1900, 4)}


def agtp_section(pulses: dict[str, np.ndarray]) -> dict:
    fair = {
        gas: {k: rounded(v) for k, v in band(pulses[pulse_key(gas, PULSE_YEAR, 1.0)]).items()}
        for gas in AGTP_GASES
    }
    ar6 = {
        gas: {k: rounded(curve) for k in ("median", "p05", "p95")}
        for gas, curve in climate_ar6.agtp_curves(HORIZON).items()
    }
    return {"fair": fair, "ar6": ar6}


def build(
    cache_dir: Path, members: int | None = None, diagnostics: bool = False
) -> tuple[dict, dict]:
    """The climate.json document and what the log, tests and docs read; `diagnostics` adds the
    runs only they read."""
    setup = climate_fair.load_setup(cache_dir, members)
    rcmip_df = rcmip.load(cache_dir)
    forcing = rcmip.load_forcing(cache_dir)
    primap_df = primap.load(cache_dir)
    fair_years = np.arange(climate_fair.START, max(PULSE_YEARS) + HORIZON + 1)
    history = fair_history.load(cache_dir)
    by_ssp = {
        ssp: rcmip.fair_emissions(rcmip_df, ssp, setup.emitted, fair_years, history) for ssp in SSPS
    }

    pulses = pulse_runs(setup, by_ssp[AGTP_SSP], pulse_plan(diagnostics), HORIZON)

    years = np.arange(climate_fair.START, SCENARIO_END + 1)
    sector = {
        ssp: {
            cause: cause_emissions(primap_df, rcmip_df, ssp, cause, years, LAST_HISTORY)
            for cause in ("agriculture", "fossilIndustry", "waste")
        }
        for ssp in SSPS
    }
    full = {
        ssp: {k: v[: len(years)] for k, v in by_ssp[ssp].items()}
        | {climate_fair.LAND_USE: rcmip.albedo_forcing(forcing, ssp, years)}
        for ssp in SSPS
    }
    runs = {
        ssp: attribution_runs(
            setup,
            full[ssp],
            sector[ssp]["agriculture"],
            sector[ssp]["fossilIndustry"],
            SCENARIO_END + 1,
            diagnostics,
            sector[ssp]["waste"],
            burning_kg(rcmip_df, ssp, years),
        )
        for ssp in SSPS
    }
    natural = natural_only(setup, years)
    by_cause = {ssp: contributions(years, runs[ssp], natural) for ssp in SSPS}
    by_gas = {ssp: gas_contributions(years, runs[ssp]) for ssp in SSPS}

    shown = years >= FIRST_YEAR
    to_end = shown & (years <= ATTRIBUTION_END)
    emitted = shown & (years <= EMISSIONS_END)
    document = {
        "observed": observed(cache_dir),
        "agtp": agtp_section(pulses),
        "scenarioTemperature": {
            ssp: band_series(years[shown], band(by_cause[ssp]["total"][shown])) for ssp in SSPS
        },
        "agricultureEmissions": {
            ssp: {g: series(years[emitted], sector[ssp]["agriculture"][g][emitted]) for g in GASES}
            for ssp in SSPS
        },
        "attribution": {
            ssp: attribution_document(
                years, to_end, by_cause[ssp], (*CAUSES, LAND_ALBEDO, "natural")
            )
            for ssp in SSPS
        },
        "attributionByGas": {
            ssp: {gas: attribution_document(years, to_end, parts) for gas, parts in gases.items()}
            for ssp, gases in by_gas.items()
        },
        "naturalOnly": band_series(years[shown], band(natural[shown])),
        "permafrost": permafrost(),
        "shippingSulphur2020": shipping_sulphur(rcmip_df),
        "co2": {
            ssp: band_series(years[shown], band(co2[shown]))
            for ssp, co2 in scenario_co2(setup, full, SCENARIO_END + 1).items()
        },
        "oceanPhObserved": series(*ocean_ph.observed(cache_dir)),
        "co2PpmPerKg": {
            k: rounded(v) for k, v in band(co2_ppm_per_kg(setup, by_ssp[AGTP_SSP], HORIZON)).items()
        },
        "seaLevel": {
            **sea_level.section(
                years[shown], {ssp: band(by_cause[ssp]["total"][shown])["median"] for ssp in SSPS}
            ),
            **observed_sea_level(cache_dir),
        },
    }
    diagnostics = {
        "years": years,
        "by_cause": by_cause,
        "by_gas": by_gas,
        "pulses": pulses,
        **(
            {
                "additivity_gap": {ssp: additivity_gap(years, runs[ssp]) for ssp in SSPS},
                "future_food": {ssp: future_food_warming(years, runs[ssp]) for ssp in SSPS},
            }
            if diagnostics
            else {}
        ),
        "preindustrial_offset": {
            ssp: {c: preindustrial_offset(years, runs[ssp], c) for c in CAUSES} for ssp in SSPS
        },
        "agriculture": {ssp: sector[ssp]["agriculture"] for ssp in SSPS},
        "natural": natural,
        "members": len(setup.configs),
    }
    return document, diagnostics


def window(years: np.ndarray, values: np.ndarray, first: int, last: int) -> str:
    """The median and 5–95% range of the members' mean over `first`..`last`."""
    mean = values[(years >= first) & (years <= last)].mean(axis=0)
    p05, p50, p95 = np.percentile(mean, PERCENTILES)
    return f"{p50:.3f} ({p05:.3f}–{p95:.3f})"


def horizons(years: np.ndarray, values: np.ndarray, label: str = "") -> str:
    """A part's warming over 2015–2024, in 2050 and in 2100."""
    return (
        f"2015–2024{label} {window(years, values, 2015, 2024)}, "
        f"2050 {window(years, values, 2050, 2050)}, 2100 {window(years, values, 2100, 2100)}"
    )


def diagnostic_lines(diagnostics: dict, ssp: str) -> list[str]:
    """What only a `--diagnostics` build logs: food emitted from 2020 and the additivity gap."""
    years = diagnostics["years"]
    gap = diagnostics["additivity_gap"][ssp]
    food = diagnostics["future_food"][ssp][years == 2100][0]
    return [
        f"  agriculture + land use emitted from {FOOD_FUTURE_FROM}, warming in 2100: "
        f"{np.median(food):.3f} ({np.percentile(food, 5):.3f}–{np.percentile(food, 95):.3f})",
        f"  additivity gap 2024 {gap[years == 2024][0]:.3f}, 2050 {gap[years == 2050][0]:.3f}",
    ]


def ssp_lines(diagnostics: dict, ssp: str) -> list[str]:
    """An SSP's total, each cause, each gas by cause, and the diagnostics when they were run."""
    years = diagnostics["years"]
    by_cause = diagnostics["by_cause"][ssp]
    return [
        f"{ssp}: {horizons(years, by_cause['total'], ' total')}",
        *(
            f"  {cause}: {horizons(years, by_cause[cause])}"
            for cause in (*CAUSES, "natural", "other")
        ),
        *(
            f"  {gas}: "
            + ", ".join(
                f"{name} 2015–2024 {window(years, values, 2015, 2024)} "
                f"2100 {window(years, values, 2100, 2100)}"
                for name, values in parts.items()
            )
            for gas, parts in diagnostics["by_gas"][ssp].items()
        ),
        f"  1850–1900 offsets {diagnostics['preindustrial_offset'][ssp]}",
        *(diagnostic_lines(diagnostics, ssp) if "future_food" in diagnostics else []),
    ]


def agtp_line(document: dict, pulses: dict, gas: str) -> str:
    """A gas's AGTP from FaIR against AR6's, and the pulse checks when they were run."""
    main = pulses[pulse_key(gas, PULSE_YEAR, 1.0)]
    med = np.median(main, axis=-1)
    ar6 = document["agtp"]["ar6"][gas]["median"]
    large = pulses.get(pulse_key(gas, PULSE_YEAR, 10.0))
    checks = (
        f"; linearity {relative_spread(large, main):.4f}; years {year_spread(pulses, gas):.4f}"
        if large is not None
        else ""
    )
    return (
        f"AGTP {gas}: fair h20 {med[20]:.3e} h50 {med[50]:.3e} h100 {med[100]:.3e}; "
        f"ar6 h20 {ar6[20]:.3e} h50 {ar6[50]:.3e} h100 {ar6[100]:.3e}; "
        f"peak h{int(np.argmax(med))}{checks}"
    )


def summary(document: dict, diagnostics: dict) -> list[str]:
    years = diagnostics["years"]
    natural = diagnostics["natural"][(years >= 2010) & (years <= 2019)].mean(axis=0)
    return [
        f"members: {diagnostics['members']}",
        f"natural factors only, 2010–2019: {np.median(natural):.3f} "
        f"({np.percentile(natural, 5):.3f}–{np.percentile(natural, 95):.3f})",
        *(line for ssp in SSPS for line in ssp_lines(diagnostics, ssp)),
        *(agtp_line(document, diagnostics["pulses"], gas) for gas in AGTP_GASES),
    ]


def build_climate(cache_dir: Path, out_dir: Path, diagnostics: bool = False) -> None:
    started = time.monotonic()
    document, checks = build(cache_dir, diagnostics=diagnostics)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "climate.json").write_text(
        json.dumps(document, separators=(",", ":"), allow_nan=False)
    )
    for line in summary(document, checks):
        log.info(line)
    log.info("climate.json built in %.0f s", time.monotonic() - started)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--diagnostics",
        action="store_true",
        help="also run what only the log reads: the additivity gap, the warming of food emitted "
        "from 2020 and the AGTP pulses' checks",
    )
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build_climate(DEFAULT_CACHE, DEFAULT_OUT, parser.parse_args().diagnostics)
