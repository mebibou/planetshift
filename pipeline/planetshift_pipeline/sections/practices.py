"""practices.json: the farming practices, each country given its applicable share."""

from .. import practices as P
from ..inputs import Build, write
from ..sources import worldbank


def build(b: Build) -> None:
    classes = worldbank.classification(b.cache).dropna()
    incomes = dict(zip(classes["iso3"], classes["income"], strict=True))
    countries = sorted(set(b.iso3.values()))
    data = P.practices_json(P.load(), countries, b.regions, incomes)
    write(b.out, "practices.json", data)
