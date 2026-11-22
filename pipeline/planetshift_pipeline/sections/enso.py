"""enso.json: El Niño and La Niña years from NOAA's Oceanic Niño Index."""

from .. import enso as E
from ..inputs import Build, write


def build(b: Build) -> None:
    write(b.out, "enso.json", E.enso_json(E.read_oni(b.cache)))
