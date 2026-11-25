"""sectors.json: fossil CO₂ of road transport, aviation, shipping, electricity and data centres
under each SSP, the grid's carbon intensity, the electricity electric vehicles need, aviation's
non-CO₂ forcing and FaIR's temperature response to a year of forcing. Run alone with
`uv run python -m planetshift_pipeline.sectors`; explained in docs/methodology/en/sectors.md."""

import dataclasses
import json
import logging
import time
from pathlib import Path

import numpy as np
import pandas as pd

from . import climate_fair
from .cache import DEFAULT_CACHE
from .climate import AGTP_SSP, DEFAULT_OUT, HORIZON, PULSE_YEAR, SSPS, band, rounded
from .coemissions import FUELS as FOSSIL_FUELS
from .coemissions import ROAD as ROAD_SECTORS
from .sources import ar6db, ceds, fair_history, rcmip

log = logging.getLogger(__name__)

SECTORS = ("roadPassenger", "roadFreight", "aviation", "shipping", "electricity", "dataCentres")
BASE_YEAR = 2023
END_YEAR = 2100
KG_PER_MT = 1e9
KG_PER_GT = 1e12
KWH_PER_TWH = 1e9
TWH_PER_EJ = 1e6 / 3.6

# Recent inventory (2023, kg CO₂/yr) each sector's SSP trajectory is scaled to meet.
# Road: CEDS's fossil CO₂ of road transport in its last year, 2022 (`road_kg`), carried to 2023
# by each SSP's transport shape; split 60/40 between passengers (cars, two- and three-wheelers,
# buses) and freight (trucks and vans) after the IEA's tracking of cars and vans and of trucks and
# buses. Aviation (domestic and international): IEA tracking, "almost 950 Mt". Shipping
# (international and domestic navigation): IEA tracking, about 0.85 Gt. Electricity: Ember Global
# Electricity Review 2024, 14,153 Mt for 29,471 TWh of demand, the basis of Ember's 480 g/kWh.
PASSENGER_SHARE = 0.6
ROAD_SHARES = {"roadPassenger": PASSENGER_SHARE, "roadFreight": 1 - PASSENGER_SHARE}
INVENTORY = {
    "aviation": 0.95 * KG_PER_GT,
    "shipping": 0.85 * KG_PER_GT,
    "electricity": 14_153 * KG_PER_MT,
}
GENERATION_2023_TWH = 29_471

# The RCMIP (CMIP6 harmonised) variable whose shape each transport sector follows.
RCMIP_SHAPE = {
    "roadPassenger": "Emissions|CO2|MAGICC Fossil and Industrial|Transportation Sector",
    "roadFreight": "Emissions|CO2|MAGICC Fossil and Industrial|Transportation Sector",
    "aviation": "Emissions|CO2|MAGICC Fossil and Industrial|Aircraft",
    "shipping": "Emissions|CO2|MAGICC Fossil and Industrial|International Shipping",
}

# Electricity per kg of tailpipe CO₂ avoided, kWh/kg: EV use at the plug ÷ the vehicle it replaces'
# CO₂ per km (petrol 2.33 kg/L, diesel 2.63 kg/L: UK conversion factors 2023, 100% mineral
# fuel). Passenger: 0.18 (0.15–0.22) kWh/km against 7 (9–5.5) L of petrol per 100 km.
# Freight: a 40 t battery truck at 1.1 kWh/km (1.06 for the eActros 600 tractor and 1.15 for a
# 38 t Scania in German fleets: Oeko-Institut 2025, Real-world data analysis of battery electric
# trucks operating in Germany) against 33 L of diesel per 100 km, with vans (0.25 kWh/km against
# 9 L/100 km) at the low end.
PETROL_KG_PER_L = 2.33
DIESEL_KG_PER_L = 2.63
EV_KWH_PER_KG = {
    "passenger": {
        "median": 0.18 / (0.07 * PETROL_KG_PER_L),
        "low": 0.15 / (0.09 * PETROL_KG_PER_L),
        "high": 0.22 / (0.055 * PETROL_KG_PER_L),
    },
    "freight": {
        "median": 1.1 / (0.33 * DIESEL_KG_PER_L),
        "low": 0.25 / (0.09 * DIESEL_KG_PER_L),
        "high": 1.6 / (0.30 * DIESEL_KG_PER_L),
    },
}

