"""Freshwater withdrawn per tonne of each item in each country, by tier, and the scarcity-weighted
use HESTIA gives for crops (docs/methodology/en/water.md).

The tiers are the emissions' (`intensities.merge`): 1 HESTIA country, 2 HESTIA region or world,
4 Poore & Nemecek (2018), 5 proxy item or primary item over its extraction rate, 6 group world
median. There is no tier 3. Animal products carry only the water withdrawn besides their
concentrate feed, whose water is counted on the crops.
"""

import json
from pathlib import Path

import pandas as pd

from . import intensities as I
from .cache import fetched
from .sources import food_stages, literature

URL = (
    "https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore.csv"
    "?v=1&csvType=full&useColumnShortNames=true"
)
FILE = "water-withdrawals-per-kg-poore.csv"
PAGE = "https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore"
COLUMN = "freshwater_withdrawals_per_kilogram__poore__and__nemecek__2018"
AQUASTAT_URLS = {
    "total": "https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWTL.K3"
    "?format=json&per_page=20000&mrnev=1",
    "agriculture": "https://api.worldbank.org/v2/country/all/indicator/ER.H2O.FWAG.ZS"
    "?format=json&per_page=20000&mrnev=1",
}
IRRIGATION_ITEM = 6690

SOURCES = [
    {
        "id": "owid-water-withdrawals-poore",
        "name": "Our World in Data, Freshwater withdrawals per kilogram of food product "
        "(Poore & Nemecek 2018), litres per kg of retail product",
        "version": "2018",
        "url": PAGE,
        "licence": "CC BY 4.0",
    }
]

#: The one scope of the water, so that the emissions' tier merge serves it unchanged.
SCOPE = "cradleToFarmGate"
LITRES = "co2"
#: Poore & Nemecek's products as Our World in Data names them, where the names differ.
OWID_NAMES = {
    "Wheat & Rye (Bread)": "Wheat & Rye",
    "Maize (Meal)": "Maize",
    "Bovine Meat (beef herd)": "Beef (beef herd)",
    "Bovine Meat (dairy herd)": "Beef (dairy herd)",
}
FED_GROUPS = ("ruminantMeat", "pigMeat", "poultryMeat", "dairy", "eggs")
SEAFOOD_NOTE = "freshwater of aquaculture not counted"


def path(cache_dir: Path) -> Path:
    return fetched(Path(cache_dir) / "owid", URL, FILE)


def read_withdrawals(file: Path) -> dict[str, float]:
    """Litres withdrawn per kg of retail product, by Poore & Nemecek's product."""
    raw = pd.read_csv(file)
    return dict(zip(raw["entity"], raw[COLUMN].astype(float), strict=True))


def read_farm_stage(file: Path) -> dict[str, float]:
    """Farm-stage kg CO₂e per kg of retail product, by product (the same extract as the chain)."""
    raw = pd.read_csv(file)
    return dict(zip(raw["entity"], raw["food_emissions_farm"].astype(float), strict=True))


def per_fbs_unit(term, withdrawals: dict, farm: dict) -> float | None:
    """Litres per kg of the product's FBS unit: per kg retail times the kg of retail product a kg
    of the FBS unit gives, the ratio of the farm stage per FBS unit (`literature_terms.csv`) to
    the farm stage per kg retail."""
    name = OWID_NAMES.get(term.product, term.product)
    litres, retail = withdrawals.get(name), farm.get(name)
    return None if litres is None or not retail else litres * term.farm_kg_co2e_per_kg / retail


def literature_rows(terms: pd.DataFrame, withdrawals: dict, farm: dict) -> list[dict]:
    """Litres per tonne of the FBS item of each Poore & Nemecek product that has a value."""
    return [
        {
            "fbs_item_code": int(term.fbs_item_code),
            "weight": float(term.weight_kt),
            "litres": litres * float(term.kg_product_per_kg_item) * 1000,
        }
        for term in terms.itertuples()
        for litres in [per_fbs_unit(term, withdrawals, farm)]
        if litres is not None
    ]


def literature_water(rows: list[dict]) -> pd.DataFrame:
    """World litres per tonne of each item, its products weighted by their food and waste."""
    frame = pd.DataFrame(rows, columns=["fbs_item_code", "weight", "litres"])
    sums = (
        frame.assign(weighted=frame["litres"] * frame["weight"])
        .groupby("fbs_item_code", as_index=False)[["weighted", "weight"]]
        .sum()
    )
    return pd.DataFrame(
        {
            "fbs_item_code": sums["fbs_item_code"].astype(int),
            "area": "World",
            "litres": sums["weighted"] / sums["weight"],
            "url": literature.SOURCE_URL,
        }
    )


def class_litres(crops: pd.DataFrame, feed: pd.DataFrame, class_of: dict[int, str]) -> dict:
    """Litres per tonne of each feed class, the crops' values weighted by their feed use.
    `crops` has iso3, fbs_code, litres; `feed` iso3, fbs_code, feed."""
    rows = crops.merge(feed, on=["iso3", "fbs_code"])
    rows = rows.assign(cls=rows["fbs_code"].map(class_of), used=rows["litres"] * rows["feed"])
    sums = rows.dropna(subset=["cls"]).groupby("cls")[["used", "feed"]].sum()
    sums = sums[sums["feed"] > 0]
    return (sums["used"] / sums["feed"]).to_dict()


