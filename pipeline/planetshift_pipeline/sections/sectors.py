"""sectors.json: fossil CO₂ by sector under each SSP and what the energy levers need."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("sectors", "build_sectors")
    if run is not None:
        run(b.cache, b.out)
