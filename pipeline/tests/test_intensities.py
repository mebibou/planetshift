import pandas as pd
import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline.breakdown import primaries

GASES = list(I.GASES)


def totals(*rows):
    return pd.DataFrame(rows, columns=["area_code", "gas", "kg"]).assign(
        process="syntheticFertiliser"
    )


def weights(*rows):
    return pd.DataFrame(rows, columns=["area_code", "key", "weight"])


def test_shared_conserves_each_country_total():
    out = I.shared(
        totals((1, "n2o", 100.0), (2, "n2o", 50.0)),
        weights((1, 15, 3.0), (1, 27, 1.0), (2, 15, 1.0)),
    )
    assert out.groupby("area_code")["kg"].sum().to_dict() == {1: 100.0, 2: 50.0}
    assert out.set_index(["area_code", "key"])["kg"][(1, 15)] == 75.0


def test_nitrogen_rates_weight_area_by_class():
    rates = I.nitrogen_rates(pd.Series({"maize": 100.0, "vegetables": 10.0}))
    crops = pd.DataFrame({"qcl_code": [56, 358], "n_class": ["maize", "vegetables"]})
    area = pd.DataFrame({"area_code": [1, 1], "qcl_code": [56, 358], "ha": [10.0, 10.0]})
    w = I.nitrogen_weights(area, crops, rates).set_index("key")["weight"]
    shares = I.NITROGEN_SHARES
    assert w[358] / w[56] == pytest.approx((shares["vegetables"] / 10) / (shares["maize"] / 100))


def test_area_weights_leave_out_faostat_aggregate_items():
    crops = pd.DataFrame({"qcl_code": [15, 56], "n_class": ["wheat", "maize"]})
    area = pd.DataFrame(
        {"area_code": [1, 1, 1], "qcl_code": [15, 56, 1717], "ha": [30.0, 10.0, 40.0]}
    )
    w = I.area_weights(area, crops)
    assert set(w["key"]) == {15, 56}
    out = I.shared(totals((1, "co2", 100.0)), w).set_index("key")["kg"]
    assert out[15] == pytest.approx(75.0)


def test_world_area_counts_china_once():
    crops = pd.DataFrame({"qcl_code": [27], "n_class": ["rice"]})
    area = pd.DataFrame(
        {"area_code": [41, 214, 351, 5000], "qcl_code": [27] * 4, "ha": [30.0, 1.0, 31.0, 99.0]}
    )
    assert I.world_area(area, crops).to_dict() == {"rice": 31.0}


def test_fertiliser_allocation_conserves_the_total():
    crop_w = weights((1, 56, 2.0), (1, 15, 1.0), (2, 56, 1.0))
    rum_w = weights((1, 2731, 3.0), (1, 2848, 1.0), (3, 2731, 1.0))
    t = totals((1, "n2o", 1000.0), (2, "n2o", 10.0), (3, "n2o", 7.0))
    parts = I.with_grassland(t, crop_w, rum_w)
    by_area = parts.groupby("area_code")["kg"].sum()
    assert by_area.to_dict() == pytest.approx({1: 1000.0, 2: 10.0, 3: 7.0})
    grass = parts[(parts["area_code"] == 1) & (parts["kind"] == "fbs")]["kg"].sum()
    assert grass == pytest.approx(1000 * I.GRASSLAND_SHARE)


def test_to_fbs_drops_non_food_and_the_lint_share_of_cotton():
    crops = pd.DataFrame(
        {
            "qcl_code": [328, 826],
            "fbs_code": pd.array([2559, None], dtype="Int64"),
            "share": [0.15, 1.0],
        }
    )
    by_crop = pd.DataFrame(
        {"area_code": [1, 1], "key": [328, 826], "gas": ["n2o", "n2o"], "kg": [100.0, 50.0]}
    ).assign(process="residues")
    out = I.to_fbs(by_crop, crops)
    assert out["kg"].sum() == pytest.approx(15.0)
    assert list(out["fbs_code"]) == [2559]


def gle(*rows):
    return pd.DataFrame(rows, columns=["area_code", "item_code", "element_code", "value"])


