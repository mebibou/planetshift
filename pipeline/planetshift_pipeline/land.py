"""Land used by farming in the base year, and how fast freed farmland takes up carbon (land.json).

Cropland: FAOSTAT harvested area per tonne of each crop's Food Balance Sheet production, with the
processed share of a crop carried by the processed items, as for emissions. Pasture: FAOSTAT's
permanent meadows and pastures, shared between ruminant meat and dairy by livestock units.
Regrowth: the country rates of natural forest regrowth of Cook-Patton et al. (2020).
"""

import io
from pathlib import Path

import numpy as np
import pandas as pd

from . import intensities as I

HERE = Path(__file__).resolve().parent.parent

#: QCL elements.
AREA_HARVESTED, PRODUCTION, STOCKS, MILK_ANIMALS = 5312, 5510, 5111, 5318
#: RL items and element (1000 ha), EK element (livestock units).
LAND_AREA, CROPLAND, FOREST, PASTURE, RL_AREA = 6601, 6620, 6646, 6655, 5110
#: Temporary meadows and pastures: grass sown on arable land, the one fodder crop FAOSTAT still
#: reports by area.
TEMPORARY_MEADOWS = 6633
LSU = 5118
THOUSAND = 1000.0

#: Cattle stocks and the dairy herd (cows milked); the dairy herd is shared like its emissions.
CATTLE, CATTLE_MILK = 866, 882
#: Mixed herds: species -> (milk product, meat product), split by protein as in intensities.py.
MIXED_HERDS = {946: (951, 947), 976: (982, 977), 1016: (1020, 1017), 1126: (1130, 1127)}
GROUP_OF = {2848: "dairy", 2731: "ruminantMeat", 2732: "ruminantMeat", 2735: "ruminantMeat"}
#: Balance uses other than processing, whose land the processed items carry.
USE_FIELDS = ("food", "feed", "losses", "seed", "other")

#: An own ha/t more than this factor above or below the item's world median is a mismatch
#: between FAOSTAT's area and the balance's production, and not used.
OUTLIER_FACTOR = 20.0

#: Each crushed oilseed's oil and cake: tonnes of cake per tonne of oil and world prices.
OILCAKES = HERE / "oilcakes.csv"

REGROWTH_URL = (
    "https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-020-2686-x/"
    "MediaObjects/41586_2020_2686_MOESM2_ESM.csv"
)
REGROWTH_FILE = "cook-patton-2020-supplementary-data-1.csv"
REGROWTH_NAMES = HERE / "land_regrowth_names.csv"
#: Cook-Patton et al. map the first 30 years of natural regrowth.
REGROWTH_YEARS = 30
CO2_PER_C = 44.0 / 12.0
#: A country missing from Cook-Patton's table with less forest than this share of its land is
#: taken as dryland, where forest does not grow back on its own.
DRYLAND_FOREST_SHARE = 0.10

SOURCES = [
    {
        "id": "cook-patton-2020",
        "name": "Cook-Patton et al. (2020), Mapping carbon accumulation potential from global "
        "natural forest regrowth, Nature 585, 545-550, Supplementary Data 1 (country rates)",
        "version": "2020, doi:10.1038/s41586-020-2686-x",
        "url": "https://doi.org/10.1038/s41586-020-2686-x",
        "licence": "article under exclusive licence to Springer Nature; country rates reused "
        "with citation (the map layers on Global Forest Watch are CC BY 4.0)",
    },
    {
        "id": "faostat-trade",
        "name": "FAOSTAT Trade, crops and livestock products: world export value over quantity "
        "of vegetable oils and oilcakes, 2021-2023 (oilcakes.csv)",
        "version": "read 2026-11-22",
        "url": "https://www.fao.org/faostat/en/#data/TCL",
        "licence": "CC BY 4.0",
    },
    {
        "id": "fao-tcf",
        "name": "FAO, Technical Conversion Factors for Agricultural Commodities: oil and cake "
        "per tonne of oilseed crushed (oilcakes.csv)",
        "version": "2000",
        "url": "https://www.fao.org/economic/the-statistics-division-ess/methodology/"
        "methodology-systems/technical-conversion-factors-for-agricultural-commodities/en/",
        "licence": "FAO publication, figures cited",
    },
]


