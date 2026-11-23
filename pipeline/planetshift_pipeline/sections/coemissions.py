"""coemissions.json: methane and air pollution emitted with each sector's fossil CO₂, and their
forcing, for the energy, heating and industry levers."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("coemissions", "build_coemissions")
    if run is not None:
        run(b.cache, b.out)
