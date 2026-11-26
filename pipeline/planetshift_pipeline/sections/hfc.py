"""hfc.json: each SSP's HFCs and their gas cycles, for the HFC phase-down lever."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("hfc", "build_hfc")
    if run is not None:
        run(b.cache, b.out)
