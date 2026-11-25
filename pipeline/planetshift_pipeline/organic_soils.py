"""CO₂ from drained organic soils under farming, by country and the item it is shared to.

FAOSTAT's *Emissions from Drained organic soils* (GV) gives each country's CO₂ on cropland and on
grassland. Cropland's goes to the crops by DeDuCE's peat drainage by commodity where DeDuCE has
any for the country (mostly oil palm in Indonesia and Malaysia), else by harvested area;
grassland's goes to the ruminant products by their methane. The N₂O, about a tenth of it in CO₂e,
is left out.
"""

import pandas as pd

LAND = {6727: "cropland", 6728: "grassland"}
CO2 = 7273
AREA_HARVESTED = 5312
T_PER_KT = 1e3


def country_co2(gv: pd.DataFrame, iso3: dict[int, str]) -> pd.DataFrame:
    """t of CO₂ a year by country and land (cropland, grassland)."""
    rows = gv[gv["item_code"].isin(LAND) & (gv["element_code"] == CO2) & gv["area_code"].isin(iso3)]
    return rows.assign(
        iso3=rows["area_code"].map(iso3),
        land=rows["item_code"].map(LAND),
        t=rows["value"] * T_PER_KT,
    )[["iso3", "land", "t"]]


def harvested_area(qcl: pd.DataFrame, crops: pd.DataFrame, iso3: dict[int, str]) -> pd.DataFrame:
    """Harvested hectares by country and food item, weights for the crops (column w)."""
    area = qcl[(qcl["element_code"] == AREA_HARVESTED) & qcl["area_code"].isin(iso3)]
    joined = area.merge(crops, left_on="item_code", right_on="qcl_code")
    joined = joined.assign(iso3=joined["area_code"].map(iso3), w=joined["value"] * joined["share"])
    return joined.groupby(["iso3", "fbs_code"], as_index=False)["w"].sum()


def crop_weights(area: pd.DataFrame, peat: pd.DataFrame) -> pd.DataFrame:
    """A country's peat drainage by item where it has any, else its harvested area."""
    with_peat = set(peat.loc[peat["w"] > 0, "iso3"])
    return pd.concat([peat[peat["iso3"].isin(with_peat)], area[~area["iso3"].isin(with_peat)]])


def ruminant_weights(merged: pd.DataFrame, production: pd.DataFrame, items: tuple) -> pd.DataFrame:
    """Each ruminant product's methane a year in its country (kg per tonne × tonnes)."""
    rows = merged[(merged["scope"] == "farmGate") & merged["fbs_code"].isin(items)]
    joined = rows.merge(production, on=["iso3", "fbs_code"])
    return joined.assign(w=joined["ch4"] * joined["production"])[["iso3", "fbs_code", "w"]]


def shared(totals: pd.DataFrame, weights: pd.DataFrame) -> pd.DataFrame:
    """t of CO₂ by country and item: each country's total in proportion to the weights; a
    country without weights keeps none."""
    w = weights[weights["w"] > 0]
    sums = w.groupby("iso3")["w"].transform("sum")
    parts = w.assign(part=w["w"] / sums).merge(totals, on="iso3")
    return parts.assign(t_co2=parts["part"] * parts["t"])[["iso3", "fbs_code", "t_co2"]]


def drained(
    co2: pd.DataFrame, crops: pd.DataFrame, ruminants: pd.DataFrame
) -> tuple[pd.DataFrame, float]:
    """t of CO₂ a year by country and item, summed over both lands, and the t left on no item."""
    by_land = {
        "cropland": shared(co2[co2["land"] == "cropland"], crops),
        "grassland": shared(co2[co2["land"] == "grassland"], ruminants),
    }
    kept = pd.concat(by_land.values()).groupby(["iso3", "fbs_code"], as_index=False)["t_co2"].sum()
    return kept, float(co2["t"].sum() - kept["t_co2"].sum())
