"""meta.json: the base year, the build date, the departures from FaIR the data was built for and
every source with its version."""

from datetime import UTC, datetime

from .. import config
from ..cache import downloaded_on
from ..inputs import Build, optional, write
from ..sources import faostat, naturalearth, worldbank


def build(b: Build, modules: tuple[str, ...]) -> None:
    write(
        b.out,
        "meta.json",
        {
            "baseYear": b.year,
            "builtAt": datetime.now(UTC).date().isoformat(),
            "departures": config.load(),
            "sources": sources(b, modules),
        },
    )


def sources(b: Build, modules: tuple[str, ...]) -> list[dict]:
    """FAOSTAT, Natural Earth and the World Bank, then the SOURCES of each module named."""

    def faostat_source(domain: str) -> dict:
        path = b.cache / faostat.FILES[domain]
        return {
            "id": f"faostat-{domain.lower()}",
            "name": f"FAOSTAT, {faostat.NAMES[domain]}",
            "version": f"updated {faostat.updated_on(b.cache, domain)}, "
            f"downloaded {downloaded_on(path) or 'unknown'}",
            "url": faostat.domain_url(domain),
            "licence": faostat.LICENCE,
        }

    own = [faostat_source(d) for d in faostat.NAMES if (b.cache / faostat.FILES[d]).exists()]
    ne = {
        "id": "natural-earth",
        "name": "Natural Earth, Admin 0 countries, 1:50m",
        "version": naturalearth.VERSION,
        "url": naturalearth.PAGE,
        "licence": naturalearth.LICENCE,
    }
    wb = {
        "id": "world-bank-income",
        "name": "World Bank country and lending groups",
        "version": worldbank.fiscal_year(b.cache),
        "url": worldbank.PAGE,
        "licence": worldbank.LICENCE,
    }
    return [*own, ne, wb, *module_sources(modules, b.missing)]


def module_sources(modules: tuple[str, ...], missing) -> list[dict]:
    """The SOURCES of each module, but those the build went on without."""
    return [
        s
        for module in modules
        if module not in missing
        for s in (getattr(optional(module), "SOURCES", None) or [])
    ]
