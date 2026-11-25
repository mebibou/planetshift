"""FAOSTAT's detailed trade matrix (TM): each reporter's imports of each item by partner.

The file is about 8.5 GB unzipped, so it is read in chunks and only the import quantities in
tonnes of the years asked for are kept, in an extract next to the download."""

from pathlib import Path

import pandas as pd

from ..cache import extracted
from . import faostat

IMPORT_QUANTITY = 5610
COLUMNS = {
    "Reporter Country Code": "reporter",
    "Partner Country Code": "partner",
    "Item Code": "item_code",
    "Element Code": "element_code",
    "Year": "year",
    "Unit": "unit",
    "Value": "value",
}
CHUNK = 2_000_000


def read_imports(zip_path: Path, first: int, last: int) -> pd.DataFrame:
    """reporter, partner, item_code, year, t: import quantities in tonnes, first..last."""
    import zipfile

    with zipfile.ZipFile(zip_path) as z:
        name = next(n for n in z.namelist() if n.endswith("(Normalized).csv"))
        with z.open(name) as f:
            chunks = pd.read_csv(
                f, encoding="latin-1", usecols=list(COLUMNS), chunksize=CHUNK, low_memory=False
            )
            kept = [
                c.rename(columns=COLUMNS).query(
                    "element_code == @IMPORT_QUANTITY and unit == 't' and @first <= year <= @last"
                )
                for c in chunks
            ]
    rows = pd.concat(kept, ignore_index=True)
    return rows.rename(columns={"value": "t"})[["reporter", "partner", "item_code", "year", "t"]]


def imports(cache_dir: Path, first: int, last: int) -> pd.DataFrame:
    """The import quantities of first..last, extracted once from the cached bulk file."""
    zip_path = faostat.bulk_path(Path(cache_dir), "TM")
    extract = zip_path.with_name(f"{zip_path.stem}_imports_{first}-{last}.pkl")
    return extracted(extract, lambda: read_imports(zip_path, first, last))
