import json

import pytest

from planetshift_pipeline import config

SCHEMA = json.loads(config.SCHEMA.read_text())


def test_the_committed_config_is_valid_and_names_every_switch():
    written = json.loads(config.CONFIG.read_text())["departures"]
    assert set(written) == set(config.switches(SCHEMA))
    assert config.load() == written


def test_every_switch_has_its_default_and_plain_value_among_its_values():
    for spec in config.switches(SCHEMA).values():
        assert spec["default"] in spec["enum"]
        assert spec["plainFair"] in spec["enum"]
        assert spec["description"]


def test_a_switch_left_out_takes_its_default():
    defaults = {k: s["default"] for k, s in config.switches(SCHEMA).items()}
    assert config.resolve({}, SCHEMA) == defaults
    assert config.resolve({"departures": {}}, SCHEMA) == defaults


def test_plain_fair_is_a_valid_config():
    plain = config.plain_fair(SCHEMA)
    assert config.resolve({"departures": plain}, SCHEMA) == plain


@pytest.mark.parametrize(
    "bad",
    [
        {"other": 1},
        {"departures": {"nothing": "on"}},
        {"departures": {"permafrost": "maybe"}},
        {"departures": []},
    ],
)
def test_unknown_keys_and_values_are_errors(bad):
    with pytest.raises(ValueError):
        config.resolve(bad, SCHEMA)
