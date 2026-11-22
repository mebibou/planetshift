"""intensities.json: emissions per tonne of each item in each country, by tier."""

from .. import groups as G
from .. import intensities as I
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
    write(b.out, "intensities.json", I.intensities_json(merged))
