import pandas as pd
import pytest

from planetshift_pipeline import land as L

CROPS = pd.DataFrame(
    {
        "qcl_code": [15, 44, 328],
        "fbs_code": pd.array([2511, 2513, 2559], dtype="Int64"),
        "share": [1.0, 1.0, 0.15],
    }
)


def qcl(*rows):
    """rows: (area_code, item_code, year, area ha, production t)."""
    return pd.DataFrame(
        [
            {"area_code": a, "item_code": i, "year": y, "element_code": e, "value": v}
            for a, i, y, ha, t in rows
            for e, v in ((L.AREA_HARVESTED, ha), (L.PRODUCTION, t))
        ]
    )


def test_ha_per_tonne_averages_the_years_and_converts_to_fbs_tonnes():
    rows = qcl(
        (1, 15, 2022, 100.0, 300.0),
        (1, 15, 2023, 100.0, 400.0),
        (1, 15, 2024, 100.0, 500.0),
        (1, 328, 2023, 1000.0, 3000.0),
    )
    sums = L.crop_sums(rows, CROPS, 2023)
    production = pd.DataFrame(
        {"area_code": [1, 1], "fbs_code": [2511, 2559], "production": [400.0, 1800.0]}
    )
    out = L.own_ha_per_tonne(sums, production).set_index("fbs_code")["ha_per_t"]
    assert out[2511] == pytest.approx(300 / 1200)
    assert out[2559] == pytest.approx(0.15 * 1000 / 1800)


def test_crop_years_without_production_are_left_out():
    rows = qcl((1, 15, 2022, 100.0, 0.0), (1, 15, 2023, 100.0, 400.0))
    sums = L.crop_sums(rows, CROPS, 2023)
    assert sums.loc[0, "ha"] == 100.0


def test_outliers_are_dropped():
    own = pd.DataFrame(
        {"area_code": [1, 2, 3, 4], "fbs_code": [2511] * 4, "ha_per_t": [0.3, 0.3, 0.35, 9.0]}
    )
    production = own[["area_code", "fbs_code"]].assign(production=100.0)
    assert list(L.without_outliers(own, production)["area_code"]) == [1, 2, 3]


def test_gaps_take_the_region_then_the_world():
    own = pd.DataFrame({"iso3": ["AAA", "BBB"], "fbs_code": [2511, 2511], "ha_per_t": [0.2, 0.4]})
    production = own[["iso3", "fbs_code"]].assign(production=[100.0, 300.0])
    regions = {"AAA": "North", "BBB": "South", "CCC": "North", "DDD": "East"}
    out = L.filled(own, ["AAA", "CCC", "DDD"], [2511, 2513], regions, production)
    got = out.set_index(["iso3", "fbs_code"])
    assert got.loc[("AAA", 2511), "how"] == "country"
    assert got.loc[("CCC", 2511)].to_dict() == {"ha_per_t": 0.2, "how": "region"}
    assert got.loc[("DDD", 2511)].to_dict() == {"ha_per_t": 0.4, "how": "world"}
    assert ("AAA", 2513) not in got.index


def test_processed_items_carry_their_primary_land_over_the_extraction_rate():
    primary = pd.DataFrame(
        {"iso3": ["AAA", "AAA"], "fbs_code": [2536, 2537], "ha_per_t": [0.01, 0.02]}
    )
    extraction = {2542: [(2536, 0.1), (2537, 0.2)], 2571: [(2555, 0.2)]}
    processing = pd.DataFrame(
        {"iso3": ["AAA", "AAA"], "fbs_code": [2536, 2537], "processing": [100.0, 100.0]}
    )
    out = L.derived(primary, [2542, 2571], ["AAA"], extraction, processing)
    sugar = out.set_index("fbs_code").loc[2542, "ha_per_t"]
    assert sugar == pytest.approx(1 / 3 * 0.01 / 0.1 + 2 / 3 * 0.02 / 0.2)
    assert 2571 not in set(out["fbs_code"])


def test_cropland_counts_production_less_processing():
    ha_per_t = pd.DataFrame({"iso3": ["AAA"], "fbs_code": [2555], "ha_per_t": [0.4]})
    rows = pd.DataFrame(
        {"iso3": ["AAA"], "fbs_code": [2555], "production": [100.0], "processing": [60.0]}
    )
    assert L.cropland(ha_per_t, rows)["ha"].iloc[0] == pytest.approx(16.0)


