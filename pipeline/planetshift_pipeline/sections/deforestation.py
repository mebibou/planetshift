"""deforestation.json: the CO₂ of clearing forest and the area cleared, by country and the item
it serves."""

from .. import deforestation as D
from ..inputs import Build, log, write


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
    write(b.out, "deforestation.json", D.deforestation_json(data, area))
