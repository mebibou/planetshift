"""Who eats each feed item: shares of its feed use by animal group, by region, two ways.

`species`: one global split of concentrate feed between species, scaled to each region's
production of each animal group. The same split applies to every feed item.

`gleam`: GLEAM-style regional rations. Each group needs a quantity of concentrate feed per
tonne of product (higher in high-income countries' more intensive systems), made of feed classes
(grain, oilseeds, pulses, roots, sugar, milk) in set proportions. A region's demand for a class
by a group is the sum over its countries of production x feed per tonne x the class's share of the
ration, and a feed item goes to groups in proportion to the demand for its class.

Seafood eats feed through aquaculture: its production here is the fed aquaculture of each country
(FishStat), not the FBS production, most of which is wild or unfed. Fish fed to animals (fishmeal)
are shared by their own split (`fishmeal` in feed_species.csv) in the species method and by the
`fish` class of the rations in the GLEAM-style one.
"""

from pathlib import Path

import pandas as pd

from .groups import ANIMAL_GROUPS

HERE = Path(__file__).resolve().parent.parent
WORLD = "World"
DECIMALS = 4

#: FBS items that are each group's main product, for its production. Co-products (offals, fats)
#: and processed products (butter, cream) would count the same animals twice.
PRODUCT_ITEMS = {
    2731: "ruminantMeat",
    2732: "ruminantMeat",
    2735: "ruminantMeat",
    2733: "pigMeat",
    2734: "poultryMeat",
    2848: "dairy",
    2744: "eggs",
}

#: Feed class of each item group; items of other groups (nuts, stimulants, spices, meat...) fall
#: back to the species split.
CLASS_OF_GROUP = {
    "cereals": "grain",
    "rice": "grain",
    "oilCrops": "oilseed",
    "pulses": "pulses",
    "rootsTubers": "roots",
    "vegetables": "roots",
    "fruit": "roots",
    "sugarCrops": "sugar",
    "dairy": "milk",
    "seafood": "fish",
}
SEAFOOD = "seafood"


def load_species(path: Path = HERE / "feed_species.csv") -> pd.Series:
    return pd.read_csv(path, index_col="group")["share"]


def load_fishmeal(path: Path = HERE / "feed_species.csv") -> pd.Series:
    """Split of fish fed to animals (fishmeal and whole fish) between groups."""
    return pd.read_csv(path, index_col="group")["fishmeal"].fillna(0.0)


def load_intake(path: Path = HERE / "feed_gleam_intake.csv") -> pd.DataFrame:
    return pd.read_csv(path, index_col="group")


def load_rations(path: Path = HERE / "feed_gleam_rations.csv") -> pd.DataFrame:
    return pd.read_csv(path, index_col="class")


def group_production(
    production: pd.DataFrame, aquaculture: pd.Series | None = None
) -> pd.DataFrame:
    """Tonnes by country (rows) and animal group (columns) from FBS production (columns iso3,
    fbs_code, production), with seafood the fed aquaculture by iso3 (none when not given)."""
    rows = production[production["fbs_code"].isin(PRODUCT_ITEMS)]
    land = rows.assign(group=rows["fbs_code"].map(PRODUCT_ITEMS)).pivot_table(
        index="iso3", columns="group", values="production", aggfunc="sum"
    )
    fed = (
        pd.DataFrame({SEAFOOD: aquaculture[aquaculture > 0]})
        if aquaculture is not None
        else pd.DataFrame(columns=[SEAFOOD])
    )
    both = land.drop(columns=SEAFOOD, errors="ignore").join(fed, how="outer")
    return both.reindex(columns=list(ANIMAL_GROUPS)).fillna(0.0)


def normalised(weights: pd.Series) -> dict[str, float]:
    """Shares summing to 1 after rounding (the largest absorbs the rounding), zeros dropped."""
    total = weights.sum()
    if total <= 0:
        return {}
    shares = (weights / total).round(DECIMALS)
    shares = shares[shares > 0]
    top = shares.idxmax()
    return {
        str(g): float(round(v + (1 - shares.sum() if g == top else 0), DECIMALS))
        for g, v in shares.items()
    }


