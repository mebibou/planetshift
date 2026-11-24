"""Emission intensities from HESTIA's published aggregations (docs/methodology/en/hestia.md)."""

from __future__ import annotations

import hashlib
import inspect
import json
import logging
import os
import re
from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

log = logging.getLogger(__name__)

API = "https://api.hestia.earth"
SITE = "https://hestia.earth"
# HESTIA's releases by data version (the API's /settings `dataReleases`). A release is open to
# priority-access tokens for its first 182 days, then to everyone; change these deliberately.
PUBLIC_RELEASE = "2026-04-30"
LATEST_RELEASE = "2026-11-17"
RELEASE_NAMES = {PUBLIC_RELEASE: "v1.2", LATEST_RELEASE: "v1.3"}
TOKEN_ENV = "HESTIA_API_TOKEN"


def release_for(token: str | None) -> str:
    """The release the build reads: the latest with a token, the newest public one without."""
    return LATEST_RELEASE if token else PUBLIC_RELEASE


TOKEN = os.environ.get(TOKEN_ENV) or None
RELEASE = release_for(TOKEN)
TERMS_CSV = Path(__file__).resolve().parents[2] / "hestia_terms.csv"

GASES = ("co2", "ch4", "n2o")
SCOPES = ("farmGate", "cradleToFarmGate")
COLUMNS = ["fbs_item_code", "area", "scope", *GASES, "url"]

SOURCES = [
    {
        "id": "hestia-aggregations",
        "name": "HESTIA aggregated impact assessments",
        "version": f"{RELEASE_NAMES[RELEASE]} ({RELEASE})",
        "url": f"{SITE}/data",
        "licence": "CC BY 4.0",
    }
]
WORKERS = 4
TIMEOUT = 120
PAGE = 1000

GAS_PREFIXES = {"co2ToAir": "co2", "ch4ToAir": "ch4", "n2OToAir": "n2o"}
LAND_USE_MARKERS = (
    "StockChange",
    "LandUseChange",
    "ManagementChange",
    "NaturalVegetationBurning",
    "OrganicSoil",
)
NOT_COUNTED = frozenset(
    {
        "co2ToAirCropResidueDecomposition",
        "co2ToAirSoilFlux",
        "n2OToAirBackgroundSoilFluxDirect",
    }
)
AGRICULTURAL_INPUT_TYPES = frozenset(
    {
        "crop",
        "forage",
        "animalProduct",
        "liveAnimal",
        "liveAquaticSpecies",
        "processedFood",
        "seed",
    }
)


#: The emission source (EmissionSource in app/src/data/types.ts) of an on-farm term, by the
#: first marker its id contains; an on-farm term matching none is `other` (lime, aquaculture,
#: waste treatment, soil flux, reservoirs, industrial processes).
SOURCE_MARKERS = (
    ("EntericFermentation", "enteric"),
    ("Excreta", "manure"),
    ("FloodedRice", "rice"),
    ("InorganicFertiliser", "syntheticFertiliser"),
    ("UreaHydrolysis", "syntheticFertiliser"),
    ("OrganicFertiliser", "organicFertiliser"),
    ("CropResidue", "residues"),
)
FARM_ENERGY_MARKER = "FuelCombustion"
#: Background rows of these input types are the making of the farm's energy, by its source.
ENERGY_INPUT_TYPES = {"electricity": "electricity", "fuel": "fuel"}


def gas_of(term_id: str) -> str | None:
    return next((gas for prefix, gas in GAS_PREFIXES.items() if term_id.startswith(prefix)), None)


def category_of(term_id: str) -> str | None:
    """onFarm, farmEnergy (fuel burnt on the farm), background, landUse or excluded; None for
    anything that is not CO2, CH4 or N2O."""
    return (
        None
        if gas_of(term_id) is None
        else "excluded"
        if term_id in NOT_COUNTED
        else "background"
        if "InputsProduction" in term_id
        else "landUse"
        if any(marker in term_id for marker in LAND_USE_MARKERS)
        else "farmEnergy"
        if FARM_ENERGY_MARKER in term_id
        else "onFarm"
    )


