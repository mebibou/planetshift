"""fossilmethane.json: the methane leaked by oil, gas and coal, for the levers that cut it."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("fossil_methane", "build_fossil_methane")
    if run is not None:
        run(b.cache, b.out)
