"""industry.json: direct fossil CO₂ of buildings and of industry under each SSP, and what the
clean-heating and clean-industry levers need. Run alone with
`uv run python -m planetshift_pipeline.industry`; explained in docs/methodology/en/industry.md."""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from .cache import DEFAULT_CACHE, fetched
from .climate import DEFAULT_OUT, SSPS, rounded
from .coemissions import CEDS_SECTORS
from .coemissions import FUELS as FOSSIL_FUELS
from .sources import ceds, rcmip

log = logging.getLogger(__name__)

BASE_YEAR = 2023
END_YEAR = 2100
KG_PER_GT = 1e12
KG_PER_KT = 1e6

# The RCMIP (CMIP6 harmonised, CEDS sectors) variable whose shape each sector follows.
RCMIP_SHAPE = {
    "buildings": "Emissions|CO2|MAGICC Fossil and Industrial|Residential Commercial Other",
    "industry": "Emissions|CO2|MAGICC Fossil and Industrial|Industrial Sector",
}

# The inventories each shape is scaled to: buildings to CEDS 1A4a/1A4b fossil fuel in 2022
# (`buildings_kg`; RCMIP's sector also holds 1A4c, left out), industry to the IEA's 9.0 Gt of
# 2022 (Tracking Clean Energy Progress 2023), both taken for 2023.
INVENTORY = {"industry": 9.0 * KG_PER_GT}

# Global Carbon Budget cement process CO₂ (Andrew), kt CO₂ by country and year.
CEMENT_URL = "https://zenodo.org/records/22178444/files/0.%20GCP-CEM.csv?download=1"
CEMENT_DOI = "10.5281/zenodo.22178444"
CEMENT_VERSION = "260830"
# Calcination is about 60% of a cement plant's direct CO₂, the rest kiln fuel (IEA cement
# tracking; Andrew 2019, ESSD 11, 1675).
CEMENT_PROCESS_SHARE = 0.6
# Iron and steel's direct CO₂, 2.6 Gt a year (IEA 2020, Iron and Steel Technology Roadmap, 2019
# data), taken for 2022.
STEEL_2022 = 2.6 * KG_PER_GT
# Primary chemicals' direct CO₂, about 935 Mt in 2022, 45% of it from ammonia (IEA, Tracking
# Clean Energy Progress, chemicals). Ammonia is left out: its CO₂ is that of making fertiliser,
# which the nitrogen-efficiency practice cuts on the farm side.
PRIMARY_CHEMICALS_2022 = 0.935 * KG_PER_GT
AMMONIA_SHARE = 0.45

# Fossil CO₂ per kWh of fuel (IPCC 2006 Guidelines, vol. 2, table 1.4: natural gas 56.1 and
# gas/diesel oil 74.1 t CO₂ per TJ) and the heat pump replacing a boiler: kWh of electricity per
# kg of CO₂ avoided = boiler efficiency / (heat pump seasonal COP × fuel CO₂ per kWh). Median: a
# gas boiler at 90% against a heat pump at a seasonal COP of 3 (IEA 2022, The Future of Heat
# Pumps: three to five times as efficient as a gas boiler). Low end: an oil boiler at 85% against
# a COP of 4. High end: a condensing gas boiler at 95% against a COP of 2.5 (cold climates).
KG_PER_KWH = {"gas": 56.1 / 277.8, "oil": 74.1 / 277.8}
HEAT_PUMP = {
    "median": {"fuel": "gas", "boiler": 0.90, "cop": 3.0},
    "low": {"fuel": "oil", "boiler": 0.85, "cop": 4.0},
    "high": {"fuel": "gas", "boiler": 0.95, "cop": 2.5},
}

# Share of each part's direct CO₂ gone at full adoption, and electricity per kg avoided; the
# derivations are in docs/methodology/en/industry.md. Steel: IEA 2020, Iron and Steel Technology
# Roadmap (pp. 42, 54, 92, 107), and Vogl et al. 2018 for the electricity. Cement, capture on
# every kiln: Voldsund et al. 2019, tables 14 and 15. Chemicals: IEA 2023, Primary chemicals, for
# the high cut and mix, and Kätelhön et al. 2019 for the high electricity; the median and low
# cuts, and capture at the cement kiln's 0.20 kWh/kg, are judgements no source gives.
PARTS = {
    "steel": {
        "cut": {"median": 0.9, "low": 0.9, "high": 0.97},
        "kwhPerKgCo2": {"median": 1.5, "low": 0.4, "high": 2.2},
    },
    "cement": {
        "cut": {"median": 0.9, "low": 0.9, "high": 0.93},
        "kwhPerKgCo2": {"median": 0.2, "low": 0.2, "high": 0.37},
    },
    "chemicals": {
        "cut": {"median": 0.8, "low": 0.6, "high": 0.93},
        "kwhPerKgCo2": {"median": 1.9, "low": 0.2, "high": 5.2},
    },
}

