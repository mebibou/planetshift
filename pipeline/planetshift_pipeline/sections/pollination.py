"""pollination.json: how much each item's production depends on animal pollination, by country."""

from .. import intensities as I
from .. import pollination as P
from ..inputs import Build, log, write


def build(b: Build) -> None:
    y = b.year
    _, extraction = I.load_proxies()
    links = P.item_crops(I.load_crops(), P.primaries(extraction))
    weights = P.crop_weights(b.read("QCL", y - P.YEARS + 1, y), links, set(b.iso3))
    classes = P.load_classes()
    country = P.ratios(weights.assign(iso3=weights["area_code"].map(b.iso3)), classes, ["iso3"])
    world = P.ratios(weights, classes, [])
    emitting = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    rows = emitting.assign(t=(emitting["production"] - emitting["processing"]).clip(lower=0))
    rated = rows.merge(world, on="fbs_code")
    log.info("world crop production by tonnes, with world ratios: %s", P.shares(rated))
    write(b.out, "pollination.json", P.pollination_json(country, world))
