"""Farmed mammals' live weight by country and by the food group each herd follows (mammals.json).

FAOSTAT's livestock stocks (GLE, which splits dairy from other cattle and breeding from market
swine) times IPCC 2006's typical animal mass by region, the method and masses of Greenspoon et al.
(2023), whose world wild mammal biomass the app compares them with.
"""

from pathlib import Path

import pandas as pd

from . import intensities as I

HERE = Path(__file__).resolve().parent.parent
WEIGHTS = HERE / "mammals_live_weights.csv"

REGIONS = (
    "north_america",
    "western_europe",
    "eastern_europe",
    "oceania",
    "latin_america",
    "africa",
    "middle_east",
    "asia",
    "indian_subcontinent",
)

#: UN sub-regions to IPCC 2006's livestock regions, as Greenspoon et al. (2023) grouped
#: FAOSTAT's regions.
IPCC_REGION = {
    "Northern America": "north_america",
    "Northern Europe": "western_europe",
    "Southern Europe": "western_europe",
    "Western Europe": "western_europe",
    "Eastern Europe": "eastern_europe",
    "Australia and New Zealand": "oceania",
    "Melanesia": "oceania",
    "Micronesia": "oceania",
    "Polynesia": "oceania",
    "Caribbean": "latin_america",
    "Central America": "latin_america",
    "South America": "latin_america",
    "Eastern Africa": "africa",
    "Middle Africa": "africa",
    "Northern Africa": "africa",
    "Southern Africa": "africa",
    "Western Africa": "africa",
    "Western Asia": "middle_east",
    "Central Asia": "asia",
    "Eastern Asia": "asia",
    "South-eastern Asia": "asia",
    "Southern Asia": "asia",
}
#: Countries Greenspoon et al. place outside their sub-region's IPCC region.
IPCC_REGION_OVERRIDES = {
    "ARM": "asia",
    "AZE": "asia",
    "GEO": "asia",
    "IRN": "middle_east",
    "PAK": "middle_east",
    "IND": "indian_subcontinent",
    "BGD": "indian_subcontinent",
    "BTN": "indian_subcontinent",
}

STOCKS = 5111
#: The share of each herd that follows no food group: animals kept for work (intensities.py).
OTHER = "other"

#: Greenspoon et al. (2023), wet weight in tonnes: wild land mammals (Results, ≈22 Mt) and wild
#: marine mammals (≈39 Mt).
WILD = {"land": 22e6, "marine": 39e6}
WILD_URL = "https://doi.org/10.1073/pnas.2204892120"

SOURCES = [
    {
        "id": "ipcc-2006-livestock",
        "name": "2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 4, Ch. 10, "
        "Tables 10A-4 to 10A-9 and 10.10: typical live weight of each farmed mammal by region "
        "(mammals_live_weights.csv)",
        "version": "2006",
        "url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html",
        "licence": "IPCC publication, figures cited",
    },
    {
        "id": "greenspoon-2023",
        "name": "Greenspoon et al. (2023), The global biomass of wild mammals, PNAS 120, "
        "e2204892120: wild land and marine mammals' wet biomass",
        "version": "2023, doi:10.1073/pnas.2204892120",
        "url": WILD_URL,
        "licence": "article CC BY-NC-ND 4.0, figures cited; code and data MIT",
    },
]


def load_weights(path: Path = WEIGHTS) -> pd.DataFrame:
    """kg per head by GLE species and IPCC region (columns species, region, kg)."""
    df = pd.read_csv(path)
    return df.melt(
        id_vars=["species"], value_vars=list(REGIONS), var_name="region", value_name="kg"
    )


def ipcc_regions(regions: dict[str, str]) -> dict[str, str]:
    """Each country's IPCC livestock region, from its UN sub-region; none when unknown."""
    return {
        iso3: IPCC_REGION_OVERRIDES.get(iso3, IPCC_REGION.get(sub, ""))
        for iso3, sub in regions.items()
        if iso3 in IPCC_REGION_OVERRIDES or sub in IPCC_REGION
    }


