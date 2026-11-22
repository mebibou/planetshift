"""supply.json: the base year's balance of each country and item."""

from .. import supply as S
from ..inputs import Build, write


def build(b: Build) -> None:
    by_country = S.supply_json(b.balance, b.iso3, b.kept_codes)
    write(b.out, "supply.json", {"baseYear": b.year, "byCountry": by_country})
