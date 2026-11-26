import numpy as np

from planetshift_pipeline import fair_app, fair_ts_export


def test_compact_drops_the_config_axis_only_when_every_config_agrees():
    same = np.array([[1.0, np.nan], [1.0, np.nan]])
    varies = np.array([[1.0, 2.0], [1.5, 2.0]])
    assert fair_app.compact(same) == {"perConfig": False, "values": [1.0, None]}
    assert fair_app.compact(varies) == {"perConfig": True, "values": [[1.0, 2.0], [1.5, 2.0]]}


def test_stopped_brings_emissions_to_their_baseline_and_keeps_the_land_use_forcing():
    years = fair_ts_export.STOP_YEAR - 1750 + 2
    emissions = {"CH4": np.full(years, 300.0), "Land use": np.full(years, -0.2)}
    out = fair_ts_export.stopped(emissions, {"CH4": 40.0})
    assert out["CH4"][-3:].tolist() == [300.0, 40.0, 40.0]
    assert out["Land use"].tolist() == emissions["Land use"].tolist()