# IEA, Energy and AI (2025): world data-centre electricity, TWh. 415 in 2024; base case 945 in
# 2030 and about 1,200 in 2035; Headwinds about 700 and Lift-Off about 1,700 in 2035 (executive
# summary). The report gives nothing after 2035, where demand is held flat, an assumption. Only
# the growth beyond 2024 is added to the SSPs, which already supply 2024's.
DATA_CENTRES_2024 = 415.0
DATA_CENTRES = {
    "median": {2024: 415.0, 2030: 945.0, 2035: 1200.0},
    "low": {2024: 415.0, 2035: 700.0},
    "high": {2024: 415.0, 2035: 1700.0},
}

# Lee et al. (2021), Table 2: aviation's net non-CO₂ ERF in 2018, 66.6 (21–111) mW/m², from
# 1,034 Tg of aviation CO₂ that year (abstract and Table 5).
AVIATION_CO2_2018_KG = 1034e9
AVIATION_NON_CO2_W = {"median": 66.6e-3, "low": 21e-3, "high": 111e-3}

FORCING_SPECIE = "Solar"
FORCING_SCALES = (1.0, 10.0)

SOURCE = (
    "RCMIP v5.1.0 and the IPCC AR6 Scenario Database (SSP marker runs), harmonised to CEDS 2022, "
    "IEA and Ember 2023; IEA Energy and AI (2025); Lee et al. 2021; FaIR 2.2.5 with fair-calibrate "
    "1.4.1"
)

SOURCES = [
    {
        "id": "ar6-scenario-database",
        "name": "IPCC AR6 Scenario Database (SSP marker runs: electricity CO₂ and generation)",
        "version": ar6db.VERSION,
        "url": f"https://doi.org/{ar6db.DOI}",
        "licence": ar6db.LICENCE,
    },
    {
        "id": "ember-global-electricity-review",
        "name": "Ember, Global Electricity Review 2024 (2023 generation and power-sector CO₂)",
        "version": "2024",
        "url": "https://ember-energy.org/latest-insights/global-electricity-review-2024/",
        "licence": "CC BY 4.0",
    },
    {
        "id": "ceds-road",
        "name": "Community Emissions Data System (CEDS), road transport's fossil CO₂",
        "version": ceds.VERSION,
        "url": f"https://doi.org/{ceds.DOI}",
        "licence": ceds.LICENCE,
    },
    {
        "id": "iea-tracking-transport",
        "name": "IEA, Tracking Clean Energy Progress: cars and vans, trucks and buses, aviation, "
        "international shipping",
        "version": "2023",
        "url": "https://www.iea.org/energy-system/transport",
        "licence": "CC BY 4.0",
    },
    {
        "id": "iea-energy-and-ai",
        "name": "IEA, Energy and AI (data-centre electricity cases to 2035)",
        "version": "2025",
        "url": "https://www.iea.org/reports/energy-and-ai",
        "licence": "CC BY 4.0",
    },
    {
        "id": "lee-2021-aviation",
        "name": "Lee et al., The contribution of global aviation to anthropogenic climate forcing "
        "for 2000 to 2018, Atmospheric Environment 244 (2021)",
        "version": "2021",
        "url": "https://doi.org/10.1016/j.atmosenv.2020.117834",
        "licence": "CC BY 4.0",
    },
]


def scaled_to(values: np.ndarray, years: np.ndarray, year: int, target: float) -> np.ndarray:
    """`values` multiplied so they equal `target` in `year`."""
    return values * (target / values[years == year][0])


def ramp(points: dict[int, float], years: np.ndarray) -> np.ndarray:
    """Linear between the points, held flat beyond the last."""
    known = sorted(points)
    return np.interp(years, known, [points[y] for y in known])


def road_kg(table: pd.DataFrame) -> float:
    """Road transport's fossil CO₂ in a CEDS table of CO₂ by sector and fuel, kg."""
    rows = table[table["sector"].isin(ROAD_SECTORS) & table["fuel"].isin(FOSSIL_FUELS)]
    return float(rows["kg"].sum())


def transport(
    rcmip_df: pd.DataFrame, ssp: str, years: np.ndarray, road: float
) -> dict[str, np.ndarray]:
    """kg CO₂/yr of each transport sector: its SSP shape scaled to its inventory, road's to
    `road` in CEDS's last year."""
    targets = {s: (ceds.LAST_YEAR, road * share) for s, share in ROAD_SHARES.items()} | {
        s: (BASE_YEAR, INVENTORY[s]) for s in ("aviation", "shipping")
    }

    def one(sector: str) -> np.ndarray:
        year, target = targets[sector]
        span = np.arange(min(year, years[0]), years[-1] + 1)
        shape = rcmip.series(rcmip_df, ssp, RCMIP_SHAPE[sector], span)
        return np.maximum(scaled_to(shape, span, year, target)[span >= years[0]], 0)

    return {sector: one(sector) for sector in RCMIP_SHAPE}


