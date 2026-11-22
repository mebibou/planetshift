"""feed.json: how each feed item is shared out between the animal groups."""

from .. import feed as Fd
from .. import groups as G
from .. import seafood as Sf
from ..inputs import Build, write


def build(b: Build) -> None:
    kept = G.kept(b.groups)
    world_feed = b.balance["feed"].groupby("item_code").sum()
    fed = kept[kept["fbs_code"].map(world_feed).fillna(0) > 0]
    items = fed.rename(columns={"fbs_code": "code"})[["code", "group"]]
    data = Fd.feed_json(
        b.production,
        b.regions,
        b.rich,
        items,
        Fd.load_species(),
        Fd.load_intake(),
        Fd.load_rations(),
        Sf.fed_aquaculture(b.fishstat, b.year) if b.fishstat is not None else None,
        Fd.load_fishmeal(),
    )
    write(b.out, "feed.json", data)
