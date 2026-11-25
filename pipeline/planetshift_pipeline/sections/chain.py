"""chain.json: food's emissions after the farm, by country and stage, and each food's weight."""

from .. import chain as C
from ..inputs import Build, log, write
from ..intensities import GWP100
from ..sources import food_stages


def build(b: Build) -> None:
    y = b.emissions_year
    w = C.weights(C.load_items(), food_stages.read(food_stages.path(b.cache)))
    counted = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    area_of = {iso3: area for area, iso3 in b.iso3.items()}
    production = counted.assign(
        area_code=counted["iso3"].map(area_of),
        t=(counted["production"] - counted["processing"]).clip(lower=0.0),
    )[["area_code", "fbs_code", "t"]]
    kg = C.stage_kg(b.read("GPP", y - 4, y), y)
    denominator = C.denominators(production, w)
    data = C.chain_json(
        C.factors(kg, denominator), C.world_factors(kg, denominator, b.iso3), w, b.iso3, y
    )
    own = kg[kg["area_code"].isin(b.iso3)]
    co2e = own.assign(kg=own["kg"] * own["gas"].map(GWP100)).groupby("stage")["kg"].sum() / 1e9
    log.info(
        "food after the farm %d: %s Mt CO2e (GWP100) by stage; no figures for %s",
        y,
        co2e.round(0).to_dict(),
        sorted(set(b.iso3.values()) - set(data["byCountry"])),
    )
    write(b.out, "chain.json", data)