SOURCE = (
    "RCMIP v5.1.0 harmonised to CEDS v_2024_07_08 (buildings, 2022) and IEA Tracking Clean "
    "Energy Progress 2023 (industry); Global Carbon Budget "
    "cement process CO₂ (Andrew, v260830); heat-pump, steel, cement and chemicals factors from "
    "the IEA, "
    "IPCC, published roadmaps and studies"
)

# RCMIP is listed by the climate section.
SOURCES = [
    {
        "id": "gcp-cement",
        "name": "Andrew, R. M., Global CO₂ emissions from cement production (Global Carbon Budget)",
        "version": CEMENT_VERSION,
        "url": f"https://doi.org/{CEMENT_DOI}",
        "licence": "CC BY 4.0",
    },
    {
        "id": "iea-tracking-buildings-industry",
        "name": "IEA, Tracking Clean Energy Progress 2023: buildings, industry, iron and steel, "
        "cement, chemicals",
        "version": "2023",
        "url": "https://www.iea.org/reports/tracking-clean-energy-progress-2023",
        "licence": "CC BY 4.0",
    },
    {
        "id": "iea-future-of-heat-pumps",
        "name": "IEA, The Future of Heat Pumps",
        "version": "2022",
        "url": "https://www.iea.org/reports/the-future-of-heat-pumps",
        "licence": "CC BY 4.0",
    },
    {
        "id": "iea-primary-chemicals",
        "name": "IEA, Net Zero Roadmap: Primary chemicals",
        "version": "2023",
        "url": "https://www.iea.org/reports/primary-chemicals",
        "licence": "CC BY 4.0",
    },
    {
        "id": "katelhon-2019-ccu",
        "name": "Kätelhön et al. (2019), climate change mitigation potential of carbon capture "
        "and utilization in the chemical industry",
        "version": "PNAS 116(23)",
        "url": "https://doi.org/10.1073/pnas.1821029116",
        "licence": "PNAS, free to read",
    },
    {
        "id": "iea-steel-roadmap",
        "name": "IEA, Iron and Steel Technology Roadmap",
        "version": "2020",
        "url": "https://www.iea.org/reports/iron-and-steel-technology-roadmap",
        "licence": "IEA, all rights reserved",
    },
    {
        "id": "voldsund-2019-cement-capture",
        "name": "Voldsund et al. (2019), Comparison of technologies for CO₂ capture from cement "
        "production, part 1: technical evaluation",
        "version": "Energies 12(3), 559",
        "url": "https://doi.org/10.3390/en12030559",
        "licence": "CC BY 4.0",
    },
]


def scaled_to(values: np.ndarray, years: np.ndarray, year: int, target: float) -> np.ndarray:
    """`values` multiplied so they equal `target` in `year`."""
    return values * (target / values[years == year][0])


def series(years: np.ndarray, values: np.ndarray) -> dict:
    return {"years": [int(y) for y in years], "values": rounded(values)}


def buildings_kg(table: pd.DataFrame) -> float:
    """Buildings' fossil CO₂ in a CEDS table of CO₂ by sector and fuel, kg."""
    rows = table["sector"].isin(CEDS_SECTORS["buildings"]) & table["fuel"].isin(FOSSIL_FUELS)
    return float(table.loc[rows, "kg"].sum())


def sector_co2(
    rcmip_df: pd.DataFrame, ssp: str, years: np.ndarray, buildings: float
) -> dict[str, np.ndarray]:
    """kg CO₂/yr of each sector: its SSP shape scaled to its inventory, never below zero;
    buildings' to `buildings` kg in CEDS's last year."""
    targets = {
        "buildings": (ceds.LAST_YEAR, buildings),
        "industry": (BASE_YEAR, INVENTORY["industry"]),
    }

    def one(sector: str) -> np.ndarray:
        year, target = targets[sector]
        span = np.arange(min(year, years[0]), years[-1] + 1)
        shape = rcmip.series(rcmip_df, ssp, RCMIP_SHAPE[sector], span)
        return np.maximum(scaled_to(shape, span, year, target)[span >= years[0]], 0)

    return {sector: one(sector) for sector in RCMIP_SHAPE}


