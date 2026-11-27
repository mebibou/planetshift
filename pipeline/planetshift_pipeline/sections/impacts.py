"""impacts.json: what the IPCC assessed at given levels of global warming, read by the card on
what the warming means."""

from .. import impacts as I
from ..inputs import Build, write


def build(b: Build) -> None:
    write(
        b.out, "impacts.json", I.impacts_json(I.read_spm6(b.cache), I.read_cited(), I.read_floods())
    )