def live_weight(gle: pd.DataFrame, weights: pd.DataFrame, region: dict[int, str]) -> pd.DataFrame:
    """Tonnes of live weight by area and species: stocks times the region's kg per head.
    `region` maps FAOSTAT area codes to IPCC regions; other areas are left out."""
    stocks = gle[
        (gle["element_code"] == STOCKS)
        & gle["item_code"].isin(weights["species"])
        & gle["area_code"].isin(region)
    ]
    rows = stocks.assign(species=stocks["item_code"], region=stocks["area_code"].map(region))
    merged = rows.merge(weights, on=["species", "region"])
    return (
        merged.assign(t=merged["value"] * merged["kg"] / 1000.0)
        .groupby(["area_code", "species"], as_index=False)["t"]
        .sum()
    )


def herd_shares(species: int, area: int, splits: dict[int, pd.DataFrame]) -> dict[int, float]:
    """The FBS items a species' herd in an area follows, with their shares: those its emissions
    are allocated by (intensities.LIVESTOCK); a mixed herd by its protein output, all to its
    meat where the area reports neither."""
    out = I.LIVESTOCK.get(species, {})
    split = splits.get(species)
    known = split is not None and area in split.index
    return (
        out
        if isinstance(out, dict)
        else {out[0][1]: float(split.loc[area, "milk"]), out[1][1]: float(split.loc[area, "meat"])}
        if known
        else {out[1][1]: 1.0}
    )


def food_shares(
    weight: pd.DataFrame, qcl_production: pd.DataFrame, group_of: dict[int, str]
) -> pd.DataFrame:
    """Rows (area_code, species, group, share) for each herd of `weight`; a species with no food
    item (horses, asses, mules) has none."""
    splits = {
        sp: I.milk_meat_split(qcl_production, out[0][0], out[1][0])
        for sp, out in I.LIVESTOCK.items()
        if isinstance(out, tuple)
    }
    rows = [
        {"area_code": area, "species": sp, "group": group_of[code], "share": share}
        for area, sp in zip(weight["area_code"], weight["species"], strict=True)
        for code, share in herd_shares(sp, area, splits).items()
    ]
    columns = ["area_code", "species", "group", "share"]
    return pd.DataFrame(rows, columns=columns).groupby(columns[:3], as_index=False)["share"].sum()


def by_group(weight: pd.DataFrame, food: pd.DataFrame, nonfood: pd.DataFrame) -> pd.DataFrame:
    """Tonnes by area and group: each herd's share raised for food split by `food`, the rest
    (`nonfood`: area_code, species, share) and the herds with no food shares in OTHER."""
    kept = weight.merge(
        nonfood.rename(columns={"share": "nonfood"}), on=["area_code", "species"], how="left"
    ).fillna({"nonfood": 0.0})
    fed = kept.merge(food, on=["area_code", "species"])
    eaten = fed.assign(t=fed["t"] * (1 - fed["nonfood"]) * fed["share"])
    has_food = kept.set_index(["area_code", "species"]).index.isin(
        food.set_index(["area_code", "species"]).index
    )
    other = kept.assign(t=kept["t"] * (kept["nonfood"] + (1 - kept["nonfood"]) * ~has_food))
    return (
        pd.concat([eaten, other.assign(group=OTHER)], ignore_index=True)
        .groupby(["area_code", "group"], as_index=False)["t"]
        .sum()
        .query("t > 0")
        .reset_index(drop=True)
    )


def mammals_json(tonnes: pd.DataFrame, iso3: dict[int, str], year: int) -> dict:
    """byCountry[iso3][group]: tonnes of live weight, three significant figures."""
    rows = tonnes[tonnes["area_code"].isin(iso3)]
    return {
        "year": year,
        "byCountry": {
            iso3[area]: {r.group: I.significant(r.t, 3) for r in g.itertuples()}
            for area, g in sorted(rows.groupby("area_code"), key=lambda kv: iso3[kv[0]])
        },
        "wild": WILD,
        "source": WILD_URL,
    }