def energy_source(input_types: Iterable[str]) -> str:
    """The source of making an input: the farm's electricity or fuel, else the other inputs."""
    return next(
        (ENERGY_INPUT_TYPES[t] for t in input_types if t in ENERGY_INPUT_TYPES), "inputsManufacture"
    )


def source_of(term_id: str, input_types: Iterable[str] = ()) -> str | None:
    """The emission source of a counted term, None for terms no scope counts."""
    category = category_of(term_id)
    return (
        energy_source(input_types)
        if category == "background"
        else "fuel"
        if category == "farmEnergy"
        else next((source for marker, source in SOURCE_MARKERS if marker in term_id), "other")
        if category == "onFarm"
        else None
    )


def counts_in(scope: str, category: str | None, input_types: Iterable[str]) -> bool:
    """Agricultural inputs (seed, feed, animals) are left out, as their own items count them."""
    return category == "onFarm" or (
        scope == "cradleToFarmGate"
        and (
            category == "farmEnergy"
            or (category == "background" and not AGRICULTURAL_INPUT_TYPES.intersection(input_types))
        )
    )


def gas_totals(rows: Iterable[dict], keep: Callable[[str | None, list[str]], bool]) -> dict:
    """Sums the kept emission rows into kg of each gas per unit of product."""
    kept = [
        (gas_of(row["term"]["@id"]), row.get("value") or 0.0)
        for row in rows
        if gas_of(row["term"]["@id"])
        and keep(
            category_of(row["term"]["@id"]),
            [i.get("termType", "") for i in row.get("inputs", [])],
        )
    ]
    return {gas: sum(value for g, value in kept if g == gas) for gas in GASES}


def scope_totals(rows: list[dict], scope: str) -> dict:
    return gas_totals(rows, lambda category, inputs: counts_in(scope, category, inputs))


def area_of(region_id: str) -> str | None:
    """An ISO3 code, World, or region:<id>, from a HESTIA region term id."""
    match = re.fullmatch(r"GADM-([A-Z]{3})", region_id)
    return (
        "World"
        if region_id == "region-world"
        else f"region:{region_id}"
        if region_id.startswith("region-")
        else match.group(1)
        if match
        else None
    )


def term_of(aggregation_id: str) -> str:
    return aggregation_id.split("-", 1)[0]


def latest_aggregations(hits: Iterable[dict], term_ids: set[str]) -> list[str]:
    """The id of the latest period of each product and area among the search hits."""
    best: dict[tuple[str, str], dict] = {}
    for hit in hits:
        term = term_of(hit["@id"])
        if term not in term_ids:
            continue
        key = (term, hit.get("country", {}).get("name", ""))
        rank = (str(hit.get("endDate", "")), str(hit.get("startDate", "")), hit["@id"])
        if key not in best or rank > best[key]["rank"]:
            best[key] = {"rank": rank, "id": hit["@id"]}
    return sorted(entry["id"] for entry in best.values())


def trim_node(node: dict) -> dict:
    """Keeps what the intensities need: the gas rows without their distributions."""
    rows = [
        {
            "term": {"@id": row["term"]["@id"]},
            "value": row.get("value"),
            "methodTier": row.get("methodTier"),
            "inputs": [
                {"@id": i.get("@id"), "termType": i.get("termType")} for i in row.get("inputs", [])
            ],
        }
        for row in node.get("emissionsResourceUse", [])
        if gas_of(row["term"]["@id"])
    ]
    impacts = [
        {"term": {"@id": i["term"]["@id"]}, "value": i.get("value")}
        for i in node.get("impacts", [])
        if i["term"]["@id"] == "gwp100"
    ]
    product = node.get("product", {})
    return {
        "@id": node.get("@id"),
        "name": node.get("name"),
        "startDate": node.get("startDate"),
        "endDate": node.get("endDate"),
        "aggregatedDataValidated": node.get("aggregatedDataValidated"),
        "country": {"@id": node.get("country", {}).get("@id")},
        "product": {
            "term": {
                "@id": product.get("term", {}).get("@id"),
                "units": product.get("term", {}).get("units"),
            }
        },
        "emissionsResourceUse": rows,
        "impacts": impacts,
    }


