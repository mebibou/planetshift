"""FAOSTAT bulk downloads: one normalised zip per domain, read into a tidy frame."""

import json
import logging
import zipfile
from pathlib import Path

import pandas as pd

from ..cache import extracted, fetched, record, recorded, today

log = logging.getLogger(__name__)

BULK = "https://bulks-faostat.fao.org/production/"
LICENCE = "CC BY 4.0"
LICENCE_URL = "https://www.fao.org/contact-us/terms/db-terms-of-use/en"

FILES = {
    "FBS": "FoodBalanceSheets_E_All_Data_(Normalized).zip",
    "FBSH": "FoodBalanceSheetsHistoric_E_All_Data_(Normalized).zip",
    "OA": "Population_E_All_Data_(Normalized).zip",
    "QCL": "Production_Crops_Livestock_E_All_Data_(Normalized).zip",
    "QV": "Value_of_Production_E_All_Data_(Normalized).zip",
    "GCE": "Emissions_crops_E_All_Data_(Normalized).zip",
    "GLE": "Emissions_livestock_E_All_Data_(Normalized).zip",
    "GT": "Emissions_Totals_E_All_Data_(Normalized).zip",
    "GN": "Emissions_Agriculture_Energy_E_All_Data_(Normalized).zip",
    "GPP": "Emissions_Pre_Post_Production_E_All_Data_(Normalized).zip",
    "RL": "Inputs_LandUse_E_All_Data_(Normalized).zip",
    "EK": "Environment_LivestockPatterns_E_All_Data_(Normalized).zip",
    "TCL": "Trade_CropsLivestock_E_All_Data_(Normalized).zip",
    "FBS_FR": "BilansAlimentaires_F_Toutes_les_Données_(Normalisé).zip",
    "OA_FR": "Population_F_Toutes_les_Données_(Normalisé).zip",
}

NAMES = {
    "FBS": "Food Balances (2010-)",
    "FBSH": "Food Balances (-2013, old methodology)",
    "OA": "Annual population",
    "QCL": "Crops and livestock products",
    "QV": "Value of Agricultural Production",
    "GCE": "Emissions from Crops",
    "GLE": "Emissions from Livestock",
    "GT": "Emissions totals",
    "GN": "Emissions from energy use in agriculture",
    "GPP": "Emissions from pre and post agricultural production",
    "RL": "Land Use",
    "EK": "Livestock Patterns",
    "TCL": "Trade of crops and livestock products",
}

COLUMNS = {
    "Area Code": "area_code",
    "Code zone": "area_code",
    "Area Code (M49)": "m49",
    "Code zone (M49)": "m49",
    "Area": "area",
    "Zone": "area",
    "Item Code": "item_code",
    "Code Produit": "item_code",
    "Item": "item",
    "Produit": "item",
    "Element Code": "element_code",
    "Code Élément": "element_code",
    "Element": "element",
    "Élément": "element",
    "Year": "year",
    "Année": "year",
    "Unit": "unit",
    "Unité": "unit",
    "Value": "value",
    "Valeur": "value",
}

#: The emissions domains' source code for FAOSTAT's own (Tier 1) estimates.
FAO_SOURCE = "3050"

#: The historic Food Balance Sheets are the one bulk file still in Latin-1.
ENCODINGS = {"FBSH": "latin-1"}

#: Items whose code changed between the historic and the current Food Balance Sheets.
FBSH_ITEM_CODES = {2805: 2807, 2556: 2552}


DATASETS = BULK + "datasets_E.json"


def listed_update(cache_dir: Path, domain: str) -> str:
    """The date FAOSTAT last updated a domain, from today's bulk listing."""
    path = fetched(cache_dir, DATASETS, f"datasets_E_{today()}.json")
    listing = json.loads(path.read_text())["Datasets"]["Dataset"]
    code = domain.removesuffix("_FR")
    return next((d["DateUpdate"][:10] for d in listing if d["DatasetCode"] == code), "")


