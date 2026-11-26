"""Observed global mean surface ocean pH, total scale, yearly: the Copernicus Marine Service's
ocean monitoring indicator, from its multi-observation reconstruction (LSCE)."""

import datetime as dt
from pathlib import Path

import h5py
import numpy as np

from ..cache import fetched

VERSION = "202611"
URL = (
    "https://s3.waw3-1.cloudferro.com/mdl-native-14/native/"
    "OMI_HEALTH_PH_GLOBAL_carbon_ph_area_averaged_mean/"
    f"omi_health_ph_global_ph_area_averaged_mean_{VERSION}/"
    "OMI_HEALTH_PH_GLOBAL_carbon_ph_area_averaged_mean.nc"
)
DOI = "https://doi.org/10.48670/moi-00224"
LICENCE = "Copernicus Marine Service licence (credit required)"
# The licence's required credit for a derived product, shown where the data is shown.
CREDIT = "Generated using E.U. Copernicus Marine Service Information; doi:10.48670/moi-00224"
EPOCH = dt.date(1950, 1, 1)


def parse(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Years and pH; the time axis is in days since 1950, one value a year."""
    with h5py.File(path, "r") as f:
        days = f["time"][:]
        values = f["ph"][:]
    years = np.array([(EPOCH + dt.timedelta(days=int(d))).year for d in days])
    return years, np.asarray(values, dtype=float)


def observed(cache_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    return parse(fetched(cache_dir / "ocean", URL, f"ocean_ph_{VERSION}.nc"))
