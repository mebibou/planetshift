"""deeptime.json: Earth's global mean surface temperature through deep time, every series put on
the app's 1850–1900 baseline, for the prototype deep-time page.

- 485 million years: PhanDA (Judd et al. 2024), 85 stage means, absolute °C with 5–95% ranges.
- 66 million years to 24,000 years ago: CENOGRID (Westerhold et al. 2020) turned into GMST
  with Hansen et al. (2013)'s formulas, as IPCC AR6 WGI Cross-Chapter Box 2.1 Figure 1 gives it
  (already on 1850–1900). The CEDA file is cut off at 33.52 Ma, so the older part applies AR6's
  early-Cenozoic formula to CENOGRID's 2,000-year bins from PANGAEA.
- 24,000 years: LGMR (Osman et al. 2021), 200-year means, absolute °C with the ensemble's SD.
  NCEI keeps it as netCDF-4; `lgmr_gmst.csv` holds its two GMST variables as read from
  `LGMR_GMST_climo.nc`, as the pipeline has no HDF5 reader.
- 1–1849 CE: PAGES 2k (2019) as AR6 WGI Figure 2.11a gives it, 10-year smoothed, on 1850–1900.

LGMR's last bin (0–200 years BP, 1750–1950) stands for 1850–1900. PhanDA's Holocene stage mean is
set to LGMR's Holocene mean on that baseline, so the two meet over the Holocene."""

import csv
import io
from pathlib import Path

from .cache import fetched

PIPELINE = Path(__file__).resolve().parent.parent
LGMR_CSV = PIPELINE / "lgmr_gmst.csv"

PHANDA_URL = (
    "https://raw.githubusercontent.com/EJJudd/PhanDA/"
    "064798b7d81de99cbe8c899898e3b6aefeef9a42/5_Outputs/PhanDA_GMSTandCO2_percentiles.csv"
)
PHANDA_PAGE = "https://github.com/EJJudd/PhanDA"
AR6_CCB21_URL = (
    "https://dap.ceda.ac.uk/badc/ar6_wg1/data/ch_02/ch2_ccb2_1_1/v20221114/"
    "FinalData_CCB2_1_Fig1_DMS.csv"
)
AR6_CCB21_PAGE = "https://catalogue.ceda.ac.uk/uuid/0f05c2fb8f814d60ac2d657a70e9a7f5"
AR6_FIG211_URL = (
    "https://dap.ceda.ac.uk/badc/ar6_wg1/data/ch_02/ch2_fig11/v20220510/"
    "Figure_2_11a-PAGES_2k_Consortium.csv"
)
AR6_FIG211_PAGE = "https://catalogue.ceda.ac.uk/uuid/f3515388768344bfb2be0521f82388be"
LGMR_PAGE = "https://doi.org/10.25921/njxd-hg08"
CENOGRID_URL = "https://doi.pangaea.de/10.1594/PANGAEA.917717?format=textfile"
CENOGRID_PAGE = "https://doi.org/10.1594/PANGAEA.917717"
CENOGRID_AGE = "Tuned time [Ma]"
#: The binned, gap-interpolated δ18O that AR6 used (its readme; Table 2.SM.1).
CENOGRID_D18O = "Foram benth δ18O [‰ PDB] (ISOBENbinned_d18Ointerp)"

#: Present in PhanDA's and LGMR's ages (before present = 1950) and in AR6's Westerhold column.
BP_YEAR = 1950
AR6_AGE_YEAR = 2000
#: LGMR covers the last 24,000 years, so the Westerhold series is kept only before it.
CENOZOIC_FROM_AGE = 24_000
CENOZOIC_BIN = 10_000
#: The Cenozoic's start, years before 2000, as far back as the series goes.
CENOZOIC_START_AGE = 66_000_000
#: Hansen et al. (2013)'s δ18O, ‰, below which the early Cenozoic had little ice (their eq. 3.1).
ICE_FREE_D18O = 1.75
#: PAGES 2k is kept until the instrumental series starts.
PAGES2K_LAST_YEAR = 1849
PAGES2K_STEP = 5
#: The Holocene's start, years before 1950 (PhanDA's own boundary, 0.0117 Ma).
HOLOCENE_BP = 11_700
#: 5–95% of a normal distribution, in standard deviations, for LGMR's ensemble SD.
Z90 = 1.645
#: What AR6 added to put each of its series on 1850–1900, from its readme.
AR6_WESTERHOLD_OFFSET = 0.36
AR6_PAGES2K_OFFSET = 0.37
#: Song et al. (2021)'s thresholds linked to major marine mass extinctions.
EXTINCTION_THRESHOLD = {
    "warming": 5.2,
    "degreesPerMyr": 10,
    "source": "Song et al. (2021), Nature Communications 12, 4694, doi:10.1038/s41467-021-25019-2",
}

