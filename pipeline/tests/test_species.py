from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import species as S

FIXTURE = Path(__file__).parent / "fixtures" / "scherer-cf-country.csv"
ANIMALS = sum(n for g, n in S.DESCRIBED.items() if g != "Plants")
PLANTS = S.DESCRIBED["Plants"]


def test_described_species_are_iucn_2025_1_counts():
    assert S.DESCRIBED["Mammals"] == 6_736
    assert S.DESCRIBED["Plants"] == 381_913
    assert sum(S.DESCRIBED.values()) == 421_093


def test_species_per_ha_weigh_each_groups_light_use_factor_by_its_described_species():
    cf = S.read(FIXTURE)
    crop = S.per_ha(cf, "cropland", "average")
    assert crop["FRA"] == pytest.approx((1e-15 * ANIMALS + 1e-15 * PLANTS) * 1e4)
    assert crop["BRA"] == pytest.approx(3 * crop["FRA"])
    pasture = S.per_ha(cf, "pasture", "marginal")
    assert pasture["FRA"] == pytest.approx((3e-15 * ANIMALS + 5e-15 * PLANTS) * 1e4)


def test_a_country_in_two_parts_takes_their_mean_and_one_missing_a_group_is_left_out():
    crop = S.per_ha(S.read(FIXTURE), "cropland", "average")
    assert crop["PSE"] == pytest.approx(2e-15 * (ANIMALS + PLANTS) * 1e4)
    assert "NCL" not in crop


def test_factors_keep_the_app_countries_with_average_and_marginal_per_use():
    out = S.factors(S.read(FIXTURE), {"FRA", "PSE", "NCL", "USA"}, {})
    assert sorted(out) == ["FRA", "PSE"]
    average, marginal = out["FRA"]["pasture"]
    assert marginal > average > 0


def test_species_json_carries_the_described_total_and_the_fish():
    data = S.species_json({"FRA": {}})
    assert data["described"] == 421_093
    assert data["fish"]["fished"] / data["fish"]["unfished"] == pytest.approx(1 / 3)


def test_pasture_takes_minimal_use_below_the_low_density_and_light_use_above_the_high_one():
    assert S.minimal_share(0.05) == 1.0
    assert S.minimal_share(S.MINIMAL_BELOW) == 1.0
    assert S.minimal_share(1.5) == 0.0
    mid = (S.MINIMAL_BELOW + S.LIGHT_ABOVE) / 2
    assert S.minimal_share(mid) == pytest.approx(0.5)


def test_grazing_density_is_livestock_units_per_ha_of_pasture_and_none_without_pasture():
    density = S.grazing_density(
        pd.Series({1: 30.0, 2: 5.0}), pd.Series({1: 100.0, 2: 0.0, 3: 50.0})
    )
    assert density.to_dict() == {1: 0.3, 3: 0.0}


def test_pasture_mixes_light_and_minimal_use_and_cropland_stays_light():
    cf = S.read(FIXTURE)
    light = S.factors(cf, {"FRA"}, {})["FRA"]
    rangeland = S.factors(cf, {"FRA"}, {"FRA": 1.0})["FRA"]
    half = S.factors(cf, {"FRA"}, {"FRA": 0.5})["FRA"]
    assert rangeland["cropland"] == light["cropland"]
    assert rangeland["pasture"][0] == pytest.approx(1e-16 * (ANIMALS + PLANTS) * 1e4, rel=1e-2)
    assert half["pasture"][0] == pytest.approx(
        (light["pasture"][0] + rangeland["pasture"][0]) / 2, rel=1e-2
    )
