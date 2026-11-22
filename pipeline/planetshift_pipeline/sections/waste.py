"""waste.json: food wasted after shops, by country."""

import pandas as pd

from .. import waste as W
from ..inputs import Build, log, write


def build(b: Build) -> None:
    food = b.uses("food")
    food = food[food["fbs_code"].isin(b.kept_codes)].groupby("iso3")["food"].sum()
    pop = b.population[b.year]
    people = pd.Series({iso3: pop[a] for a, iso3 in b.iso3.items() if a in pop.index})
    countries = sorted(people.index)
    m49 = dict(zip(b.area_table["m49"], b.area_table["iso3"], strict=True))
    table = W.report_table(W.download(b.cache))
    log.info("waste confidence by sector:\n%s", W.confidence_counts(table, m49))
    rows, filled = W.region_filled(W.by_iso3(table, m49), countries, b.regions)
    if filled:
        log.info("waste filled from regions: %s", filled)
    rows, capped = W.capped(W.edible(rows, b.rich), food * 1000 / people)
    if capped:
        log.info("waste capped at %.0f%% of food supply: %s", W.MAX_SHARE_OF_FOOD * 100, capped)
    write(b.out, "waste.json", W.waste_json(rows))
