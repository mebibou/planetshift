"""climate.json: AGTP curves, scenario temperatures, attribution and permafrost."""

from ..inputs import Build, log, optional


def build(b: Build) -> None:
    mod = optional("climate")
    if mod is None or not hasattr(mod, "build_climate"):
        log.warning("climate.build_climate missing: climate.json not built")
        return
    mod.build_climate(b.cache, b.out)