def electricity(rows: list[dict], ssp: str, years: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """kg CO₂/yr from generating electricity (removals by bioenergy with CCS left out) and TWh
    generated, each scaled to 2023."""
    co2, co2_unit = ar6db.series(rows, ssp, ar6db.ELECTRICITY_CO2, years)
    generated, generated_unit = ar6db.series(rows, ssp, ar6db.ELECTRICITY_GENERATED, years)
    if (co2_unit, generated_unit) != ("Mt CO2/yr", "EJ/yr"):
        raise ValueError(f"{ssp}: units {co2_unit}, {generated_unit}")
    kg = scaled_to(co2 * KG_PER_MT, years, BASE_YEAR, INVENTORY["electricity"])
    twh = scaled_to(generated * TWH_PER_EJ, years, BASE_YEAR, GENERATION_2023_TWH)
    return np.maximum(kg, 0), twh


def data_centres_twh(years: np.ndarray) -> dict[str, np.ndarray]:
    """Data-centre electricity beyond 2024's, TWh/yr."""
    return {
        k: np.maximum(ramp(points, years) - DATA_CENTRES_2024, 0)
        for k, points in DATA_CENTRES.items()
    }


def series(years: np.ndarray, values: np.ndarray) -> dict:
    return {"years": [int(y) for y in years], "values": rounded(values)}


def sector_co2(
    rcmip_df: pd.DataFrame, rows: list[dict], years: np.ndarray, road: float
) -> tuple[dict, dict, dict]:
    """kg CO₂/yr by SSP and sector, kg CO₂/kWh by SSP, and data-centre TWh/yr."""
    centres = data_centres_twh(years)
    power = {ssp: electricity(rows, ssp, years) for ssp in SSPS}
    intensity = {ssp: kg / (twh * KWH_PER_TWH) for ssp, (kg, twh) in power.items()}
    co2 = {
        ssp: transport(rcmip_df, ssp, years, road)
        | {
            "electricity": power[ssp][0],
            "dataCentres": centres["median"] * KWH_PER_TWH * intensity[ssp],
        }
        for ssp in SSPS
    }
    return co2, intensity, centres


def range3(values: dict[str, float]) -> dict[str, float]:
    return {k: rounded([values[k]])[0] for k in ("median", "low", "high")}


def aviation_non_co2() -> dict[str, float]:
    """W/m² per kg/yr of aviation CO₂."""
    return range3({k: v / AVIATION_CO2_2018_KG for k, v in AVIATION_NON_CO2_W.items()})


# Temperature response to a year of forcing, from FaIR


def with_forcing(setup: climate_fair.Setup, year: int, watts: float) -> climate_fair.Setup:
    """`setup` with `watts` W/m² more of FORCING_SPECIE's forcing for calendar `year`: one FaIR
    step's worth at the year's closing bound, where an emission during `year` first acts, so the
    response lines up with the AGTP curves (index 0 is the same calendar year)."""
    natural = setup.natural_forcing.copy()
    row = natural["Variable"] == FORCING_SPECIE
    bound = str(year + 1)
    natural.loc[row, bound] = natural.loc[row, bound].astype(float) + watts
    return dataclasses.replace(setup, natural_forcing=natural)


def forcing_scale(setup: climate_fair.Setup) -> np.ndarray:
    """Each member's scaling of FORCING_SPECIE's forcing, which climate_fair applies."""
    scales = pd.read_csv(setup.parameters, index_col=0).loc[setup.configs]
    return scales[f"forcing_scale[{FORCING_SPECIE}]"].to_numpy()


def forcing_runs(
    setup: climate_fair.Setup, emissions: dict[str, np.ndarray], scales: tuple[float, ...]
) -> dict[float, np.ndarray]:
    """°C per W/m² held one year in PULSE_YEAR, at horizons 0..HORIZON, per member, by size."""
    end = PULSE_YEAR + HORIZON + 1
    start = PULSE_YEAR - climate_fair.START
    window = slice(start, start + HORIZON + 1)
    base = climate_fair.run(setup, {"base": emissions}, end).temperature[window, 0, :]
    member_scale = forcing_scale(setup)

    def one(watts: float) -> np.ndarray:
        pulsed = climate_fair.run(
            with_forcing(setup, PULSE_YEAR, watts), {"pulse": emissions}, end
        ).temperature[window, 0, :]
        return (pulsed - base) / (watts * member_scale)

    return {watts: one(watts) for watts in scales}


def forcing_band(response: np.ndarray) -> dict[str, list[float]]:
    return {k: rounded(v) for k, v in band(response).items()}


# Assembly


def build(cache_dir: Path, members: int | None = None) -> tuple[dict, dict]:
    """The sectors.json document and diagnostics for the log and tests."""
    years = np.arange(BASE_YEAR, END_YEAR + 1)
    rcmip_df = rcmip.load(cache_dir)
    rows = ar6db.load(cache_dir)
    road = road_kg(ceds.by_sector_fuel(ceds.path(cache_dir), "CO2"))
    co2, intensity, centres = sector_co2(rcmip_df, rows, years, road)

    setup = climate_fair.load_setup(cache_dir, members)
    fair_years = np.arange(climate_fair.START, PULSE_YEAR + HORIZON + 1)
    emissions = rcmip.fair_emissions(
        rcmip_df, AGTP_SSP, setup.emitted, fair_years, fair_history.load(cache_dir)
    )
    responses = forcing_runs(setup, emissions, FORCING_SCALES)

    document = {
        "co2": {
            ssp: {sector: series(years, co2[ssp][sector]) for sector in SECTORS} for ssp in SSPS
        },
        "gridIntensity": {ssp: series(years, intensity[ssp]) for ssp in SSPS},
        "evKwhPerKgCo2": {kind: range3(values) for kind, values in EV_KWH_PER_KG.items()},
        "dataCentresTwh": {"years": [int(y) for y in years]}
        | {k: rounded(v) for k, v in centres.items()},
        "aviationNonCo2": aviation_non_co2(),
        "forcingResponse": forcing_band(responses[FORCING_SCALES[0]]),
        "source": SOURCE,
    }
    diagnostics = {"years": years, "responses": responses, "members": len(setup.configs)}
    return document, diagnostics


def linearity(responses: dict[float, np.ndarray]) -> float:
    """Largest gap between the median responses per W/m² to the two forcings, as a share of the
    small one's peak (a ratio would magnify noise where the curve is a hundredth of its peak)."""
    small, large = (np.median(responses[s], axis=-1) for s in FORCING_SCALES)
    return float(np.max(np.abs(large - small)) / np.max(small))


def summary(document: dict, diagnostics: dict) -> list[str]:
    def gt(ssp: str, sector: str, year: int) -> str:
        values = document["co2"][ssp][sector]
        return f"{values['values'][values['years'].index(year)] / KG_PER_GT:.2f}"

    lines = [f"members: {diagnostics['members']}"]
    for ssp in SSPS:
        intensity = document["gridIntensity"][ssp]
        lines.append(
            f"{ssp}: "
            + ", ".join(
                f"{sector} {gt(ssp, sector, BASE_YEAR)}/{gt(ssp, sector, 2050)}/"
                f"{gt(ssp, sector, 2100)} Gt"
                for sector in SECTORS
            )
            + "; grid kg/kWh "
            + "/".join(
                f"{intensity['values'][intensity['years'].index(y)]:.3f}"
                for y in (BASE_YEAR, 2030, 2050, 2100)
            )
        )
    response = document["forcingResponse"]["median"]
    lines.append(
        f"forcing response °C per W/m²·yr: h0 {response[0]:.4f} h1 {response[1]:.4f} "
        f"h10 {response[10]:.4f} h50 {response[50]:.4f} h100 {response[100]:.4f}; "
        f"peak h{int(np.argmax(response))}; sum {sum(response):.3f}; "
        f"linearity {linearity(diagnostics['responses']):.4f}"
    )
    return lines


def build_sectors(cache_dir: Path, out_dir: Path) -> None:
    started = time.monotonic()
    document, diagnostics = build(cache_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "sectors.json").write_text(
        json.dumps(document, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )
    for line in summary(document, diagnostics):
        log.info(line)
    log.info("sectors.json built in %.0f s", time.monotonic() - started)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build_sectors(DEFAULT_CACHE, DEFAULT_OUT)