#: Nodes are cached trimmed, so the cache is keyed by the code that trims them: a change to
#: what `trim_node` keeps fetches them anew.
TRIM_KEY = hashlib.sha256(inspect.getsource(trim_node).encode()).hexdigest()[:12]


def load_terms(path: Path = TERMS_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"fbs_item_code": int, "priority": int})


def per_tonne_of_item(kg_per_unit: dict, kg_product_per_kg_item: float) -> dict:
    return {gas: kg_per_unit[gas] * kg_product_per_kg_item * 1000 for gas in GASES}


def node_rows(node: dict, terms: pd.DataFrame) -> list[dict]:
    """Rows of one aggregation: one per FBS item it is mapped to and per scope."""
    area = area_of(node.get("country", {}).get("@id") or "")
    rows = node.get("emissionsResourceUse", [])
    return [] if area is None or not rows else item_rows(node, terms, area, rows)


def item_rows(node: dict, terms: pd.DataFrame, area: str, rows: list[dict]) -> list[dict]:
    """The aggregation's intensity per tonne of each FBS item it is mapped to, by scope."""
    term = node["product"]["term"]["@id"]
    # HESTIA gives an aggregation's Cycle the id of its ImpactAssessment; the Cycle page shows the
    # inputs and the practices behind it.
    url = f"{SITE}/cycle/{node['@id']}"
    totals = {scope: scope_totals(rows, scope) for scope in SCOPES}
    return [
        {
            "fbs_item_code": int(mapping.fbs_item_code),
            "area": area,
            "scope": scope,
            "term": term,
            "priority": int(mapping.priority),
            **per_tonne_of_item(totals[scope], float(mapping.kg_product_per_kg_item)),
            "url": url,
        }
        for mapping in terms[terms.hestia_term_id == term].itertuples()
        for scope in SCOPES
    ]


def input_types(row: dict) -> list[str]:
    return [i.get("termType", "") for i in row.get("inputs", [])]


def source_totals(rows: list[dict], scope: str) -> dict[tuple[str, str], float]:
    """(gas, source) -> kg per unit of product, over the rows the scope counts."""
    kept = [
        ((gas_of(row["term"]["@id"]), source_of(row["term"]["@id"], input_types(row))), value)
        for row in rows
        if gas_of(row["term"]["@id"])
        and counts_in(scope, category_of(row["term"]["@id"]), input_types(row))
        for value in [row.get("value") or 0.0]
    ]
    return {key: sum(v for k, v in kept if k == key) for key in dict.fromkeys(k for k, _ in kept)}


def node_source_rows(node: dict, terms: pd.DataFrame) -> list[dict]:
    """node_rows, split by gas and emission source: kg of the gas per tonne of the FBS item."""
    area = area_of(node.get("country", {}).get("@id") or "")
    rows = node.get("emissionsResourceUse", [])
    return [] if area is None or not rows else item_source_rows(node, terms, area, rows)


def item_source_rows(node: dict, terms: pd.DataFrame, area: str, rows: list[dict]) -> list[dict]:
    """The aggregation's kg of each gas by source per tonne of each FBS item, by scope."""
    term = node["product"]["term"]["@id"]
    totals = {scope: source_totals(rows, scope) for scope in SCOPES}
    return [
        {
            "fbs_item_code": int(mapping.fbs_item_code),
            "area": area,
            "scope": scope,
            "term": term,
            "gas": gas,
            "source": source,
            "kg": kg * float(mapping.kg_product_per_kg_item) * 1000,
        }
        for mapping in terms[terms.hestia_term_id == term].itertuples()
        for scope in SCOPES
        for (gas, source), kg in totals[scope].items()
    ]


def combine(rows: list[dict]) -> pd.DataFrame:
    """Keeps the best priority of each item and area, and averages the products sharing it."""
    return (
        best_averaged(pd.DataFrame(rows))
        if rows
        else pd.DataFrame(columns=COLUMNS).astype({"fbs_item_code": int})
    )


