"""wastemethane.json: the methane of landfills and wastewater by country (CEDS), the scenarios'
waste methane, and what the Landfills and Wastewater levers need. Explained in
docs/methodology/en/landfills.md."""

import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from . import solidwaste as S
from .climate import LAST_HISTORY, SSPS, rounded
from .climate_scenarios import cause_emissions
from .sources import ceds, primap, rcmip, what_a_waste

END_YEAR = 2100

#: The CEDS sectors each lever acts on; waste combustion and other waste handling stay as they are.
SECTORS = {"landfill": "5A_Solid-waste-disposal", "wastewater": "5D_Wastewater-handling"}
WASTE_PREFIX = "5"
#: CEDS's codes that are not ISO3 country codes: Kosovo, and its global row of shipping and air.
CEDS_CODES = {"srb (kosovo)": "XKX", "global": None}

# Share of a managed landfill's methane that gas collection takes at full adoption: a site with a
# gas system collects 50–90% of what it makes while it runs, less over its whole life (US EPA,
# AP-42 2.4; IPCC 2006 Guidelines vol. 5 ch. 3).
CAPTURE = {"median": 0.6, "low": 0.5, "high": 0.75}
# Share of the degradable waste kept out of landfills and dumps at full adoption, composted or
# digested instead; the methane of what was buried before keeps coming (DECAY_YEARS).
DIVERSION = {"median": 0.4, "low": 0.3, "high": 0.5}
# Share of wastewater's methane cut at full adoption: sewers and aerobic treatment in place of
# latrines, septic tanks and untreated discharge, and covered lagoons and digesters whose gas is
# burnt (IPCC AR6 WGIII, ch. 12 and Table 12.SM.1.1).
WASTEWATER_CUT = {"median": 0.45, "low": 0.4, "high": 0.5}
# First-order decay of buried waste (IPCC 2006 Guidelines vol. 5 ch. 3, Table 3.3, bulk waste):
# k = 0.05 a year in dry temperate climates, 0.09 in wet ones, 0.17 in moist tropical ones. The
# time constant is 1/k years.
DECAY_RATE = {"median": 0.09, "low": 0.05, "high": 0.17}

SOURCE = (
    "CEDS v_2024_07_08 (landfill and wastewater methane by country, 2022); PRIMAP-hist and RCMIP "
    "v5.1.0 (the scenarios' waste methane); World Bank What a Waste 3.0 (treatment shares); "
    "IPCC 2006 Guidelines and AR6 WGIII (capture, diversion, decay)"
)

# CEDS is listed by the coemissions section, PRIMAP-hist and RCMIP by the climate section, What
# a Waste by the solidwaste section.
SOURCES = [
    {
        "id": "ipcc-2006-waste",
        "name": "IPCC, 2006 Guidelines for National Greenhouse Gas Inventories, vol. 5, ch. 3: "
        "solid waste disposal (first-order decay)",
        "version": "2006",
        "url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html",
        "licence": "IPCC, free to read",
    },
    {
        "id": "ipcc-ar6-wg3-ch12",
        "name": "IPCC AR6 WGIII, ch. 12 and Table 12.SM.1.1: mitigation potential of solid waste "
        "and wastewater",
        "version": "2022",
        "url": "https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-12/",
        "licence": "IPCC, free to read",
    },
]


def by_country_sector(archive: Path, year: int = ceds.LAST_YEAR) -> pd.DataFrame:
    """CEDS's methane of every waste sector in `year`, kg: columns iso3, sector, kg."""
    name = f"CH4_CEDS_emissions_by_country_sector_{ceds.FILE_VERSION}.csv"
    with zipfile.ZipFile(archive) as z, z.open(name) as f:
        frame = pd.read_csv(f)
    waste = frame[frame["sector"].str.startswith(WASTE_PREFIX)]
    return pd.DataFrame(
        {
            "iso3": waste["country"].map(lambda c: CEDS_CODES.get(c, c.upper())),
            "sector": waste["sector"],
            "kg": waste[f"X{year}"].astype(float) * ceds.KG_PER_UNIT["ktCH4"],
        }
    )


def managed_share(treatment: dict[str, float]) -> float:
    """The share of a country's buried waste in landfills, where gas can be collected, rather than
    open dumps or left uncollected; 1 where it buries none."""
    buried = treatment["landfill"] + treatment["openDump"] + treatment["uncollected"]
    return treatment["landfill"] / buried if buried > 0 else 1.0


