"""sectors.json: fossil CO₂ by sector under each SSP and what the energy levers need."""

from ..inputs import Build, log, optional


def build(b: Build) -> None:
    mod = optional("sectors")
    if mod is None or not hasattr(mod, "build_sectors"):
        log.warning("sectors.build_sectors missing: sectors.json not built")
        return
    mod.build_sectors(b.cache, b.out)
