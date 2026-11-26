"""fair.json: the FaIR calibration and SSP emissions the app runs FaIR on."""

from ..inputs import Build, write


def build(b: Build) -> None:
    fair_json = b.module("fair_app", "fair_json")
    if fair_json is not None:
        write(b.out, "fair.json", fair_json(b.cache))
