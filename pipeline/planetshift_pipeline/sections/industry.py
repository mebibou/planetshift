"""industry.json: buildings' and industry's direct CO₂ under each SSP, for their levers."""

from ..inputs import Build, log, optional


def build(b: Build) -> None:
    mod = optional("industry")
    if mod is None or not hasattr(mod, "build_industry"):
        log.warning("industry.build_industry missing: industry.json not built")
        return
    mod.build_industry(b.cache, b.out)
