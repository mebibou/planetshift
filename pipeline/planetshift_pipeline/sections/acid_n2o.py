"""acidn2o.json: the N₂O from making adipic and nitric acid, for the lever that abates it."""

from ..inputs import Build


def build(b: Build) -> None:
    run = b.module("acid_n2o", "build_acid_n2o")
    if run is not None:
        run(b.cache, b.out)
