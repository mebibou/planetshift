"""intensities.json: emissions per tonne of each item in each country, by tier."""

from .. import groups as G
from .. import intensities as I
from .. import land as L
from ..inputs import Build, log, write


def build(b: Build) -> None:
    merged = b.merged
    kept = G.kept(b.groups)
    tiers = merged.assign(
        group=merged["fbs_code"].map(dict(zip(kept["fbs_code"], kept["group"], strict=True)))
    )
    log.info(
        "cells by tier and group:\n%s",
        tiers[tiers["scope"] == "farmGate"].pivot_table(
            index="group", columns="tier", values="iso3", aggfunc="count", fill_value=0
        ),
    )
    _, extraction = I.load_proxies()
    rows = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    cake = I.oilcake_emissions(merged, L.load_oilcakes(), extraction, rows)
    log.info(
        "oilcakes carry %.0f Mt CO2e a year (cradle to farm gate)",
        I.co2e(cake[cake["scope"] == "cradleToFarmGate"]).sum() / 1e9,
    )
    nonfood = b.nonfood
    log.info(
        "animals not raised for food emit %.0f Mt CO2e a year",
        (nonfood["kg"] * nonfood["gas"].map(I.GWP100)).sum() / 1e9,
    )
    write(
        b.out,
        "intensities.json",
        I.intensities_json(merged)
        | {"oilcake": I.oilcake_json(cake), "nonFood": I.nonfood_json(nonfood, b.iso3)},
    )
