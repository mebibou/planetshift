"""climate.json: AGTP curves, scenario temperatures, attribution and permafrost."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("climate", "build_climate")
    if run is not None:
        run(b.cache, b.out)