SOURCES = [
    {
        "id": "phanda",
        "name": "PhanDA: Judd et al. (2024), A 485-million-year history of Earth's surface "
        "temperature, Science 385, eadk3705",
        "version": "GMST percentiles by stage, commit 064798b (file last changed 2024-06-12)",
        "url": PHANDA_PAGE,
        "licence": "CC BY 4.0",
    },
    {
        "id": "ar6-ccb2-1-westerhold",
        "name": "IPCC AR6 WGI Cross-Chapter Box 2.1 Figure 1 data (Kaufman): CENOGRID "
        "(Westerhold et al. 2020) as GMST by Hansen et al. (2013)'s formulas",
        "version": "v20221114 (the file is cut off at 33.52 Ma)",
        "url": AR6_CCB21_PAGE,
        "licence": "CC BY 4.0",
    },
    {
        "id": "cenogrid",
        "name": "CENOGRID: Westerhold et al. (2020), An astronomically dated record of Earth's "
        "climate and its predictability over the last 66 million years, Science 369, 1383–1387; "
        "PANGAEA, binned and interpolated benthic δ18O",
        "version": "S34, ISOBENbinned_d18Ointerp, used older than 33.52 Ma",
        "url": CENOGRID_PAGE,
        "licence": "CC BY 4.0",
    },
    {
        "id": "lgmr",
        "name": "LGMR: Osman et al. (2021), Globally resolved surface temperatures since the Last "
        "Glacial Maximum, Nature 599, 239–244; NOAA NCEI",
        "version": "LGMR_GMST_climo.nc, 2021-11-10",
        "url": LGMR_PAGE,
        "licence": "CC0 1.0 (NOAA NCEI catalogue); cite the publication",
    },
    {
        "id": "ar6-fig2-11-pages2k",
        "name": "IPCC AR6 WGI Figure 2.11a data (Trewin, Kaufman): PAGES 2k Consortium (2019) "
        "multi-method GMST reconstruction",
        "version": "v20220510",
        "url": AR6_FIG211_PAGE,
        "licence": "CC BY 4.0",
    },
]


def number(text: str) -> float | None:
    try:
        value: float | None = float(text)
    except ValueError:
        value = None
    return value


def parse_phanda(text: str) -> list[dict]:
    """PhanDA's stage rows, youngest first: their ages in Ma and GMST percentiles in °C."""
    keys = ("UpperAge", "LowerAge", "GMST_05", "GMST_16", "GMST_50", "GMST_84", "GMST_95")
    return [{k: float(row[k]) for k in keys} for row in csv.DictReader(io.StringIO(text))]


def parse_lgmr(text: str) -> list[dict]:
    """LGMR's 200-year bins, youngest first: age (years BP), mean and SD in °C."""
    return [
        {"age": int(row["age_bp"]), "mean": float(row["gmst"]), "sd": float(row["gmst_sd"])}
        for row in csv.DictReader(io.StringIO(text))
    ]


def ar6_column(text: str, age: int, value: int) -> list[tuple[float, float]]:
    """One series of an AR6 figure CSV (two header lines): its (age or year, value) pairs."""
    rows = list(csv.reader(io.StringIO(text)))[2:]
    pairs = ((number(r[age]), number(r[value])) for r in rows if len(r) > value)
    return [(a, v) for a, v in pairs if a is not None and v is not None]


