import json

import numpy as np
import pytest

from planetshift_pipeline import climate, climate_ar6, climate_scenarios
from planetshift_pipeline.sources import temperature

# AR6 WG1 Table 7.SM.7 (IPCC-WG1/Chapter-7, data_output/7sm/metrics_supplement_cleaned.csv):
# AGTP at 50 and 100 years, K per kg, for an instantaneous pulse.
AR6_TABLE = {
    "co2": {50: 4.28e-16, 100: 3.95e-16},
    "ch4": {50: 4.73e-15, 100: 2.12e-15},
    "n2o": {50: 1.24e-13, 100: 9.19e-14},
}
AR6_GTP100 = {"ch4": 5.38, "n2o": 233.0}


def instant(gas: str, t: np.ndarray) -> np.ndarray:
    return {
        "co2": climate_ar6.agtp_co2_instant,
        "ch4": climate_ar6.agtp_ch4_instant,
        "n2o": climate_ar6.agtp_n2o_instant,
    }[gas](t)


@pytest.mark.parametrize("gas", ["co2", "ch4", "n2o"])
def test_ar6_agtp_reproduces_table_7sm7_within_half_a_percent(gas):
    t = climate_ar6.grid(100)
    curve = instant(gas, t)
    for horizon, published in AR6_TABLE[gas].items():
        assert curve[horizon * climate_ar6.STEPS_PER_YEAR] == pytest.approx(published, rel=5e-3)


def test_ar6_gtp100_matches_the_table():
    t = climate_ar6.grid(100)
    co2 = climate_ar6.agtp_co2_instant(t)[1000]
    for gas, published in AR6_GTP100.items():
        assert instant(gas, t)[1000] / co2 == pytest.approx(published, rel=5e-3)


def test_annualised_curve_follows_the_instant_one_away_from_the_pulse():
    t = climate_ar6.grid(100)
    yearly = climate_ar6.annualised(climate_ar6.agtp_n2o_instant(t), 100)
    assert len(yearly) == 101
    assert yearly[0] < yearly[1]
    assert yearly[50] == pytest.approx(climate_ar6.agtp_n2o_instant(t)[500], rel=0.01)


def test_annualised_of_a_constant_is_the_constant_after_a_year():
    ones = np.ones(len(climate_ar6.grid(10)))
    assert climate_ar6.annualised(ones, 10)[1:] == pytest.approx(1.0)


def test_harmonised_joins_history_and_scaled_scenario():
    years = np.arange(2000, 2006)
    history = np.array([1, 2, 3, 4, 0, 0], dtype=float)
    scenario = np.array([9, 9, 9, 2, 3, 4], dtype=float)
    joined = climate_scenarios.harmonised(years, history, scenario, 2003)
    assert joined == pytest.approx([1, 2, 3, 4, 6, 8])


def test_harmonised_without_scenario_holds_the_last_value():
    years = np.arange(2000, 2004)
    joined = climate_scenarios.harmonised(years, np.array([1.0, 5, 0, 0]), None, 2001)
    assert joined == pytest.approx([1, 5, 5, 5])


def test_without_converts_kg_and_never_goes_negative():
    emissions = {"CH4": np.array([10.0, 1.0]), "N2O": np.array([1.0, 1.0])}
    less = climate_scenarios.without(emissions, {"CH4": np.array([2e9, 5e9])})
    assert less["CH4"] == pytest.approx([8, 0])
    assert less["N2O"] is emissions["N2O"]


def test_taking_farming_out_keeps_the_carbon_removal_of_net_negative_fossil_co2():
    emissions = {"CO2 FFI": np.array([-5.0]), "CO2 AFOLU": np.array([0.0])}
    agriculture = {"co2": np.array([2e11]), "ch4": np.array([0.0]), "n2o": np.array([0.0])}
    fossil = {"co2": np.array([0.0]), "ch4": np.array([0.0]), "n2o": np.array([0.0])}
    taken = climate_scenarios.removals(
        emissions, agriculture, fossil, {}, fossil | {"ch4": np.array([0.0])}
    )
    assert climate_scenarios.without(emissions, taken["agriculture"])["CO2 FFI"] == pytest.approx(
        [-5.2]
    )
    assert climate_scenarios.without(emissions, taken["fossilIndustry"])[
        "CO2 FFI"
    ] == pytest.approx([0.2])