# --- Cropland per tonne ---------------------------------------------------------------------


def crop_sums(qcl: pd.DataFrame, crops: pd.DataFrame, base_year: int) -> pd.DataFrame:
    """Per area and FBS item: harvested area and production summed over the years of `qcl`
    (only crop-years with both), and the base year's production, each times the crop's share."""
    wide = qcl[qcl["element_code"].isin([AREA_HARVESTED, PRODUCTION])].pivot_table(
        index=["area_code", "item_code", "year"],
        columns="element_code",
        values="value",
        aggfunc="sum",
    )
    wide = wide.reindex(columns=[AREA_HARVESTED, PRODUCTION]).fillna(0.0)
    both = wide[(wide[AREA_HARVESTED] > 0) & (wide[PRODUCTION] > 0)].reset_index()
    mapped = both.merge(
        crops.dropna(subset=["fbs_code"])[["qcl_code", "fbs_code", "share"]],
        left_on="item_code",
        right_on="qcl_code",
    )
    mapped = mapped.assign(
        fbs_code=mapped["fbs_code"].astype(int),
        ha=mapped[AREA_HARVESTED] * mapped["share"],
        t=mapped[PRODUCTION] * mapped["share"],
        t_base=np.where(mapped["year"] == base_year, mapped[PRODUCTION] * mapped["share"], 0.0),
    )
    return mapped.groupby(["area_code", "fbs_code"], as_index=False)[["ha", "t", "t_base"]].sum()


def own_ha_per_tonne(sums: pd.DataFrame, production: pd.DataFrame) -> pd.DataFrame:
    """ha per tonne of FBS production: the crops' area per tonne over the years, times the
    base year's tonnes of crop per tonne of the FBS item (milled rice, cottonseed...).
    `production` has columns area_code, fbs_code, production (t, base year)."""
    df = sums.merge(production, on=["area_code", "fbs_code"])
    df = df[(df["t"] > 0) & (df["t_base"] > 0) & (df["production"] > 0)]
    return df.assign(ha_per_t=df["ha"] / df["t"] * df["t_base"] / df["production"])[
        ["area_code", "fbs_code", "ha_per_t"]
    ].reset_index(drop=True)


def without_outliers(own: pd.DataFrame, production: pd.DataFrame) -> pd.DataFrame:
    """Drop values more than OUTLIER_FACTOR times above or below the item's production-weighted
    world median."""
    df = own.merge(production, on=["area_code", "fbs_code"])
    medians = df.groupby("fbs_code")[["ha_per_t", "production"]].apply(
        lambda g: I.weighted_median(g["ha_per_t"], g["production"])
    )
    ratio = df["ha_per_t"] / df["fbs_code"].map(medians)
    keep = ratio.between(1 / OUTLIER_FACTOR, OUTLIER_FACTOR)
    return own[keep.to_numpy()].reset_index(drop=True)


def filled(
    own: pd.DataFrame,
    countries: list[str],
    items: list[int],
    regions: dict[str, str],
    production: pd.DataFrame,
) -> pd.DataFrame:
    """One ha/t per country and primary item: the country's own, else the production-weighted
    median of its region, else of the world. `own` and `production` are keyed by iso3."""
    weighted = own.merge(production, on=["iso3", "fbs_code"], how="left").fillna({"production": 0})
    weighted = weighted.assign(region=weighted["iso3"].map(regions))

    def medians(keys: list[str]) -> pd.Series:
        return weighted.groupby(keys)[["ha_per_t", "production"]].apply(
            lambda g: I.weighted_median(g["ha_per_t"], g["production"])
        )

    by_region, world = medians(["region", "fbs_code"]), medians(["fbs_code"])
    grid = pd.DataFrame([{"iso3": c, "fbs_code": i} for c in countries for i in items])
    grid = grid.merge(own, on=["iso3", "fbs_code"], how="left")
    region_value = pd.Series(
        [
            by_region.get((regions.get(c), i), np.nan)
            for c, i in zip(grid["iso3"], grid["fbs_code"], strict=True)
        ],
        index=grid.index,
    )
    world_value = grid["fbs_code"].map(world)
    how = np.select(
        [grid["ha_per_t"].notna(), region_value.notna(), world_value.notna()],
        ["country", "region", "world"],
        default="none",
    )
    value = grid["ha_per_t"].fillna(region_value).fillna(world_value)
    out = grid.assign(ha_per_t=value, how=how)
    return out[out["how"] != "none"].reset_index(drop=True)


