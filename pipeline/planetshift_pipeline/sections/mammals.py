"""mammals.json: farmed mammals' live weight by country and the food group each herd follows, and
the world's wild mammals, for the biodiversity figure and map layer."""

from .. import mammals as M
from ..inputs import Build, log, write


def build(b: Build) -> None:
    y = b.emissions_year
    regions = M.ipcc_regions(b.regions)
    area_region = {area: regions[iso3] for area, iso3 in b.iso3.items() if iso3 in regions}
    weight = M.live_weight(b.read("GLE", y, y), M.load_weights(), area_region)
    qcl = b.read("QCL", y, y)
    group_of = dict(zip(b.groups["fbs_code"], b.groups["group"], strict=True))
    food = M.food_shares(weight, qcl[qcl["element_code"] == M.I.PRODUCTION], group_of)
    tonnes = M.by_group(weight, food, b.nonfood_shares)
    data = M.mammals_json(tonnes, b.iso3, y)
    total = sum(sum(g.values()) for g in data["byCountry"].values())
    by_group = tonnes[tonnes["area_code"].isin(b.iso3)].groupby("group")["t"].sum() / 1e6
    log.info(
        "farmed mammals %d: %.0f Mt live weight in %d countries (%s Mt by group), "
        "%.1f times the wild mammals' %.0f Mt; missing IPCC region: %s",
        y,
        total / 1e6,
        len(data["byCountry"]),
        by_group.round(1).to_dict(),
        total / sum(M.WILD.values()),
        sum(M.WILD.values()) / 1e6,
        sorted(set(b.iso3.values()) - set(regions)),
    )
    write(b.out, "mammals.json", data)