def test_removals_never_take_agricultural_co2_twice():
    emissions = {"CO2 FFI": np.array([30.0]), "CO2 AFOLU": np.array([4.0])}
    agriculture = {"co2": np.array([1e11]), "ch4": np.array([1e11]), "n2o": np.array([1e9])}
    fossil = {"co2": np.array([0.0]), "ch4": np.array([1e11]), "n2o": np.array([1e9])}
    taken = climate_scenarios.removals(
        emissions, agriculture, fossil, {}, fossil | {"ch4": np.array([0.0])}
    )
    total_ffi = taken["agriculture"]["CO2 FFI"] + taken["fossilIndustry"]["CO2 FFI"]
    assert total_ffi == pytest.approx(30e12)
    assert taken["landUse"]["CO2 AFOLU"] == pytest.approx(4e12)


def test_contributions_add_up_to_the_total_for_every_member():
    years = np.arange(1850, 1905)
    rng = np.random.default_rng(0)
    runs = {k: rng.normal(size=(len(years), 7)) for k in ("full", *climate.CAUSES)}
    parts = climate.contributions(years, runs, rng.normal(size=(len(years), 7)))
    summed = sum(parts[c] for c in (*climate.CAUSES, "natural", "other"))
    assert summed == pytest.approx(parts["total"])
    bands = climate.attribution_bands(parts)
    medians = sum(bands[c]["median"] for c in (*climate.CAUSES, "natural", "other"))
    assert medians == pytest.approx(np.median(parts["total"], axis=-1))


def gas_taken() -> tuple[dict, dict]:
    emissions = {
        "CO2 FFI": np.array([30.0]),
        "CO2 AFOLU": np.array([4.0]),
        "CH4": np.array([300.0]),
        "N2O": np.array([8.0]),
        "HFC-134a": np.array([200.0]),
        "Sulfur": np.array([100.0]),
    }
    agriculture = {"co2": np.array([1e11]), "ch4": np.array([1e11]), "n2o": np.array([2e9])}
    fossil = {"co2": np.array([0.0]), "ch4": np.array([1e11]), "n2o": np.array([1e9])}
    baseline = {"CO2 FFI": 0.0, "CO2 AFOLU": 0.0, "CH4": 20.0, "N2O": 1.0, "Sulfur": 2.0}
    waste = {"co2": np.array([0.0]), "ch4": np.array([5e10]), "n2o": np.array([1e8])}
    return climate_scenarios.removals(emissions, agriculture, fossil, baseline, waste), emissions


def test_gas_removals_split_each_cause_by_gas_and_alias_a_cause_of_one_gas():
    taken, emissions = gas_taken()
    baseline = {"CO2 FFI": 0.0, "CO2 AFOLU": 0.0, "CH4": 20.0, "N2O": 1.0, "HFC-134a": 0.0}
    parts, alone = climate.gas_removals(taken, emissions, baseline, np.array([3e9]))
    assert alone == {"landUse:co2": "landUse"}
    assert set(parts) == {
        *(f"{c}:{g}" for c in ("fossilIndustry", "agriculture") for g in ("co2", "ch4", "n2o")),
        "waste:ch4",
        "waste:n2o",
        "burning:ch4",
        "all:co2",
        "all:ch4",
        "all:n2o",
        "all:hfc",
    }
    assert set(parts["agriculture:ch4"]) == {"CH4"}
    assert parts["burning:ch4"] == {"CH4": pytest.approx([3e9])}
    assert taken["waste"]["CH4"] == pytest.approx([5e10])
    assert climate_scenarios.without(emissions, parts["all:hfc"])["HFC-134a"] == pytest.approx([0])
    assert parts["all:co2"]["CO2 AFOLU"] == pytest.approx([4e12])
    less = climate_scenarios.without(emissions, parts["all:ch4"])
    assert less["CH4"] == pytest.approx([20.0])


def test_gas_contributions_add_up_to_each_gas_total_for_every_member():
    years = np.arange(1850, 1905)
    rng = np.random.default_rng(1)
    names = [
        "full",
        *(f"{c}:{g}" for c in ("fossilIndustry", "agriculture") for g in climate.GASES),
    ]
    names += ["landUse:co2", "all:co2", "all:ch4", "all:n2o", "all:hfc"]
    runs = {k: rng.normal(size=(len(years), 5)) for k in names}
    by_gas = climate.gas_contributions(years, runs)
    assert set(by_gas["co2"]) == {"total", "fossilIndustry", "agriculture", "landUse", "other"}
    assert set(by_gas["ch4"]) == {"total", "fossilIndustry", "agriculture", "other"}
    assert set(by_gas["hfc"]) == {"total", "other"}
    for parts in by_gas.values():
        summed = sum(v for k, v in parts.items() if k != "total")
        assert summed == pytest.approx(parts["total"])
    document = climate.attribution_document(years, years >= 1850, by_gas["n2o"])
    assert set(document) == {"fossilIndustry", "agriculture", "other"}
    medians = sum(np.array(part["median"]) for part in document.values())
    assert medians == pytest.approx(np.median(by_gas["n2o"]["total"], axis=-1), rel=1e-3, abs=1e-3)


