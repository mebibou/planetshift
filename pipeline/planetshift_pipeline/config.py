"""planetshift.config.json: a fork's departures from FaIR's own physics, checked against
planetshift.config.schema.json at the repository's root (see docs/app.md, "Forking")."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "planetshift.config.json"
SCHEMA = ROOT / "planetshift.config.schema.json"


def switches(schema: dict) -> dict[str, dict]:
    return schema["properties"]["departures"]["properties"]


def resolve(config: dict, schema: dict) -> dict[str, str]:
    """Every switch's value: the config's, or its default when left out. Unknown keys and values
    outside a switch's enum are errors."""
    unknown = set(config) - set(schema["properties"])
    if unknown:
        raise ValueError(f"planetshift.config.json: unknown keys {sorted(unknown)}")
    known = switches(schema)
    given = config.get("departures", {})
    if not isinstance(given, dict):
        raise ValueError("planetshift.config.json: departures must be an object")
    stray = set(given) - set(known)
    if stray:
        raise ValueError(f"planetshift.config.json: unknown departures {sorted(stray)}")
    wrong = {k: v for k, v in given.items() if v not in known[k]["enum"]}
    if wrong:
        raise ValueError(
            "planetshift.config.json: "
            + ", ".join(f"{k} is {v!r}, not one of {known[k]['enum']}" for k, v in wrong.items())
        )
    return {k: given.get(k, spec["default"]) for k, spec in known.items()}


def plain_fair(schema: dict) -> dict[str, str]:
    """Every switch at the value that keeps to FaIR."""
    return {k: spec["plainFair"] for k, spec in switches(schema).items()}


def load(config: Path = CONFIG, schema: Path = SCHEMA) -> dict[str, str]:
    read = json.loads(config.read_text()) if config.exists() else {}
    return resolve(read, json.loads(schema.read_text()))
