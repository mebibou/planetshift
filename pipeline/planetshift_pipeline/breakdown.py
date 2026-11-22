"""The share of each gas of every intensity by emission source (docs/methodology/en/emissions.md).

Each cell follows the tier that set its intensity: HESTIA rows split by their emission terms,
FAOSTAT rows by the processes the allocation shares, published and proxy rows by the FAOSTAT
split of the same item in the country or the world, a processed item by its primary items.
A gas missing from that profile falls back, in order, on the FAOSTAT split of the item in the
country, in the world, HESTIA's world split, a split known for the item from its own source
(seafood), the same for its related items (the primary items a processed item is made from, then
its proxies), the item's world breakdown, and `other`.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

import pandas as pd

from .intensities import GASES

SOURCES = (
    "enteric",
    "manure",
    "rice",
    "syntheticFertiliser",
    "organicFertiliser",
    "residues",
    "energy",
    "inputsManufacture",
    "other",
)
DIGITS = 3

Shares = dict[str, float]
Profile = dict[str, Shares]


def shares(kg: dict[str, float]) -> Shares | None:
    """kg by source to shares summing to 1; negative parts count as none."""
    positive = {s: v for s, v in kg.items() if v > 0}
    total = sum(positive.values())
    return {s: v / total for s, v in positive.items()} if total > 0 else None


def profiles(frame: pd.DataFrame, keys: list[str]) -> dict[tuple, Profile]:
    """{key tuple: {gas: shares}} from long rows (keys..., gas, source, kg)."""
    sums = frame.groupby([*keys, "gas", "source"])["kg"].sum()
    nested: dict[tuple, dict[str, dict[str, float]]] = {}
    for (*key, gas, source), kg in sums.items():
        nested.setdefault(tuple(key), {}).setdefault(gas, {})[source] = kg
    return {
        key: {gas: s for gas, kg in by_gas.items() if (s := shares(kg))}
        for key, by_gas in nested.items()
    }


def faostat_frame(emissions: dict[str, pd.DataFrame], iso3: dict[int, str]) -> pd.DataFrame:
    """FAOSTAT kg by (iso3, fbs_code, scope, gas, source) for the model's countries."""
    return pd.concat(
        [
            e[e["area_code"].isin(iso3)].assign(
                iso3=lambda d: d["area_code"].map(iso3), scope=scope, source=e["process"]
            )
            for scope, e in emissions.items()
        ],
        ignore_index=True,
    )[["iso3", "fbs_code", "scope", "gas", "source", "kg"]]


def hestia_world(hestia: pd.DataFrame) -> pd.DataFrame:
    """HESTIA's World rows, or for items without one the sum over its countries."""
    world = hestia[hestia["area"] == "World"]
    countries = hestia[hestia["area"].str.len() == 3]
    return pd.concat([world, countries[~countries["fbs_item_code"].isin(world["fbs_item_code"])]])


PROXY = re.compile(r"^proxy (\d+): ")
PROCESSED = re.compile(r"^processed from (.+) \(extraction rate\)")


def primaries(source: str) -> list[tuple[int, float]]:
    """[(primary item, extraction rate)] from a processed cell's source text."""
    match = PROCESSED.match(source)
    if not match:
        return []
    return [
        (int(code), float(rate))
        for code, rate in (part.split(" / ") for part in match.group(1).split(" + "))
    ]


def proxy_of(source: str) -> int | None:
    match = PROXY.match(source)
    return int(match.group(1)) if match else None


def blend(parts: Iterable[tuple[float, Shares]]) -> Shares | None:
    """Shares weighted by kg: [(kg, shares)] -> shares of the sum."""
    total: dict[str, float] = {}
    for kg, s in parts:
        for source, share in s.items():
            total[source] = total.get(source, 0.0) + kg * share
    return shares(total)