def best_averaged(frame: pd.DataFrame) -> pd.DataFrame:
    """The products of the best priority of each item, area and scope, averaged."""
    frame = frame.sort_values(["fbs_item_code", "area", "scope", "priority", "term"])
    keys = ["fbs_item_code", "area", "scope"]
    best = frame[frame.priority == frame.groupby(keys).priority.transform("min")]
    return (
        best.groupby(keys, as_index=False)
        .agg(co2=("co2", "mean"), ch4=("ch4", "mean"), n2o=("n2o", "mean"), url=("url", "first"))
        .astype({"fbs_item_code": int})[COLUMNS]
        .reset_index(drop=True)
    )


def region_members_from(countries: Iterable[dict], regions: Iterable[dict]) -> dict:
    """Region id → ISO3 codes, from country terms and the subClassOf names they carry."""
    by_name = {region["name"]: region["@id"] for region in regions}
    members: dict[str, set[str]] = {}
    for country in countries:
        iso3 = area_of(country.get("@id", ""))
        if iso3 is None or iso3 == "World" or iso3.startswith("region:"):
            continue
        for name in ancestor_names(country.get("subClassOf", [])):
            if name in by_name:
                members.setdefault(by_name[name], set()).add(iso3)
        members.setdefault("region-world", set()).add(iso3)
    return {region: sorted(codes) for region, codes in sorted(members.items())}


def ancestor_names(parents: list[dict]) -> list[str]:
    return [
        name
        for parent in parents
        for name in [parent.get("name", ""), *ancestor_names(parent.get("subClassOf", []))]
    ]


def session(token: str | None = TOKEN, release: str = RELEASE) -> requests.Session:
    retry = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
    )
    http = requests.Session()
    http.mount("https://", HTTPAdapter(max_retries=retry, pool_maxsize=WORKERS))
    http.headers.update({"Accept": "application/json", "X-Data-Version": release})
    if token:
        http.headers["X-ACCESS-TOKEN"] = token
    return http


def cached(path: Path, fetch: Callable[[], Any]) -> Any:
    """The JSON at path, or fetch() written there (None, a node HESTIA does not serve, is not
    cached); a failed request raises."""
    value = json.loads(path.read_text()) if path.exists() else fetch()
    if value is not None and not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))
    return value


