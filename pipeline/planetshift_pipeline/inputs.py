"""What the sections share: the inputs read once and only when a section asks for them."""

import importlib
import json
import logging
from functools import cached_property
from pathlib import Path

import pandas as pd

from . import countries as K
from . import groups as G
from . import intensities as I
from . import land as L
from . import seafood as Sf
from . import supply as S
from .sources import faostat, fishstat, naturalearth, worldbank

log = logging.getLogger("planetshift")

OUT_DIR = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"
FIRST_FBS_YEAR = 2010
LAST_YEAR = 2100
HISTORIC_YEARS = (2000, 2013)
#: The literature tier reads HESTIA's intensities too, so it goes when HESTIA does.
HESTIA_DEPENDENTS = ("sources.hestia", "sources.literature")


class MissingSource(RuntimeError):
    """A source the build could not read; `--allow-missing` builds without it instead."""


def optional(module: str):
    """A sibling module another part of the project owns, or None when it is missing or broken."""
    try:
        found = importlib.import_module(f"planetshift_pipeline.{module}")
    except Exception as err:  # noqa: BLE001 - any failure means building without it
        log.warning("%s unavailable (%s)", module, err)
        found = None
    return found


def write(out_dir: Path, name: str, data) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / name
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
    log.info("wrote %s (%.0f kB)", path.name, path.stat().st_size / 1024)


