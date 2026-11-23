"""coemissions.json: what the fossil fuels the energy, heating and industry levers cut emit besides
CO₂, per kg of each sector's fossil CO₂ under each SSP: methane from producing the fuel (coal
mines, oil fields, gas leaks) and from burning it, and the aerosols and their precursors (SO₂,
black and organic carbon, NOx); and the effective radiative forcing per kg of each of those from
FaIR's calibration. Run alone with `uv run python -m planetshift_pipeline.coemissions`; explained
in docs/methodology/en/sectors.md."""

import json
import logging
import time
from pathlib import Path

import numpy as np
import pandas as pd

from . import climate_fair
from .cache import DEFAULT_CACHE
from .climate import DEFAULT_OUT, SSPS, rounded
from .sources import ceds, rcmip

log = logging.getLogger(__name__)

BASE_YEAR = 2023
END_YEAR = 2100
YEARS = np.array([BASE_YEAR, *range(2025, END_YEAR + 1, 5)])
# "co2" is the fossil CO₂ emitted producing the fuel (refineries, coke ovens, flaring), on top of
# the sector's own; every other species is emitted producing and burning it.
SPECIES = ("co2", "ch4", "n2o", "so2", "bc", "oc", "nh3", "nox", "co", "voc")
SUPPLY_ONLY = ("co2",)
AEROSOLS = ("so2", "bc", "oc", "nh3", "nox", "co", "voc")
PARTICLES = ("so2", "bc", "oc", "nh3")
OZONE = ("co", "voc")
SECTORS = (
    "roadPassenger",
    "roadFreight",
    "aviation",
    "shipping",
    "electricity",
    "buildings",
    "industry",
    "aviationOwn",
)
CEDS_NAME = {
    "co2": "CO2",
    "ch4": "CH4",
    "n2o": "N2O",
    "so2": "SO2",
    "bc": "BC",
    "oc": "OC",
    "nh3": "NH3",
    "nox": "NOx",
    "co": "CO",
    "voc": "NMVOC",
}
RCMIP_NAME = CEDS_NAME | {"so2": "Sulfur", "voc": "VOC"}
KG_PER_FAIR_UNIT = 1e9

# CEDS fuels by the fossil fuel they are; biomass is left out (its CO₂ is not fossil and no lever
# replaces it), and "process" counts only where a sector's CO₂ includes its processes.
FUELS = {
    "hard_coal": "coal",
    "brown_coal": "coal",
    "coal_coke": "coal",
    "light_oil": "oil",
    "diesel_oil": "oil",
    "heavy_oil": "oil",
    "natural_gas": "gas",
}
ROAD = ("1A3b_Road",)
AVIATION = ("1A3ai_International-aviation", "1A3aii_Domestic-aviation")
# The CEDS sectors of each lever sector. Industry is the steel and cement the clean-industry lever
# acts on, fuel and process, as its CO₂ in industry.json includes both.
CEDS_SECTORS = {
    "roadPassenger": ROAD,
    "roadFreight": ROAD,
    "aviation": AVIATION,
    "aviationOwn": AVIATION,
    "shipping": ("1A3di_International-shipping", "1A3dii_Domestic-navigation"),
    "electricity": (
        "1A1a_Electricity-public",
        "1A1a_Electricity-autoproducer",
        "1A1a_Heat-production",
    ),
    "buildings": ("1A4a_Commercial-institutional", "1A4b_Residential"),
    "industry": (
        "1A2a_Ind-Comb-Iron-steel",
        "1A2f_Ind-Comb-Non-metalic-minerals",
        "2A1_Cement-production",
        "2A2_Lime-production",
        "2C1_Iron-steel-alloy-prod",
    ),
}
WITH_PROCESS = ("industry",)
# Producing each fuel, with each CEDS sector's share: coal mining, oil production (with its
# flaring and venting) and tanker loading, gas production and distribution, all booked under
# "process"; and the fuel the energy industries burn besides power plants (1A1bc: refineries, coke
# ovens, oil and gas fields' own use), which the aggregate files do not split by fuel: two thirds
# to oil and one third to coal is an assumption (docs/methodology/en/sectors.md).
OTHER_TRANSFORMATION = "1A1bc_Other-transformation"
SUPPLY_SECTORS = {
    "coal": {"1B1_Fugitive-solid-fuels": 1.0, OTHER_TRANSFORMATION: 1 / 3},
    "oil": {
        "1B2_Fugitive-petr": 1.0,
        "1A3di_Oil_Tanker_Loading": 1.0,
        OTHER_TRANSFORMATION: 2 / 3,
    },
    "gas": {"1B2b_Fugitive-NG-prod": 1.0, "1B2b_Fugitive-NG-distr": 1.0},
}
# Aviation's own NOx, sulphate and soot are in sectors.json's aviationNonCo2 (Lee et al. 2021),
# so only its fuel's supply is counted under aviation; aviationOwn carries them through FaIR's
# coefficients instead, without the supply, for the plain-FaIR aviationNonCo2 departure.
OWN_EMISSIONS_ELSEWHERE = ("aviation",)
NO_SUPPLY = ("aviationOwn",)

