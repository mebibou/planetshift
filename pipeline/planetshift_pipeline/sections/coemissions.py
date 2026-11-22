"""coemissions.json: methane and air pollution emitted with each sector's fossil CO₂, and their
forcing, for the energy, heating and industry levers."""

from ..inputs import Build, log, optional


def build(b: Build) -> None:
    mod = optional("coemissions")
    if mod is None or not hasattr(mod, "build_coemissions"):
        log.warning("coemissions.build_coemissions missing: coemissions.json not built")
        return
    mod.build_coemissions(b.cache, b.out)
