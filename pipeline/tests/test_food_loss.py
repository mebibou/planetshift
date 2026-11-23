from planetshift_pipeline import food_loss as L


def row(area, product, value, year=2023):
    return {
        "geoAreaName": area,
        "timePeriodStart": year,
        "value": str(value),
        "dimensions": {"Reporting Type": "G", "Type of product": product},
    }


ROWS = [
    row("World", "ALP", 10),
    row("World", "CRL_PUL", 5),
    row("World", "FRT_VGT", 25),
    row("World", "ANMPROD", 15),
    row("World", "RT_TBR", 10),
    row("World", "ALP", 99, year=2022),
    row("South-Eastern Asia", "ALP", 20),
    row("South-Eastern Asia", "CRL_PUL", "NaN"),
]


def test_latest_keeps_the_last_year_and_drops_missing_values():
    table = L.latest(ROWS)
    assert table["world"]["ALP"] == 0.10
    assert "CRL_PUL" not in table["south-eastern asia"]


def test_a_region_scales_the_world_ratios_and_a_country_without_one_takes_the_world():
    shares = L.loss_shares(ROWS, ["VNM", "ATA"], {"VNM": "South-eastern Asia"})
    assert shares["VNM"] == {
        "cerealsPulses": 0.1,
        "fruitVegetables": 0.5,
        "rootsTubers": 0.2,
        "animal": 0.3,
        "all": 0.2,
    }
    assert shares["ATA"]["fruitVegetables"] == 0.25