def test_dairy_herd_split_between_milk_and_beef():
    out = I.livestock(
        gle((1, 960, 72254, 1.0)), pd.DataFrame(columns=["area_code", "item_code", "value"])
    )
    kg = out.set_index("fbs_code")["kg"]
    assert kg[2848] == pytest.approx(I.DAIRY_MILK_SHARE * 1e6)
    assert kg[2731] == pytest.approx((1 - I.DAIRY_MILK_SHARE) * 1e6)


def test_mixed_herds_split_by_protein_and_default_to_meat():
    qcl = pd.DataFrame({"area_code": [1, 1], "item_code": [982, 977], "value": [100.0, 0.0]})
    out = I.livestock(gle((1, 976, 72254, 1.0), (2, 976, 72254, 1.0)), qcl)
    got = out.set_index(["area_code", "fbs_code"])["kg"]
    assert got[(1, 2848)] == pytest.approx(1e6)
    assert got[(2, 2732)] == pytest.approx(1e6)
    assert out["kg"].sum() == pytest.approx(2e6)


def test_livestock_keeps_each_process_apart():
    out = I.livestock(
        gle((1, 961, 72254, 2.0), (1, 961, 72256, 1.0), (1, 961, 72300, 0.1)),
        pd.DataFrame(columns=["area_code", "item_code", "value"]),
    )
    kg = out.set_index(["gas", "process"])["kg"]
    assert kg[("ch4", "enteric")] == pytest.approx(2e6)
    assert kg[("ch4", "manure")] == pytest.approx(1e6)
    assert kg[("n2o", "organicFertiliser")] == pytest.approx(1e5)


def test_every_faostat_element_and_upstream_item_has_a_process():
    elements = {*I.CROP_ELEMENTS, *I.LIVESTOCK_ELEMENTS, I.FERTILISER_N2O, *I.UPSTREAM}
    assert elements <= set(I.PROCESSES)


def qcl_rows(*rows):
    return pd.DataFrame(rows, columns=["area_code", "item_code", "element_code", "value"])


def test_nonfood_shares_keep_the_head_beyond_milking_and_slaughter():
    gle_rows = gle(
        (1, 961, I.STOCKS, 100.0),
        (2, 961, I.STOCKS, 100.0),
        (1, 946, I.STOCKS, 100.0),
        (1, 1107, 72254, 1.0),
    )
    qcl = qcl_rows(
        (1, 867, I.SLAUGHTERED, 100 * I.FOOD_OFFTAKE / 4),
        (2, 867, I.SLAUGHTERED, 50.0),
        (1, 951, I.MILK_ANIMALS, 40.0),
        (1, 947, I.SLAUGHTERED, 60 * I.FOOD_OFFTAKE / 2),
    )
    got = I.nonfood_shares(gle_rows, qcl).set_index(["area_code", "species"])["share"]
    assert got[(1, 961)] == pytest.approx(0.75)
    assert (2, 961) not in got
    assert got[(1, 946)] == pytest.approx(0.3)
    assert got[(1, 1107)] == 1.0


def test_food_offtake_is_the_lowest_regional_mean():
    assert I.FOOD_OFFTAKE == 0.067


def test_nonfood_shares_grow_with_the_offtake_threshold():
    gle_rows = gle((1, 961, I.STOCKS, 100.0))
    qcl = qcl_rows((1, 867, I.SLAUGHTERED, 6.0))

    def share(offtake: float) -> float:
        got = I.nonfood_shares(gle_rows, qcl, offtake=offtake)
        return float(got["share"].sum())

    assert share(0.12) == pytest.approx(0.5)
    assert share(0.099) == pytest.approx(1 - 6 / 9.9)
    assert share(0.06) == 0.0