def stock_rows(year=2023):
    ek = pd.DataFrame(
        [
            {"area_code": 1, "item_code": L.CATTLE, "element_code": L.LSU, "year": year},
            {"area_code": 1, "item_code": 976, "element_code": L.LSU, "year": year},
        ]
    ).assign(value=[100.0, 10.0])
    q = pd.DataFrame(
        [
            (1, L.CATTLE, L.STOCKS, 200.0),
            (1, L.CATTLE_MILK, L.MILK_ANIMALS, 50.0),
            (1, 982, L.PRODUCTION, 0.0),
            (1, 977, L.PRODUCTION, 5.0),
            (2, L.CATTLE, L.STOCKS, 40.0),
        ],
        columns=["area_code", "item_code", "element_code", "value"],
    ).assign(year=year)
    return ek, q


def test_cattle_split_follows_the_dairy_herd_and_its_emission_share():
    ek, q = stock_rows()
    lsu = L.lsu_by_group(ek, q, 2023)
    dairy_cattle = 100.0 * 50 / 200
    assert lsu.loc[1, "dairy"] == pytest.approx(0.88 * dairy_cattle)
    assert lsu.loc[1, "ruminantMeat"] == pytest.approx(110.0 - 0.88 * dairy_cattle)


def test_areas_missing_from_livestock_patterns_use_the_world_units_per_head():
    ek, q = stock_rows()
    lsu = L.lsu_by_group(ek, q, 2023)
    assert lsu.loc[2].sum() == pytest.approx(40.0 * 100 / 200)


def test_pasture_shares_sum_to_one_and_every_country_is_listed():
    shares = L.pasture_shares(
        pd.DataFrame({"dairy": [1.0, 0.0], "ruminantMeat": [2.0, 0.0]}, index=[1, 2])
    )
    out = L.pasture_json(pd.Series({1: 3e6}), shares, {1: "AAA", 2: "BBB", 3: "CCC"})
    assert sum(out["AAA"]["shares"].values()) == pytest.approx(1.0)
    assert out["AAA"]["ha"] == 3e6
    assert out["BBB"] == {"ha": 0.0, "shares": {}}
    assert out["CCC"] == {"ha": 0.0, "shares": {}}


TABLE = (
    "Geography,Mean aboveground rate_MgC_ha_yr,Min aboveground rate_MgC_ha_yr,"
    "Max aboveground rate_MgC_ha_yr,Mean belowground rate_MgC_ha_yr,x,y\r\n\r\n"
    "Alpha,2,1,4,1,0.9,\r\n\r\nBeta land,1,0.5,2,0.5,0,\r\n\r\nGamma,0.5,0.4,0.6,0.1,,\r\n"
)


def rates_of(names):
    return L.regrowth_rates(L.read_regrowth(TABLE), names)


def test_regrowth_rates_add_roots_and_convert_carbon_to_co2():
    rates = rates_of({"Alpha": "AAA", "Beta land": "BBB"})
    alpha = rates.set_index("iso3").loc["AAA"]
    assert alpha["median"] == pytest.approx(3 * 44 / 12)
    assert alpha["low"] == pytest.approx(1 * 1.5 * 44 / 12)
    assert alpha["high"] == pytest.approx(4 * 1.5 * 44 / 12)
    assert alpha["forest_ha"] == pytest.approx(0.9e6 / 3)
    assert "Gamma" not in set(rates["iso3"])


def test_forest_fractions_bound_the_farmland_where_forest_grows_back():
    assert L.forest_fractions(30.0, 100.0, 20.0) == pytest.approx((30 / 120, 40 / 120, 50 / 120))
    assert L.forest_fractions(300.0, 100.0, 20.0) == (1.0, 1.0, 1.0)
    assert L.forest_fractions(None, 100.0, 20.0) == (0.0, 0.5, 1.0)


