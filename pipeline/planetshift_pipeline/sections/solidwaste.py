"""solidwaste.json and oceanplastic.json: municipal solid waste by country, by type and
treatment, and plastic reaching the ocean through rivers."""

from .. import solidwaste as S
from ..inputs import Build, log, write
from ..sources import ocean_plastic, what_a_waste


def build(b: Build) -> None:
    data = S.solidwaste_json(what_a_waste.read(what_a_waste.path(b.cache)))
    rows = data["byCountry"].values()
    log.info(
        "municipal solid waste %d: %.2f Gt in %d countries; types filled for %d, treatment for %d",
        data["year"],
        sum(r["tonnes"] for r in rows) / 1e9,
        len(rows),
        sum("types" in r.get("filled", []) for r in rows),
        sum("treatment" in r.get("filled", []) for r in rows),
    )
    write(b.out, "solidwaste.json", data)
    year, tonnes = ocean_plastic.read(ocean_plastic.path(b.cache))
    log.info(
        "plastic to the ocean %d: %.3f Mt in %d countries", year, tonnes.sum() / 1e6, len(tonnes)
    )
    write(b.out, "oceanplastic.json", S.oceanplastic_json(year, tonnes))