# The RCMIP (CMIP6, CEDS-harmonised) sector whose ratio of each species to CO₂ sets how the
# sector's emission factor changes under each SSP; "supply" for the fuel's production.
RCMIP_SECTOR = {
    "roadPassenger": "Transportation Sector",
    "roadFreight": "Transportation Sector",
    "aviation": "Aircraft",
    "aviationOwn": "Aircraft",
    "shipping": "International Shipping",
    "electricity": "Energy Sector",
    "buildings": "Residential Commercial Other",
    "industry": "Industrial Sector",
}
SUPPLY_RCMIP = "Energy Sector"
FOSSIL_RCMIP = (
    "Energy Sector",
    "Industrial Sector",
    "Residential Commercial Other",
    "Transportation Sector",
    "International Shipping",
    "Aircraft",
)
# Where NOx is emitted changes how much methane it destroys. Hoor et al. (2009, ACP 9, 3113,
# QUANTIFY, Tables 1 and 8): five chemistry models perturbing each transport sector's year-2000
# emissions by 5%; methane and methane-induced ozone forcing, mW/m², from road (6.85 Tg N of NOx)
# and shipping (4.39 Tg N). Per Tg N, ships' NOx, emitted in clean marine air, does 2.7–5.7 times
# as much as road's (whose CO and hydrocarbons, emitted with it, offset part of its effect).
HOOR_METHANE_MW = {
    "road": {"TM4": 23.8, "OSLO": 17.4, "LMDz": 24.4, "UCI": 16.3, "TOMCAT": 20.9},
    "ship": {"TM4": 41.6, "OSLO": 46.4, "LMDz": 52.7, "UCI": 44.9, "TOMCAT": 78.1},
}
HOOR_NOX_TGN = {"road": 6.85, "ship": 4.39}
HOOR_YEAR = 2000
NO2_PER_N = 46.006 / 14.007
# ACCMIP's steady-state forcing of a Mt of methane a year, 2.2 mW/m² from the methane and 0.7 from
# the ozone it makes (Stevenson et al. 2013, ACP 13, 3063, as tabulated in Bellouin et al. 2016,
# ACP 16, 13885, Table 1): what turns Hoor's methane and methane-ozone forcing into the methane
# emission that would give it, for the chemistry variant of NOx's methane.
MW_PER_MT_CH4 = 2.9
ACCMIP_CH4_MW = 2.2
# ACCMIP's methane forcing of a Tg of NMVOC a year, same sources: what Hoor's figures are given
# back for the VOCs emitted with each source's NOx, now that their methane is counted apart.
ACCMIP_VOC_MW = 0.27
HOOR_CEDS = {"road": ("1A3b_Road",), "ship": ("1A3di_International-shipping",)}
# Lever sectors whose NOx is emitted at sea; every other source is on land, like road.
AT_SEA = ("shipping",)
SHIPPING_NOX_RCMIP = "Emissions|NOx|MAGICC Fossil and Industrial|International Shipping"
TOTAL_NOX_RCMIP = "Emissions|NOx"
# The NOx-methane variants written, picked by planetshift.config.json's noxMethane departure.
NOX_VARIANTS = ("hoor", "fair", "chemistry")

# Below this share of its base-year CO₂, a sector's ratio is held: what is left of its pollutants
# is then mostly not from fossil fuel (biomass, processes, bioenergy with capture), and the ratio
# stops measuring the fuel's emission factor.
HOLD_BELOW = 0.5

