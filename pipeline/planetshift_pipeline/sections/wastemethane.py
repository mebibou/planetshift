"""wastemethane.json: landfill and wastewater methane by country and the scenarios' waste
methane, for the Landfills and Wastewater levers."""

from .. import wastemethane as M
from ..inputs import Build, log, write


def build(b: Build) -> None:
    data = M.build(b.cache)
    for line in M.summary(data):
        log.info(line)
    write(b.out, "wastemethane.json", data)
