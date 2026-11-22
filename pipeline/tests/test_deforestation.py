import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import deforestation as D
from planetshift_pipeline import groups as G

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"
CACHE = Path(__file__).resolve().parent.parent / "cache"

#: DeDuCE's commodities that each drove more than 10 Mt CO2 a year in 2019-2023.
MAJOR = [
    "Cattle meat",
    "Cassava, fresh",
    "Maize (corn)",
    "Rice",
    "Soya beans",
    "Oil palm fruit",
    "Beans, dry",
    "Sugar cane",
    "Coffee, green",
    "Bananas",
    "Sorghum",
    "Groundnuts, excluding shelled",
    "Plantains and cooking bananas",
    "Yams",
    "Mangoes, guavas and mangosteens",
    "Cocoa beans",
    "Avocados",
    "Wheat",
]


def deduce(rows):
    return pd.DataFrame(
        rows, columns=["iso3", "year", "group", "commodity", "mt_co2", "peat_mt_co2"]
    )


def test_yearly_mean_averages_the_years_in_tonnes():
    df = deduce(
        [
            ("BRA", 2018, "Pasture", "Cattle meat", 9.0, 0.0),
            ("BRA", 2019, "Pasture", "Cattle meat", 1.0, 0.0),
            ("BRA", 2020, "Pasture", "Cattle meat", 3.0, 0.5),
        ]
    )
    means = D.yearly_mean(df, (2019, 2020))
    assert means.loc[0, "t_co2"] == pytest.approx(2e6)
    assert means.loc[0, "peat_t_co2"] == pytest.approx(0.25e6)


def test_attribution_splits_shares_and_reports_what_is_left_out():
    means = pd.DataFrame(
        [
            ("BRA", "Pasture", "Cattle meat", 100.0),
            ("BRA", "Pasture", "Leather", 5.0),
            ("BRA", "Fibre crops", "Seed cotton, unginned", 10.0),
            ("BRA", "Forest plantation", "Forest plantation (Pine)", 3.0),
            ("BRA", "Other", "Something new", 1.0),
        ],
        columns=["iso3", "group", "commodity", "t_co2"],
    )
    items = pd.DataFrame(
        {
            "commodity": ["Cattle meat", "Leather", "Seed cotton, unginned"],
            "fbs_code": pd.array([2731, pd.NA, 2559], dtype="Int64"),
            "share": [1.0, 1.0, 0.15],
        }
    )
    kept, dropped = D.attributed(means, items)
    assert dict(zip(kept["fbs_code"], kept["t_co2"], strict=True)) == pytest.approx(
        {2731: 100.0, 2559: 1.5}
    )
    reasons = dropped.set_index("commodity")["reason"].to_dict()
    assert reasons == {
        "Leather": "non-food",
        "Seed cotton, unginned": "non-food share",
        "Forest plantation (Pine)": "forestry",
        "Something new": "unmapped",
    }
    assert kept["t_co2"].sum() + dropped["t_co2"].sum() == pytest.approx(means["t_co2"].sum())


def test_by_country_keeps_net_emissions_of_model_countries():
    kept = pd.DataFrame(
        [("BRA", 2731, 10.4), ("BRA", 2562, -3.0), ("XXX", 2731, 5.0), ("IDN", 2562, 0.2)],
        columns=["iso3", "fbs_code", "t_co2"],
    )
    assert D.by_country(kept, {"BRA", "IDN"}) == {"BRA": {"2731": 10}}


def test_every_major_commodity_is_mapped_to_a_food_item_in_the_model():
    items = D.item_map().set_index("commodity")
    kept = set(G.kept(G.load())["fbs_code"])
    missing = [c for c in MAJOR if c not in items.index or pd.isna(items.loc[c, "fbs_code"])]
    assert missing == []
    assert {int(items.loc[c, "fbs_code"]) for c in MAJOR} <= kept


def test_mapping_leaves_out_non_food_commodities():
    items = D.item_map().set_index("commodity")
    assert pd.isna(items.loc["Natural rubber in primary forms", "fbs_code"])
    assert pd.isna(items.loc["Leather", "fbs_code"])
    assert items.loc["Cattle meat", "fbs_code"] == 2731


def test_json_shape():
    data = D.deforestation_json({"BRA": {"2731": 1}})
    assert set(data) == {"byCountry", "years", "source"}
    assert data["years"] == list(D.YEARS)


@pytest.mark.network
def test_built_file_matches_the_contract_and_published_totals():
    path = OUT / "deforestation.json"
    if not path.exists():
        pytest.skip("deforestation.json not built")
    data = json.loads(path.read_text())
    assert set(data) == {"byCountry", "years", "source"}
    assert len(data["years"]) == 2 and data["years"][0] <= data["years"][1]
    countries = {c["iso3"] for c in json.loads((OUT / "countries.json").read_text())}
    assert set(data["byCountry"]) <= countries
    values = [v for items in data["byCountry"].values() for v in items.values()]
    assert all(isinstance(v, int | float) and v > 0 for v in values)
    total = sum(values)
    # Pendrill et al. 2019 and DeDuCE: about 2 to 2.6 Gt CO2/yr from commodity-driven clearing
    assert 1.5e9 < total < 3.5e9
    brazil = sum(data["byCountry"]["BRA"].values())
    assert brazil == max(sum(v.values()) for v in data["byCountry"].values())
    assert data["byCountry"]["BRA"]["2731"] > 0.5 * brazil
    assert path.stat().st_size < 1_000_000


@pytest.mark.network
def test_cached_dataset_has_no_major_commodity_unmapped():
    if not (CACHE / "extracts" / "deduce_2001_2023.pkl").exists():
        pytest.skip("DeDuCE not in the cache")
    means = D.yearly_mean(D.read(CACHE))
    _, dropped = D.attributed(means, D.item_map())
    unmapped = dropped[dropped["reason"] == "unmapped"]
    assert unmapped["t_co2"].abs().sum() < 1e6
