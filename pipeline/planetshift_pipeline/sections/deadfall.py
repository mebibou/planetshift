"""deadfall.json: CO₂ that uncaught large pelagic fish would sink to the deep ocean, per tonne of
each seafood item a country produces."""

from .. import deadfall as D
from ..inputs import Build, log, write


def build(b: Build) -> None:
    fishstat = b.fishstat
    factors = {} if fishstat is None else D.per_item(fishstat, b.year, set(b.iso3.values()))
    if fishstat is not None:
        world = D.world_stored(fishstat, b.year)
        log.info(
            "deadfall: %.1f Mt a year of large pelagic catch at sea would keep %.2f Mt CO2 a year",
            world["catch"] / 1e6,
            world["co2"] / 1e6,
        )
    write(b.out, "deadfall.json", D.deadfall_json(factors))
