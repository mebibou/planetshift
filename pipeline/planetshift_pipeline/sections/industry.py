"""industry.json: buildings' and industry's direct CO₂ under each SSP, for their levers."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("industry", "build_industry")
    if run is not None:
        run(b.cache, b.out)