def test_nonfood_shares_count_net_live_exports_as_offtake():
    gle_rows = gle(
        (1, 961, I.STOCKS, 100.0),
        (2, 961, I.STOCKS, 100.0),
        (3, 961, I.STOCKS, 100.0),
        (1, 946, I.STOCKS, 100.0),
    )
    qcl = qcl_rows(
        (1, 867, I.SLAUGHTERED, 1.0),
        (2, 867, I.SLAUGHTERED, 1.0),
        (3, 867, I.SLAUGHTERED, 1.0),
        (1, 947, I.SLAUGHTERED, 1.0),
    )
    trade = qcl_rows(
        (1, 866, I.EXPORTED_HEAD, 2.0),
        (1, 866, I.IMPORTED_HEAD, 1.0),
        (2, 866, I.IMPORTED_HEAD, 5.0),
        (1, 946, I.EXPORTED_HEAD, 3.0),
    )
    got = I.nonfood_shares(gle_rows, qcl, trade, offtake=0.1).set_index(["area_code", "species"])
    assert got.loc[(1, 961), "share"] == pytest.approx(0.8)
    assert got.loc[(2, 961), "share"] == pytest.approx(0.9)
    assert got.loc[(3, 961), "share"] == pytest.approx(0.9)
    assert got.loc[(1, 946), "share"] == pytest.approx(0.6)
    without = I.nonfood_shares(gle_rows, qcl, offtake=0.1).set_index(["area_code", "species"])
    assert without.loc[(1, 961), "share"] == pytest.approx(0.9)


def test_nonfood_emissions_leave_the_products_and_are_conserved():
    rows = gle((1, 961, 72254, 2.0), (1, 961, 72300, 0.1), (1, 1096, 72254, 1.0))
    shares = pd.DataFrame({"area_code": [1, 1], "species": [961, 1096], "share": [0.25, 1.0]})
    food = I.livestock(rows, pd.DataFrame(columns=["area_code", "item_code", "value"]), shares)
    held = I.nonfood_emissions(rows, shares).set_index(["gas", "process"])["kg"]
    assert food["kg"].sum() == pytest.approx(0.75 * 2.1e6)
    assert held[("ch4", "enteric")] == pytest.approx(0.5e6 + 1e6)
    assert held[("n2o", "organicFertiliser")] == pytest.approx(0.025e6)


def test_nonfood_json_by_country():
    kg = pd.DataFrame(
        {"area_code": [1, 1, 9], "gas": ["ch4", "n2o", "ch4"], "kg": [1234.5, 6.0, 1.0]}
    )
    assert I.nonfood_json(kg, {1: "AAA"}) == {"AAA": {"co2": 0.0, "ch4": 1230.0, "n2o": 6.0}}


def test_livestock_leaves_out_work_animals_and_aggregates():
    out = I.livestock(
        gle((1, 1096, 72254, 1.0), (1, 1757, 72254, 5.0)),
        pd.DataFrame(columns=["area_code", "item_code", "value"]),
    )
    assert out.empty


def test_coproducts_share_meat_emissions_by_mass_and_conserve_them():
    emissions = pd.DataFrame(
        {
            "area_code": [1, 1],
            "fbs_code": [2731, 2733],
            "gas": ["ch4", "ch4"],
            "process": ["enteric", "manure"],
            "kg": [90.0, 10.0],
        }
    )
    production = pd.DataFrame(
        {
            "area_code": [1, 1, 1, 1],
            "fbs_code": [2731, 2733, 2736, 2737],
            "production": [60.0, 30.0, 6.0, 4.0],
        }
    )
    out = I.coproducts(emissions, production)
    assert out["kg"].sum() == pytest.approx(100.0)
    assert out.groupby("process")["kg"].sum().to_dict() == pytest.approx(
        {"enteric": 90.0, "manure": 10.0}
    )
    kg = out.groupby("fbs_code")["kg"].sum()
    assert kg[2736] / 6 == pytest.approx(kg[2737] / 4)
    assert kg[2731] == pytest.approx(90.0 * 0.9)


def test_per_tonne_only_for_items_produced_in_covered_countries():
    emissions = pd.DataFrame(
        {"area_code": [1, 1], "fbs_code": [2511, 2511], "gas": ["n2o", "ch4"], "kg": [20.0, 4.0]}
    )
    production = pd.DataFrame(
        {
            "area_code": [1, 1, 1, 2],
            "fbs_code": [2511, 2605, 2571, 2511],
            "production": [10.0, 5.0, 3.0, 1.0],
        }
    )
    out = I.per_tonne(emissions, production, {1}, {2511, 2605}).set_index("fbs_code")
    assert out.loc[2511, "n2o"] == 2.0
    assert out.loc[2605, GASES].sum() == 0.0
    assert set(out.index) == {2511, 2605}


