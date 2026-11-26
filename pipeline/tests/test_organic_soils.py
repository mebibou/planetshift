import pandas as pd
import pytest

from planetshift_pipeline import organic_soils as O


def frame(rows: list[tuple], columns: list[str]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=columns)


def test_country_co2_reads_each_land_in_tonnes_for_the_model_countries():
    gv = frame(
        [
            (1, 6727, 7273, 2.0),
            (1, 6728, 7273, 0.5),
            (1, 6727, 7230, 9.0),
            (1, 6729, 7273, 2.5),
            (5000, 6727, 7273, 99.0),
        ],
        ["area_code", "item_code", "element_code", "value"],
    )
    rows = O.country_co2(gv, {1: "AAA"}).set_index("land")["t"].to_dict()
    assert rows == {"cropland": 2000.0, "grassland": 500.0}


def test_harvested_area_maps_the_crops_to_their_food_items_by_share():
    qcl = frame(
        [(1, 15, 5312, 100.0), (1, 328, 5312, 40.0), (1, 15, 5510, 9e9)],
        ["area_code", "item_code", "element_code", "value"],
    )
    crops = frame([(15, 2511, 1.0), (328, 2560, 0.15)], ["qcl_code", "fbs_code", "share"])
    area = O.harvested_area(qcl, crops, {1: "AAA"}).set_index("fbs_code")["w"].to_dict()
    assert area == pytest.approx({2511: 100.0, 2560: 6.0})


def test_crop_weights_prefer_peat_drainage_where_a_country_has_any():
    area = frame([("AAA", 1, 10.0), ("AAA", 2, 30.0), ("BBB", 1, 5.0)], ["iso3", "fbs_code", "w"])
    peat = frame([("AAA", 3, 7.0), ("BBB", 3, 0.0)], ["iso3", "fbs_code", "w"])
    weights = O.crop_weights(area, peat)
    assert sorted(map(tuple, weights.values.tolist())) == [("AAA", 3, 7.0), ("BBB", 1, 5.0)]


def test_drained_shares_each_land_by_its_weights_and_reports_what_is_left_on_no_item():
    co2 = frame(
        [("AAA", "cropland", 100.0), ("AAA", "grassland", 40.0), ("CCC", "cropland", 9.0)],
        ["iso3", "land", "t"],
    )
    crops = frame([("AAA", 1, 1.0), ("AAA", 2, 3.0)], ["iso3", "fbs_code", "w"])
    ruminants = frame([("AAA", 2731, 2.0), ("AAA", 2848, 0.0)], ["iso3", "fbs_code", "w"])
    kept, lost = O.drained(co2, crops, ruminants)
    assert kept.set_index("fbs_code")["t_co2"].to_dict() == pytest.approx(
        {1: 25.0, 2: 75.0, 2731: 40.0}
    )
    assert lost == pytest.approx(9.0)


def test_ruminant_weights_are_the_farm_gate_methane_of_their_production():
    merged = frame(
        [
            ("AAA", 2731, "farmGate", 50.0),
            ("AAA", 2731, "cradleToFarmGate", 60.0),
            ("AAA", 2511, "farmGate", 1.0),
        ],
        ["iso3", "fbs_code", "scope", "ch4"],
    )
    production = frame([("AAA", 2731, 2.0), ("AAA", 2511, 9.0)], ["iso3", "fbs_code", "production"])
    weights = O.ruminant_weights(merged, production, (2731,))
    assert weights.values.tolist() == [["AAA", 2731, 100.0]]


def test_tropical_share_reads_faostat_co2_per_hectare_between_ipcc_factors():
    assert O.tropical_share("cropland", 7.9 / O.C_PER_CO2) == pytest.approx(0.0)
    assert O.tropical_share("cropland", 14.0 / O.C_PER_CO2) == pytest.approx(1.0)
    assert O.tropical_share("grassland", 7.65 / O.C_PER_CO2) == pytest.approx(0.5)
    assert O.tropical_share("cropland", 1.0) == 0.0


def test_country_area_reads_the_hectares_of_each_land():
    gv = frame(
        [(1, 6727, 5026, 300.0), (1, 6728, 5026, 100.0), (1, 6727, 7273, 2.0)],
        ["area_code", "item_code", "element_code", "value"],
    )
    rows = O.country_area(gv, {1: "AAA"}).set_index("land")["t"].to_dict()
    assert rows == {"cropland": 300.0, "grassland": 100.0}


def test_rewetted_ch4_is_the_area_times_ipcc_methane_of_its_climate_zone():
    co2 = frame(
        [("AAA", "cropland", 7.9 / O.C_PER_CO2 * 100), ("BBB", "cropland", 14.0 / O.C_PER_CO2)],
        ["iso3", "land", "t"],
    )
    area = frame(
        [("AAA", "cropland", 100.0), ("BBB", "cropland", 1.0), ("CCC", "cropland", 0.0)],
        ["iso3", "land", "t"],
    )
    ch4 = O.rewetted_ch4(co2, area).set_index("iso3")["t"].to_dict()
    assert ch4 == pytest.approx({"AAA": 100 * 216 * 16 / 12 / 1e3, "BBB": 41 * 16 / 12 / 1e3})