def managed_shares(solidwaste: dict, landfill: pd.Series) -> dict[str, float]:
    """Each country's managed share; a country What a Waste leaves out takes the world's,
    weighted by landfill methane (1 with none to weigh)."""
    known = {
        iso3: managed_share(row["treatment"])
        for iso3, row in solidwaste["byCountry"].items()
        if iso3 in landfill.index
    }
    weights = landfill.reindex(list(known))
    total = float(weights.sum())
    world = float((pd.Series(known, dtype=float) * weights).sum()) / total if total > 0 else 1.0
    return {iso3: known.get(iso3, world) for iso3 in landfill.index}


def countries(table: pd.DataFrame, managed: dict[str, float]) -> dict[str, dict]:
    """byCountry[iso3]: landfill and wastewater methane, kg, and the managed share."""
    sectors = (
        table[table["sector"].isin(SECTORS.values()) & table["iso3"].notna()]
        .pivot_table(index="iso3", columns="sector", values="kg", aggfunc="sum")
        .reindex(columns=list(SECTORS.values()))
        .fillna(0.0)
    )
    return {
        iso3: {
            **{name: rounded([row[code]])[0] for name, code in SECTORS.items()},
            "managed": round(managed.get(iso3, 1.0), 4),
        }
        for iso3, row in sectors.sort_index().iterrows()
        if row.sum() > 0
    }


def scenario_ch4(primap_df: pd.DataFrame, rcmip_df: pd.DataFrame, ssp: str) -> dict:
    """The waste cause's methane in `ssp`, kg a year, LAST_HISTORY..END_YEAR: PRIMAP-hist, then
    the SSP's waste methane scaled to meet it (as climate.json's Waste cause)."""
    years = np.arange(1990, END_YEAR + 1)
    ch4 = cause_emissions(primap_df, rcmip_df, ssp, "waste", years, LAST_HISTORY)["ch4"]
    kept = years >= LAST_HISTORY
    return {"years": [int(y) for y in years[kept]], "values": rounded(ch4[kept])}


def range3(values: dict[str, float]) -> dict[str, float]:
    return {k: values[k] for k in ("median", "low", "high")}


def decay_years() -> dict[str, float]:
    """The decay's time constant, years, from its rate."""
    return {k: round(1 / r, 2) for k, r in range3(DECAY_RATE).items()}


def document(table: pd.DataFrame, solidwaste: dict, paths: dict[str, dict]) -> dict:
    landfill = table[table["sector"] == SECTORS["landfill"]].groupby("iso3")["kg"].sum()
    return {
        "year": ceds.LAST_YEAR,
        "total": rounded([table["kg"].sum()])[0],
        "byCountry": countries(table, managed_shares(solidwaste, landfill)),
        "ch4": paths,
        "capture": range3(CAPTURE),
        "diversion": range3(DIVERSION),
        "wastewaterCut": range3(WASTEWATER_CUT),
        "decayYears": decay_years(),
        "source": SOURCE,
    }


def build(cache_dir: Path) -> dict:
    table = by_country_sector(ceds.path(cache_dir))
    solidwaste = S.solidwaste_json(what_a_waste.read(what_a_waste.path(cache_dir)))
    primap_df, rcmip_df = primap.load(cache_dir), rcmip.load(cache_dir)
    paths = {ssp: scenario_ch4(primap_df, rcmip_df, ssp) for ssp in SSPS}
    return document(table, solidwaste, paths)


def summary(doc: dict) -> list[str]:
    rows = doc["byCountry"].values()
    mt = {s: sum(r[s] for r in rows) / 1e9 for s in SECTORS}
    weighted = sum(r["landfill"] * r["managed"] for r in rows) / (mt["landfill"] * 1e9)
    s = doc["ch4"]["ssp245"]
    at = {y: s["values"][s["years"].index(y)] / 1e9 for y in (LAST_HISTORY, 2050, 2100)}
    return [
        f"waste methane {doc['year']}: {doc['total'] / 1e9:.1f} Mt, landfill "
        f"{mt['landfill']:.1f}, wastewater {mt['wastewater']:.1f}, {len(rows)} countries; "
        f"managed share {weighted:.3f}",
        "ssp245 waste methane " + ", ".join(f"{y} {v:.1f} Mt" for y, v in at.items()),
    ]
