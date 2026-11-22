"""items.json: the Food Balance Sheet items kept in the model."""

from .. import groups as G
from .. import supply as S
from ..inputs import Build, log, write


def build(b: Build) -> None:
    fbs_year = b.fbs[b.fbs["year"] == b.year]
    names_en = dict(zip(fbs_year["item_code"], fbs_year["item"], strict=False))
    names_fr = b.names("FBS_FR") if b.has_french("FBS_FR") else {}
    missing = G.unmapped(
        b.balance["production"].groupby("item_code").sum().loc[lambda s: s > 0], b.groups
    )
    if missing:
        log.warning("FBS items with production missing from groups.csv: %s", missing)
    world = S.world_nutrients(fbs_year)
    write(b.out, "items.json", G.item_records(b.groups, world, names_en, names_fr))