def search_all(http: requests.Session, query: dict, fields: list[str]) -> list[dict]:
    def page(offset: int) -> dict:
        body = {"query": query, "fields": fields, "limit": PAGE, "offset": offset}
        response = http.post(f"{API}/search", json=body, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()

    first = page(0)
    rest = [page(offset)["results"] for offset in range(PAGE, first.get("count", 0), PAGE)]
    return first["results"] + [hit for results in rest for hit in results]


AGGREGATIONS_QUERY = {
    "bool": {
        "must": [
            {"match": {"@type": "ImpactAssessment"}},
            {"match": {"aggregated": "true"}},
            {"match": {"aggregatedDataValidated": "true"}},
        ]
    }
}


#: What `trim_node` reads, asked of the API so that a node's distributions, most of its 20 MB or
#: so, are never downloaded.
NODE_FIELDS = ",".join(
    [
        "@id",
        "name",
        "startDate",
        "endDate",
        "aggregatedDataValidated",
        "country.@id",
        "product.term.@id",
        "product.term.units",
        "emissionsResourceUse.term.@id",
        "emissionsResourceUse.value",
        "emissionsResourceUse.methodTier",
        "emissionsResourceUse.inputs.@id",
        "emissionsResourceUse.inputs.termType",
        "impacts.term.@id",
        "impacts.value",
    ]
)


def fetch_node(http: requests.Session, aggregation_id: str) -> dict | None:
    response = http.get(
        f"{API}/impactassessments/{aggregation_id}",
        params={"dataState": "recalculated", "fields": NODE_FIELDS},
        timeout=TIMEOUT,
    )
    refused = response.status_code in (401, 403, 404)
    if refused:
        log.info("HESTIA aggregation %s answered %s", aggregation_id, response.status_code)
    else:
        response.raise_for_status()
    return None if refused else trim_node(response.json())


def release_dir(cache_dir: Path) -> Path:
    return Path(cache_dir) / "hestia" / RELEASE


def combine_sources(rows: list[dict], source_rows: list[dict]) -> pd.DataFrame:
    """kg of each gas by source, summed over the products `combine` averages for each item,
    area and scope, with the URL `combine` gives the row: the shares of these sums are the
    shares of the averaged intensity."""
    columns = ["fbs_item_code", "area", "scope", "url", "gas", "source", "kg"]
    return (
        best_sources(rows, source_rows)[columns]
        if rows and source_rows
        else pd.DataFrame(columns=columns)
    )


def best_sources(rows: list[dict], source_rows: list[dict]) -> pd.DataFrame:
    """The source rows of the products `combine` keeps, summed, with the URL it gives."""
    keys = ["fbs_item_code", "area", "scope"]
    frame = pd.DataFrame(rows).sort_values([*keys, "priority", "term"])
    best = frame[frame.priority == frame.groupby(keys).priority.transform("min")]
    urls = best.groupby(keys, as_index=False).url.first()
    kept = pd.DataFrame(source_rows).merge(best[[*keys, "term"]], on=[*keys, "term"])
    return kept.groupby([*keys, "gas", "source"], as_index=False)["kg"].sum().merge(urls, on=keys)


def fetch_nodes(cache_dir: Path) -> list[dict]:
    """The latest validated aggregation of each mapped product and area, trimmed."""
    root = release_dir(cache_dir)
    terms = load_terms()
    http = session()
    hits = cached(
        root / "aggregations.json",
        lambda: search_all(
            http, AGGREGATIONS_QUERY, ["@id", "name", "startDate", "endDate", "country.name"]
        ),
    )
    ids = latest_aggregations(hits, set(terms.hestia_term_id))
    if not ids:
        raise ValueError("HESTIA's search found no aggregation of a mapped product")
    log.info("HESTIA: %d aggregations of mapped products", len(ids))

    def node(aggregation_id: str) -> dict | None:
        return cached(
            root / "nodes" / TRIM_KEY / f"{aggregation_id}.json",
            lambda: fetch_node(http, aggregation_id),
        )

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        return [n for n in pool.map(node, ids) if n]


def fetch_intensities(cache_dir: Path) -> pd.DataFrame:
    """kg of CO2, CH4 and N2O per tonne of each FBS item, by area and scope."""
    terms = load_terms()
    return combine([row for n in fetch_nodes(cache_dir) for row in node_rows(n, terms)])


def fetch_breakdown(cache_dir: Path) -> pd.DataFrame:
    """fetch_intensities split by emission source (columns of `combine_sources`)."""
    terms = load_terms()
    nodes = fetch_nodes(cache_dir)
    return combine_sources(
        [row for n in nodes for row in node_rows(n, terms)],
        [row for n in nodes for row in node_source_rows(n, terms)],
    )


def region_members(cache_dir: Path) -> dict[str, list[str]]:
    """HESTIA region id → ISO3 codes of its countries, from the glossary's region terms."""
    root = Path(cache_dir) / "hestia" / "glossary"
    http = session()
    region_query = {
        "bool": {
            "must": [
                {"match": {"@type": "Term"}},
                {"match": {"termType": "region"}},
                {"prefix": {"@id.keyword": "region-"}},
            ]
        }
    }
    country_query = {
        "bool": {
            "must": [
                {"match": {"@type": "Term"}},
                {"match": {"termType": "region"}},
                {"match": {"gadmLevel": 0}},
            ]
        }
    }
    regions = cached(root / "regions.json", lambda: search_all(http, region_query, ["@id", "name"]))
    countries = cached(
        root / "countries.json",
        lambda: search_all(http, country_query, ["@id", "name", "subClassOf"]),
    )
    return region_members_from(countries or [], regions or [])
