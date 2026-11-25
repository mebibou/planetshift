import pytest

from planetshift_pipeline import albedo as A


def test_band_of_reads_north_and_south_alike():
    assert [A.band_of(x) for x in (0, -20, 23.6, -45, 50.1, -60)] == [
        "tropical",
        "tropical",
        "temperate",
        "temperate",
        "boreal",
        "boreal",
    ]


def test_latitudes_read_the_label_points():
    gj = {
        "features": [
            {"properties": {"ISO": "AAA", "LABEL_Y": 61.5}},
            {"properties": {"ISO": "BBB", "LABEL_Y": None}},
        ]
    }
    assert A.latitudes(gj, lambda p: p["ISO"]) == {"AAA": 61.5}


def test_per_hectare_is_the_bands_forest_value_on_the_share_where_forest_grows_back():
    share = {"FIN": 1.0, "BRA": 0.5, "XXX": 1.0, "MNG": 0.0}
    per_ha = A.per_hectare(share, {"FIN": 64.0, "BRA": -10.0, "MNG": 47.0})
    assert per_ha["FIN"] == pytest.approx(-0.26e-9)
    assert per_ha["BRA"] == pytest.approx(-0.5 * 0.071e-9)
    assert per_ha["XXX"] == pytest.approx(-0.17e-9)
    assert "MNG" not in per_ha