def derived(
    primary: pd.DataFrame,
    derived_items: list[int],
    countries: list[str],
    extraction: dict[int, list[tuple[int, float]]],
    processing: pd.DataFrame,
) -> pd.DataFrame:
    """Processed items' ha/t: their primary items' over the extraction rate, weighted as for
    emissions (intensities.from_primaries), so the processed share of a crop is counted once."""
    resolved = primary.assign(
        scope="land", co2=primary["ha_per_t"], ch4=0.0, n2o=0.0, tier=0, source=""
    )
    missing = pd.DataFrame(
        [{"iso3": c, "fbs_code": i, "scope": "land"} for c in countries for i in derived_items]
    )
    out = I.from_primaries(missing, resolved, extraction, processing)
    return out.rename(columns={"co2": "ha_per_t"}).assign(how="processed")[
        ["iso3", "fbs_code", "ha_per_t", "how"]
    ]


def crop_json(ha_per_t: pd.DataFrame) -> dict[str, dict[str, float]]:
    return {
        iso3: {
            str(int(r.fbs_code)): I.significant(r.ha_per_t) for r in g.itertuples() if r.ha_per_t
        }
        for iso3, g in ha_per_t.sort_values(["iso3", "fbs_code"]).groupby("iso3")
    }


def cropland(ha_per_t: pd.DataFrame, rows: pd.DataFrame) -> pd.DataFrame:
    """Hectares by country and item as the model counts them: ha/t x (production - processing).
    `rows` has columns iso3, fbs_code, production, processing."""
    df = ha_per_t.merge(rows, on=["iso3", "fbs_code"])
    return df.assign(ha=df["ha_per_t"] * (df["production"] - df["processing"]).clip(lower=0))[
        ["iso3", "fbs_code", "ha"]
    ]


# --- Oil and oilcake ------------------------------------------------------------------------


def load_oilcakes(path: Path = OILCAKES) -> pd.DataFrame:
    """Per oil: its oilseed and the oil's share of the crush's value (economic allocation)."""
    df = pd.read_csv(path)
    oil_value = df["oil_usd_per_t"]
    cake_value = df["cake_per_t_oil"] * df["cake_usd_per_t"]
    return df.assign(oil_share=oil_value / (oil_value + cake_value))[
        ["oil_code", "primary_code", "oil_share"]
    ]


def crush_json(oilcakes: pd.DataFrame) -> dict[str, dict]:
    """crush[oilseed code] = {oil: the oil's code, oilShare: its share of the crush's value}."""
    return {
        str(int(r.primary_code)): {
            "oil": str(int(r.oil_code)),
            "oilShare": round(float(r.oil_share), 3),
        }
        for r in oilcakes.itertuples()
    }


def extraction_json(extraction: dict[int, list[tuple[int, float]]]) -> dict[str, dict]:
    """extraction[processed item code] = {primary item code: t of the item per t processed}."""
    return {str(c): {str(p): r for p, r in pairs} for c, pairs in extraction.items()}


