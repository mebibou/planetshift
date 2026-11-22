"""World population from 1850 and UN WPP 2024's low, medium and high variants to 2100: the world
series for the population chart and, per country, each variant's ratio to the medium one, which
the app applies to the countries' own medium population (countries.json)."""

from pathlib import Path

import pandas as pd

from .cache import fetched

WPP_URL = (
    "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/"
    "WPP2024_TotalPopulationBySex.csv.gz"
)
WPP_PAGE = "https://population.un.org/wpp/"
OWID_URL = (
    "https://ourworldindata.org/grapher/population.csv"
    "?v=1&csvType=filtered&useColumnShortNames=true&country=~OWID_WRL"
)
OWID_PAGE = "https://ourworldindata.org/grapher/population"
OWID_NAME = "owid-population-world.csv"

VARIANTS = {"Medium": "medium", "Low": "low", "High": "high"}
FIRST_YEAR = 1850
#: The first year of WPP's estimates, which follow OWID's long-run series.
WPP_FIRST_YEAR = 1950
#: The last year of WPP 2024's estimates; its variants start the year after.
LAST_ESTIMATE = 2023
LAST_YEAR = 2100
#: The years each country's variant ratios are given for; the app interpolates between them,
#: from 1 in LAST_ESTIMATE (within 0.2% of the yearly ratios, summed over the world).
RATIO_YEARS = [2025, 2030, *range(2040, LAST_YEAR + 1, 10)]

SOURCE = (
    "World 1850–1949: Our World in Data's long-run population (HYDE 3.3, Gapminder v7); "
    "1950–2100: UN DESA, World Population Prospects 2024, estimates and the medium, low and "
    "high variants"
)
SOURCES = [
    {
        "id": "un-wpp-2024",
        "name": "UN DESA, World Population Prospects 2024, total population by sex",
        "version": "2024 revision: estimates 1950–2023, medium, low and high variants 2024–2100",
        "url": WPP_PAGE,
        "licence": "CC BY 3.0 IGO",
    },
    {
        "id": "owid-population",
        "name": "Our World in Data, Population (long-run series: HYDE 3.3, Gapminder v7, UN WPP)",
        "version": "updated 2024-07-15, world 1850–1949",
        "url": OWID_PAGE,
        "licence": "CC BY 4.0",
    },
]


def read_wpp(cache_dir: Path) -> pd.DataFrame:
    """WPP's world and country rows of the three variants: iso3 ('WLD' for the world), variant,
    year and people."""
    raw = pd.read_csv(
        fetched(cache_dir, WPP_URL),
        usecols=["ISO3_code", "LocTypeName", "Variant", "Time", "PopTotal"],
        low_memory=False,
    )
    return tidy_wpp(raw)


def tidy_wpp(raw: pd.DataFrame) -> pd.DataFrame:
    rows = raw[raw["Variant"].isin(VARIANTS) & raw["LocTypeName"].isin(["World", "Country/Area"])]
    return pd.DataFrame(
        {
            "iso3": rows["ISO3_code"].where(rows["LocTypeName"] != "World", "WLD"),
            "variant": rows["Variant"].map(VARIANTS),
            "year": rows["Time"].astype(int),
            "people": rows["PopTotal"] * 1000,
        }
    ).reset_index(drop=True)


def read_owid(cache_dir: Path) -> pd.Series:
    """OWID's world population by year."""
    raw = pd.read_csv(fetched(cache_dir, OWID_URL, OWID_NAME))
    return raw.set_index("year")[raw.columns[-1]]


def series(values: pd.Series, first: int, last: int) -> dict:
    kept = values.loc[first:last].round()
    return {"years": [int(y) for y in kept.index], "values": [int(v) for v in kept]}


def world(wpp: pd.DataFrame, owid: pd.Series) -> dict:
    """The world's history (OWID to 1949, WPP's estimates from 1950) and each variant from the
    year after the last estimate."""
    w = wpp[wpp["iso3"] == "WLD"].pivot_table(index="year", columns="variant", values="people")
    history = pd.concat(
        [owid.loc[FIRST_YEAR : WPP_FIRST_YEAR - 1], w["medium"].loc[WPP_FIRST_YEAR:LAST_ESTIMATE]]
    )
    return {
        "history": series(history, FIRST_YEAR, LAST_ESTIMATE),
        **{v: series(w[v], LAST_ESTIMATE + 1, LAST_YEAR) for v in ("medium", "low", "high")},
    }


def country_ratios(wpp: pd.DataFrame, countries: list[str]) -> dict[str, dict[str, list[float]]]:
    """Each country's low and high variant over its medium one in RATIO_YEARS, for the countries
    WPP has in every one of those years."""
    rows = wpp[wpp["iso3"].isin(countries) & wpp["year"].isin(RATIO_YEARS)]
    p = rows.pivot_table(index=["iso3", "year"], columns="variant", values="people")

    def ratios(g: pd.DataFrame) -> dict[str, list[float]]:
        return {v: [round(float(r), 4) for r in g[v] / g["medium"]] for v in ("low", "high")}

    def complete(g: pd.DataFrame) -> bool:
        return len(g) == len(RATIO_YEARS) and bool(
            g.notna().all().all() and (g["medium"] > 0).all()
        )

    return {
        str(iso3): ratios(g.droplevel("iso3").reindex(RATIO_YEARS))
        for iso3, g in p.groupby(level="iso3")
        if complete(g)
    }


def population_json(wpp: pd.DataFrame, owid: pd.Series, countries: list[str]) -> dict:
    return {
        "world": world(wpp, owid),
        "lastEstimate": LAST_ESTIMATE,
        "ratioYears": RATIO_YEARS,
        "byCountry": country_ratios(wpp, countries),
        "source": SOURCE,
    }