def test_weighted_median():
    assert I.weighted_median(pd.Series([1.0, 10.0, 100.0]), pd.Series([1.0, 5.0, 1.0])) == 10.0


def candidate(iso3, code, tier, ch4, rank=0, scope="farmGate", source="s"):
    return {
        "iso3": iso3,
        "fbs_code": code,
        "scope": scope,
        "co2": 0.0,
        "ch4": ch4,
        "n2o": 0.0,
        "tier": tier,
        "rank": rank,
        "source": source,
    }


def run_merge(
    cands, grid_codes, proxies=None, extraction=None, processing=None, zero=None, countries=("FRA",)
):
    grid = pd.DataFrame(
        [
            {"iso3": c, "fbs_code": code, "scope": "farmGate"}
            for c in countries
            for code in grid_codes
        ]
    )
    groups = {
        2511: "cereals",
        2513: "cereals",
        2516: "cereals",
        2555: "oilCrops",
        2571: "oilCrops",
        2536: "sugarCrops",
        2537: "sugarCrops",
        2542: "sugarCrops",
        2581: "oilCrops",
    }
    production = pd.DataFrame(
        [{"iso3": c, "fbs_code": code, "production": 1.0} for c in countries for code in grid_codes]
    )
    out = I.merge(
        grid,
        [pd.DataFrame(cands)],
        proxies or {},
        extraction or {},
        groups,
        production,
        processing
        if processing is not None
        else pd.DataFrame(columns=["iso3", "fbs_code", "processing"]),
        zero or {},
    )
    return out.set_index(["iso3", "fbs_code"])


def test_tiers_are_taken_in_order():
    cands = [
        candidate("FRA", 2511, 3, 3.0),
        candidate("FRA", 2511, 2, 2.0, rank=10_000),
        candidate("FRA", 2511, 2, 2.5, rank=5),
        candidate("FRA", 2511, 4, 4.0),
        candidate("FRA", 2513, 4, 4.0),
        candidate("FRA", 2513, 3, 3.0),
        candidate("FRA", 2516, 1, 1.0),
        candidate("FRA", 2516, 2, 2.0),
    ]
    out = run_merge(cands, [2511, 2513, 2516])
    assert out.loc[("FRA", 2511), "tier"] == 2
    assert out.loc[("FRA", 2511), "ch4"] == 2.5
    assert out.loc[("FRA", 2513), "tier"] == 3
    assert out.loc[("FRA", 2516), "tier"] == 1


def test_proxy_then_group_median():
    cands = [candidate("FRA", 2513, 3, 3.0, source="u"), candidate("DEU", 2511, 3, 7.0)]
    out = run_merge(
        cands, [2511, 2513, 2516], proxies={2516: [2512, 2513]}, countries=("FRA", "DEU")
    )
    assert out.loc[("FRA", 2516), "tier"] == 5
    assert out.loc[("FRA", 2516), "ch4"] == 3.0
    assert out.loc[("FRA", 2516), "source"] == "proxy 2513: u"
    assert out.loc[("FRA", 2511), "tier"] == 6
    assert out.loc[("DEU", 2516), "tier"] == 6
    assert out.loc[("DEU", 2511), "tier"] == 3
    assert len(out) == 6


def test_a_proxy_never_borrows_a_proxy_or_a_median():
    out = run_merge(
        [candidate("DEU", 2513, 3, 1.0)],
        [2511, 2513],
        proxies={2511: [2513]},
        countries=("FRA", "DEU"),
    )
    assert out.loc[("FRA", 2511), "tier"] == 6


def test_processed_items_divide_their_primary_by_the_extraction_rate():
    cands = [
        candidate("FRA", 2555, 3, 1.9),
        candidate("FRA", 2536, 3, 1.1),
        candidate("FRA", 2537, 3, 1.6),
    ]
    processing = pd.DataFrame(
        {"iso3": ["FRA", "FRA"], "fbs_code": [2536, 2537], "processing": [0.0, 10.0]}
    )
    extraction = {2571: [(2555, 0.19)], 2542: [(2536, 0.11), (2537, 0.16)]}
    out = run_merge(
        cands, [2555, 2571, 2536, 2537, 2542], extraction=extraction, processing=processing
    )
    assert out.loc[("FRA", 2571), "tier"] == 5
    assert out.loc[("FRA", 2571), "ch4"] == pytest.approx(10.0)
    assert out.loc[("FRA", 2542), "ch4"] == pytest.approx(10.0)
    assert out.loc[("FRA", 2571), "source"].startswith("processed from 2555 / 0.19")


