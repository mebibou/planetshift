"""deforestation.json: the CO₂ of clearing forest and the area cleared, by country and the item
it serves."""

import pandas as pd

from .. import deforestation as D
from .. import intensities as I
from .. import organic_soils as O
from ..inputs import Build, log, write


def drained(b: Build, peat: dict) -> dict:
    """t of CO₂ and N₂O a year from drained organic soils, and of CH₄ once rewetted, by country
    and the item they are shared to."""
    y = b.emissions_year
    area = O.harvested_area(b.read("QCL", y, y), I.load_crops(), b.iso3)
    peat_rows = [
        {"iso3": c, "fbs_code": int(code), "w": t}
        for c, items in peat.items()
        for code, t in items.items()
    ]
    crops = O.crop_weights(area, pd.DataFrame(peat_rows, columns=["iso3", "fbs_code", "w"]))
    ruminants = O.ruminant_weights(
        b.merged, b.production[["iso3", "fbs_code", "production"]], I.RUMINANT_ITEMS
    )
    gv = b.read("GV", y, y)
    co2 = O.country_co2(gv, b.iso3)
    drained_area = O.country_area(gv, b.iso3)
    food_crops = crops[crops["fbs_code"].isin(b.kept_codes)]
    kept, lost = O.drained(co2, food_crops, ruminants)
    n2o, _ = O.drained(O.country_n2o(gv, b.iso3), food_crops, ruminants)
    ch4, _ = O.drained(O.rewetted_ch4(co2, drained_area), food_crops, ruminants)
    log.info(
        "drained organic soils %s: %.2f Gt CO2/yr on food items (cropland %.2f, grassland %.2f), "
        "%.0f Mt on none",
        y,
        kept["t_co2"].sum() / 1e9,
        co2.loc[co2["land"] == "cropland", "t"].sum() / 1e9,
        co2.loc[co2["land"] == "grassland", "t"].sum() / 1e9,
        lost / 1e6,
    )
    log.info(
        "drained organic soils %s: %.1f Mha, %.3f Mt N2O/yr on food items, %.2f Mt CH4/yr once "
        "rewetted",
        y,
        drained_area["t"].sum() / 1e6,
        n2o["t_co2"].sum() / 1e6,
        ch4["t_co2"].sum() / 1e6,
    )
    countries = set(b.iso3.values())
    return {
        "drainedByCountry": D.by_country(kept, countries),
        "drainedN2oByCountry": D.by_country(n2o, countries),
        "rewettedCh4ByCountry": D.by_country(ch4, countries),
    }


def build(b: Build) -> None:
    items = D.item_map()
    foreign = set(items["fbs_code"].dropna()) - b.kept_codes
    if foreign:
        log.warning("deforestation items not in the model: %s", sorted(foreign))
    means = D.yearly_mean(D.read(b.cache))
    kept, dropped = D.attributed(means, items)
    countries = set(b.iso3.values())
    outside = kept[~kept["iso3"].isin(countries)].groupby("iso3")["t_co2"].sum()
    food = kept[kept["fbs_code"].isin(b.kept_codes)]
    data = D.by_country(food, countries)
    area = D.by_country(food, countries, value="ha")
    log.info(
        "deforestation %s-%s: %.1f Mha a year cleared for food items",
        *D.YEARS,
        sum(sum(v.values()) for v in area.values()) / 1e6,
    )
    total, top = D.summary(data)
    log.info(
        "deforestation %s-%s: %.2f Gt CO2/yr on food items (DeDuCE total %.2f, peat "
        "drainage %.2f, not counted); top: %s",
        *D.YEARS,
        total / 1e9,
        means["t_co2"].sum() / 1e9,
        means["peat_t_co2"].sum() / 1e9,
        ", ".join(f"{c} {t / 1e6:.0f} Mt" for c, t in top),
    )
    log.info(
        "deforestation left out (Mt CO2/yr):\n%s",
        dropped.assign(mt=(dropped["t_co2"] / 1e6).round(1))
        .head(12)[["reason", "commodity", "mt"]]
        .to_string(index=False),
    )
    if len(outside):
        log.info("deforestation in areas outside the model (Mt): %s", (outside / 1e6).round(2))
    peat, _ = D.attributed(means.assign(t_co2=means["peat_t_co2"]), items)
    peat_food = D.by_country(peat[peat["fbs_code"].isin(b.kept_codes)], countries)
    write(
        b.out,
        "deforestation.json",
        D.deforestation_json(data, area) | drained(b, peat_food),
    )