SOURCE = (
    "CEDS v_2024_07_08 (2022 emissions by sector and fuel), changed with each SSP's RCMIP v5.1.0 "
    "emission factors; FaIR 2.2.5 with fair-calibrate 1.4.1 for the forcing per kg"
)

# RCMIP and FaIR are listed by the climate section.
SOURCES = [
    {
        "id": "ceds",
        "name": "Community Emissions Data System (CEDS), global emissions by sector and fuel",
        "version": ceds.VERSION,
        "url": f"https://doi.org/{ceds.DOI}",
        "licence": ceds.LICENCE,
    },
]


# Ratios in CEDS's last year


def fossil_rows(table: pd.DataFrame, sectors: tuple[str, ...], process: bool) -> pd.DataFrame:
    keep = table["fuel"].isin(FUELS) | (process & (table["fuel"] == "process"))
    return table[table["sector"].isin(sectors) & keep]


def own_per_kg(tables: dict[str, pd.DataFrame], sector: str) -> dict[str, float]:
    """kg of each species the sector emits burning fossil fuel per kg of its fossil CO₂."""
    process = sector in WITH_PROCESS
    co2 = fossil_rows(tables["co2"], CEDS_SECTORS[sector], process)["kg"].sum()
    return {
        s: 0.0
        if sector in OWN_EMISSIONS_ELSEWHERE or s in SUPPLY_ONLY
        else fossil_rows(tables[s], CEDS_SECTORS[sector], process)["kg"].sum() / co2
        for s in SPECIES
    }


def fuel_shares(co2: pd.DataFrame, sector: str) -> dict[str, float]:
    """Each fossil fuel's share of the sector's CO₂ (its processes, where counted, have none)."""
    rows = fossil_rows(co2, CEDS_SECTORS[sector], sector in WITH_PROCESS)
    total = rows["kg"].sum()
    by_fuel = rows.assign(group=rows["fuel"].map(FUELS)).groupby("group")["kg"].sum()
    return {f: float(by_fuel.get(f, 0.0)) / total for f in SUPPLY_SECTORS}


def supply_per_kg(tables: dict[str, pd.DataFrame]) -> dict[str, dict[str, float]]:
    """kg of each species emitted producing a fuel per kg of CO₂ from burning it, world-wide."""
    co2 = tables["co2"]
    burnt = co2[co2["fuel"].isin(FUELS)]
    burnt_by_fuel = burnt.assign(group=burnt["fuel"].map(FUELS)).groupby("group")["kg"].sum()

    def per_kg(fuel: str, species: str) -> float:
        rows = tables[species]
        share = rows["sector"].map(SUPPLY_SECTORS[fuel]).fillna(0.0)
        emitted = (rows["kg"] * share).sum()
        burnt_kg = burnt_by_fuel.get(fuel, 0.0)
        return emitted / burnt_kg if burnt_kg > 0 else 0.0

    return {fuel: {s: per_kg(fuel, s) for s in SPECIES} for fuel in SUPPLY_SECTORS}


def upstream_per_kg(shares: dict[str, float], supply: dict[str, dict[str, float]]) -> dict:
    return {s: sum(shares[f] * supply[f][s] for f in SUPPLY_SECTORS) for s in SPECIES}


def base_ratios(tables: dict[str, pd.DataFrame]) -> dict[str, dict[str, dict[str, float]]]:
    """Per sector: its own and its fuel supply's kg of each species per kg of its fossil CO₂."""
    supply = supply_per_kg(tables)
    return {
        sector: {
            "own": own_per_kg(tables, sector),
            "supply": dict.fromkeys(SPECIES, 0.0)
            if sector in NO_SUPPLY
            else upstream_per_kg(fuel_shares(tables["co2"], sector), supply),
        }
        for sector in SECTORS
    }


# How the ratios change under each SSP


def held_trend(species: np.ndarray, co2: np.ndarray) -> np.ndarray:
    """The ratio of `species` to `co2` relative to the first year's, held at its last value once
    `co2` falls below HOLD_BELOW of the first year's, and kept within 0..1: an emission factor
    that only improves on today's."""
    if co2[0] <= 0:
        raise ValueError("no CO₂ in the base year to hold a ratio to")
    ratio = (species / species[0]) / np.maximum(co2 / co2[0], 1e-12)
    valid = co2 >= HOLD_BELOW * co2[0]
    last = np.maximum.accumulate(np.where(valid, np.arange(len(co2)), 0))
    return np.clip(ratio[last], 0, 1)