def updated_on(cache_dir: Path, domain: str) -> str:
    """The date FAOSTAT had last updated a domain when its bulk file was downloaded."""
    return recorded(bulk_path(cache_dir, domain)).get("updated", "")


def domain_url(domain: str) -> str:
    return f"https://www.fao.org/faostat/en/#data/{domain.removesuffix('_FR')}"


def release_name(file: str, updated: str) -> str:
    """A bulk file's cached name, keyed by FAOSTAT's update date of its domain."""
    stem, dot, ext = file.rpartition(".")
    return f"{stem}_{updated}{dot}{ext}" if updated else file


def cached_bulk(cache_dir: Path, domain: str) -> Path | None:
    """The cached bulk file of the release FAOSTAT lists today, if the build has fetched it."""
    path = cache_dir / release_name(FILES[domain], listed_update(cache_dir, domain))
    return path if path.exists() else None


def bulk_path(cache_dir: Path, domain: str) -> Path:
    """The cached bulk file of the release FAOSTAT lists today: a new release is a new file."""
    updated = listed_update(cache_dir, domain)
    path = fetched(cache_dir, BULK + FILES[domain], release_name(FILES[domain], updated))
    if "updated" not in recorded(path):
        record(path, updated=updated)
    return path


def extract_path(cache_dir: Path, domain: str, first_year: int, last_year: int) -> Path:
    """The extract of a domain's years, keyed by the bulk file it was read from."""
    side = recorded(bulk_path(cache_dir, domain))
    version = f"{side.get('updated', '')}_{side.get('downloaded', '')}"
    return cache_dir / "extracts" / f"{domain}_{first_year}_{last_year}_{version}.pkl"


def tidy(raw: pd.DataFrame) -> pd.DataFrame:
    """Standard column names, numeric codes, and the M49 code without FAOSTAT's leading quote."""
    renamed = raw.rename(columns=COLUMNS)
    df = renamed[[c for c in dict.fromkeys(COLUMNS.values()) if c in renamed.columns]]
    return df.assign(
        m49=df["m49"].astype(str).str.strip("'"),
        area_code=df["area_code"].astype(int),
        item_code=df["item_code"].astype(int),
        element_code=df["element_code"].astype(int),
        year=df["year"].astype(int),
        value=pd.to_numeric(df["value"], errors="coerce"),
    )


def data_member(z: zipfile.ZipFile) -> str:
    return next(n for n in z.namelist() if "All_Data" in n or "Toutes" in n or "Donn" in n)


def read_zip(path: Path, first_year: int, last_year: int, encoding: str = "utf-8") -> pd.DataFrame:
    year_col = "Année" if "_F_" in path.name else "Year"
    with zipfile.ZipFile(path) as z, z.open(data_member(z)) as f:
        chunks = pd.read_csv(f, chunksize=2_000_000, dtype=str, encoding=encoding)
        frames = [kept_rows(c, year_col, first_year, last_year) for c in chunks]
    return tidy(pd.concat(frames, ignore_index=True))


def kept_rows(chunk: pd.DataFrame, year_col: str, first_year: int, last_year: int) -> pd.DataFrame:
    """Rows of the years asked; in the emissions domains, FAOSTAT's own estimates only, since
    they also carry each country's UNFCCC inventory as a second source for the same rows."""
    in_years = pd.to_numeric(chunk[year_col]).between(first_year, last_year)
    own = chunk["Source Code"] == FAO_SOURCE if "Source Code" in chunk else True
    return chunk[in_years & own]


def read(cache_dir: Path, domain: str, first_year: int, last_year: int) -> pd.DataFrame:
    """Rows of a domain for the years asked, kept as an extract in the cache once read."""

    def build() -> pd.DataFrame:
        log.info("reading %s %s-%s", domain, first_year, last_year)
        return read_zip(
            bulk_path(cache_dir, domain), first_year, last_year, ENCODINGS.get(domain, "utf-8")
        )

    return extracted(extract_path(cache_dir, domain, first_year, last_year), build)
