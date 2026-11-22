"""removals.json: carbon stored in farmland by practice."""

from .. import removals as R
from ..inputs import Build, write


def build(b: Build) -> None:
    countries = set(b.iso3.values())
    data = R.removals_json(R.load(), R.load_zones(), countries)
    write(b.out, "removals.json", data)