def binned(pairs: list[tuple[float, float]], width: int) -> list[tuple[float, float]]:
    """Means of the pairs in bins `width` wide, youngest first."""
    bins: dict[int, list[tuple[float, float]]] = {}
    for age, value in pairs:
        bins.setdefault(int(age // width), []).append((age, value))
    means = (
        (sum(a for a, _ in b) / len(b), sum(v for _, v in b) / len(b))
        for _, b in sorted(bins.items())
    )
    return list(means)


def lgmr_offset(lgmr: list[dict]) -> float:
    """What puts LGMR on 1850–1900: minus its youngest bin (0–200 years BP)."""
    return -min(lgmr, key=lambda b: b["age"])["mean"]


def phanda_offset(phanda: list[dict], lgmr: list[dict]) -> float:
    """What sets PhanDA's Holocene stage mean to LGMR's Holocene mean on 1850–1900."""
    holocene = [b["mean"] for b in lgmr if b["age"] < HOLOCENE_BP]
    target = sum(holocene) / len(holocene) + lgmr_offset(lgmr)
    youngest = min(phanda, key=lambda s: s["UpperAge"])
    return target - youngest["GMST_50"]


def r2(x: float) -> float:
    return round(x, 2)


def phanda_json(phanda: list[dict], offset: float) -> dict:
    """The stages oldest first, as years CE (negative before the common era)."""
    stages = sorted(phanda, key=lambda s: -s["LowerAge"])

    def year(ma: float) -> int:
        return round(BP_YEAR - ma * 1e6)

    def column(key: str) -> list[float]:
        return [r2(s[key] + offset) for s in stages]

    return {
        "from": [year(s["LowerAge"]) for s in stages],
        "to": [year(s["UpperAge"]) for s in stages],
        "p05": column("GMST_05"),
        "p16": column("GMST_16"),
        "p50": column("GMST_50"),
        "p84": column("GMST_84"),
        "p95": column("GMST_95"),
    }


def parse_cenogrid(text: str) -> list[tuple[float, float]]:
    """PANGAEA's tab-separated CENOGRID bins, after the metadata: (years before 2000, δ18O)."""
    body = text.split("*/\n", 1)[-1]
    rows = csv.DictReader(io.StringIO(body), delimiter="\t")
    pairs = ((number(r.get(CENOGRID_AGE, "")), number(r.get(CENOGRID_D18O, ""))) for r in rows)
    return [(a * 1e6, d) for a, d in pairs if a is not None and d is not None]


def early_cenozoic_warming(d18o: float) -> float:
    """°C on 1850–1900 before the Pliocene, as AR6 applies Hansen et al. (2013): the deep ocean's
    temperature (eq. 3.1 when ice-free, eq. 3.5 otherwise), rounded to 0.01 °C, as the surface's
    change, plus AR6's 0.36 °C."""
    deep = -4 * d18o + 12 if d18o < ICE_FREE_D18O else 5 - 8 * (d18o - ICE_FREE_D18O) / 3
    return r2(round(deep, 2) + AR6_WESTERHOLD_OFFSET)


def extended(ar6: list[tuple[float, float]], cenogrid: list[tuple[float, float]]):
    """AR6's series, then CENOGRID's older bins through AR6's formula, to the Cenozoic's start."""
    last = max(a for a, _ in ar6)
    older = [(a, early_cenozoic_warming(d)) for a, d in cenogrid if last < a <= CENOZOIC_START_AGE]
    return ar6 + older


def cenozoic_json(pairs: list[tuple[float, float]]) -> dict:
    """The Westerhold series older than LGMR, in 10,000-year means, oldest first."""
    kept = binned([(a, v) for a, v in pairs if a >= CENOZOIC_FROM_AGE], CENOZOIC_BIN)[::-1]
    return {
        "years": [round(AR6_AGE_YEAR - a) for a, _ in kept],
        "median": [r2(v) for _, v in kept],
    }


def lgmr_json(lgmr: list[dict], offset: float) -> dict:
    bins = sorted(lgmr, key=lambda b: -b["age"])
    return {
        "years": [BP_YEAR - b["age"] for b in bins],
        "mean": [r2(b["mean"] + offset) for b in bins],
        "p05": [r2(b["mean"] - Z90 * b["sd"] + offset) for b in bins],
        "p95": [r2(b["mean"] + Z90 * b["sd"] + offset) for b in bins],
    }


def pages2k_json(rows: list[tuple[float, float, float, float]]) -> dict:
    """PAGES 2k every PAGES2K_STEP years up to PAGES2K_LAST_YEAR, oldest first."""
    kept = sorted(
        (r for r in rows if r[0] <= PAGES2K_LAST_YEAR and int(r[0]) % PAGES2K_STEP == 0),
        key=lambda r: r[0],
    )
    return {
        "years": [int(r[0]) for r in kept],
        "median": [r[1] for r in kept],
        "p05": [r[2] for r in kept],
        "p95": [r[3] for r in kept],
    }


def pages2k_rows(text: str) -> list[tuple[float, float, float, float]]:
    """AR6 Figure 2.11a's PAGES 2k CSV (one header line): year, median, 5th and 95th."""
    rows = list(csv.reader(io.StringIO(text)))[1:]
    values = ([number(c) for c in r[:4]] for r in rows if len(r) >= 4)
    return [(v[0], v[1], v[2], v[3]) for v in values if None not in v]


def deeptime_json(
    phanda: list[dict], ar6: str, lgmr: list[dict], pages2k: str, cenogrid: str
) -> dict:
    lgmr_shift, phanda_shift = lgmr_offset(lgmr), phanda_offset(phanda, lgmr)
    return {
        "baseline": "1850-1900",
        "offsets": {
            "phanda": r2(phanda_shift),
            "cenozoic": AR6_WESTERHOLD_OFFSET,
            "lgmr": r2(lgmr_shift),
            "pages2k": AR6_PAGES2K_OFFSET,
        },
        "phanda": phanda_json(phanda, phanda_shift),
        "cenozoic": cenozoic_json(extended(ar6_column(ar6, 0, 2), parse_cenogrid(cenogrid))),
        "lgmr": lgmr_json(lgmr, lgmr_shift),
        "pages2k": pages2k_json(pages2k_rows(pages2k)),
        "extinctionThreshold": EXTINCTION_THRESHOLD,
    }


def read_sources(cache_dir: Path) -> tuple[list[dict], str, list[dict], str, str]:
    """PhanDA, the AR6 Westerhold CSV, LGMR (from `lgmr_gmst.csv`), the AR6 PAGES 2k CSV and
    CENOGRID from PANGAEA."""
    folder = cache_dir / "deeptime"
    return (
        parse_phanda(fetched(folder, PHANDA_URL).read_text()),
        fetched(folder, AR6_CCB21_URL).read_text(encoding="latin-1"),
        parse_lgmr(LGMR_CSV.read_text()),
        fetched(folder, AR6_FIG211_URL).read_text(encoding="latin-1"),
        fetched(folder, CENOGRID_URL, "cenogrid_S34.tab").read_text(encoding="utf-8"),
    )
