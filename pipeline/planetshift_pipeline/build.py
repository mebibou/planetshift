"""Builds app/public/data/*.json. `python -m planetshift_pipeline.build [--only a,b]`."""

import argparse
import logging
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from . import config
from .cache import DEFAULT_CACHE
from .inputs import OUT_DIR, Build, log
from .sections import (
    breakdown,
    chain,
    climate,
    coemissions,
    countries,
    deadfall,
    deeptime,
    deforestation,
    enso,
    feed,
    impacts,
    industry,
    intensities,
    items,
    land,
    landuse,
    mammals,
    map,
    meta,
    people,
    population,
    practices,
    removals,
    sectors,
    species,
    supply,
    waste,
)

__all__ = ["OUT_DIR", "SECTIONS", "Build", "Section", "main"]


@dataclass(frozen=True)
class Section:
    """One part of the build: what it writes, and the modules whose SOURCES meta.json lists."""

    name: str
    build: Callable[[Build], None]
    outputs: tuple[str, ...]
    sources: tuple[str, ...] = ()


def source_modules() -> tuple[str, ...]:
    """Every section's source modules, in section order, each once."""
    return tuple(dict.fromkeys(m for s in SECTIONS for m in s.sources))


#: The sections in the order they run; meta.json lists their sources in this order too.
SECTIONS: tuple[Section, ...] = (
    Section("countries", countries.build, ("countries.json",)),
    Section("items", items.build, ("items.json",)),
    Section("supply", supply.build, ("supply.json",)),
    Section("feed", feed.build, ("feed.json",)),
    Section(
        "intensities",
        intensities.build,
        ("intensities.json",),
        ("sources.hestia", "sources.literature", "sources.fishstat", "seafood"),
    ),
    Section("deadfall", deadfall.build, ("deadfall.json",), ("deadfall",)),
    Section("breakdown", breakdown.build, ("breakdown.json",)),
    Section("climate", climate.build, ("climate.json",), ("climate",)),
    Section("enso", enso.build, ("enso.json",), ("enso",)),
    Section("sectors", sectors.build, ("sectors.json",), ("sectors",)),
    Section("industry", industry.build, ("industry.json",), ("industry",)),
    Section("coemissions", coemissions.build, ("coemissions.json",), ("coemissions",)),
    Section("waste", waste.build, ("waste.json",), ("waste", "food_loss")),
    Section("land", land.build, ("land.json",), ("land",)),
    Section("practices", practices.build, ("practices.json",), ("practices", "sources.ember")),
    Section("deforestation", deforestation.build, ("deforestation.json",), ("deforestation",)),
    Section("landuse", landuse.build, ("landuse.json",), ("landuse",)),
    Section("removals", removals.build, ("removals.json",), ("removals",)),
    Section("population", population.build, ("population.json",), ("population",)),
    Section("people", people.build, ("people.json",)),
    Section("deeptime", deeptime.build, ("deeptime.json",), ("deeptime",)),
    Section("impacts", impacts.build, ("impacts.json",), ("impacts",)),
    Section("mammals", mammals.build, ("mammals.json",), ("mammals",)),
    Section("species", species.build, ("species.json",), ("species",)),
    Section("chain", chain.build, ("chain.json",), ("sources.food_stages",)),
    Section("map", map.build, ("world.topo.json",)),
    Section("meta", lambda b: meta.build(b, source_modules()), ("meta.json",)),
)


def main(argv: list[str] | None = None) -> None:
    names = [s.name for s in SECTIONS]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help=f"comma-separated sections among {', '.join(names)}")
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="build without a source that cannot be read, and leave it out of meta.json",
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    wanted = args.only.split(",") if args.only else names
    unknown = set(wanted) - set(names)
    if unknown:
        parser.error(f"unknown sections: {', '.join(sorted(unknown))}")
    log.info("departures from FaIR: %s", config.load())
    build = Build(args.cache, args.out, args.allow_missing)
    for section in (s for s in SECTIONS if s.name in wanted):
        log.info("section %s", section.name)
        section.build(build)
    if build.missing:
        log.warning("built without: %s", ", ".join(build.missing))


if __name__ == "__main__":
    main()