def rcmip_sector(df: pd.DataFrame, ssp: str, species: str, sector: str, years) -> np.ndarray:
    """A sector's emissions of a species under an SSP; zeros when RCMIP does not give the species
    for the sector (methane from aircraft), an error when it has no such species or sector."""
    prefix = "Emissions|{}|MAGICC Fossil and Industrial"
    names = set(df["Variable"])
    species_known = any(v.startswith(prefix.format(RCMIP_NAME[species])) for v in names)
    if not species_known or f"{prefix.format('CO2')}|{sector}" not in names:
        raise KeyError(f"RCMIP has no {species} or no sector {sector}")
    variable = f"{prefix.format(RCMIP_NAME[species])}|{sector}"
    try:
        return rcmip.series(df, ssp, variable, years)
    except KeyError:
        return np.zeros(len(years))


def trends(df: pd.DataFrame, ssp: str, years: np.ndarray) -> dict[str, dict[str, np.ndarray]]:
    """Per lever sector and for fuel supply, how each species' ratio to CO₂ changes, 1 in the base
    year. A species the SSP does not give for a sector keeps its ratio."""

    def of(species: np.ndarray, co2: np.ndarray) -> np.ndarray:
        return held_trend(species, co2) if species[0] > 0 else np.ones(len(years))

    def sector_trend(sector: str) -> dict[str, np.ndarray]:
        co2 = np.maximum(rcmip_sector(df, ssp, "co2", sector, years), 0)
        return {s: of(rcmip_sector(df, ssp, s, sector, years), co2) for s in SPECIES}

    fossil = sum(np.maximum(rcmip_sector(df, ssp, "co2", s, years), 0) for s in FOSSIL_RCMIP)
    supply = {
        s: np.ones(len(years))
        if s in SUPPLY_ONLY
        else of(rcmip_sector(df, ssp, s, SUPPLY_RCMIP, years), fossil)
        for s in SPECIES
    }
    return {sector: sector_trend(RCMIP_SECTOR[sector]) for sector in SECTORS} | {"supply": supply}


def ratios(base: dict, trend: dict) -> dict[str, dict[str, np.ndarray]]:
    """kg of each species per kg of each sector's fossil CO₂, by year."""
    return {
        sector: {
            s: base[sector]["own"][s] * trend[sector][s]
            + base[sector]["supply"][s] * trend["supply"][s]
            for s in SPECIES
        }
        for sector in SECTORS
    }


# Forcing per kg, from FaIR's calibration


def aci_forcing(scale, shapes: dict[str, np.ndarray], emissions: dict[str, np.ndarray]):
    """FaIR's aerosol-cloud term scale·log(1 + Σ shapeᵢ·Eᵢ); the difference between two calls is
    the forcing between two levels of emissions."""
    return scale * np.log(1 + sum(shapes[s] * emissions[s] for s in shapes))


def erf_per_kg(
    parameters: pd.DataFrame, species: pd.DataFrame, totals: dict[str, np.ndarray]
) -> dict[str, np.ndarray]:
    """W/m² per kg/yr of each aerosol species, (year, member): its aerosol-radiation efficiency,
    the slope of the aerosol-cloud forcing at the SSP's total emissions that year (`totals`, FaIR
    units by FaIR specie), black carbon's on snow and ice, and the tropospheric ozone of NOx, CO
    and VOCs. Their effect on methane's lifetime is not a forcing of its own: see
    lifetime_methane."""
    p = parameters
    cloud = ("Sulfur", "BC", "OC")
    shapes = {s: p[f"aci_shape[{s}]"].to_numpy() for s in cloud}
    scale = p["aci_scale"].to_numpy()
    denominator = 1 + sum(shapes[s][None, :] * totals[s][:, None] for s in cloud)

    def cloud_slope(s: str) -> np.ndarray:
        return scale[None, :] * shapes[s][None, :] / denominator

    def ari(s: str) -> np.ndarray:
        return p[f"erfari_radiative_efficiency[{s}]"].to_numpy()[None, :]

    snow = (
        species.loc["BC", "lapsi_radiative_efficiency"]
        * p["forcing_scale[Light absorbing particles on snow and ice]"].to_numpy()[None, :]
    )

    def ozone(s: str) -> np.ndarray:
        return p[f"ozone_radiative_efficiency[{s}]"].to_numpy()[None, :]

    flat = np.zeros_like(denominator)
    per_unit = {
        "so2": ari("Sulfur") + cloud_slope("Sulfur"),
        "bc": ari("BC") + cloud_slope("BC") + snow,
        "oc": ari("OC") + cloud_slope("OC"),
        "nh3": ari("NH3") + flat,
        "nox": ari("NOx") + ozone("NOx") + flat,
        "co": ozone("CO") + flat,
        "voc": ari("VOC") + ozone("VOC") + flat,
    }
    return {s: v / KG_PER_FAIR_UNIT for s, v in per_unit.items()}


