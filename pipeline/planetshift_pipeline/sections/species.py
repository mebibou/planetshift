"""species.json: species committed to extinction per hectare of farmland by country, and the
ocean's fish with and without fishing."""

from .. import land as L
from .. import species as S
from ..inputs import Build, log, write


def build(b: Build) -> None:
    y = b.year
    pasture = L.latest(b.read("RL", y - 2, y), L.PASTURE, y)
    lsu = L.herd_lsu(b.read("EK", y, y), b.read("QCL", y, y), y).sum(axis=1)
    density = S.grazing_density(lsu, pasture)
    minimal = {b.iso3[a]: S.minimal_share(float(d)) for a, d in density.items() if a in b.iso3}
    iso3s = set(b.iso3.values())
    data = S.species_json(S.factors(S.read(S.path(b.cache)), iso3s, minimal))
    log.info(
        "pasture at minimal use: %s; species per Mha of pasture, average: %s; no factors for %s",
        {k: round(minimal.get(k, 0.0), 2) for k in ("AUS", "USA", "CHN", "BRA", "FRA")},
        {k: round(data["byCountry"][k]["pasture"][0] * 1e6, 1) for k in ("AUS", "BRA", "FRA")},
        sorted(iso3s - set(data["byCountry"])),
    )
    write(b.out, "species.json", data)
