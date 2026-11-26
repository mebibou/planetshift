"""water.json: freshwater withdrawn per tonne of each item in each country, by tier."""

import pandas as pd

from .. import feed as F
from .. import groups as G
from .. import intensities as I
from .. import land as L
from .. import water as W
from ..inputs import HESTIA_DEPENDENTS, Build, log, write


def grid(countries: list[str], codes) -> pd.DataFrame:
    return pd.DataFrame(
        [{"iso3": c, "fbs_code": code, "scope": W.SCOPE} for c in countries for code in codes]
    )


def build(b: Build) -> None:
    countries = sorted(set(b.iso3.values()))
    kept = G.kept(b.groups)
    group_of = dict(zip(kept["fbs_code"], kept["group"], strict=True))
    hestia = b.fetch(HESTIA_DEPENDENTS, "fetch_water", None)
    world = W.literature_world(b.cache)
    proxies, extraction = I.load_proxies()
    zero = G.byproducts(kept) | {c: W.SEAFOOD_NOTE for c, g in group_of.items() if g == F.SEAFOOD}
    production = b.production[["iso3", "fbs_code", "production"]]
    cells = grid(countries, kept["fbs_code"])

    def merged(frames: list[pd.DataFrame]) -> pd.DataFrame:
        return I.merge(
            cells,
            frames,
            proxies,
            extraction,
            group_of,
            production,
            b.uses("processing"),
            zero,
            b.oil_shares,
        )

    plants = world[~world["fbs_item_code"].map(group_of).isin(W.FED_GROUPS)]
    common = [
        W.candidates(plants, countries, {}, 4, 4),
        *([] if hestia is None else [W.candidates(hestia, countries, b.hestia_members, 1, 2)]),
    ]
    class_of = {
        c: F.CLASS_OF_GROUP[g]
        for c, g in group_of.items()
        if g in G.PLANT_GROUPS and g in F.CLASS_OF_GROUP
    }
    classes = W.class_litres(W.litres_of(merged(common)), b.uses("feed"), class_of)
    intake, rations = F.load_intake(), F.load_rations()
    animals = W.animal_water(
        world,
        countries,
        b.rich,
        group_of,
        lambda group, rich: W.feed_litres(group, rich, intake, rations, classes),
    )
    final = merged([*common, W.candidates(animals, countries, {}, 4, 4)])
    rows = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    cake = I.oilcake_emissions(final, L.load_oilcakes(), extraction, rows)
    litres = W.litres_of(final)
    scarcity = (
        W.scarcity_rows(hestia, countries)
        if hestia is not None
        else pd.DataFrame(columns=["iso3", "fbs_code", "scarcity"])
    )
    y = b.year
    irrigated = L.latest(b.read("RL", y - 3, y), W.IRRIGATION_ITEM, y)
    log_totals(b, litres, cake, scarcity, classes)
    write(
        b.out,
        "water.json",
        W.water_json(
            litres,
            scarcity,
            cake,
            {iso3: float(irrigated.get(area, 0.0)) for area, iso3 in b.iso3.items()},
        ),
    )


def yearly(litres: pd.DataFrame, rows: pd.DataFrame, value: str = "litres") -> pd.DataFrame:
    """Litres a year by country and item: per tonne times production less processing."""
    emitting = rows.assign(t=(rows["production"] - rows["processing"]).clip(lower=0))
    df = litres.merge(emitting[["iso3", "fbs_code", "t"]], on=["iso3", "fbs_code"])
    return df.assign(year=df[value] * df["t"])


def log_totals(b: Build, litres, cake, scarcity, classes) -> None:
    rows = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    by_item = yearly(litres, rows)
    by_country = by_item.groupby("iso3")["year"].sum() + cake.groupby("iso3")[
        W.LITRES
    ].sum().reindex(by_item["iso3"].unique(), fill_value=0.0)
    world = by_country.sum()
    log.info("feed classes, litres per tonne: %s", {k: round(v) for k, v in classes.items()})
    log.info(
        "freshwater withdrawn: %.0f km3 a year (oilcakes %.0f); by tier (km3): %s",
        world / 1e12,
        cake[W.LITRES].sum() / 1e12,
        (by_item.groupby("tier")["year"].sum() / 1e12).round(0).to_dict(),
    )
    log.info(
        "scarcity-weighted use where HESTIA has it: %.0f km3 eq a year in %d countries",
        yearly(scarcity, rows, "scarcity")["year"].sum() / 1e12,
        scarcity["iso3"].nunique(),
    )
    against_aquastat(b, by_country)


def read_aquastat(b: Build) -> dict[str, float]:
    """AQUASTAT's agricultural withdrawals, or none when they cannot be read."""
    try:
        aquastat = W.read_aquastat(b.cache)
    except Exception as err:  # noqa: BLE001 - the comparison is only logged
        log.warning("AQUASTAT unavailable (%s): water totals not compared", err)
        aquastat = {}
    return aquastat


def against_aquastat(b: Build, by_country: pd.Series) -> None:
    """Logs the totals against AQUASTAT's agricultural withdrawals; not a check that fails."""
    aquastat = read_aquastat(b)
    both = by_country[by_country.index.isin(aquastat)]
    ratio = both / both.index.map(aquastat)
    if "WLD" in aquastat:
        log.info(
            "water against AQUASTAT's agricultural withdrawals: world %.0f km3 against %.0f "
            "(ratio %.2f); median country ratio %.2f over %d countries; largest: %s",
            by_country.sum() / 1e12,
            aquastat["WLD"] / 1e12,
            by_country.sum() / aquastat["WLD"],
            ratio.median(),
            len(ratio),
            {
                iso3: (round(by_country[iso3] / 1e12), round(aquastat[iso3] / 1e12))
                for iso3 in both.sort_values(ascending=False).index[:8]
            },
        )
