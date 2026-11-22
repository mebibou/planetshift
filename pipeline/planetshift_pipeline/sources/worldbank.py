"""World Bank country income classification (CLASS.xlsx), for the high-income flag."""

from pathlib import Path

import pandas as pd

from ..cache import fetched

URL = "https://ddh-openapi.worldbank.org/resources/DR0095333/download"
PAGE = "https://datahelpdesk.worldbank.org/knowledgebase/articles/906519"
LICENCE = "CC BY 4.0"


def classification(cache_dir: Path) -> pd.DataFrame:
    raw = pd.read_excel(fetched(cache_dir, URL, "CLASS.xlsx"), sheet_name="List of economies")
    return raw.rename(columns={"Code": "iso3", "Income group": "income"})[["iso3", "income"]]


def high_income(classes: pd.DataFrame) -> set[str]:
    return set(classes.loc[classes["income"] == "High income", "iso3"])


def fiscal_year(cache_dir: Path) -> str:
    notes = pd.read_excel(fetched(cache_dir, URL, "CLASS.xlsx"), sheet_name="notes")
    text = " ".join(notes.iloc[:, 0].astype(str))
    return next((w for w in text.replace(",", " ").split() if w.startswith("FY")), "")