def test_rates_apply_to_the_share_of_farmland_where_forest_grows_back():
    rates = rates_of({"Alpha": "AAA"})
    out = L.regrowth_filled(rates, ["AAA"], {}, {}, {"AAA": (0.5e6, 0.1e6)})
    alpha = rates.iloc[0]
    got = out.iloc[0]
    assert got["low"] == pytest.approx(alpha["low"] * 0.3e6 / 0.6e6)
    assert got["high"] == pytest.approx(alpha["high"] * 0.4e6 / 0.6e6)
    assert got["median"] == pytest.approx(alpha["median"] * 0.35e6 / 0.6e6)


def test_missing_countries_take_their_region_lowest_or_the_dryland_rate():
    rates = rates_of({"Alpha": "AAA", "Beta land": "BBB", "Gamma": "GGG"})
    regions = {"AAA": "R", "BBB": "R", "GGG": "S", "WET": "R", "DRY": "R"}
    forest = {"WET": 0.5, "DRY": 0.02}
    farmland = {"WET": (100.0, 0.0), "DRY": (75.0, 25.0)}
    out = L.regrowth_filled(rates, ["WET", "DRY"], regions, forest, farmland)
    got = out.set_index("iso3")
    beta = rates.set_index("iso3").loc["BBB"]
    gamma = rates.set_index("iso3").loc["GGG"]
    assert got.loc["WET"][["median", "low", "high"]].tolist() == pytest.approx(
        [beta["median"] * 0.5, 0.0, beta["high"]]
    )
    assert got.loc["WET", "how"] == "region"
    assert got.loc["DRY"][["median", "low", "high"]].tolist() == pytest.approx(
        [gamma["median"] * 0.125, 0.0, gamma["high"] * 0.25]
    )


def test_animal_share_counts_pasture_and_the_feed_part_of_cropland():
    crop_ha = pd.DataFrame({"fbs_code": [2514, 2511], "ha": [100.0, 100.0]})
    uses = pd.DataFrame(
        {
            "fbs_code": [2514, 2511],
            "food": [20.0, 100.0],
            "feed": [80.0, 0.0],
            "losses": [0.0, 0.0],
            "seed": [0.0, 0.0],
            "other": [0.0, 0.0],
        }
    )
    out = L.animal_share(crop_ha, uses, 300.0)
    assert out["animalShare"] == pytest.approx((80 + 300) / 500)


def test_oil_keeps_its_share_of_the_crush_value_and_the_cake_the_rest():
    oilcakes = L.load_oilcakes()
    soy = oilcakes.set_index("oil_code").loc[2571]
    assert soy["primary_code"] == 2555
    assert 0.3 < soy["oil_share"] < 0.45
    assert oilcakes["oil_share"].between(0.3, 1.0).all()
    ha_per_t = pd.DataFrame(
        {"iso3": ["BRA", "BRA"], "fbs_code": [2571, 2511], "ha_per_t": [2.0, 0.3]}
    )
    rows = pd.DataFrame(
        {
            "iso3": ["BRA", "BRA"],
            "fbs_code": [2571, 2511],
            "production": [10.0, 100.0],
            "processing": [0.0, 0.0],
        }
    )
    shared, cake = L.shared_with_cake(ha_per_t, rows, oilcakes)
    by_code = shared.set_index("fbs_code")["ha_per_t"]
    assert by_code[2511] == 0.3
    assert by_code[2571] == pytest.approx(2.0 * soy["oil_share"])
    assert cake.to_dict("records") == [
        {"iso3": "BRA", "primary_code": 2555, "ha": pytest.approx(20.0 * (1 - soy["oil_share"]))}
    ]


def test_extraction_lists_each_processed_item_with_its_primaries_and_rates():
    out = L.extraction_json({2542: [(2536, 0.11), (2537, 0.16)], 2577: [(2562, 0.23)]})
    assert out == {"2542": {"2536": 0.11, "2537": 0.16}, "2577": {"2562": 0.23}}


def test_hectares_by_iso3_keep_the_areas_listed_with_some_land():
    ha = pd.Series({10: 1.234567e9, 20: 0.0, 30: 5e5})
    assert L.hectares_json(ha, {10: "AUS", 20: "XXX", 40: "FRA", 30: "BEL"}) == {
        "AUS": 1.23e9,
        "BEL": 5e5,
    }