def test_an_oil_from_its_seed_keeps_its_value_share_and_the_cake_the_rest():
    cands = [candidate("FRA", 2552, 3, 2.6)]
    extraction = {2572: [(2552, 0.26)]}
    shares = {2572: 0.8}
    grid = pd.DataFrame([{"iso3": "FRA", "fbs_code": c, "scope": "farmGate"} for c in (2552, 2572)])
    out = I.merge(
        grid,
        [pd.DataFrame(cands)],
        {},
        extraction,
        {2552: "oilcrops", 2572: "oils"},
        pd.DataFrame({"iso3": ["FRA"] * 2, "fbs_code": [2552, 2572], "production": [1.0, 1.0]}),
        pd.DataFrame(columns=["iso3", "fbs_code", "processing"]),
        {},
        shares,
    ).set_index(["iso3", "fbs_code"])
    assert out.loc[("FRA", 2572), "ch4"] == pytest.approx(10.0 * 0.8)
    assert "0.80 (oil's value share)" in out.loc[("FRA", 2572), "source"]
    assert primaries(out.loc[("FRA", 2572), "source"]) == [(2552, 0.26)]
    oilcakes = pd.DataFrame({"oil_code": [2572], "primary_code": [2552], "oil_share": [0.8]})
    rows = pd.DataFrame(
        {"iso3": ["FRA"], "fbs_code": [2572], "production": [13.0], "processing": [0.0]}
    )
    cake = I.oilcake_emissions(out.reset_index(), oilcakes, extraction, rows)
    seed_crushed = 13.0 / 0.26
    assert cake["ch4"].sum() == pytest.approx(seed_crushed * 2.6 * 0.2)
    oil = out.loc[("FRA", 2572), "ch4"] * 13.0
    assert oil + cake["ch4"].sum() == pytest.approx(seed_crushed * 2.6)
    assert I.oilcake_json(cake)["FRA"]["2552"]["farmGate"]["ch4"] == pytest.approx(26.0)


def test_a_processed_items_own_value_wins_over_its_primary():
    cands = [candidate("FRA", 2555, 3, 1.9), candidate("FRA", 2571, 4, 3.0)]
    out = run_merge(cands, [2555, 2571], extraction={2571: [(2555, 0.19)]})
    assert out.loc[("FRA", 2571), "tier"] == 4


def test_byproducts_are_zero():
    out = run_merge([candidate("FRA", 2581, 4, 3.0)], [2581], zero={2581: "counted on rice"})
    assert out.loc[("FRA", 2581), ["co2", "ch4", "n2o"]].sum() == 0.0
    assert out.loc[("FRA", 2581), "source"] == "counted on rice"


def test_external_candidates_country_then_smallest_region_then_world():
    df = pd.DataFrame(
        [
            {
                "fbs_item_code": 2511,
                "area": "World",
                "scope": "farmGate",
                "co2": 0,
                "ch4": 9,
                "n2o": 0,
                "url": "w",
            },
            {
                "fbs_item_code": 2511,
                "area": "region:europe",
                "scope": "farmGate",
                "co2": 0,
                "ch4": 5,
                "n2o": 0,
                "url": "e",
            },
            {
                "fbs_item_code": 2511,
                "area": "region:west",
                "scope": "farmGate",
                "co2": 0,
                "ch4": 4,
                "n2o": 0,
                "url": "we",
            },
            {
                "fbs_item_code": 2511,
                "area": "DEU",
                "scope": "farmGate",
                "co2": 0,
                "ch4": 1,
                "n2o": 0,
                "url": "d",
            },
        ]
    )
    members = {"europe": ["FRA", "DEU", "ITA"], "west": ["FRA", "DEU"]}
    chosen = I.best(I.candidates_from(df, ["FRA", "DEU", "BRA"], members, 1, 2)).set_index("iso3")
    assert (chosen.loc["DEU", "tier"], chosen.loc["DEU", "source"]) == (1, "d")
    assert (chosen.loc["FRA", "tier"], chosen.loc["FRA", "source"]) == (2, "we")
    assert (chosen.loc["BRA", "tier"], chosen.loc["BRA", "source"]) == (2, "w")


