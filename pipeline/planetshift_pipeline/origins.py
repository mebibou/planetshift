"""Where each country's imports of each food come from (origins.json), from FAOSTAT's detailed
trade matrix: the tonnes each country reports importing from each partner, over three years,
summed over the traded items of each Food Balance Sheet item (`trade_items.csv`)."""

from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
ITEMS_CSV = HERE / "trade_items.csv"

#: An item's origins are kept from the largest down until they cover this share of its imports,
#: at most MAX_ORIGINS of them and none under 1%, in whole percents; the rest takes the world's
#: average intensity.
COVERED, MAX_ORIGINS, DIGITS = 0.95, 10, 2


def load_items(path: Path = ITEMS_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"tm_code": int, "fbs_code": int})


def by_origin(imports: pd.DataFrame, items: pd.DataFrame, iso3: dict[int, str]) -> pd.DataFrame:
    """importer, fbs_code, origin, t: tonnes imported by model country, food and origin. A
    partner outside the model, or the importer itself, is kept as origin '' (the world)."""
    rows = imports.merge(items[["tm_code", "fbs_code"]], left_on="item_code", right_on="tm_code")
    rows = rows[rows["reporter"].isin(iso3) & (rows["t"] > 0)]
    origin = rows["partner"].map(iso3).fillna("")
    importer = rows["reporter"].map(iso3)
    return (
        rows.assign(importer=importer, origin=origin.where(origin != importer, ""))
        .groupby(["importer", "fbs_code", "origin"], as_index=False)["t"]
        .sum()
    )


def top_origins(group: pd.DataFrame) -> list[list]:
    """The main known origins of one importer's food as [iso3, share], largest first."""
    total = group["t"].sum()
    known = group[group["origin"] != ""].sort_values("t", ascending=False).head(MAX_ORIGINS)
    shares = known["t"] / total
    kept = shares[(shares.cumsum() - shares) < COVERED]
    return [
        [iso3, round(float(s), DIGITS)]
        for iso3, s in zip(known.loc[kept.index, "origin"], kept, strict=True)
        if round(float(s), DIGITS) > 0
    ]


def origins_json(rows: pd.DataFrame, years: tuple[int, int]) -> dict:
    by_country: dict[str, dict[str, list]] = {}
    for (importer, code), group in rows.groupby(["importer", "fbs_code"]):
        found = top_origins(group)
        if found:
            by_country.setdefault(importer, {})[str(code)] = found
    return {"years": list(years), "byCountry": dict(sorted(by_country.items()))}
