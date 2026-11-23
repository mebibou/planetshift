"""practices.json: the farming practices, each country given its applicable share."""

from .. import breakdown as B
from .. import practices as P
from ..inputs import Build, write
from ..sources import worldbank


def build(b: Build) -> None:
    classes = worldbank.classification(b.cache).dropna()
    incomes = dict(zip(classes["iso3"], classes["income"], strict=True))
    countries = sorted(set(b.iso3.values()))
    table = P.load()
    kwh = P.value(table[table["practice"] == "farmEnergy"], "kwhPerMjFuel")
    drawn = B.electricity_per_fuel_co2(b.read("GN", b.year - 4, b.year), b.iso3, kwh)
    data = P.practices_json(table, countries, b.regions, incomes, drawn)
    write(b.out, "practices.json", data)
