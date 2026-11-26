import pandas as pd
import pytest

from planetshift_pipeline import solidwaste as S
from planetshift_pipeline.sources import ocean_plastic, what_a_waste


def dataset(path, rows):
    """A What a Waste country sheet: a row of labels, a row of codes, then the countries."""
    frame = pd.DataFrame(rows)
    sheet = pd.concat([pd.DataFrame([frame.columns], columns=frame.columns), frame])
    sheet.to_excel(path, sheet_name=what_a_waste.SHEET, index=False)
    return path


def country(iso3, income, tonnes, composition=None, treatment=None, uncollected=None):
    return {
        "iso3c": iso3,
        what_a_waste.INCOME: income,
        what_a_waste.TONNES: tonnes,
        what_a_waste.PEOPLE: 1000,
        **{what_a_waste.composition_column(k): v for k, v in (composition or {}).items()},
        **{what_a_waste.treatment_column(k): v for k, v in (treatment or {}).items()},
        what_a_waste.UNCOLLECTED: uncollected,
    }


def test_what_a_waste_groups_and_scales_the_shares(tmp_path):
    file = dataset(
        tmp_path / "waw.xlsx",
        [
            country(
                "AAA",
                "HIC",
                100,
                {"food_organic_waste": 0.4, "yard_garden_green_waste": 0.1, "plastic": 0.45},
                {"sanitary_landfill_landfill_gas_system": 0.5, "compost": 0.2},
                0.3,
            ),
            country("BBB", "UMC (2019)", "—", {"plastic": 0.5}, {"recycling": 0.2}),
        ],
    )
    table = what_a_waste.read(file)
    a = table.loc["AAA"]
    assert a["type_foodGreen"] == pytest.approx(0.5 / 0.95)
    assert a["type_plastic"] == pytest.approx(0.45 / 0.95)
    assert a["type_paper"] == 0
    assert a["treatment_landfill"] == pytest.approx(0.5)
    assert a["treatment_uncollected"] == pytest.approx(0.3)
    b = table.loc["BBB"]
    assert b["income"] == "upperMiddle"
    assert pd.isna(b["tonnes"])
    assert pd.isna(b["type_plastic"]) and pd.isna(b["treatment_recycling"])


def test_a_country_without_shares_takes_its_income_group_weighted_by_tonnes():
    shares = pd.DataFrame(
        {"a": [1.0, 0.0, None, None], "b": [0.0, 1.0, None, None]},
        index=["X", "Y", "Z", "W"],
    )
    tonnes = pd.Series({"X": 3.0, "Y": 1.0, "Z": 5.0, "W": 2.0})
    income = pd.Series({"X": "high", "Y": "high", "Z": "high", "W": "low"})
    filled, which = S.income_filled(shares, tonnes, income)
    assert which == ["W", "Z"]
    assert filled.loc["Z"].tolist() == [0.75, 0.25]
    assert filled.loc["W"].tolist() == [0.75, 0.25]


def test_ocean_plastic_keeps_countries_only(tmp_path):
    file = tmp_path / "ocean.csv"
    file.write_text(
        "entity,code,year,me_tons_per_year\n"
        "Albania,ALB,2019,1565\nWorld,OWID_WRL,2019,979458\nSomewhere,,2019,3\n"
    )
    year, tonnes = ocean_plastic.read(file)
    assert year == 2019
    assert tonnes.to_dict() == {"ALB": 1565.0}
    assert S.oceanplastic_json(year, tonnes)["byCountry"] == {"ALB": 1565.0}
