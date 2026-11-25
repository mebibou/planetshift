"""practices.json: the farming practices, each country given its applicable share."""

from .. import breakdown as B
from .. import intensities as I
from .. import practices as P
from ..inputs import Build, log, write
from ..sources import ember, worldbank


def rounded(values: dict[str, float]) -> dict[str, float]:
    return {k: I.significant(v, 3) for k, v in values.items()}


def build(b: Build) -> None:
    classes = worldbank.classification(b.cache).dropna()
    incomes = dict(zip(classes["iso3"], classes["income"], strict=True))
    countries = sorted(set(b.iso3.values()))
    table = P.load()
    kwh = P.value(table[table["practice"] == "farmEnergy"], "kwhPerMjFuel")
    gn = b.read("GN", b.year - 4, b.year)
    faostat = B.grid_kg_per_kwh(gn, b.iso3)
    rows = ember.read(ember.path(b.cache))
    own = ember.countries(rows)
    by_country = dict(zip(own["iso3"], own["kg_per_kwh"], strict=True))
    _, world = ember.world(rows)
    grid = {
        "kwhPerFuelCo2": rounded(B.kwh_per_fuel_co2(gn, b.iso3, kwh)),
        "gridRatio": rounded(P.grid_ratio(by_country, world, faostat)),
        "kgCo2PerKwh": I.significant(faostat["World"], 3),
    }
    log.info(
        "farm grid against the world's: %s; from FAOSTAT, no Ember figure: %s",
        {k: round(grid["gridRatio"][k], 2) for k in ("FRA", "POL", "IND", "USA")},
        sorted(set(countries) - set(by_country)),
    )
    write(b.out, "practices.json", P.practices_json(table, countries, b.regions, incomes, grid))