def methane_sink(airborne: np.ndarray, emissions: np.ndarray, baseline: float) -> np.ndarray:
    """Mt of the methane above pre-industrial removed each year: what was emitted above the
    pre-industrial level less what stayed airborne. `airborne` (year, member), `emissions` by
    year."""
    return (emissions - baseline)[:, None] - np.gradient(airborne, axis=0)


def lifetime_methane(
    sink: np.ndarray, emitted: np.ndarray, baseline: float, sensitivity: float
) -> np.ndarray:
    """kg of methane that a kg less of a specie leaves in the air each year, (year, member): FaIR
    scales methane's lifetime by 1 + sensitivity·(E − baseline) for NOx and VOCs, so a kg less
    lengthens it by −sensitivity / (1 + sensitivity·(E − baseline)) of itself, and slows the
    removal of the methane above pre-industrial by as much, which acts as that much more methane
    emitted. NOx shortens the lifetime (more methane left), VOCs lengthen it (less)."""
    lengthening = -sensitivity / (1 + sensitivity * (emitted - baseline))
    return sink * lengthening[:, None]


def erf_per_kg_co2(
    ratios: dict[str, dict[str, np.ndarray]],
    erf: dict[str, np.ndarray],
    species: tuple[str, ...],
) -> dict[str, np.ndarray]:
    """W/m² per kg/yr of each sector's fossil CO₂ from the `species` that come with it, (year,
    member): added up member by member, so the range keeps how FaIR's members trade one species
    against another. NOx is left apart, as a clean fuel still burnt keeps it."""
    return {
        sector: sum(by_species[s][:, None] * erf[s] for s in species)
        for sector, by_species in ratios.items()
    }


def hoor_without_voc(nox: pd.DataFrame, voc: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Hoor et al.'s forcing of each source with the methane of the VOCs emitted with its NOx
    given back: their models perturbed all of a source's emissions, and the VOCs' own methane is
    now counted apart, so leaving it in would count it twice. `nox` and `voc` are CEDS's in Hoor's
    year; a Tg of VOC's methane and methane-ozone forcing is ACCMIP's, its ozone in proportion."""

    def offset(source: str) -> float:
        def tg(table: pd.DataFrame) -> float:
            return table[table["sector"].isin(HOOR_CEDS[source])]["kg"].sum() / 1e9

        per_tg_n = tg(voc) / (tg(nox) / NO2_PER_N)
        return per_tg_n * ACCMIP_VOC_MW * MW_PER_MT_CH4 / ACCMIP_CH4_MW * HOOR_NOX_TGN[source]

    return {
        source: {m: v + offset(source) for m, v in models.items()}
        for source, models in HOOR_METHANE_MW.items()
    }


def ship_to_land(table: dict[str, dict[str, float]] = HOOR_METHANE_MW) -> dict[str, float]:
    """How many times as much methane a Tg of ships' NOx destroys as a Tg of road's: the
    multi-model mean, and the lowest and highest model."""
    per_tg = {k: {m: v / HOOR_NOX_TGN[k] for m, v in models.items()} for k, models in table.items()}
    ratios = [per_tg["ship"][m] / per_tg["road"][m] for m in per_tg["road"]]
    mean = np.mean(list(per_tg["ship"].values())) / np.mean(list(per_tg["road"].values()))
    return {"median": float(mean), "low": float(min(ratios)), "high": float(max(ratios))}


def chemistry_per_kg(
    table: dict[str, dict[str, float]] = HOOR_METHANE_MW,
) -> dict[str, dict[str, float]]:
    """kg of methane emitted that has the methane and methane-ozone forcing of a kg of NO₂ less
    in Hoor et al.'s chemistry models, on land (road) and at sea (ships), in their year: the
    multi-model mean, and the lowest and highest model."""

    def place(source: str) -> dict[str, float]:
        per_kg = [
            v / HOOR_NOX_TGN[source] / NO2_PER_N / MW_PER_MT_CH4 for v in table[source].values()
        ]
        return {"median": float(np.mean(per_kg)), "low": min(per_kg), "high": max(per_kg)}

    return {"land": place("road"), "sea": place("ship")}


def held(per_place: dict[str, dict[str, float]], years: int, scale: float = 1.0) -> dict:
    """Each place's ends held over `years`, times `scale`. The chemistry variant multiplies them
    by FaIR's methane per kg of NOx relative to its value in Hoor et al.'s year, so the models'
    value is carried by FaIR's change with the scenario's methane and NOx."""
    return {
        place: {k: np.full(years, v * scale) for k, v in ends.items()}
        for place, ends in per_place.items()
    }


def nox_factors(
    ship_share: np.ndarray, ratio: dict[str, float]
) -> dict[str, dict[str, np.ndarray]]:
    """Each place's NOx methane relative to FaIR's global coefficient, by year: land sources f,
    ships ratio × f, with f set so that the average over the year's NOx (ships' share
    `ship_share`) is 1, which keeps FaIR's all-source total."""

    def land(r: float) -> np.ndarray:
        return 1 / (1 + (r - 1) * ship_share)

    return {
        "land": {k: land(r) for k, r in ratio.items()},
        "sea": {k: r * land(r) for k, r in ratio.items()},
    }


