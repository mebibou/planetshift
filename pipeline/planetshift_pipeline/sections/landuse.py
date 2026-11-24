"""landuse.json: each country's net CO₂ from land-use change, sources and sinks."""

from .. import landuse as U
from ..inputs import Build, log, write


def build(b: Build) -> None:
    sheets = U.read(b.cache)
    gaps = {m: U.check_total(s) for m, s in sheets.items()}
    log.info("land use: countries add up to the world total within %s", gaps)
    countries = set(b.iso3.values())
    named = dict(zip(b.area_table["area"], b.area_table["iso3"], strict=True))
    iso3_by_name = {**{n: c for n, c in named.items() if c in countries}, **U.load_names()}
    mean = U.mean_co2(sheets)
    unnamed = U.unnamed(mean, iso3_by_name)
    if len(unnamed):
        log.warning("land use: columns with no ISO3 code, left out (Mt): %s", unnamed / 1e6)
    data = U.by_country(mean, iso3_by_name, countries)
    world = float(mean[U.WORLD])
    log.info(
        "land use %s-%s: %.2f Gt CO2/yr in the world, %.2f in %d countries of the model "
        "(sources %.2f, sinks %.2f); missing: %s",
        *U.YEARS,
        world / 1e9,
        sum(data.values()) / 1e9,
        len(data),
        sum(v for v in data.values() if v > 0) / 1e9,
        sum(v for v in data.values() if v < 0) / 1e9,
        sorted(countries - set(data)),
    )
    write(b.out, "landuse.json", U.landuse_json(data, world))
