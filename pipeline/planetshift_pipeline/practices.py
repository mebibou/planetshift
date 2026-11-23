"""Farming practices that cut emissions at the source, from `practices.csv`
(docs/methodology/en/practices.md).

Each row of the table sets one parameter of one practice, with its reason and citation:
`sources`, `gases` and `groups` (values separated by `;`), `reduction` (`median`, `low`,
`high`), and `applicable` keyed by `World`, `income:<World Bank income group>`,
`region:<region>` or an ISO3 code. A country takes its own value, else its region's, else
its income group's, else the world's.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent.parent
CSV = HERE / "practices.csv"

PRACTICES = (
    "feedAdditives",
    "breedingAndFeed",
    "manureManagement",
    "riceWater",
    "nitrogenEfficiency",
    "nitrificationInhibitors",
    "farmEnergy",
)
URL = re.compile(r"https://[^\s,\"]+")

#: The works practices.csv cites, for meta.json. Only their published figures are used.
SOURCES = [
    {
        "id": "kebreab-2023-3nop",
        "name": "Kebreab et al. (2023), meta-analysis of 3-nitrooxypropanol in dairy cattle",
        "version": "J Dairy Sci 106(2)",
        "url": "https://doi.org/10.3168/jds.2022-22211",
        "licence": "CC BY 4.0",
    },
    {
        "id": "dijkstra-2018-3nop",
        "name": "Dijkstra et al. (2018), antimethanogenic effects of 3-nitrooxypropanol",
        "version": "J Dairy Sci 101",
        "url": "https://doi.org/10.3168/jds.2018-14456",
        "licence": "American Dairy Science Association, free to read",
    },
    {
        "id": "arndt-2022-ruminant-methane",
        "name": "Arndt et al. (2022), strategies to mitigate methane emissions by ruminants",
        "version": "PNAS 119(20)",
        "url": "https://doi.org/10.1073/pnas.2111294119",
        "licence": "CC BY-NC-ND 4.0",
    },
    {
        "id": "gerber-2013-fao-livestock",
        "name": "Gerber et al. (2013), Tackling climate change through livestock, FAO",
        "version": "2013",
        "url": "https://www.fao.org/3/i3437e/i3437e.pdf",
        "licence": "FAO copyright, free to read",
    },
    {
        "id": "sajeev-2018-manure",
        "name": "Sajeev et al. (2018), emissions from liquid manure management chains",
        "version": "J Environ Qual 47(1)",
        "url": "https://doi.org/10.2134/jeq2017.05.0199",
        "licence": "CC BY-NC-ND 4.0",
    },
    {
        "id": "ipcc-2019-refinement",
        "name": "IPCC (2019), Refinement to the 2006 Guidelines, vol. 4, ch. 5 (rice)",
        "version": "2019",
        "url": "https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html",
        "licence": "IPCC copyright, free to read",
    },
    {
        "id": "jiang-2019-rice-water",
        "name": "Jiang et al. (2019), water management and the warming potential of rice",
        "version": "Field Crops Res 234",
        "url": "https://doi.org/10.1016/j.fcr.2019.02.010",
        "licence": "Elsevier, subscription",
    },
    {
        "id": "gu-2023-nitrogen",
        "name": "Gu et al. (2023), cost-effective mitigation of nitrogen pollution from croplands",
        "version": "Nature 613",
        "url": "https://doi.org/10.1038/s41586-022-05481-8",
        "licence": "CC BY 4.0",
    },
    {
        "id": "shcherbak-2014-n2o",
        "name": "Shcherbak et al. (2014), nonlinear response of soil N2O to fertilizer nitrogen",
        "version": "PNAS 111(25)",
        "url": "https://doi.org/10.1073/pnas.1322434111",
        "licence": "PNAS, free to read",
    },
    {
        "id": "ipcc-ar6-wg3-ch7",
        "name": "IPCC AR6 WGIII (2022), ch. 7: Agriculture, Forestry and Other Land Uses",
        "version": "2022",
        "url": "https://doi.org/10.1017/9781009157926.009",
        "licence": "IPCC copyright, free to read",
    },
    {
        "id": "akiyama-2010-inhibitors",
        "name": "Akiyama et al. (2010), enhanced-efficiency fertilizers and N2O: meta-analysis",
        "version": "Glob Change Biol 16(6)",
        "url": "https://doi.org/10.1111/j.1365-2486.2009.02031.x",
        "licence": "Wiley, subscription",
    },
    {
        "id": "lam-2017-inhibitors",
        "name": "Lam et al. (2017), nitrification inhibitors: a double-edged sword?",
        "version": "Glob Change Biol 23(2)",
        "url": "https://doi.org/10.1111/gcb.13338",
        "licence": "Wiley, subscription",
    },
    {
        "id": "fao-2011-energy-smart",
        "name": "FAO (2011), Energy-smart food for people and climate",
        "version": "2011",
        "url": "https://www.fao.org/3/i2454e/i2454e.pdf",
        "licence": "FAO copyright, free to read",
    },
]


def load(path: Path = CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False)


def cited(rows: pd.DataFrame) -> list[str]:
    """URLs the rows cite, in order, once each."""
    return list(dict.fromkeys(u for text in rows["citation"] for u in URL.findall(text)))


def listed(rows: pd.DataFrame, field: str) -> list[str]:
    values = rows.loc[rows["field"] == field, "value"]
    return [v for v in ";".join(values).split(";") if v]


def applicable(rows: pd.DataFrame, countries: list[str], regions: dict, incomes: dict) -> dict:
    """{'World': share, iso3: share} for every country, by the most specific row."""
    given = dict(
        zip(
            rows.loc[rows["field"] == "applicable", "key"],
            rows.loc[rows["field"] == "applicable", "value"].astype(float),
            strict=True,
        )
    )

    def share(iso3: str) -> float:
        keys = (iso3, f"region:{regions.get(iso3)}", f"income:{incomes.get(iso3)}", "World")
        return next(given[k] for k in keys if k in given)

    return {"World": given["World"], **{iso3: share(iso3) for iso3 in sorted(countries)}}


def value(rows: pd.DataFrame, field: str) -> float | None:
    """The one value of a field, or None when the practice has none."""
    values = rows.loc[rows["field"] == field, "value"].astype(float)
    return float(values.iloc[0]) if len(values) else None


def electrified(rows: pd.DataFrame, co2_per_fuel_co2: dict[str, float] | None) -> dict:
    """The part of a fuel cut beyond `efficiency` switches to grid electricity, which emits
    co2PerFuelCo2 kg per kg of fuel CO₂ it replaces; nothing for a practice without one."""
    efficiency = value(rows, "efficiency")
    return (
        {"electrified": {"efficiency": efficiency, "co2PerFuelCo2": co2_per_fuel_co2}}
        if efficiency is not None and co2_per_fuel_co2
        else {}
    )


def practice(
    rows: pd.DataFrame,
    countries: list[str],
    regions: dict,
    incomes: dict,
    co2_per_fuel_co2: dict[str, float] | None = None,
) -> dict:
    reduction = rows[rows["field"] == "reduction"].set_index("key")["value"].astype(float)
    groups = listed(rows, "groups")
    return {
        "sources": listed(rows, "sources"),
        "gases": listed(rows, "gases"),
        **({"groups": groups} if groups else {}),
        "reduction": {k: float(reduction[k]) for k in ("median", "low", "high")},
        "applicable": applicable(rows, countries, regions, incomes),
        **electrified(rows, co2_per_fuel_co2),
        "source": "; ".join(cited(rows)),
    }


def practices_json(
    table: pd.DataFrame,
    countries: list[str],
    regions: dict[str, str],
    incomes: dict[str, str],
    co2_per_fuel_co2: dict[str, float] | None = None,
) -> dict:
    """Practices: one record per practice id, every country given its applicable share, and the
    grid's CO₂ per kg of fuel CO₂ for a practice that switches fuel to electricity."""
    return {
        pid: practice(
            table[table["practice"] == pid], countries, regions, incomes, co2_per_fuel_co2
        )
        for pid in PRACTICES
    }
