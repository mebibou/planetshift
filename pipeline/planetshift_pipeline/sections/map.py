"""world.topo.json: the Natural Earth map as TopoJSON."""

from ..inputs import Build, log
from ..sources import naturalearth


def build(b: Build) -> None:
    naturalearth.write_topojson(b.natural_earth, b.out / "world.topo.json")
    log.info("wrote world.topo.json (%.0f kB)", (b.out / "world.topo.json").stat().st_size / 1024)
