import json
import math
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import fires as F

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"
FOREST = "Forest (>=30% tree cover)"


def area_rows(values: dict[str, list[float]], cover: str = "Total", **last) -> pd.DataFrame:
    """One region's burned area by season from 2002, the last season holding the baseline."""
    rows = [
        {
            "Product": F.BURNED_PRODUCT,
            "Region Name": name,
            "Regional Layer": F.LAYER,
            F.SEASON[0]: 2002 + i,
            F.SEASON[1]: 2003 + i,
            "Land Cover": cover,
            "Burned Area (km^2)": v,
            "Burned Area Mean Annual (km^2)": math.nan,
            "Burned Area Anomaly (%)": math.nan,
        }
        for name, series in values.items()
        for i, v in enumerate(series)
    ]
    df = pd.DataFrame(rows)
    final = df[F.SEASON[0]] == df[F.SEASON[0]].max()
    for name, series in values.items():
        mean = sum(series[:-1]) / (len(series) - 1)
        at = final & (df["Region Name"] == name)
        df.loc[at, "Burned Area Mean Annual (km^2)"] = last.get("mean", mean)
        df.loc[at, "Burned Area Anomaly (%)"] = 100 * (series[-1] - mean) / mean
    return df


def carbon_rows(last: dict[str, tuple[float, float, float]], synthesis: float) -> pd.DataFrame:
    """Brazil's last season: each product's kg of carbon, its baseline mean and its anomaly."""
    products = {**last, F.SYNTHESIS: (math.nan, math.nan, synthesis)}
    return pd.DataFrame(
        [
            {
                "Product": p,
                "Region Name": "Brazil",
                F.SEASON[0]: 2025,
                "Carbon Emitted": kg,
                "Carbon Emitted Mean Annual (kg)": mean,
                "Carbon Emitted Anomaly (%)": pct,
            }
            for p, (kg, mean, pct) in products.items()
        ]
    )


def test_the_baseline_is_the_mean_of_the_seasons_before_the_last():
    rows = area_rows({"Brazil": [100.0, 300.0, 100.0]})
    assert F.check_baseline(rows, "Burned Area (km^2)", "Burned Area Mean Annual (km^2)") == 0


def test_a_baseline_that_is_not_that_mean_is_refused():
    rows = area_rows({"Brazil": [100.0, 300.0, 100.0]}, mean=150.0)
    with pytest.raises(ValueError, match="baseline"):
        F.check_baseline(rows, "Burned Area (km^2)", "Burned Area Mean Annual (km^2)")


def test_a_file_without_the_modis_product_stops_the_build():
    rows = area_rows({"Brazil": [1.0, 2.0]}).assign(Product="VIIRS_VNP64A1")
    with pytest.raises(ValueError, match="product changed"):
        F.burned_rows(rows)


def test_the_last_season_against_the_mean_in_all_and_in_forest():
    rows = pd.concat(
        [
            area_rows({"Brazil": [100.0, 300.0, 100.0]}),
            area_rows({"Brazil": [20.0, 20.0, 50.0]}, cover=FOREST),
        ]
    )
    b = F.burned(rows).loc["Brazil"]
    assert b["burned"] == 100.0
    assert b["burnedAnomaly"] == pytest.approx(-0.5)
    assert b["forest"] == 50.0
    assert b["forestAnomaly"] == pytest.approx(1.5)


def test_an_anomaly_on_a_mean_of_almost_nothing_is_left_out():
    rows = pd.concat(
        [
            area_rows({"Malta": [12.0, 12.0, 24.0]}),
            area_rows({"Malta": [1.0, 1.0, 3.0]}, cover=FOREST),
        ]
    )
    record = F.record(F.burned(rows).loc["Malta"])
    assert record == {"burned": 24.0, "burnedAnomaly": 1.0, "forest": 3.0}


def test_the_carbon_is_the_two_products_mean_and_the_anomaly_the_source_s():
    rows = carbon_rows(
        {"GFED5.1": (1.4e11, 3.2e11, -55.3), "CAMS_GFAS": (1.0e11, 2.0e11, -52.4)},
        synthesis=-53.87,
    )
    c = F.carbon(rows).loc["Brazil"]
    assert c["carbon"] == 1.2e8
    assert c["carbonAnomaly"] == pytest.approx(-0.539)


def test_a_region_keeps_only_the_figures_it_has():
    row = pd.Series({"burned": 0.0, "burnedAnomaly": math.nan, "carbon": 290.0})
    record = F.record(row)
    assert record == {"burned": 0.0, "carbon": 290}
    assert isinstance(record["carbon"], int)


def test_countries_are_named_by_iso3_for_the_model_only():
    regions = {"Brazil": {"burned": 1.0}, "Atlantis": {"burned": 2.0}, F.WORLD: {"burned": 3.0}}
    names = {"Brazil": "BRA", "Atlantis": "ATL"}
    assert F.by_country(regions, names, {"BRA", "FRA"}) == {"BRA": {"burned": 1.0}}
    assert F.unnamed(regions, {"Brazil": "BRA"}) == ["Atlantis"]


def test_the_aliases_name_each_country_once():
    names = pd.read_csv(F.NAMES_CSV)
    assert names["name"].is_unique
    assert names["iso3"].is_unique
    assert names["iso3"].str.fullmatch(r"[A-Z]{3}").all()


@pytest.mark.network
def test_the_built_file_has_the_latest_season_against_2002_2024():
    path = OUT / "fires.json"
    if not path.exists():
        pytest.skip("not built")
    data = json.loads(path.read_text())
    assert data["baseline"] == {"burned": [2002, 2024], "carbon": [2003, 2024]}
    assert data["season"] == [2025, 2026]
    assert -1 < data["world"]["burnedAnomaly"] < 0
    assert data["byCountry"]["BRA"]["burned"] > data["byCountry"]["BRA"]["forest"] > 0
    assert len(data["byCountry"]) > 150