def plain_factors(years: int) -> dict[str, dict[str, np.ndarray]]:
    """FaIR's one coefficient for every source: a factor of 1 on land and at sea."""
    one = {k: np.ones(years) for k in ("median", "low", "high")}
    return {"land": one, "sea": one}


def ch4_per_kg_co2(
    ratios: dict[str, dict[str, np.ndarray]],
    kept: np.ndarray,
    factors: dict[str, dict[str, np.ndarray]],
    specie: str = "nox",
) -> dict[str, dict[str, list[float]]]:
    """kg of methane left in the air per kg of each sector's CO₂ cut, through its NOx (or VOCs),
    by year: its kg of the specie per kg of CO₂ × the place's factor × FaIR's methane per kg of
    the specie (`kept`, (year, member)). The range spans the ends of both."""
    low, median, high = np.percentile(kept, (5, 50, 95), axis=-1)

    def one(sector: str) -> dict[str, list[float]]:
        f = factors["sea" if sector in AT_SEA else "land"]
        emitted = ratios[sector][specie]
        ends = [k * f[e] for k in (low, high) for e in ("low", "high")]
        return {
            "median": rounded(emitted * median * f["median"]),
            "low": rounded(emitted * np.minimum.reduce(ends)),
            "high": rounded(emitted * np.maximum.reduce(ends)),
        }

    return {sector: one(sector) for sector in ratios}


def erf_band(values: np.ndarray) -> dict[str, list[float]]:
    low, median, high = np.percentile(values, (5, 50, 95), axis=-1)
    return {"median": rounded(median), "low": rounded(low), "high": rounded(high)}


LIFETIME_SPECIES = {"nox": "NOx", "voc": "VOC"}


def lifetime_methane_by_ssp(
    setup: climate_fair.Setup, rcmip_df: pd.DataFrame, species: pd.DataFrame, at: np.ndarray
) -> dict[str, dict[str, np.ndarray]]:
    """lifetime_methane of NOx and VOCs on the years `at`, from one FaIR run of each SSP."""
    years = np.arange(climate_fair.START, END_YEAR + 2)
    emissions = {ssp: rcmip.fair_emissions(rcmip_df, ssp, setup.emitted, years) for ssp in SSPS}
    run = climate_fair.run(setup, emissions, END_YEAR + 2)
    index = at - climate_fair.START

    def one(i: int, ssp: str, specie: str) -> np.ndarray:
        sink = methane_sink(
            run.ch4_airborne[:, i, :],
            emissions[ssp]["CH4"][: len(run.years)],
            species.loc["CH4", "baseline_emissions"],
        )
        return lifetime_methane(
            sink[index],
            emissions[ssp][specie][index],
            species.loc[specie, "baseline_emissions"],
            species.loc[specie, "ch4_lifetime_chemical_sensitivity"],
        )

    return {
        key: {ssp: one(i, ssp, specie) for i, ssp in enumerate(run.scenarios)}
        for key, specie in LIFETIME_SPECIES.items()
    }


