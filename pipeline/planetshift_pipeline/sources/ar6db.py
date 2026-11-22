"""The IPCC AR6 Scenario Database (public release), read through IIASA's Scenario Explorer API as a
guest: world values of a few variables for the SSP marker runs behind RCMIP's SSP emissions."""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import requests

from ..cache import USER_AGENT, sidecar

log = logging.getLogger(__name__)

VERSION = "1.1"
DOI = "10.5281/zenodo.5886911"
LICENCE = "CC BY 4.0"
TOKEN_URL = "https://db1.ene.iiasa.ac.at/EneAuth/config/v1/anonym/"
API = "https://db1.ene.iiasa.ac.at/ar6-public-api/rest/v2.1"

# The integrated assessment model runs CMIP6 used as each SSP's marker (RCMIP's emissions).
MARKERS = {
    "ssp126": ("IMAGE 3.0.1", "SSP1-26"),
    "ssp245": ("MESSAGE-GLOBIOM 1.0", "SSP2-45"),
    "ssp370": ("AIM/CGE 2.0", "SSP3-Baseline"),
}
ELECTRICITY_CO2 = "Emissions|CO2|Energy|Supply|Electricity"
ELECTRICITY_GENERATED = "Secondary Energy|Electricity"
VARIABLES = (ELECTRICITY_CO2, ELECTRICITY_GENERATED)
FILE = "ar6-markers-world.json"


def _get(url: str, token: str | None = None):
    headers = {"User-Agent": USER_AGENT} | ({"Authorization": f"Bearer {token}"} if token else {})
    r = requests.get(url, headers=headers, timeout=120)
    r.raise_for_status()
    return r.json()


def _download() -> list[dict]:
    token = _get(TOKEN_URL)
    runs = _get(f"{API}/runs?getOnlyDefaultRuns=true", token)
    wanted = set(MARKERS.values())
    ids = [r["run_id"] for r in runs if (r["model"], r["scenario"]) in wanted]
    if len(ids) != len(wanted):
        raise KeyError(f"AR6 marker runs: found {len(ids)} of {len(wanted)}")
    body = {
        "filters": {
            "regions": ["World"],
            "variables": list(VARIABLES),
            "runs": ids,
            "years": [],
            "units": [],
            "timeslices": [],
            "times": [],
        }
    }
    r = requests.post(
        f"{API}/runs/bulk/ts",
        json=body,
        headers={"User-Agent": USER_AGENT, "Authorization": f"Bearer {token}"},
        timeout=300,
    )
    r.raise_for_status()
    return [
        {k: row[k] for k in ("model", "scenario", "variable", "unit", "year", "value")}
        for row in r.json()
    ]


def load(cache_dir: Path) -> list[dict]:
    """Rows (model, scenario, variable, unit, year, value), downloaded once into the cache."""
    path = cache_dir / "ar6db" / FILE
    if not path.exists():
        log.info("downloading the AR6 marker runs from %s", API)
        rows = _download()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(rows))
        sidecar(path).write_text(
            json.dumps(
                {"url": f"{API}/runs/bulk/ts", "downloaded": datetime.now(UTC).date().isoformat()},
                indent=2,
            )
        )
    return json.loads(path.read_text())


def series(rows: list[dict], ssp: str, variable: str, years: np.ndarray) -> tuple[np.ndarray, str]:
    """One variable of an SSP's marker run, interpolated linearly to `years`, and its unit."""
    model, scenario = MARKERS[ssp]
    found = sorted(
        (r["year"], r["value"], r["unit"])
        for r in rows
        if r["model"] == model and r["scenario"] == scenario and r["variable"] == variable
    )
    if not found:
        raise KeyError(f"{ssp} {variable}: no values")
    units = {u for _, _, u in found}
    if len(units) != 1:
        raise ValueError(f"{ssp} {variable}: units {units}")
    known_years, values, _ = zip(*found, strict=True)
    return np.interp(years, known_years, values), units.pop()
