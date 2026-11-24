"""impacts.json: what the IPCC (and one study) assessed at given levels of global warming, for the
card that reads them at the warming each future reaches.

- AR6 WGI Figure SPM.6: how many times more often a hot extreme, a heavy 1-day rain or an
  agricultural and ecological drought once in 10 (or 50) years in 1850–1900 comes, at 1, 1.5, 2,
  3 and 4 °C, with the median and the 5–95% range of the CMIP6 models (CEDA, CC BY 4.0).
- AR6 WGII SPM B.4.1, SR1.5 SPM B.3.1, B.4.1, B.4.2 and B.4.4, and Dosio et al. (2018): single
  values cited with their page, in `impacts.csv`. SR1.5 and the heatwave study stop at 2 °C."""

import csv
import io
from pathlib import Path

from .cache import fetched

PIPELINE = Path(__file__).resolve().parent.parent
CITED_CSV = PIPELINE / "impacts.csv"

SPM6_BASE = "https://dap.ceda.ac.uk/badc/ar6_wg1/data/spm/spm_06/v20210809"
SPM6_PAGE = "https://doi.org/10.5285/93d1b84fbb144901809eaf67b35eb5c4"
#: Each SPM.6 row, its panel and its frequency file: events once in 10 or 50 years in 1850–1900.
SPM6_FILES = {
    "hot10": ("a", "TXx_freq_change_10_year_event.csv"),
    "hot50": ("b", "TXx_freq_change_50_year_event.csv"),
    "rain10": ("c", "Rx1day_freq_change_10_year_event.csv"),
    "drought10": ("d", "drought_freq_change_10_year_event.csv"),
}
#: The figure's dots: the median, and the 5–95% range as its light dots.
SPM6_COLUMNS = {"mid": "50th", "low": "5th", "high": "95th"}

WGII_PAGE = "https://www.ipcc.ch/report/ar6/wg2/chapter/summary-for-policymakers/"
SR15_PAGE = "https://www.ipcc.ch/sr15/chapter/spm/"
DOSIO_PAGE = "https://doi.org/10.1088/1748-9326/aab827"

#: The groups in the card's order, each with its source's page and whether both futures must lie
#: within its levels for a row to be read (the studies that stop at 2 °C).
GROUPS = (
    {"id": "wgi", "url": SPM6_PAGE, "jointly": False},
    {"id": "wgii", "url": WGII_PAGE, "jointly": False},
    {"id": "sr15", "url": SR15_PAGE, "jointly": True},
    {"id": "heatwave", "url": DOSIO_PAGE, "jointly": True},
)
IPCC_TERMS = "IPCC copyright: the values are cited as facts with their page, the text is not reused"

SOURCES = [
    {
        "id": "ar6-wgi-spm6",
        "name": "IPCC AR6 WGI Figure SPM.6 data: frequency of hot extremes, heavy 1-day "
        "precipitation and agricultural and ecological drought at 1 to 4 °C of global warming",
        "version": "v20210809",
        "url": SPM6_PAGE,
        "licence": "CC BY 4.0",
    },
    {
        "id": "ar6-wgii-spm",
        "name": "IPCC (2022), Climate Change 2022: Impacts, Adaptation and Vulnerability, Summary "
        "for Policymakers, B.4.1 (p. 14): land species at very high risk of extinction",
        "version": "AR6 WGII SPM",
        "url": WGII_PAGE,
        "licence": IPCC_TERMS,
    },
    {
        "id": "sr15-spm",
        "name": "IPCC (2018), Global Warming of 1.5 °C, Summary for Policymakers, B.3.1, B.4.1, "
        "B.4.2 (p. 8) and B.4.4 (p. 9)",
        "version": "SPM, report version (2022)",
        "url": SR15_PAGE,
        "licence": IPCC_TERMS,
    },
    {
        "id": "dosio-2018",
        "name": "Dosio et al. (2018), Extreme heat waves under 1.5 °C and 2 °C global warming, "
        "Environmental Research Letters 13, 054006, section 3.4 (p. 6)",
        "version": "2018",
        "url": DOSIO_PAGE,
        "licence": "CC BY 3.0",
    },
]


def read_spm6(cache_dir: Path) -> dict[str, str]:
    """Each SPM.6 row's frequency file, as text."""
    folder = cache_dir / "ipcc" / "spm6"
    return {
        row: fetched(folder, f"{SPM6_BASE}/panel_{panel}/{name}").read_text()
        for row, (panel, name) in SPM6_FILES.items()
    }


def read_cited(path: Path = CITED_CSV) -> list[dict]:
    return list(csv.DictReader(path.open(encoding="utf-8")))


def parse_spm6(text: str) -> dict:
    """An SPM.6 frequency file: its warming levels and the median, 5th and 95th percentiles."""
    rows = list(csv.DictReader(io.StringIO(text)))
    return {
        "levels": [float(r["warming_level"]) for r in rows],
        **{key: [float(r[col]) for r in rows] for key, col in SPM6_COLUMNS.items()},
    }


def spm6_ref(row: str) -> str:
    return f"IPCC AR6 WGI Figure SPM.6, panel {SPM6_FILES[row][0]}"


def spm6_rows(files: dict[str, str]) -> list[dict]:
    return [
        {"id": row, "unit": "times", "ref": spm6_ref(row), **parse_spm6(text)}
        for row, text in files.items()
    ]


def cited_row(lines: list[dict]) -> dict:
    """One row of `impacts.csv` from its lines, one per level; a column left empty is left out."""
    first = lines[0]
    columns = {
        key: [float(line[key]) for line in lines]
        for key in ("mid", "low", "high")
        if all(line[key] for line in lines)
    }
    return {
        "id": first["row"],
        "unit": first["unit"],
        "ref": first["ref"],
        "levels": [float(line["level"]) for line in lines],
        **columns,
    }


def cited_rows(lines: list[dict], group: str) -> list[dict]:
    """The rows of a group, in the order of the table."""
    ids = dict.fromkeys(line["row"] for line in lines if line["group"] == group)
    return [
        cited_row([line for line in lines if line["group"] == group and line["row"] == i])
        for i in ids
    ]


def grouped(group: dict, rows: list[dict]) -> dict:
    """A group with its rows, which must all be assessed at the same levels."""
    levels = {tuple(r["levels"]) for r in rows}
    if len(levels) != 1:
        raise ValueError(f"{group['id']}: rows assessed at different levels {sorted(levels)}")
    return {
        **group,
        "levels": list(levels.pop()),
        "rows": [{k: v for k, v in r.items() if k != "levels"} for r in rows],
    }


def impacts_json(spm6: dict[str, str], cited: list[dict]) -> dict:
    rows = {"wgi": spm6_rows(spm6)} | {
        g["id"]: cited_rows(cited, g["id"]) for g in GROUPS if g["id"] != "wgi"
    }
    return {"groups": [grouped(g, rows[g["id"]]) for g in GROUPS]}