# Assembly


def load_tables(archive: Path, year: int = ceds.LAST_YEAR) -> dict[str, pd.DataFrame]:
    return {s: ceds.by_sector_fuel(archive, CEDS_NAME[s], year) for s in SPECIES}


def build(cache_dir: Path, members: int | None = None) -> tuple[dict, dict]:
    """The coemissions.json document and diagnostics for the log and tests."""
    archive = ceds.path(cache_dir)
    tables = load_tables(archive)
    base = base_ratios(tables)
    hoor_table = hoor_without_voc(
        ceds.by_sector_fuel(archive, CEDS_NAME["nox"], HOOR_YEAR),
        ceds.by_sector_fuel(archive, CEDS_NAME["voc"], HOOR_YEAR),
    )
    rcmip_df = rcmip.load(cache_dir)
    setup = climate_fair.load_setup(cache_dir, members)
    parameters = pd.read_csv(setup.parameters, index_col=0).loc[setup.configs]
    species = pd.read_csv(setup.species_file, index_col=0)
    by_ssp = {ssp: ratios(base, trends(rcmip_df, ssp, YEARS)) for ssp in SSPS}
    totals = {
        ssp: rcmip.fair_emissions(rcmip_df, ssp, ["Sulfur", "BC", "OC"], YEARS) for ssp in SSPS
    }
    erf = {ssp: erf_per_kg(parameters, species, totals[ssp]) for ssp in SSPS}
    lifetime = lifetime_methane_by_ssp(setup, rcmip_df, species, np.array([HOOR_YEAR, *YEARS]))
    nox = {ssp: v[1:] for ssp, v in lifetime["nox"].items()}
    voc = {ssp: v[1:] for ssp, v in lifetime["voc"].items()}
    reference = {ssp: v[0] for ssp, v in lifetime["nox"].items()}
    ratio = ship_to_land(hoor_table)
    chemistry = chemistry_per_kg(hoor_table)
    n = len(YEARS)
    hoor = {
        ssp: nox_factors(
            rcmip.series(rcmip_df, ssp, SHIPPING_NOX_RCMIP, YEARS)
            / rcmip.series(rcmip_df, ssp, TOTAL_NOX_RCMIP, YEARS),
            ratio,
        )
        for ssp in SSPS
    }
    factors = {
        ssp: {"hoor": hoor[ssp], "fair": plain_factors(n), "chemistry": held(chemistry, n)}
        for ssp in SSPS
    }
    relative = {
        ssp: factors[ssp] | {"chemistry": held(chemistry, n, 1 / float(np.median(reference[ssp])))}
        for ssp in SSPS
    }
    kept = {
        ssp: {
            "hoor": nox[ssp],
            "fair": nox[ssp],
            "chemistry": nox[ssp] / reference[ssp][None, :],
        }
        for ssp in SSPS
    }
    document = {
        "years": [int(y) for y in YEARS],
        "perKgCo2": {
            ssp: {
                sector: {s: rounded(v) for s, v in by_sector.items()}
                for sector, by_sector in by_ssp[ssp].items()
            }
            for ssp in SSPS
        },
        "erfPerKg": {ssp: {s: erf_band(v) for s, v in erf[ssp].items()} for ssp in SSPS},
        "noxCh4PerKg": {ssp: erf_band(nox[ssp]) for ssp in SSPS},
        "noxCh4PerKgCo2": {
            variant: {
                ssp: ch4_per_kg_co2(by_ssp[ssp], kept[ssp][variant], factors[ssp][variant])
                for ssp in SSPS
            }
            for variant in NOX_VARIANTS
        },
        "noxPlaceFactor": {
            variant: {
                ssp: {
                    place: {k: rounded(v) for k, v in by_end.items()}
                    for place, by_end in relative[ssp][variant].items()
                }
                for ssp in SSPS
            }
            for variant in NOX_VARIANTS
        },
        "vocCh4PerKg": {ssp: erf_band(voc[ssp]) for ssp in SSPS},
        "vocCh4PerKgCo2": {
            ssp: ch4_per_kg_co2(by_ssp[ssp], voc[ssp], plain_factors(n), "voc") for ssp in SSPS
        },
        **{
            key: {
                ssp: {
                    sector: erf_band(v)
                    for sector, v in erf_per_kg_co2(by_ssp[ssp], erf[ssp], group).items()
                }
                for ssp in SSPS
            }
            for key, group in (("particleErfPerKgCo2", PARTICLES), ("ozoneErfPerKgCo2", OZONE))
        },
        "source": SOURCE,
    }
    diagnostics = {
        "base": base,
        "supply": supply_per_kg(tables),
        "parameters": parameters,
        "totals": totals,
        "nox": nox,
        "ship_to_land": ratio,
        "hoor": hoor_table,
        "voc": voc,
        "factors": relative,
        "chemistry": chemistry,
        "reference": reference,
        "members": len(setup.configs),
    }
    return document, diagnostics