def test_air_pollution_brings_aerosols_back_to_their_preindustrial_level():
    emissions = {
        "CO2 FFI": np.array([30.0]),
        "CO2 AFOLU": np.array([4.0]),
        "Sulfur": np.array([100.0]),
        "BC": np.array([8.0]),
    }
    zero = {g: np.array([0.0]) for g in ("co2", "ch4", "n2o")}
    taken = climate_scenarios.removals(emissions, zero, zero, {"Sulfur": 2.0, "BC": 1.0}, zero)
    less = climate_scenarios.without(emissions, taken["airPollution"])
    assert less["Sulfur"] == pytest.approx([2.0])
    assert less["BC"] == pytest.approx([1.0])
    assert less["CO2 FFI"] is emissions["CO2 FFI"]


def test_rebaselined_has_zero_preindustrial_mean():
    years = np.arange(1850, 2000)
    values = temperature.rebaselined(years, np.linspace(-1, 2, len(years)))
    assert values[years <= 1900].mean() == pytest.approx(0, abs=1e-12)


def test_parse_berkeley_reads_year_and_first_anomaly():
    text = "% header\n%\n  1850  -0.436  0.170  NaN  NaN\n  1851  -0.321  0.259  NaN  NaN\n"
    table = temperature.parse_berkeley(text)
    assert table["year"].tolist() == [1850, 1851]
    assert table["anomaly"].tolist() == pytest.approx([-0.436, -0.321])


def test_rounded_keeps_four_significant_figures():
    assert climate.rounded(np.array([1.234567e-15, 0.0123456, 12345.6])) == [
        1.235e-15,
        0.01235,
        12350.0,
    ]
    assert json.dumps(climate.rounded(np.array([3.0e-16])))


def test_hfc134a_temperature_potentials_match_ar6():
    """AR6 WG1 Table 7.SM.7 gives HFC-134a a GTP50 of 733 and a GTP100 of 306."""
    from planetshift_pipeline import climate_ar6

    curves = climate_ar6.agtp_curves(100)
    assert curves["hfc"][50] / curves["co2"][50] == pytest.approx(733, rel=0.03)
    assert curves["hfc"][100] / curves["co2"][100] == pytest.approx(306, rel=0.03)


def test_land_use_splits_into_its_co2_and_the_albedo_change_which_still_add_up():
    years = np.arange(1850, 1905)
    rng = np.random.default_rng(2)
    names = ["full", *climate.CAUSES, climate.NO_LAND_FORCING]
    runs = {k: rng.normal(size=(len(years), 4)) for k in names}
    natural = rng.normal(size=(len(years), 4))
    parts = climate.contributions(years, runs, natural)
    albedo = climate.anomaly(years, runs["full"] - runs[climate.NO_LAND_FORCING])
    whole = climate.anomaly(years, runs["full"] - runs["landUse"])
    assert parts[climate.LAND_ALBEDO] == pytest.approx(albedo)
    assert parts["landUse"] + parts[climate.LAND_ALBEDO] == pytest.approx(whole)
    named = sum(v for k, v in parts.items() if k != "total")
    assert named == pytest.approx(parts["total"])
    without = climate.contributions(
        years, {k: v for k, v in runs.items() if k != "noLandForcing"}, natural
    )
    assert without[climate.LAND_ALBEDO] == pytest.approx(0)


def test_co2s_gas_view_leaves_the_albedo_change_out_of_its_total_and_land_use():
    years = np.arange(1850, 1905)
    rng = np.random.default_rng(3)
    names = ["full", "landUse:co2", "all:co2", "all:ch4", "all:n2o", "all:hfc", "noLandForcing"]
    runs = {k: rng.normal(size=(len(years), 3)) for k in names}
    by_gas = climate.gas_contributions(years, runs)
    albedo = climate.land_albedo(years, runs)
    whole = climate.anomaly(years, runs["full"] - runs["landUse:co2"])
    assert by_gas["co2"]["landUse"] == pytest.approx(whole - albedo)
    assert by_gas["ch4"]["total"] == pytest.approx(
        climate.anomaly(years, runs["full"] - runs["all:ch4"])
    )
