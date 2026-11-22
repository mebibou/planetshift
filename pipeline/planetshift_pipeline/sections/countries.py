"""countries.json: the countries, their names, regions, income group and population."""

from .. import countries as K
from ..inputs import LAST_YEAR, Build, write


def build(b: Build) -> None:
    names_fr = b.names("OA_FR", "area_code") if b.has_french("OA_FR") else {}
    pop = b.population.loc[:, b.year : LAST_YEAR]
    records = K.country_records(b.area_table, names_fr, b.regions, b.rich, pop)
    write(b.out, "countries.json", records)
