"""people.json: each SSP's human emissions, for the people-on-Earth thought experiment."""

from .. import people as P
from ..inputs import Build, write


def build(b: Build) -> None:
    write(b.out, "people.json", P.build_people(b.cache))
