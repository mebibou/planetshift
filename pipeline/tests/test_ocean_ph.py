import h5py
import numpy as np
import pytest

from planetshift_pipeline.sources import ocean_ph


def test_the_years_come_from_days_since_1950(tmp_path):
    path = tmp_path / "ph.nc"
    with h5py.File(path, "w") as f:
        f["time"] = np.array([12964, 13329])  # 1985-06-30 and 1986-06-30
        f["ph"] = np.array([8.1077, 8.1065])
    years, values = ocean_ph.parse(path)
    assert list(years) == [1985, 1986]
    assert values == pytest.approx([8.1077, 8.1065])