def shared_with_cake(
    ha_per_t: pd.DataFrame, rows: pd.DataFrame, oilcakes: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Share a crushed oilseed's land between its oil and its cake by value: the oil keeps its
    share of the hectares per tonne, and the rest of the land the oil carried in the base year
    goes to the cake, by country and oilseed. `rows` has iso3, fbs_code, production,
    processing. Returns the oils' new ha/t (other items unchanged) and the cake's hectares
    (iso3, primary_code, ha)."""
    share = ha_per_t.merge(
        oilcakes.rename(columns={"oil_code": "fbs_code"}), on="fbs_code", how="left"
    )
    kept = share["oil_share"].fillna(1.0)
    oils = cropland(share[share["primary_code"].notna()], rows).merge(
        share[["iso3", "fbs_code", "primary_code", "oil_share"]], on=["iso3", "fbs_code"]
    )
    cake = oils.assign(
        primary_code=oils["primary_code"].astype(int), ha=oils["ha"] * (1 - oils["oil_share"])
    )
    return (
        ha_per_t.assign(ha_per_t=ha_per_t["ha_per_t"] * kept.to_numpy()),
        cake[cake["ha"] > 0][["iso3", "primary_code", "ha"]].reset_index(drop=True),
    )


def cake_json(cake: pd.DataFrame) -> dict[str, dict[str, float]]:
    return {
        iso3: {str(int(r.primary_code)): I.significant(r.ha) for r in g.itertuples()}
        for iso3, g in cake.sort_values(["iso3", "primary_code"]).groupby("iso3")
    }


# --- Pasture --------------------------------------------------------------------------------


def latest(rl: pd.DataFrame, item: int, year: int) -> pd.Series:
    """Hectares of an RL item by area code, in `year` or the latest year before it."""
    rows = rl[(rl["item_code"] == item) & (rl["element_code"] == RL_AREA) & (rl["year"] <= year)]
    rows = (
        rows.dropna(subset=["value"]).sort_values("year").drop_duplicates("area_code", keep="last")
    )
    return rows.set_index("area_code")["value"] * THOUSAND


def herd_lsu(ek: pd.DataFrame, qcl: pd.DataFrame, year: int) -> pd.DataFrame:
    """Livestock units by area and ruminant species in `year`, from FAOSTAT Livestock Patterns;
    an area missing there gets its QCL stocks times the world's livestock units per head."""
    species = [CATTLE, *MIXED_HERDS]
    ek_rows = ek[(ek["element_code"] == LSU) & (ek["year"] == year) & ek["item_code"].isin(species)]
    lsu = ek_rows.dropna(subset=["value"]).pivot_table(
        index="area_code", columns="item_code", values="value", aggfunc="sum"
    )
    q = qcl[
        (qcl["element_code"] == STOCKS) & (qcl["year"] == year) & qcl["item_code"].isin(species)
    ]
    heads = q.pivot_table(index="area_code", columns="item_code", values="value", aggfunc="sum")
    heads, lsu = heads.reindex(columns=species), lsu.reindex(columns=species)
    both = heads.index.intersection(lsu.index)
    per_head = lsu.loc[both].sum() / heads.loc[both].sum().replace(0, np.nan)
    from_heads = heads.loc[heads.index.difference(lsu.index)] * per_head
    return pd.concat([lsu, from_heads]).fillna(0.0)


def lsu_by_group(ek: pd.DataFrame, qcl: pd.DataFrame, year: int) -> pd.DataFrame:
    """Ruminant livestock units by area and group. Cattle: the dairy herd's share of heads
    (cows milked / cattle stocks) goes DAIRY_MILK_SHARE to dairy and the rest to beef, the
    other cattle to beef. Buffalo, sheep, goats and camels: split by protein output."""
    lsu = herd_lsu(ek, qcl, year)
    q = qcl[qcl["year"] == year]
    heads = q[(q["item_code"] == CATTLE) & (q["element_code"] == STOCKS)].groupby("area_code")
    milked = q[(q["item_code"] == CATTLE_MILK) & (q["element_code"] == MILK_ANIMALS)]
    dairy_heads = milked.groupby("area_code")["value"].sum() / heads["value"].sum().replace(
        0, np.nan
    )
    dairy_cattle = lsu[CATTLE] * dairy_heads.reindex(lsu.index).fillna(0.0).clip(upper=1.0)
    production = q[q["element_code"] == PRODUCTION]
    mixed_milk = [
        lsu[species] * I.milk_meat_split(production, milk, meat)["milk"].reindex(lsu.index)
        for species, (milk, meat) in MIXED_HERDS.items()
    ]
    milk = I.DAIRY_MILK_SHARE * dairy_cattle + sum(m.fillna(0.0) for m in mixed_milk)
    meat = lsu.sum(axis=1) - milk
    return pd.DataFrame({"dairy": milk, "ruminantMeat": meat})


def hectares_json(ha: pd.Series, iso3: dict[int, str]) -> dict[str, float]:
    """Hectares by iso3, where FAOSTAT lists any: temporary meadows, or a country's land area."""
    return {
        code: I.significant(float(ha[area]))
        for area, code in sorted(iso3.items(), key=lambda kv: kv[1])
        if area in ha.index and ha[area] > 0
    }


def pasture_shares(lsu: pd.DataFrame) -> pd.DataFrame:
    total = lsu.sum(axis=1)
    return lsu.div(total.where(total > 0), axis=0)


def pasture_json(ha: pd.Series, shares: pd.DataFrame, iso3: dict[int, str]) -> dict:
    """pasture[iso3] = {ha, shares} for every area of `iso3`, 0 ha where FAOSTAT lists no
    pasture; shares are empty where the country has no ruminants."""

    def shares_of(area: int) -> dict[str, float]:
        known = area in shares.index and not shares.loc[area].isna().all()
        dairy = round(float(shares.loc[area, "dairy"]), 3) if known else 0.0
        return {"ruminantMeat": round(1 - dairy, 3), "dairy": dairy} if known else {}

    return {
        code: {"ha": I.significant(float(ha.get(area, 0.0))), "shares": shares_of(area)}
        for area, code in sorted(iso3.items(), key=lambda kv: kv[1])
    }


# --- Regrowth -------------------------------------------------------------------------------


def read_regrowth(text: str) -> pd.DataFrame:
    """Cook-Patton et al. (2020) Supplementary Data 1: Mg C/ha/yr by country, aboveground mean,
    min and max over the country's area where forest can regrow, belowground mean, and the
    mitigation of regrowing forest on all that area (Tg C/yr, the "maximum scenario")."""
    raw = pd.read_csv(io.StringIO(text), skip_blank_lines=True)
    df = pd.DataFrame(
        {
            "name": raw.iloc[:, 0].astype(str).str.strip(),
            **{
                column: pd.to_numeric(raw.iloc[:, i], errors="coerce")
                for i, column in enumerate(
                    ["ag_mean", "ag_min", "ag_max", "bg_mean", "max_tgc"], start=1
                )
            },
        }
    )
    return df.dropna(subset=["ag_mean"]).reset_index(drop=True)


def load_names(path: Path = REGROWTH_NAMES) -> dict[str, str]:
    df = pd.read_csv(path)
    return dict(zip(df["name"].str.strip(), df["iso3"], strict=True))


def regrowth_rates(df: pd.DataFrame, iso3_by_name: dict[str, str]) -> pd.DataFrame:
    """By iso3: t CO2/ha/yr where forest regrows, aboveground + belowground (the belowground
    part scaled with the aboveground for the range, the table giving its mean only), and the
    hectares where it can regrow: the maximum scenario's carbon over the mean rate."""
    total = df["ag_mean"] + df["bg_mean"].fillna(0.0)
    root = total / df["ag_mean"]
    out = pd.DataFrame(
        {
            "iso3": df["name"].map(iso3_by_name),
            "median": total * CO2_PER_C,
            "low": df["ag_min"] * root * CO2_PER_C,
            "high": df["ag_max"] * root * CO2_PER_C,
            "forest_ha": df["max_tgc"].fillna(0.0) * 1e6 / total,
        }
    )
    return out.dropna(subset=["iso3"]).reset_index(drop=True)


def forest_fractions(forest_ha: float | None, pasture: float, cropland: float) -> tuple:
    """Share of the country's farmland where forest would grow back: (low, mid, high). Low: only
    the area Cook-Patton et al. map for regrowth (outside cropland, by construction); high: that
    area and all cropland; mid: halfway. With no mapped area known, from 0 to 1."""
    farm = pasture + cropland
    return (
        (0.0, 0.5, 1.0)
        if forest_ha is None
        else (1.0, 1.0, 1.0)
        if farm <= 0
        else mapped_fractions(forest_ha, cropland, farm)
    )


def mapped_fractions(forest_ha: float, cropland: float, farm: float) -> tuple:
    """From the mapped area alone to the mapped area and all cropland, as shares of the farm."""
    low = min(1.0, forest_ha / farm)
    high = min(1.0, (forest_ha + cropland) / farm)
    return low, (low + high) / 2, high


def regrowth_filled(
    rates: pd.DataFrame,
    countries: list[str],
    regions: dict[str, str],
    forest_share: dict[str, float],
    farmland: dict[str, tuple[float, float]],
) -> pd.DataFrame:
    """t CO2 per hectare of freed farmland per year, by country: the rate where forest regrows
    times the share of farmland where it would (`forest_fractions`, low with low, high with
    high). `farmland[iso3]` = (pasture ha, cropland ha). A country missing from the table takes
    the rates of its region's lowest country with an unknown regrowth area; a dryland one
    (forest under DRYLAND_FOREST_SHARE of its land; unknown counts as not dry) the table's
    lowest rates, on its cropland at most."""
    cols = ["median", "low", "high"]
    own = rates[rates["iso3"].isin(countries)].set_index("iso3")
    ranked = rates.sort_values("median")
    regional = (
        ranked.assign(region=ranked["iso3"].map(regions))
        .drop_duplicates("region")
        .set_index("region")[cols]
    )
    lowest = ranked.iloc[0][cols].to_dict()

    def base(iso3: str) -> tuple[dict, float | None, str]:
        region = regions.get(iso3)
        return (
            (own.loc[iso3, cols].to_dict(), float(own.loc[iso3, "forest_ha"]), "country")
            if iso3 in own.index
            else (lowest, 0.0, "dry")
            if forest_share.get(iso3, 1.0) < DRYLAND_FOREST_SHARE
            else (
                regional.loc[region].to_dict() if region in regional.index else lowest,
                None,
                "region",
            )
        )

    def row(iso3: str) -> dict:
        rate, forest_ha, how = base(iso3)
        low, mid, high = forest_fractions(forest_ha, *farmland.get(iso3, (0.0, 0.0)))
        return {
            "iso3": iso3,
            "median": rate["median"] * mid,
            "low": rate["low"] * low,
            "high": rate["high"] * high,
            "share": mid,
            "how": how,
        }

    return pd.DataFrame([row(c) for c in countries])


def regrowth_json(df: pd.DataFrame) -> dict:
    return {
        r.iso3: {"median": round(r.median, 2), "low": round(r.low, 2), "high": round(r.high, 2)}
        for r in df.itertuples()
    }


# --- Summaries ------------------------------------------------------------------------------


def animal_share(
    crop_ha: pd.DataFrame,
    uses: pd.DataFrame,
    pasture_ha: float,
    cake_ha: float = 0.0,
    fodder_ha: float = 0.0,
) -> dict:
    """Share of farmland used for animal products: all pasture, the oilcakes' and the fodder's
    land, and each crop's cropland times the world share of its uses that is feed (uses other
    than processing, which the processed items carry). `crop_ha` has fbs_code, ha; `uses`
    fbs_code and the balance's use columns."""
    world = uses.groupby("fbs_code")[list(USE_FIELDS)].sum()
    total = world.sum(axis=1)
    feed_share = (world["feed"] / total.where(total > 0)).fillna(0.0)
    by_item = crop_ha.groupby("fbs_code")["ha"].sum()
    crops = float(by_item.sum())
    feed = float((by_item * feed_share.reindex(by_item.index).fillna(0.0)).sum())
    animal = feed + cake_ha + fodder_ha
    return {
        "cropland": crops,
        "feedCropland": animal,
        "pasture": pasture_ha,
        "animalShare": (animal + pasture_ha) / (crops + cake_ha + fodder_ha + pasture_ha),
    }
