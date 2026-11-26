import pandas as pd
import pytest

from planetshift_pipeline import climate_fair, fair_app


def setup_with(configs: list[int]) -> climate_fair.Setup:
    return climate_fair.Setup(
        parameters=None,
        species_file=None,
        species=[],
        properties={},
        natural_forcing=pd.DataFrame(),
        configs=configs,
    )


def test_the_app_runs_fifty_members_of_the_calibration():
    members = pd.read_csv(fair_app.MEMBERS_FILE)["config"]
    assert len(members) == 50 and members.is_unique


def test_chosen_keeps_the_listed_members_in_their_order(tmp_path):
    path = tmp_path / "members.csv"
    path.write_text("config\n30\n10\n")
    assert fair_app.chosen(setup_with([10, 20, 30]), path).configs == [30, 10]


def test_chosen_refuses_a_member_the_calibration_lacks(tmp_path):
    path = tmp_path / "members.csv"
    path.write_text("config\n40\n")
    with pytest.raises(ValueError, match="40"):
        fair_app.chosen(setup_with([10, 20, 30]), path)


def test_rounded_keeps_seven_significant_digits():
    assert fair_app.rounded([1234.56789, 0.000123456789]) == [1234.568, 0.0001234568]
