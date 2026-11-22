import pandas as pd

from planetshift_pipeline import countries as K


def areas(*rows):
    return pd.DataFrame(rows, columns=["area_code", "m49", "area"])


def test_aggregates_regions_and_former_areas_are_not_countries():
    df = areas(
        (351, "159", "China"),
        (41, "156", "China, mainland"),
        (96, "344", "China, Hong Kong SAR"),
        (214, "158", "China, Taiwan Province of"),
        (5000, "001", "World"),
        (5101, "014", "Eastern Africa"),
        (206, "736", "Sudan (former)"),
        (276, "729", "Sudan"),
    )
    kept = set(K.countries_only(df)["area_code"])
    assert kept == {41, 96, 214, 276}


def test_china_is_counted_once():
    rows = pd.DataFrame(
        {
            "area_code": [351, 41, 96, 128, 214],
            "value": [110.0, 100.0, 4.0, 1.0, 5.0],
        }
    )
    assert K.countries_only(rows)["value"].sum() == 110.0


def test_area_table_maps_m49_to_iso3_with_overrides():
    ne = pd.DataFrame(
        {
            "iso_n3": ["156", "250", "-99"],
            "iso3": ["CHN", "FRA", "KOS"],
            "subregion": ["a", "b", "c"],
        }
    )
    table = K.area_table(
        areas((41, "156", "China, mainland"), (68, "250", "France"), (87, "312", "Guadeloupe")),
        K.iso3_by_m49(ne),
    )
    assert dict(zip(table["area_code"], table["iso3"], strict=True)) == {
        41: "CHN",
        68: "FRA",
        87: "GLP",
    }


def test_regions_use_faostat_names_and_place_open_ocean_islands():
    ne = pd.DataFrame(
        {
            "iso3": ["VNM", "MDV", "FRA"],
            "iso_n3": ["704", "462", "250"],
            "subregion": ["South-Eastern Asia", "Seven seas (open ocean)", "Western Europe"],
        }
    )
    regions = K.region_by_iso3(ne)
    assert regions["VNM"] == "South-eastern Asia"
    assert regions["MDV"] == "Southern Asia"
    assert regions["FRA"] == "Western Europe"


def test_population_is_in_people_by_year():
    oa = pd.DataFrame(
        {
            "area_code": [68, 68, 68],
            "item_code": [3010, 3010, 3010],
            "element_code": [511, 511, 511],
            "year": [2023, 2050, 2051],
            "value": [66000.0, 67000.0, 1.0],
        }
    )
    pop = K.population(oa, 2023, 2050)
    assert pop.loc[68, 2023] == 66_000_000
    assert list(pop.columns) == [2023, 2050]
