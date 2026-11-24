"""deeptime.json: global mean surface temperature through deep time, on the 1850–1900 baseline."""

from .. import deeptime as D
from ..inputs import Build, write


def build(b: Build) -> None:
    write(b.out, "deeptime.json", D.deeptime_json(*D.read_sources(b.cache)))