def summary(document: dict, diagnostics: dict) -> list[str]:
    g = 1e3
    supply = diagnostics["supply"]
    lines = [
        f"fuel supply {s}, g per kg CO₂ burnt: "
        + ", ".join(f"{f} {supply[f][s] * g:.2f}" for f in SUPPLY_SECTORS)
        for s in ("ch4", "co2")
    ]
    hoor = diagnostics["hoor"]
    lines.append(
        "Hoor et al. methane mW/m² per Tg N, VOCs given back (as published): "
        + ", ".join(
            f"{k} {np.mean(list(hoor[k].values())) / HOOR_NOX_TGN[k]:.2f} "
            f"({np.mean(list(HOOR_METHANE_MW[k].values())) / HOOR_NOX_TGN[k]:.2f})"
            for k in hoor
        )
    )
    for sector, parts in diagnostics["base"].items():
        lines.append(
            f"{sector} {BASE_YEAR}, g/kg CO₂ own+supply: "
            + ", ".join(
                f"{s} {parts['own'][s] * g:.3f}+{parts['supply'][s] * g:.3f}" for s in SPECIES
            )
        )
    for ssp in SSPS:
        erf = document["erfPerKg"][ssp]
        lines.append(
            f"{ssp} ERF mW/m² per Mt/yr in {BASE_YEAR}/2050/2100: "
            + ", ".join(
                f"{s} "
                + "/".join(f"{erf[s]['median'][i] * 1e12:.2f}" for i in (0, 6, -1))
                + f" ({erf[s]['low'][0] * 1e12:.2f} to {erf[s]['high'][0] * 1e12:.2f})"
                for s in AEROSOLS
            )
        )
    ratio = diagnostics["ship_to_land"]
    lines.append(
        f"ships' NOx methane per Tg against road's: {ratio['median']:.2f} "
        f"({ratio['low']:.2f}–{ratio['high']:.2f})"
    )
    chemistry = diagnostics["chemistry"]
    lines.append(
        f"chemistry models' kg CH₄ per kg NO₂ in {HOOR_YEAR}: "
        + ", ".join(
            f"{p} {v['median']:.2f} ({v['low']:.2f}–{v['high']:.2f})" for p, v in chemistry.items()
        )
    )
    for ssp in SSPS:
        lines.append(
            f"{ssp} FaIR kg CH₄ per kg NOx in {HOOR_YEAR}: "
            f"{np.median(diagnostics['reference'][ssp]):.2f}"
        )
        for variant in NOX_VARIANTS:
            f = diagnostics["factors"][ssp][variant]
            lines.append(
                f"{ssp} {variant} NOx methane factor {BASE_YEAR}/2050/2100: land "
                + "/".join(f"{f['land']['median'][i]:.2f}" for i in (0, 6, -1))
                + ", sea "
                + "/".join(f"{f['sea']['median'][i]:.2f}" for i in (0, 6, -1))
            )
    return lines


def build_coemissions(cache_dir: Path, out_dir: Path) -> None:
    started = time.monotonic()
    document, diagnostics = build(cache_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "coemissions.json").write_text(
        json.dumps(document, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )
    for line in summary(document, diagnostics):
        log.info(line)
    log.info("coemissions.json built in %.0f s", time.monotonic() - started)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build_coemissions(DEFAULT_CACHE, DEFAULT_OUT)
