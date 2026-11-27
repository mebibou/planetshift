"""How much each food item's production depends on animal pollination, by country.

Each FAOSTAT crop has the pollinator-dependence class Aizen et al. (2019, Appendix S1) give it,
most of them Klein et al. (2007)'s, as the ratio Aizen et al. (2009) use for the class: the share
of the crop's yield lost without pollinators. An FBS item's ratio is the mean of its crops'
ratios, weighted by the country's production of each; a processed item (oil, sugar, wine) takes
its primary items' crops. Crops without a class are left out of the mean."""

from pathlib import Path

import pandas as pd

from .land import PRODUCTION

HERE = Path(__file__).resolve().parent.parent

#: Klein et al. (2007)'s classes (none, little, modest, great, essential) as the yield lost
#: without pollinators, the middle of each class's range (Aizen et al. 2009).
RATIOS = {0: 0.0, 1: 0.05, 2: 0.25, 3: 0.65, 4: 0.95}
#: Processed items proxies.csv gives no extraction for: rice bran oil and maize germ oil.
EXTRA_PRIMARIES = {2581: (2807,), 2582: (2514,)}
DIGITS = 4
#: The years of crop production the weights add up, ending with the base year.
YEARS = 3

SOURCES = [
    {
        "id": "aizen-2019",
        "name": "Aizen et al. (2019), Global agricultural productivity is threatened by "
        "increasing pollinator dependence without a parallel increase in crop "
        "diversification, Glob. Change Biol. 25, 3516-3527: Appendix S1, the "
        "pollinator-dependence class of 114 FAO crops (most from Klein et al. 2007), as the "
        "ratios of Aizen et al. (2009)",
        "version": "2019",
        "url": "https://doi.org/10.1111/gcb.14736",
        "licence": "CC BY 4.0",
    }
]


def load_classes(path: Path = HERE / "pollination_classes.csv") -> pd.DataFrame:
    """Each classified QCL crop's ratio, and whether it depends on pollinators at all."""
    df = pd.read_csv(path)
    ratio = df["class"].map(RATIOS)
    return pd.DataFrame({"qcl_code": df["qcl_code"], "ratio": ratio, "dependent": ratio > 0})


def primaries(extraction: dict[int, list[tuple[int, float]]]) -> dict[int, tuple[int, ...]]:
    """The primary items each processed item is made from."""
    return {code: tuple(p for p, _ in pairs) for code, pairs in extraction.items()} | (
        EXTRA_PRIMARIES
    )


def item_crops(crops: pd.DataFrame, made_from: dict[int, tuple[int, ...]]) -> pd.DataFrame:
    """The QCL crops of each FBS item and their share in it (qcl_items.csv), and of each
    processed item the crops of its primary items."""
    own = crops.dropna(subset=["fbs_code"])[["qcl_code", "fbs_code", "share"]].astype(
        {"fbs_code": int}
    )
    links = pd.DataFrame(
        [(item, p) for item, ps in made_from.items() for p in ps], columns=["item", "fbs_code"]
    )
    derived = links.merge(own, on="fbs_code").drop(columns="fbs_code")
    return pd.concat([own, derived.rename(columns={"item": "fbs_code"})], ignore_index=True)


def crop_weights(qcl: pd.DataFrame, links: pd.DataFrame, areas: set[int]) -> pd.DataFrame:
    """Tonnes of each crop of each item by area, over the years of `qcl`, times its share."""
    rows = qcl[(qcl["element_code"] == PRODUCTION) & qcl["area_code"].isin(areas)]
    t = rows.groupby(["area_code", "item_code"], as_index=False)["value"].sum()
    mapped = t.merge(links, left_on="item_code", right_on="qcl_code")
    return mapped.assign(t=mapped["value"] * mapped["share"])[
        ["area_code", "fbs_code", "qcl_code", "t"]
    ]


def ratios(weights: pd.DataFrame, classes: pd.DataFrame, keys: list[str]) -> pd.DataFrame:
    """Each item's ratio and share of dependent crops by `keys`: means over its classified crops
    weighted by their tonnes. An item none of whose crops has a class is left out."""
    df = weights.merge(classes, on="qcl_code")
    df = df[df["t"] > 0]
    df = df.assign(r=df["t"] * df["ratio"], d=df["t"] * df["dependent"])
    sums = df.groupby([*keys, "fbs_code"], as_index=False)[["t", "r", "d"]].sum()
    return sums.assign(
        ratio=(sums["r"] / sums["t"]).round(DIGITS), dependent=(sums["d"] / sums["t"]).round(DIGITS)
    )[[*keys, "fbs_code", "ratio", "dependent"]]


def pairs(df: pd.DataFrame) -> dict[str, list[float]]:
    return {
        str(c): [float(r), float(d)]
        for c, r, d in zip(df["fbs_code"], df["ratio"], df["dependent"], strict=True)
    }


def pollination_json(country: pd.DataFrame, world: pd.DataFrame) -> dict:
    """`world[item]` and, where the country's own crops give another value, `byCountry[iso3]
    [item]`, each `[ratio, share of dependent crops]`."""
    merged = country.merge(world, on="fbs_code", suffixes=("", "_world"))
    own = merged[
        (merged["ratio"] != merged["ratio_world"])
        | (merged["dependent"] != merged["dependent_world"])
    ]
    return {
        "source": SOURCES[0]["url"],
        "world": pairs(world),
        "byCountry": {iso3: pairs(g) for iso3, g in own.groupby("iso3")},
    }


def shares(rows: pd.DataFrame) -> dict[str, float]:
    """The share of the tonnes (column t) from dependent crops and the share pollination gives,
    over the rows with a ratio."""
    total = rows["t"].sum()
    return {
        "dependent": float((rows["t"] * rows["dependent"]).sum() / total),
        "attributable": float((rows["t"] * rows["ratio"]).sum() / total),
    }
