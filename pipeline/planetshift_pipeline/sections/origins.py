"""origins.json: where each country's imports of each food come from."""

from .. import origins as O
from ..inputs import Build, log, write
from ..sources import trade_matrix


def build(b: Build) -> None:
    last = b.emissions_year
    first = last - 2
    rows = O.by_origin(trade_matrix.imports(b.cache, first, last), O.load_items(), b.iso3)
    data = O.origins_json(rows, (first, last))
    fra = data["byCountry"].get("FRA", {})
    log.info(
        "origins %d-%d: %d importers; France's beef from %s, its soybeans from %s",
        first,
        last,
        len(data["byCountry"]),
        fra.get("2731"),
        fra.get("2555"),
    )
    write(b.out, "origins.json", data)
