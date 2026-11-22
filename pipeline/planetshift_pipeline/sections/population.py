"""population.json: world population from 1850 and the UN's variants to 2100, by country."""

from .. import population as P
from ..inputs import Build, log, write


def build(b: Build) -> None:
    countries = sorted(set(b.iso3.values()))
    data = P.population_json(P.read_wpp(b.cache), P.read_owid(b.cache), countries)
    missing = sorted(set(countries) - set(data["byCountry"]))
    if missing:
        log.info("no WPP variants, the world's ratio stands in: %s", missing)
    write(b.out, "population.json", data)
