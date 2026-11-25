"""Natural Earth admin-0 countries at 1:50m: attributes for the countries, shapes for the map."""

import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

import pandas as pd

from ..cache import fetched

log = logging.getLogger(__name__)

VERSION = "5.1.2"
URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    f"v{VERSION}/geojson/ne_50m_admin_0_countries.geojson"
)
PAGE = "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/"
LICENCE = "Public domain"
TOPOJSON_SERVER = "topojson-server@3.0.1"
QUANTIZATION = "1e4"


def geojson(cache_dir: Path) -> dict:
    return json.loads(fetched(cache_dir, URL).read_text())


def iso3_of(props: dict) -> str:
    """ISO 3166 alpha-3, or Natural Earth's own code where a territory has none."""
    code = props.get("ISO_A3_EH") or "-99"
    return code if code != "-99" else props["ADM0_A3"]


def attributes(gj: dict) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "iso3": iso3_of(f["properties"]),
                "iso_n3": f["properties"].get("ISO_N3_EH"),
                "name": f["properties"]["NAME"],
                "name_fr": f["properties"].get("NAME_FR"),
                "subregion": f["properties"].get("SUBREGION"),
            }
            for f in gj["features"]
        ]
    )


def capitalised(name: str) -> str:
    """A name with its first letter upper-case: Natural Earth gives "îles Féroé"."""
    return name[:1].upper() + name[1:]


def slim(gj: dict) -> dict:
    """Only what the map needs on each feature: its ISO3 code and its English and French names,
    which name the places the model has no data for."""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": iso3_of(f["properties"]),
                "properties": {
                    "iso3": iso3_of(f["properties"]),
                    "name": f["properties"].get("NAME_EN") or f["properties"]["NAME"],
                    "nameFr": capitalised(
                        f["properties"].get("NAME_FR") or f["properties"]["NAME"]
                    ),
                },
                "geometry": f["geometry"],
            }
            for f in gj["features"]
            if f["properties"]["ADM0_A3"] != "ATA"
        ],
    }


def write_topojson(gj: dict, out: Path) -> None:
    """TopoJSON with shared arcs, quantised, through the npm `topojson-server` package."""
    npx = shutil.which("npx")
    if npx is None:
        raise RuntimeError("npx is needed to build world.topo.json (Node.js)")
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "countries.geojson"
        source.write_text(json.dumps(slim(gj)))
        topo = subprocess.run(
            [
                npx,
                "--yes",
                "-p",
                TOPOJSON_SERVER,
                "geo2topo",
                "-q",
                QUANTIZATION,
                f"countries={source}",
            ],
            check=True,
            capture_output=True,
            text=True,
        ).stdout
    out.write_text(json.dumps(json.loads(topo), separators=(",", ":")))