def feed_litres(group: str, rich: bool, intake: pd.DataFrame, rations: pd.DataFrame, cls: dict):
    """Litres of the concentrate feed in a tonne of an animal group's product (GLEAM-style
    concentrate per tonne and ration, `feed_gleam_*.csv`)."""
    per_tonne = intake.loc[group, "high_income" if rich else "other"]
    return per_tonne * sum(share * cls.get(c, 0.0) for c, share in rations[group].items())


def animal_water(
    world: pd.DataFrame,
    countries: list[str],
    rich: set[str],
    group_of: dict[int, str],
    feed_of,
) -> pd.DataFrame:
    """Each country's litres per tonne of the fed animal items: Poore & Nemecek's world value
    less the water of the concentrate feed (`feed_of(group, rich)`), never below zero."""
    fed = world[world["fbs_item_code"].map(group_of).isin(FED_GROUPS)]
    return pd.DataFrame(
        [
            {
                "fbs_item_code": int(row.fbs_item_code),
                "area": iso3,
                "litres": max(0.0, row.litres - feed_of(group_of[row.fbs_item_code], iso3 in rich)),
                "url": row.url,
            }
            for row in fed.itertuples()
            for iso3 in countries
        ],
        columns=["fbs_item_code", "area", "litres", "url"],
    )


def as_gases(df: pd.DataFrame) -> pd.DataFrame:
    """Litres in the place of the first gas, so that the emissions' merge carries them."""
    return df.assign(scope=SCOPE, co2=df["litres"], ch4=0.0, n2o=0.0)


def candidates(df: pd.DataFrame, countries: list[str], members: dict, tier_country: int, tier_wide):
    return I.candidates_from(as_gases(df), countries, members, tier_country, tier_wide)


def litres_of(merged: pd.DataFrame) -> pd.DataFrame:
    return merged.rename(columns={LITRES: "litres"})[
        ["iso3", "fbs_code", "litres", "tier", "source"]
    ]


def scarcity_rows(hestia: pd.DataFrame, countries: list[str]) -> pd.DataFrame:
    """L eq per tonne where a country's own HESTIA aggregation has AWARE's value."""
    own = hestia[hestia["area"].isin(countries) & hestia["scarcity"].notna()]
    return own.rename(columns={"area": "iso3", "fbs_item_code": "fbs_code"})[
        ["iso3", "fbs_code", "scarcity"]
    ]


def significant(x: float) -> float:
    return I.significant(float(x))


def by_country_json(litres: pd.DataFrame, sources: list[str]) -> dict:
    """byCountry[iso3][itemCode] = [litres per tonne, tier, source index]."""
    index = {s: i for i, s in enumerate(sources)}
    return {
        iso3: {
            str(int(row.fbs_code)): [significant(row.litres), int(row.tier), index[row.source]]
            for row in rows.sort_values("fbs_code").itertuples()
        }
        for iso3, rows in litres.groupby("iso3")
    }


def nested_json(df: pd.DataFrame, key: str, value: str) -> dict:
    """{iso3: {key: value}}, the zeros left out."""
    kept = df[df[value] > 0]
    return {
        iso3: {str(int(k)): significant(v) for k, v in zip(rows[key], rows[value], strict=True)}
        for iso3, rows in kept.sort_values(["iso3", key]).groupby("iso3")
    }


def water_json(
    litres: pd.DataFrame, scarcity: pd.DataFrame, cake: pd.DataFrame, irrigated: dict
) -> dict:
    """The water file: litres per tonne by tier and source, L eq per tonne where HESTIA has
    them, the litres a year an oilseed's cake carries, and the land equipped for irrigation."""
    sources = sorted(litres["source"].unique())
    return {
        "sources": sources,
        "byCountry": by_country_json(litres, sources),
        "scarcity": nested_json(scarcity, "fbs_code", "scarcity"),
        "oilcake": nested_json(cake, "primary_code", LITRES),
        "irrigatedHa": {iso3: significant(ha) for iso3, ha in sorted(irrigated.items()) if ha > 0},
    }


def aquastat_agriculture(total: list[dict], share: list[dict]) -> dict[str, float]:
    """Litres withdrawn for agriculture a year by ISO3 code (and WLD), from AQUASTAT's total
    withdrawals (10⁹ m³) times agriculture's share (%), as the World Bank serves them."""
    totals = {r["countryiso3code"]: r["value"] for r in total if r.get("value") is not None}
    return {
        r["countryiso3code"]: totals[r["countryiso3code"]] * r["value"] / 100 * 1e12
        for r in share
        if r.get("value") is not None and r["countryiso3code"] in totals
    }


def read_aquastat(cache_dir: Path) -> dict[str, float]:
    folder = Path(cache_dir) / "worldbank"
    pages = {
        key: json.loads(fetched(folder, url, f"aquastat-{key}.json").read_text())[1]
        for key, url in AQUASTAT_URLS.items()
    }
    return aquastat_agriculture(pages["total"], pages["agriculture"])


def farm_stage(cache_dir: Path) -> dict[str, float]:
    return read_farm_stage(food_stages.path(cache_dir))


def literature_world(cache_dir: Path) -> pd.DataFrame:
    """Poore & Nemecek's litres per tonne of each item they cover, world averages."""
    rows = literature_rows(
        literature.load_terms(), read_withdrawals(path(cache_dir)), farm_stage(cache_dir)
    )
    return literature_water(rows)
