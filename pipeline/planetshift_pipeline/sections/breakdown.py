"""breakdown.json: the share of each gas of every intensity by emission source."""

import pandas as pd

from .. import breakdown as B
from .. import intensities as I
from .. import seafood as Sf
from ..inputs import HESTIA_DEPENDENTS, Build, write


def build(b: Build) -> None:
    _, emissions = b.faostat_tier3
    hestia = b.fetch(
        HESTIA_DEPENDENTS,
        "fetch_breakdown",
        pd.DataFrame(columns=["fbs_item_code", "area", "scope", "url", "gas", "source", "kg"]),
    )
    counted = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    weights = {
        (r.iso3, r.fbs_code): max(r.production - r.processing, 0.0) for r in counted.itertuples()
    }
    produced = {(r.iso3, r.fbs_code) for r in counted.itertuples() if r.production > 0}
    proxies, extraction = I.load_proxies()
    related = {
        code: [p for p, _ in extraction.get(code, [])] + proxies.get(code, [])
        for code in {*proxies, *extraction}
    }
    shares = B.electricity_shares(b.read("GN", b.year - 4, b.year), b.iso3)
    fishstat = b.fishstat
    seafood = (
        Sf.classified(Sf.window(fishstat, b.year), Sf.load_isscaap())
        if fishstat is not None
        else None
    )
    data = B.build(
        b.merged,
        B.split_energy(B.faostat_frame(emissions, b.iso3), shares),
        hestia,
        weights,
        produced,
        related,
        Sf.breakdown_profiles(seafood),
    )
    write(b.out, "breakdown.json", data)
