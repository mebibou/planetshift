"""acidn2o.json: the N₂O from making adipic and nitric acid, for the lever that abates it: the
world's under each SSP, each country's in CEDS's last year, and the share of each the lever removes
at 100%. Run alone with `uv run python -m planetshift_pipeline.acid_n2o`; explained in
docs/methodology/en/industry.md."""

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

from . import coemissions as C
from .cache import DEFAULT_CACHE
from .climate import DEFAULT_OUT, SSPS, rounded
from .sources import ceds, rcmip

log = logging.getLogger(__name__)

ACID_SECTORS = {
    "adipic": "2B3_Chemicals-Adipic-acid",
    "nitric": "2B2_Chemicals-Nitric-acid",
}
# Adipic acid: thermal destruction's 98.5% destruction factor times its 97% utilisation (IPCC
# 2006 Guidelines, vol. 3, Table 3.4). Nitric acid: high-pressure plants' 9 kg of N₂O a tonne
# against 2.5 kg with abatement (IPCC 2019 Refinement, vol. 3, Table 3.3).
ABATED = {"adipic": 0.985 * 0.97, "nitric": 1 - 2.5 / 9}
INDUSTRIAL_N2O = "Emissions|N2O|MAGICC Fossil and Industrial"
SOURCE = (
    "CEDS v_2024_07_08 (2022 adipic and nitric acid N2O by country), changed with each SSP's "
    "RCMIP v5.1.0 fossil and industrial N2O; abatement shares from the IPCC 2006 Guidelines "
    "vol. 3 Table 3.4 and its 2019 Refinement vol. 3 Table 3.3"
)
SOURCES = [
    {
        "id": "ipcc-chemical-industry",
        "name": "IPCC, 2006 Guidelines for National Greenhouse Gas Inventories, vol. 3, ch. 3, "
        "Table 3.4 (adipic acid), and its 2019 Refinement, Table 3.3 (nitric acid): N₂O "
        "abatement",
        "version": "2006, 2019",
        "url": "https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol3.html",
        "licence": "IPCC, free to read",
    },
]


def acid_rows(rows: pd.DataFrame) -> pd.DataFrame:
    """Rows with a `sector` and `kg`, the acid ones only, with their acid."""
    acid = rows["sector"].map({s: a for a, s in ACID_SECTORS.items()})
    return rows.assign(acid=acid).dropna(subset=["acid"])


def world_n2o(by_country: pd.DataFrame) -> dict[str, float]:
    """The world's N₂O from each acid, kg, in CEDS's year."""
    rows = acid_rows(by_country)
    return {a: float(rows[rows["acid"] == a]["kg"].sum()) for a in ACID_SECTORS}


def country_n2o(by_country: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Each country's N₂O from each acid, kg, under its upper-case ISO3; CEDS's `global` rows and
    Kosovo, which no country of the app is, are left out, and so are countries with none."""
    rows = acid_rows(by_country)
    rows = rows[rows["country"].str.fullmatch("[a-z]{3}")]
    table = rows.pivot_table(index="country", columns="acid", values="kg", aggfunc="sum")
    table = table.reindex(columns=list(ACID_SECTORS)).fillna(0.0)
    return {
        str(iso3).upper(): {a: rounded([v])[0] for a, v in row.items()}
        for iso3, row in table.sort_index().iterrows()
        if row.sum() > 0
    }


def trajectory(df: pd.DataFrame, ssp: str, years: np.ndarray) -> np.ndarray:
    """The SSP's fossil and industrial N₂O relative to the base year's."""
    n2o = rcmip.series(df, ssp, INDUSTRIAL_N2O, years)
    return n2o / n2o[0]


def document(by_country: pd.DataFrame, trend: dict[str, np.ndarray]) -> dict:
    """acidn2o.json from CEDS's table by country and each SSP's trend on C.YEARS."""
    world = world_n2o(by_country)
    return {
        "years": [int(y) for y in C.YEARS],
        "cedsYear": ceds.LAST_YEAR,
        "abated": {a: round(v, 4) for a, v in ABATED.items()},
        "emissions": {
            ssp: {a: rounded(world[a] * trend[ssp]) for a in ACID_SECTORS} for ssp in SSPS
        },
        "byCountry": country_n2o(by_country),
        "source": SOURCE,
    }


def build(cache_dir: Path) -> dict:
    df = rcmip.load(cache_dir)
    return document(
        ceds.by_country_sector(ceds.path(cache_dir), "N2O"),
        {ssp: trajectory(df, ssp, C.YEARS) for ssp in SSPS},
    )


def build_acid_n2o(cache_dir: Path, out_dir: Path) -> None:
    data = build(cache_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "acidn2o.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    )
    i = data["years"].index(2050)
    for ssp in SSPS:
        e = data["emissions"][ssp]
        log.info(
            "%s acid N2O %d/2050, kt: adipic %.0f/%.0f, nitric %.0f/%.0f",
            ssp,
            data["years"][0],
            e["adipic"][0] / 1e6,
            e["adipic"][i] / 1e6,
            e["nitric"][0] / 1e6,
            e["nitric"][i] / 1e6,
        )
    log.info("acid N2O in %d countries", len(data["byCountry"]))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    build_acid_n2o(DEFAULT_CACHE, DEFAULT_OUT)