def test_outliers_are_dropped():
    intensity = pd.DataFrame(
        {
            "area_code": [1, 2, 3],
            "fbs_code": [2511] * 3,
            "co2": [0.0] * 3,
            "ch4": [1.0, 1.2, 50.0],
            "n2o": [0.0] * 3,
        }
    )
    production = pd.DataFrame(
        {"area_code": [1, 2, 3], "fbs_code": [2511] * 3, "production": [10.0, 10.0, 1.0]}
    )
    assert list(I.without_outliers(intensity, production)["area_code"]) == [1, 2]


def test_proxies_and_extraction_rates_load():
    proxies, extraction = I.load_proxies()
    assert proxies[2520][0] == 2513
    assert extraction[2542] == [(2536, 0.11), (2537, 0.16)]
    assert not set(proxies) & set(extraction)


def test_intensities_json_stores_each_source_once():
    merged = pd.DataFrame(
        [
            {**candidate("FRA", 2511, 1, 2.0, source="b"), "scope": "farmGate"},
            {**candidate("FRA", 2511, 1, 3.0, source="a"), "scope": "cradleToFarmGate"},
            {**candidate("DEU", 2513, 3, 0.0, source="b"), "scope": "farmGate"},
        ]
    )
    out = I.intensities_json(merged)
    assert out["sources"] == ["a", "b"]
    assert out["byCountry"]["FRA"]["2511"]["farmGate"] == {
        "kgPerTonne": {"co2": 0.0, "ch4": 2.0, "n2o": 0.0},
        "tier": 1,
        "source": 1,
    }
    assert out["byCountry"]["FRA"]["2511"]["cradleToFarmGate"]["source"] == 0
    assert out["byCountry"]["DEU"]["2513"]["farmGate"]["source"] == 1


def test_fertiliser_manufacturing_goes_where_its_nitrogen_is_applied():
    made = pd.DataFrame(
        {
            "area_code": [1, 2, 1, 5000],
            "gas": ["co2", "co2", "n2o", "co2"],
            "process": ["fertiliserManufacturing"] * 4,
            "kg": [90.0, 10.0, 4.0, 1e9],
        }
    )
    nitrogen = pd.DataFrame(
        {
            "area_code": [1, 2, 3, 5000, 2],
            "item_code": [I.FERTILISER_ITEM] * 4 + [3103],
            "element_code": [I.AGRICULTURAL_USE] * 4 + [I.AGRICULTURAL_USE],
            "value": [0.0, 1.0, 3.0, 1e9, 50.0],
        }
    )
    moved = I.where_applied(made, nitrogen).set_index(["area_code", "gas"])["kg"]
    assert moved.to_dict() == pytest.approx(
        {(1, "co2"): 0, (1, "n2o"): 0, (2, "co2"): 25, (2, "n2o"): 1, (3, "co2"): 75, (3, "n2o"): 3}
    )


def test_rice_and_other_fruits_take_faostat_before_hestias_world_average():
    cells = pd.DataFrame(
        {
            "iso3": ["PHL", "PHL", "PHL", "PHL", "JPN", "IND", "IND"],
            "fbs_code": [2807, 2807, 2511, 2511, 2807, 2807, 2807],
            "scope": ["farmGate"] * 7,
            "ch4": [25.5, 82.0, 1.0, 2.0, 25.5, 17.0, 24.8],
            "tier": [2, 3, 2, 3, 2, 1, 3],
            "rank": [I.WORLD_RANK, 0, I.WORLD_RANK, 0, I.WORLD_RANK, 0, 0],
        }
    )
    chosen = I.best(I.country_before_world(cells)).set_index(["iso3", "fbs_code"])
    assert chosen.loc[("PHL", 2807), "ch4"] == 82.0
    assert chosen.loc[("PHL", 2511), "ch4"] == 1.0
    assert chosen.loc[("JPN", 2807), "ch4"] == 25.5
    assert chosen.loc[("IND", 2807), "ch4"] == 17.0