def species_per_tonne(world_prod: pd.Series, split: pd.Series) -> pd.Series:
    """Share of world concentrate feed per tonne of each group's world production."""
    return (split / world_prod.where(world_prod > 0)).reindex(list(ANIMAL_GROUPS)).fillna(0.0)


def species_weights(prod: pd.DataFrame, per_tonne: pd.Series) -> pd.Series:
    """Each group's feed in a region: its global feed share x the region's share of its output."""
    return prod.sum().reindex(list(ANIMAL_GROUPS)).fillna(0.0) * per_tonne


def class_demand(
    prod: pd.DataFrame, rich: pd.Series, intake: pd.DataFrame, rations: pd.DataFrame
) -> pd.DataFrame:
    """Demand for each feed class (rows) by each group (columns) in a set of countries."""
    per_tonne = pd.DataFrame(
        {
            g: rich.map({True: intake.at[g, "high_income"], False: intake.at[g, "other"]})
            for g in ANIMAL_GROUPS
        },
        index=prod.index,
    )
    feed = (prod * per_tonne).sum()
    return rations[list(ANIMAL_GROUPS)] * feed


def region_shares(
    prod: pd.DataFrame,
    rich: pd.Series,
    items: pd.DataFrame,
    per_tonne: pd.Series,
    intake: pd.DataFrame,
    rations: pd.DataFrame,
    fallback: dict | None = None,
    fish_per_tonne: pd.Series | None = None,
) -> dict[str, dict]:
    """Both methods for one region: {method: {itemCode: {group: share}}}.

    `items` has columns code and group; a class nobody in the region eats falls back to the
    species split, and a region with no animal production to `fallback` (the world's). Seafood
    items take the fishmeal split (`fish_per_tonne`) in the species method."""
    species = normalised(species_weights(prod, per_tonne))
    if not species and fallback:
        return fallback
    fish = (
        normalised(species_weights(prod, fish_per_tonne)) if fish_per_tonne is not None else {}
    ) or species
    demand = class_demand(prod, rich, intake, rations)
    by_class = {c: normalised(demand.loc[c]) for c in demand.index}

    def gleam(group: str) -> dict:
        return by_class.get(CLASS_OF_GROUP.get(group, ""), {}) or species

    return {
        "species": {
            str(code): fish if group == SEAFOOD else species
            for code, group in zip(items["code"], items["group"], strict=True)
        },
        "gleam": {
            str(code): gleam(group)
            for code, group in zip(items["code"], items["group"], strict=True)
        },
    }


def feed_json(
    production: pd.DataFrame,
    regions: dict[str, str],
    rich: set[str],
    items: pd.DataFrame,
    split: pd.Series,
    intake: pd.DataFrame,
    rations: pd.DataFrame,
    aquaculture: pd.Series | None = None,
    fishmeal: pd.Series | None = None,
) -> dict:
    """shares[method][region][itemCode][group], for 'World' and every region. `aquaculture` is
    the fed aquaculture by iso3 (tonnes), `fishmeal` the split of fish fed to animals."""
    prod = group_production(production, aquaculture)
    is_rich = pd.Series({iso3: iso3 in rich for iso3 in prod.index}, dtype=bool)
    per_tonne = species_per_tonne(prod.sum(), split)
    fish = species_per_tonne(prod.sum(), fishmeal) if fishmeal is not None else None
    world = region_shares(prod, is_rich, items, per_tonne, intake, rations, None, fish)
    members = {
        r: [i for i in prod.index if regions.get(i) == r] for r in sorted(set(regions.values()))
    }
    by_region = {WORLD: world} | {
        r: region_shares(
            prod.loc[m], is_rich.loc[m], items, per_tonne, intake, rations, world, fish
        )
        for r, m in members.items()
        if m
    }
    return {
        "shares": {
            method: {r: shares[method] for r, shares in by_region.items()}
            for method in ("species", "gleam")
        }
    }
