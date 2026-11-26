"""fossilmethane.json: the methane that leaks from oil and gas and from coal mines, for the levers
that cut it: the world's under each SSP, its part of the fuel-supply methane per kg of each
sector's fossil CO₂ in coemissions.json, and each country's in CEDS's last year. Run alone with
`uv run python -m planetshift_pipeline.fossil_methane`; explained in
docs/methodology/en/sectors.md."""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from . import coemissions as C
from .cache import DEFAULT_CACHE
from .climate import DEFAULT_OUT, SSPS, rounded
from .sources import ceds, rcmip

log = logging.getLogger(__name__)

# The fugitive CEDS sectors of each fuel; CEDS books them all under "process".
LEAK_SECTORS = {
    "coal": ("1B1_Fugitive-solid-fuels",),
    "oil": ("1B2_Fugitive-petr",),
    "gas": ("1B2b_Fugitive-NG-prod", "1B2b_Fugitive-NG-distr"),
}
GROUPS = {"oilGas": ("oil", "gas"), "coal": ("coal",)}
# The share of each group's methane the lever removes at 100%: the IEA's avoidable share of oil
# and gas methane, and drainage with the oxidation of ventilation air for coal mines (IPCC AR6
# WGIII, Table 12.SM.1.1).
AVOIDABLE = {"oilGas": 0.75, "coal": 0.5}
ENERGY_CH4 = f"Emissions|CH4|MAGICC Fossil and Industrial|{C.SUPPLY_RCMIP}"
SOURCE = (
    "CEDS v_2024_07_08 (2022 fugitive methane by country and sector), changed with each SSP's "
    "RCMIP v5.1.0 energy methane; avoidable shares from IPCC AR6 WGIII Table 12.SM.1.1"
)


def group_of(fuel: str) -> str:
    return next(g for g, fuels in GROUPS.items() if fuel in fuels)


def sector_group(sector: str) -> str | None:
    """The group whose leaks a CEDS sector is, or None."""
    fuel = next((f for f, sectors in LEAK_SECTORS.items() if sector in sectors), None)
    return group_of(fuel) if fuel else None


def leaks_by_group(rows: pd.DataFrame) -> pd.DataFrame:
    """Rows with a `sector` and `kg`, the fugitive ones only, with their group."""
    group = rows["sector"].map(sector_group)
    return rows.assign(group=group).dropna(subset=["group"])


def burnt_by_fuel(co2: pd.DataFrame) -> pd.Series:
    """kg of CO₂ from burning each fuel, world-wide, as coemissions.supply_per_kg counts it."""
    burnt = co2[co2["fuel"].isin(C.FUELS)]
    return burnt.assign(f=burnt["fuel"].map(C.FUELS)).groupby("f")["kg"].sum()


def leak_per_kg(ch4: pd.DataFrame, co2: pd.DataFrame) -> dict[str, float]:
    """kg of methane leaked producing each fuel per kg of CO₂ from burning it."""
    burnt = burnt_by_fuel(co2)
    leaked = ch4.assign(f=ch4["sector"].map({s: f for f, ss in LEAK_SECTORS.items() for s in ss}))
    by_fuel = leaked.dropna(subset=["f"]).groupby("f")["kg"].sum()
    return {f: float(by_fuel.get(f, 0.0)) / float(burnt[f]) for f in LEAK_SECTORS}


def sector_leaks(co2: pd.DataFrame, per_kg: dict[str, float]) -> dict[str, dict[str, float]]:
    """Each lever sector's leaked methane per kg of its fossil CO₂, by group, in CEDS's year."""

    def of(sector: str) -> dict[str, float]:
        shares = C.fuel_shares(co2, sector)
        return {
            g: 0.0 if sector in C.NO_SUPPLY else sum(shares[f] * per_kg[f] for f in fuels)
            for g, fuels in GROUPS.items()
        }

    return {sector: of(sector) for sector in C.SECTORS}


def world_leaks(ch4: pd.DataFrame) -> dict[str, float]:
    """The world's leaked methane by group, kg, in CEDS's year."""
    rows = leaks_by_group(ch4)
    return {g: float(rows[rows["group"] == g]["kg"].sum()) for g in GROUPS}


def country_leaks(by_country: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Each country's leaked methane by group, kg, under its upper-case ISO3; CEDS's `global`
    rows and Kosovo, which no country of the app is, are left out."""
    rows = leaks_by_group(by_country)
    rows = rows[rows["country"].str.fullmatch("[a-z]{3}")]
    table = rows.pivot_table(index="country", columns="group", values="kg", aggfunc="sum")
    table = table.reindex(columns=list(GROUPS)).fillna(0.0)
    return {
        str(iso3).upper(): {g: float(v) for g, v in row.items()}
        for iso3, row in table.sort_index().iterrows()
        if row.sum() > 0
    }


def trajectory(df: pd.DataFrame, ssp: str, years: np.ndarray) -> np.ndarray:
    """The SSP's energy methane relative to the base year's."""
    energy = rcmip.series(df, ssp, ENERGY_CH4, years)
    return energy / energy[0]


def document(
    ch4: pd.DataFrame,
    co2: pd.DataFrame,
    by_country: pd.DataFrame,
    supply_trend: dict[str, np.ndarray],
    energy_trend: dict[str, np.ndarray],
) -> dict:
    """fossilmethane.json from CEDS's tables and each SSP's trends on C.YEARS: the supply ratio's
    (coemissions.trends' "supply" methane) and the energy methane's (trajectory)."""
    per_sector = sector_leaks(co2, leak_per_kg(ch4, co2))
    world = world_leaks(ch4)
    return {
        "years": [int(y) for y in C.YEARS],
        "cedsYear": ceds.LAST_YEAR,
        "avoidable": AVOIDABLE,
        "emissions": {
            ssp: {g: rounded(world[g] * energy_trend[ssp]) for g in GROUPS} for ssp in SSPS
        },
        "perKgCo2": {
            ssp: {
                sector: {g: rounded(v * supply_trend[ssp]) for g, v in by_group.items()}
                for sector, by_group in per_sector.items()
            }
            for ssp in SSPS
        },
        "byCountry": {
            iso3: {g: rounded([v])[0] for g, v in by_group.items()}
            for iso3, by_group in country_leaks(by_country).items()
        },
        "source": SOURCE,
    }


def build(cache_dir: Path) -> dict:
    archive = ceds.path(cache_dir)
    df = rcmip.load(cache_dir)
    supply = {ssp: C.trends(df, ssp, C.YEARS)["supply"]["ch4"] for ssp in SSPS}
    energy = {ssp: trajectory(df, ssp, C.YEARS) for ssp in SSPS}
    return document(
        ceds.by_sector_fuel(archive, "CH4"),
        ceds.by_sector_fuel(archive, "CO2"),
        ceds.by_country_sector(archive, "CH4"),
        supply,
        energy,
    )


def build_fossil_methane(cache_dir: Path, out_dir: Path) -> None:
    data = build(cache_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "fossilmethane.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )
    i = data["years"].index(2050)
    for ssp in SSPS:
        e = data["emissions"][ssp]
        log.info(
            "%s leaked methane %d/2050, Mt: oil and gas %.1f/%.1f, coal %.1f/%.1f",
            ssp,
            data["years"][0],
            e["oilGas"][0] / 1e9,
            e["oilGas"][i] / 1e9,
            e["coal"][0] / 1e9,
            e["coal"][i] / 1e9,
        )
    log.info("leaked methane in %d countries", len(data["byCountry"]))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    build_fossil_methane(DEFAULT_CACHE, DEFAULT_OUT)