def load_cement(cache_dir: Path) -> pd.DataFrame:
    return pd.read_csv(fetched(cache_dir / "gcp-cement", CEMENT_URL, "GCP-CEM.csv"))


def cement_process(cement: pd.DataFrame, year: int) -> float:
    """World cement process CO₂ in `year`, kg (the file is kt CO₂ by country)."""
    return float(cement[str(year)].fillna(0).sum()) * KG_PER_KT


def shares(cement_process_kg: float) -> dict[str, float]:
    """Each part's share of industry's direct CO₂: cement's from its process CO₂ and the process
    share of a plant's emissions, steel's and chemicals' (ammonia left out) from the IEA."""
    industry = INVENTORY["industry"]
    return {
        "steel": STEEL_2022 / industry,
        "cement": cement_process_kg / CEMENT_PROCESS_SHARE / industry,
        "chemicals": PRIMARY_CHEMICALS_2022 * (1 - AMMONIA_SHARE) / industry,
    }


def heat_pump_kwh(case: dict) -> float:
    """kWh of electricity per kg of fossil CO₂ a heat pump avoids in place of a boiler."""
    return case["boiler"] / (case["cop"] * KG_PER_KWH[case["fuel"]])


def range3(values: dict[str, float]) -> dict[str, float]:
    return {k: rounded([values[k]])[0] for k in ("median", "low", "high")}


def parts(cement_process_kg: float) -> dict[str, dict]:
    share = shares(cement_process_kg)
    return {
        name: {
            "share": rounded([share[name]])[0],
            "cut": range3(p["cut"]),
            "kwhPerKgCo2": range3(p["kwhPerKgCo2"]),
        }
        for name, p in PARTS.items()
    }


def document(rcmip_df: pd.DataFrame, cement: pd.DataFrame, buildings: float) -> dict:
    years = np.arange(BASE_YEAR, END_YEAR + 1)
    process = cement_process(cement, BASE_YEAR)
    return {
        "co2": {
            ssp: {
                sector: series(years, v)
                for sector, v in sector_co2(rcmip_df, ssp, years, buildings).items()
            }
            for ssp in SSPS
        },
        "heatPumpKwhPerKgCo2": range3({k: heat_pump_kwh(c) for k, c in HEAT_PUMP.items()}),
        "industryParts": parts(process),
        "cementProcessCo2": {"year": BASE_YEAR, "kg": rounded([process])[0]},
        "source": SOURCE,
    }


def build(cache_dir: Path) -> dict:
    measured = buildings_kg(ceds.by_sector_fuel(ceds.path(cache_dir), "CO2"))
    return document(rcmip.load(cache_dir), load_cement(cache_dir), measured)


def summary(doc: dict) -> list[str]:
    def gt(ssp: str, sector: str, year: int) -> str:
        s = doc["co2"][ssp][sector]
        return f"{s['values'][s['years'].index(year)] / KG_PER_GT:.2f}"

    lines = [
        f"{ssp}: "
        + ", ".join(
            f"{sector} " + "/".join(gt(ssp, sector, y) for y in (BASE_YEAR, 2050, 2100)) + " Gt"
            for sector in RCMIP_SHAPE
        )
        for ssp in SSPS
    ]
    p = doc["industryParts"]
    lines.append(
        f"cement process {doc['cementProcessCo2']['kg'] / KG_PER_GT:.3f} Gt; shares steel "
        f"{p['steel']['share']:.3f} cement {p['cement']['share']:.3f} chemicals "
        f"{p['chemicals']['share']:.3f}; heat pump kWh/kg "
        f"{doc['heatPumpKwhPerKgCo2']}"
    )
    return lines


def build_industry(cache_dir: Path, out_dir: Path) -> None:
    doc = build(cache_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "industry.json").write_text(
        json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )
    for line in summary(doc):
        log.info(line)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build_industry(DEFAULT_CACHE, DEFAULT_OUT)