class Build:
    """Everything a section needs, read once and only when asked for."""

    def __init__(self, cache_dir: Path, out_dir: Path, allow_missing: bool = False):
        self.cache, self.out, self.allow_missing = cache_dir, out_dir, allow_missing
        self.missing: dict[str, str] = {}

    def without(self, modules: tuple[str, ...], reason) -> None:
        """A source that could not be read: the build stops, or with `allow_missing` goes on
        without it, and meta.json leaves out the modules named."""
        if not self.allow_missing:
            raise MissingSource(f"{', '.join(modules)}: {reason}")
        log.warning("%s unavailable (%s): building without it", ", ".join(modules), reason)
        self.missing |= dict.fromkeys(modules, str(reason))

    def module(self, name: str, function: str):
        """A module's function, or None (after `without`) when it cannot be imported."""
        mod = optional(name)
        fn = getattr(mod, function, None) if mod else None
        if fn is None:
            self.without((name,), f"{name}.{function} missing")
        return fn

    def read(self, domain: str, first: int, last: int) -> pd.DataFrame:
        return faostat.read(self.cache, domain, first, last)

    @cached_property
    def fbs(self) -> pd.DataFrame:
        return self.read("FBS", FIRST_FBS_YEAR, LAST_YEAR)

    @cached_property
    def year(self) -> int:
        return S.base_year(self.fbs)

    @cached_property
    def population(self) -> pd.DataFrame:
        return K.population(
            self.read("OA", HISTORIC_YEARS[0], LAST_YEAR), HISTORIC_YEARS[0], LAST_YEAR
        )

    @cached_property
    def balance_rows(self) -> tuple[pd.DataFrame, dict[int, str]]:
        fbsh = self.read("FBSH", *HISTORIC_YEARS)
        pop = self.population[self.population.index.map(K.is_country)]
        return S.gap_filled(self.fbs, fbsh, pop, self.year, faostat.FBSH_ITEM_CODES)

    @cached_property
    def balance(self) -> pd.DataFrame:
        rows, filled = self.balance_rows
        if filled:
            log.info("balances filled from earlier years: %s", filled)
        return S.balance(rows)

    @cached_property
    def natural_earth(self) -> dict:
        return naturalearth.geojson(self.cache)

    @cached_property
    def area_table(self) -> pd.DataFrame:
        oa = self.read("OA", HISTORIC_YEARS[0], LAST_YEAR)
        ne = naturalearth.attributes(self.natural_earth)
        table = K.area_table(oa, K.iso3_by_m49(ne))
        in_balance = set(self.balance.index.get_level_values("area_code"))
        unknown = table[table["iso3"].isna() & table["area_code"].isin(in_balance)]
        if len(unknown):
            log.warning("areas with no ISO3 code, left out: %s", list(unknown["area"]))
        return table[table["iso3"].notna() & table["area_code"].isin(in_balance)]

    @cached_property
    def iso3(self) -> dict[int, str]:
        return dict(zip(self.area_table["area_code"], self.area_table["iso3"], strict=True))

    @cached_property
    def regions(self) -> dict[str, str]:
        return K.region_by_iso3(naturalearth.attributes(self.natural_earth))

    @cached_property
    def rich(self) -> set[str]:
        return worldbank.high_income(worldbank.classification(self.cache))

    @cached_property
    def groups(self) -> pd.DataFrame:
        return G.load()

    @cached_property
    def kept_codes(self) -> set[int]:
        return set(G.kept(self.groups)["fbs_code"])

    @cached_property
    def fishstat(self) -> pd.DataFrame | None:
        """FishStat production for the years before the base year, or None if unavailable."""
        try:
            production = fishstat.read(self.cache, self.year - 4, self.year)
        except Exception as err:  # noqa: BLE001 - seafood falls back to proxies and medians
            self.without(("sources.fishstat", "seafood"), err)
            production = None
        return production

    @cached_property
    def production(self) -> pd.DataFrame:
        """FBS production (t) by area_code, fbs_code and iso3, for countries in the model."""
        p = self.balance["production"].reset_index()
        p = p.rename(columns={"item_code": "fbs_code"})
        p = p[p["area_code"].isin(self.iso3) & p["fbs_code"].isin(self.kept_codes)]
        return p.assign(iso3=p["area_code"].map(self.iso3))

    def uses(self, field: str) -> pd.DataFrame:
        """One balance field (t) by iso3 and fbs_code, for countries in the model."""
        f = self.balance[field].reset_index().rename(columns={"item_code": "fbs_code"})
        f = f[f["area_code"].isin(self.iso3)]
        return f.assign(iso3=f["area_code"].map(self.iso3))[["iso3", "fbs_code", field]]

    def names(self, domain: str, column: str = "item_code") -> dict[int, str]:
        rows = self.read(domain, self.year, self.year)
        return dict(
            zip(rows[column], rows["area" if column == "area_code" else "item"], strict=False)
        )

    def has_french(self, domain: str) -> bool:
        try:
            faostat.bulk_path(self.cache, domain)
            found = True
        except Exception as err:  # noqa: BLE001
            self.without((f"faostat-{domain.lower()}",), err)
            found = False
        return found

    @cached_property
    def emissions_year(self) -> int:
        gt = self.read("GT", self.year - 3, self.year)
        return int(min(self.year, gt["year"].max()))

    def faostat_candidates(self) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
        y = self.emissions_year
        crops = I.load_crops()
        production = self.production[["area_code", "fbs_code", "production"]]
        qcl = self.read("QCL", y, y)
        emissions = I.faostat_emissions(
            self.read("GCE", y, y),
            self.read("GLE", y, y),
            self.read("GT", y, y),
            qcl,
            self.read("QV", y, y),
            crops,
            production,
            self.nonfood_shares,
        )
        covered = set(self.read("GT", y, y)["area_code"]) & set(self.iso3)
        per_scope = {
            scope: I.without_outliers(
                I.per_tonne(e, production, covered, I.faostat_items(crops)), production
            )
            for scope, e in emissions.items()
        }
        tier3 = pd.concat(
            [
                df.assign(
                    iso3=df["area_code"].map(self.iso3),
                    scope=scope,
                    tier=3,
                    rank=0,
                    source=I.FAOSTAT_SOURCE,
                )
                for scope, df in per_scope.items()
            ],
            ignore_index=True,
        )
        return tier3, emissions

    def fetch(self, modules: tuple[str, ...], function: str, default):
        """`function` of the first of `modules` on the cache, or `default` (after `without`)
        when it is missing or fails; the other modules depend on it."""
        fn = self.module(modules[0], function)
        value = default
        try:
            value = default if fn is None else fn(self.cache)
        except Exception as err:  # noqa: BLE001 - any failure is a missing source
            self.without(modules, f"{function} failed: {err}")
        return value

    def external(
        self, modules: tuple[str, ...], function: str, tier_country: int, tier_wide: int, members
    ):
        df = self.fetch(modules, function, None)
        countries = sorted(set(self.iso3.values()))
        return (
            None
            if df is None
            else I.candidates_from(df, countries, members, tier_country, tier_wide)
        )

    @cached_property
    def hestia_members(self) -> dict[str, list[str]]:
        return self.fetch(HESTIA_DEPENDENTS, "region_members", {})

    @cached_property
    def nonfood_shares(self) -> pd.DataFrame:
        """Share of each species' emissions from the animals not raised for food."""
        y = self.emissions_year
        return I.nonfood_shares(
            self.read("GLE", y, y), self.read("QCL", y, y), self.read("TCL", y, y)
        )

    @cached_property
    def nonfood(self) -> pd.DataFrame:
        """kg a year by area_code, gas and process of the animals not raised for food."""
        y = self.emissions_year
        kg = I.nonfood_emissions(self.read("GLE", y, y), self.nonfood_shares)
        return kg[kg["area_code"].isin(self.iso3)]

    @cached_property
    def faostat_tier3(self) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
        return self.faostat_candidates()

    @cached_property
    def merged(self) -> pd.DataFrame:
        tier3, _ = self.faostat_tier3
        members = self.hestia_members
        hestia = self.external(HESTIA_DEPENDENTS, "fetch_intensities", 1, 2, members)
        literature = self.external(
            ("sources.literature",), "fetch_literature_intensities", 4, 4, {}
        )
        countries = sorted(set(self.iso3.values()))
        seafood = (
            Sf.candidates(self.fishstat, self.year, countries)
            if self.fishstat is not None
            else None
        )
        kept = G.kept(self.groups)
        grid = pd.DataFrame(
            [
                {"iso3": c, "fbs_code": code, "scope": s}
                for c in countries
                for code in kept["fbs_code"]
                for s in I.SCOPES
            ]
        )
        cols = ["iso3", "fbs_code", "scope", *I.GASES, "tier", "rank", "source"]
        proxies, extraction = I.load_proxies()
        merged = I.merge(
            grid,
            [c[cols] for c in (hestia, tier3, literature, seafood) if c is not None],
            proxies,
            extraction,
            dict(zip(kept["fbs_code"], kept["group"], strict=True)),
            self.production[["iso3", "fbs_code", "production"]],
            self.uses("processing"),
            G.byproducts(kept),
            self.oil_shares,
        )
        return merged

    @cached_property
    def oil_shares(self) -> dict[int, float]:
        cakes = L.load_oilcakes()
        return dict(zip(cakes["oil_code"], cakes["oil_share"], strict=True))