class Resolver:
    """Resolves the profile of every merged intensity cell (iso3, fbs_code, scope)."""

    def __init__(
        self,
        merged: pd.DataFrame,
        faostat: pd.DataFrame,
        hestia: pd.DataFrame,
        related: dict[int, list[int]] | None = None,
        known: dict[tuple, Profile] | None = None,
    ):
        self.related = related or {}
        self.known = known or {}
        self.cells = {(r.iso3, r.fbs_code, r.scope): r for r in merged.itertuples(index=False)}
        self.faostat = profiles(faostat, ["iso3", "fbs_code", "scope"])
        self.faostat_world = profiles(faostat, ["fbs_code", "scope"])
        self.hestia = profiles(hestia, ["fbs_item_code", "scope", "url"])
        self.hestia_world = profiles(hestia_world(hestia), ["fbs_item_code", "scope"])
        self.world: dict[tuple, Profile] = {}
        self.done: dict[tuple, Profile] = {}

    def own(self, key: tuple) -> Profile:
        iso3, code, scope = key
        cell = self.cells[key]
        if cell.tier in (1, 2):
            return self.hestia.get((code, scope, cell.source), {})
        if cell.tier == 5 and (proxy := proxy_of(cell.source)) is not None:
            return self.resolved((iso3, proxy, scope))
        if cell.tier == 5 and (parts := primaries(cell.source)):
            return self.from_primaries(iso3, scope, parts)
        return {}

    def from_primaries(self, iso3: str, scope: str, parts: list[tuple[int, float]]) -> Profile:
        """Primaries weighted by the emissions each would bring per tonne of the product."""
        found = [
            (self.cells[(iso3, code, scope)], rate, self.resolved((iso3, code, scope)))
            for code, rate in parts
            if (iso3, code, scope) in self.cells
        ]
        return {
            gas: s
            for gas in GASES
            if (
                s := blend(
                    (getattr(cell, gas) / rate, p[gas]) for cell, rate, p in found if gas in p
                )
            )
        }

    def fallbacks(self, key: tuple) -> list[Profile]:
        iso3, code, scope = key
        return [
            p
            for item in (code, *self.related.get(code, []))
            for p in (
                self.faostat.get((iso3, item, scope), {}),
                self.faostat_world.get((item, scope), {}),
                self.hestia_world.get((item, scope), {}),
                self.known.get((item, scope), {}),
            )
        ] + [self.world.get((code, scope), {})]

    def resolved(self, key: tuple) -> Profile:
        if key not in self.done:
            cell = self.cells[key]
            chain = [self.own(key), *self.fallbacks(key)]
            self.done[key] = {
                gas: next((p[gas] for p in chain if gas in p), {"other": 1.0})
                for gas in GASES
                if getattr(cell, gas)
            }
        return self.done[key]

    def run(self, weights: dict[tuple, float]) -> tuple[dict, dict]:
        """(world, byCountry) profiles. The world split of an item is the cells' splits weighted
        by their emissions (intensity x weight); tier-6 cells are resolved after it."""
        first = [k for k, c in self.cells.items() if c.tier != 6]
        for key in first:
            self.resolved(key)
        self.world = world_profiles({k: self.done[k] for k in first}, self.cells, weights)
        for key in self.cells:
            self.resolved(key)
        return self.world, self.done


def world_profiles(
    done: dict[tuple, Profile], cells: dict[tuple, object], weights: dict[tuple, float]
) -> dict[tuple, Profile]:
    """(fbs_code, scope) -> shares of the world's emissions of the item, by gas. Items no country
    weighs (none produced) average their countries' shares."""
    parts: dict[tuple, dict[str, list[tuple[float, Shares]]]] = {}
    for (iso3, code, scope), profile in done.items():
        cell = cells[(iso3, code, scope)]
        for gas, s in profile.items():
            parts.setdefault((code, scope), {}).setdefault(gas, []).append(
                (getattr(cell, gas) * weights.get((iso3, code), 0.0), s)
            )
    return {
        key: {
            gas: blend(ws) if sum(w for w, _ in ws) > 0 else blend((1.0, s) for _, s in ws)
            for gas, ws in by_gas.items()
        }
        for key, by_gas in parts.items()
    }


def rounded(s: Shares) -> Shares:
    """Shares to DIGITS decimals, zeros dropped, the largest taking the rounding so they sum
    to 1 exactly at that precision."""
    kept = {k: round(v, DIGITS) for k, v in s.items() if round(v, DIGITS) > 0}
    if not kept:
        return {max(s, key=s.get): 1.0}
    top = max(kept, key=kept.get)
    rest = sum(v for k, v in kept.items() if k != top)
    return {k: (round(1 - rest, DIGITS) if k == top else v) for k, v in kept.items()}


def as_json(profile: Profile) -> dict:
    return {gas: rounded(profile[gas]) for gas in GASES if gas in profile and profile[gas]}


def breakdown_json(
    world: dict[tuple, Profile], by_cell: dict[tuple, Profile], produced: set[tuple] | None = None
) -> dict:
    """Breakdown: world[item][scope][gas][source], and byCountry the same per country, leaving
    out a country's item when it equals the world's or, given `produced` (iso3, fbs_code), when
    the country does not produce it (the app falls back on the world's)."""
    world_json: dict[str, dict] = {}
    for (code, scope), profile in sorted(world.items()):
        if as_json(profile):
            world_json.setdefault(str(code), {})[scope] = as_json(profile)
    by_country: dict[str, dict] = {}
    cells: dict[tuple, dict] = {}
    for (iso3, code, scope), profile in by_cell.items():
        if (produced is None or (iso3, code) in produced) and as_json(profile):
            cells.setdefault((iso3, str(code)), {})[scope] = as_json(profile)
    for (iso3, code), scopes in sorted(cells.items()):
        if scopes != world_json.get(code):
            by_country.setdefault(iso3, {})[code] = scopes
    return {"world": world_json, "byCountry": by_country}


def build(
    merged: pd.DataFrame,
    faostat: pd.DataFrame,
    hestia: pd.DataFrame,
    weights: dict[tuple, float],
    produced: set[tuple] | None = None,
    related: dict[int, list[int]] | None = None,
    known: dict[tuple, Profile] | None = None,
) -> dict:
    """breakdown.json from the merged intensities (iso3, fbs_code, scope, gases, tier, source),
    FAOSTAT's kg by (iso3, fbs_code, scope, gas, source), HESTIA's by (fbs_item_code, area,
    scope, url, gas, source), each country's weight of each item (tonnes it counts), and the
    (iso3, fbs_code) a country produces, the items each item may borrow a split from, and the
    splits known for some items from their own source ((fbs_code, scope) -> profile)."""
    world, by_cell = Resolver(merged, faostat, hestia, related, known).run(weights)
    return breakdown_json(world, by_cell, produced)
