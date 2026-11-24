"""Emission intensities by country, FBS item and scope, in kg of each gas per tonne of the item.

Tier 3 is computed here from FAOSTAT's emissions; the other tiers are merged in `merge`:
1 HESTIA country, 2 HESTIA region or world, 3 FAOSTAT country, 4 published LCA, 5 proxy item,
6 group world median. Animal intensities leave out the emissions of growing feed, which are
counted on the crops.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from .countries import countries_only

HERE = Path(__file__).resolve().parent.parent
GASES = ("co2", "ch4", "n2o")
SCOPES = ("farmGate", "cradleToFarmGate")
KT = 1e6  # kg per kt
GWP100 = {"co2": 1.0, "ch4": 27.0, "n2o": 273.0}

FAOSTAT_SOURCE = "https://www.fao.org/faostat/en/#data/GT"

#: FAOSTAT element codes per gas (kt), for crops (GCE, per crop) and livestock (GLE, per species).
CROP_ELEMENTS = {72255: "ch4", 72257: "ch4", 72302: "n2o", 72307: "n2o"}
LIVESTOCK_ELEMENTS = {72254: "ch4", 72256: "ch4", 72306: "n2o", 72300: "n2o", 72301: "n2o"}
FERTILISER_ITEM, FERTILISER_N2O = 3102, 72303
#: GT items added for cradle-to-farm-gate, with how each is shared between items.
UPSTREAM = {6504: "nitrogen", 6997: "area", 6994: "value"}
#: The emission source (EmissionSource in app/src/data/types.ts) of each FAOSTAT element or
#: GT item. Manure left on pasture and manure applied to soils are N deposited on soils, so
#: they count as organic fertiliser; manure management is what happens in housing and storage.
PROCESSES = {
    72254: "enteric",
    72256: "manure",
    72306: "manure",
    72300: "organicFertiliser",
    72301: "organicFertiliser",
    72255: "rice",
    72257: "residues",
    72302: "residues",
    72307: "residues",
    FERTILISER_N2O: "syntheticFertiliser",
    6504: "inputsManufacture",
    6997: "inputsManufacture",
    6994: "energy",
}
GT_GASES = {7273: "co2", 7225: "ch4", 7230: "n2o"}
#: The farm-gate processes the tier-3 intensities cover, as GT items (for the validation).
FARM_GATE_ITEMS = (5058, 5059, 5060, 5061, 5062, 5063, 5064, 5066)

#: Share of world nitrogen fertiliser use by crop class in 2014-2014/15: Heffer et al. (2017),
#: Assessment of Fertilizer Use by Crop at the Global Level, IFA and IPNI, Annex 2, World, N.
NITROGEN_SHARES = {
    "wheat": 0.182,
    "rice": 0.152,
    "maize": 0.178,
    "otherCereals": 0.047,
    "soybean": 0.011,
    "oilPalm": 0.014,
    "otherOilseeds": 0.053,
    "fibre": 0.041,
    "sugar": 0.036,
    "roots": 0.021,
    "fruits": 0.061,
    "vegetables": 0.074,
    "residual": 0.083,
}
#: Share of nitrogen spread on grassland (same table), given to ruminant products.
GRASSLAND_SHARE = 0.047

#: Share of a dairy herd's emissions given to milk; the rest goes to the beef of culled cows
#: and surplus calves. A physical allocation: the IDF's 2022 standard (Bulletin 520, eq. 2) gives
#: 85.1% for the farm of its worked example (appendix 10.5), and no global default.
DAIRY_MILK_SHARE = 0.85
#: Protein, tonnes per tonne, to split mixed herds between milk and meat.
MILK_PROTEIN = {951: 0.042, 982: 0.055, 1020: 0.035, 1130: 0.032}
MEAT_PROTEIN = 0.15

#: GLE species -> FBS items. A float is a fixed share; a pair (milk, meat) of QCL product codes
#: splits by protein output. Horses, asses and mules are kept for work (WORKING).
LIVESTOCK = {
    960: {2848: DAIRY_MILK_SHARE, 2731: 1 - DAIRY_MILK_SHARE},
    961: {2731: 1.0},
    946: ((951, 2848), (947, 2731)),
    976: ((982, 2848), (977, 2732)),
    1016: ((1020, 2848), (1017, 2732)),
    1126: ((1130, 2848), (1127, 2735)),
    1177: {2735: 1.0},
    1049: {2733: 1.0},
    1051: {2733: 1.0},
    1053: {2734: 1.0},
    1052: {2744: 1.0},
    1068: {2734: 1.0},
    1079: {2734: 1.0},
}
WORKING = (1096, 1107, 1110)
#: Species also kept for draught: (QCL milk item, None when milking cows are GLE 960; meat item).
DRAUGHT = {961: (None, 867), 946: (951, 947)}
#: Lowest regional mean offtake of traditional cattle in sub-Saharan Africa, southern Africa's
#: (Otte and Chilonda 2002, chapter 5): a herd taking off less is not raised for food.
FOOD_OFFTAKE = 0.067
#: FAOSTAT trade (TCL) item of each DRAUGHT species' live animals, in head.
LIVE_ANIMALS = {961: 866, 946: 946}
IMPORTED_HEAD, EXPORTED_HEAD = 5608, 5908
STOCKS, MILK_ANIMALS, SLAUGHTERED, PRODUCTION = 5111, 5318, 5320, 5510
RUMINANT_ITEMS = (2731, 2732, 2735, 2848)
MEAT_ITEMS = (2731, 2732, 2733, 2734, 2735)
COPRODUCT_ITEMS = (2736, 2737)

#: A tier-3 intensity more than this many times the item's world median (in CO2e) is taken as
#: a mismatch between FAOSTAT's emissions and the balance's production, and not used.
OUTLIER_FACTOR = 20.0


def load_crops(path: Path = HERE / "qcl_items.csv") -> pd.DataFrame:
    df = pd.read_csv(path)
    return df.assign(fbs_code=df["fbs_code"].astype("Int64"))


def parse_pairs(text) -> list[tuple[int, float]]:
    """ "2536:0.11;2537:0.16" -> [(2536, 0.11), (2537, 0.16)]."""
    pairs = text.split(";") if isinstance(text, str) and text.strip() else []
    return [(int(c), float(r)) for c, r in (pair.split(":") for pair in pairs)]


def load_proxies(path: Path = HERE / "proxies.csv") -> tuple[dict, dict]:
    """Proxy items in order of preference, and for processed items the primary items they are
    made from with their extraction rates (t of the processed item per t of primary processed)."""
    df = pd.read_csv(path, dtype={"proxies": str, "extraction": str})
    proxies = {
        int(code): [int(p) for p in str(ps).split(";")]
        for code, ps in zip(df["fbs_code"], df["proxies"], strict=True)
        if isinstance(ps, str) and ps.strip()
    }
    extraction = {
        int(code): parse_pairs(e)
        for code, e in zip(df["fbs_code"], df["extraction"], strict=True)
        if parse_pairs(e)
    }
    return proxies, extraction


# --- Sharing a country total between items -------------------------------------------------


def shared(totals: pd.DataFrame, weights: pd.DataFrame) -> pd.DataFrame:
    """Share each area's total (columns area_code, gas, kg) between keys in proportion to the
    weights (columns area_code, key, weight). Areas with no weight keep nothing: the caller
    checks what is lost. The sum over keys equals the area total wherever weights exist."""
    w = weights[weights["weight"] > 0]
    w = w.assign(part=w["weight"] / w.groupby("area_code")["weight"].transform("sum"))
    out = w.merge(totals, on="area_code")
    return out.assign(kg=out["kg"] * out["part"])[["area_code", "key", "gas", "process", "kg"]]


def nitrogen_rates(world_area: pd.Series) -> pd.Series:
    """Relative synthetic N rate per hectare of each crop class: world N share / world area."""
    shares = pd.Series(NITROGEN_SHARES)
    return (shares / world_area.reindex(shares.index)).replace([np.inf], 0).fillna(0.0)


def nitrogen_weights(area: pd.DataFrame, crops: pd.DataFrame, rates: pd.Series) -> pd.DataFrame:
    """Weight of each crop (key = QCL code) in a country's synthetic N: area x class rate.
    `area` has columns area_code, qcl_code, ha."""
    classed = area.merge(crops[["qcl_code", "n_class"]].drop_duplicates("qcl_code"), on="qcl_code")
    return classed.assign(
        key=classed["qcl_code"], weight=classed["ha"] * classed["n_class"].map(rates).fillna(0.0)
    )[["area_code", "key", "weight"]]


def with_grassland(
    totals: pd.DataFrame, crop_weights: pd.DataFrame, ruminant_weights: pd.DataFrame
) -> pd.DataFrame:
    """Share a country's synthetic N emissions: GRASSLAND_SHARE to ruminant products (by their
    weights), the rest to crops. A country with only one of the two gives it everything."""
    has_crops = set(crop_weights.loc[crop_weights["weight"] > 0, "area_code"])
    has_ruminants = set(ruminant_weights.loc[ruminant_weights["weight"] > 0, "area_code"])
    both = has_crops & has_ruminants

    def part(df: pd.DataFrame, share_if_both: float) -> pd.DataFrame:
        return df.assign(kg=df["kg"] * np.where(df["area_code"].isin(both), share_if_both, 1.0))

    return pd.concat(
        [
            shared(part(totals, 1 - GRASSLAND_SHARE), crop_weights).assign(kind="crop"),
            shared(part(totals, GRASSLAND_SHARE), ruminant_weights).assign(kind="fbs"),
        ],
        ignore_index=True,
    )


def to_fbs(by_crop: pd.DataFrame, crops: pd.DataFrame) -> pd.DataFrame:
    """Emissions by QCL crop (key) to FBS items, through qcl_items.csv; crops outside the food
    balance (fibres, tobacco, rubber...) and the lint share of seed cotton drop out here."""
    mapped = by_crop.merge(
        crops.dropna(subset=["fbs_code"])[["qcl_code", "fbs_code", "share"]],
        left_on="key",
        right_on="qcl_code",
    )
    return mapped.assign(
        fbs_code=mapped["fbs_code"].astype(int), kg=mapped["kg"] * mapped["share"]
    )[["area_code", "fbs_code", "gas", "process", "kg"]]


# --- FAOSTAT emissions by FBS item ----------------------------------------------------------


def gases(rows: pd.DataFrame, elements: dict[int, str], key: str = "item_code") -> pd.DataFrame:
    picked = rows[rows["element_code"].isin(elements)]
    return (
        picked.assign(
            gas=picked["element_code"].map(elements),
            process=picked["element_code"].map(PROCESSES),
            kg=picked["value"] * KT,
        )
        .groupby(["area_code", key, "gas", "process"], as_index=False)["kg"]
        .sum()
        .rename(columns={key: "key"})
    )


def crop_process(gce: pd.DataFrame, crops: pd.DataFrame) -> pd.DataFrame:
    """Rice methane, crop residue N2O and residue burning, by FBS item."""
    return to_fbs(gases(gce[gce["item_code"] != FERTILISER_ITEM], CROP_ELEMENTS), crops)


def milk_meat_split(qcl_production: pd.DataFrame, milk: int, meat: int) -> pd.DataFrame:
    """Each country's share of a mixed herd's emissions to milk and to meat, by protein output."""
    wide = (
        qcl_production[qcl_production["item_code"].isin([milk, meat])]
        .pivot_table(index="area_code", columns="item_code", values="value", aggfunc="sum")
        .reindex(columns=[milk, meat])
        .fillna(0.0)
    )
    protein_milk = wide[milk] * MILK_PROTEIN[milk]
    protein_meat = wide[meat] * MEAT_PROTEIN
    total = protein_milk + protein_meat
    return pd.DataFrame({"milk": (protein_milk / total.where(total > 0)).fillna(0.0)}).assign(
        meat=lambda d: 1 - d["milk"]
    )


def species_shares(qcl_production: pd.DataFrame) -> pd.DataFrame:
    """Rows (area_code or None for every area, species, fbs_code, share)."""
    fixed = [
        {"area_code": None, "species": sp, "fbs_code": code, "share": share}
        for sp, out in LIVESTOCK.items()
        if isinstance(out, dict)
        for code, share in out.items()
    ]
    mixed = [
        {"area_code": area, "species": sp, "fbs_code": fbs, "share": row[part]}
        for sp, out in LIVESTOCK.items()
        if isinstance(out, tuple)
        for area, row in milk_meat_split(qcl_production, out[0][0], out[1][0]).iterrows()
        for part, fbs in (("milk", out[0][1]), ("meat", out[1][1]))
    ]
    return pd.DataFrame(fixed + mixed)


def nonfood_shares(
    gle: pd.DataFrame,
    qcl: pd.DataFrame,
    trade: pd.DataFrame | None = None,
    offtake: float = FOOD_OFFTAKE,
) -> pd.DataFrame:
    """Share of each species' emissions (area_code, species, share) from animals not raised for
    food: all of WORKING; of a DRAUGHT species, the head beyond those milked and those needed to
    take off, at `offtake`, what it slaughters and exports alive net of imports (FAOSTAT trade,
    none where it has no row), over its stock (emissions taken per head)."""

    def by_area(df: pd.DataFrame | None, item: int | None, element: int) -> pd.Series:
        rows = (
            pd.DataFrame(columns=["item_code", "element_code", "area_code", "value"])
            if df is None
            else df[(df["item_code"] == item) & (df["element_code"] == element)]
        )
        return rows.groupby("area_code")["value"].sum().astype(float)

    def net_exports(species: int) -> pd.Series:
        item = LIVE_ANIMALS[species]
        exported = by_area(trade, item, EXPORTED_HEAD)
        return exported.sub(by_area(trade, item, IMPORTED_HEAD), fill_value=0.0).clip(lower=0)

    draught = pd.concat(
        [
            pd.DataFrame(
                {
                    "stock": by_area(gle, species, STOCKS),
                    "milked": by_area(qcl, milk, MILK_ANIMALS),
                    "slaughtered": by_area(qcl, meat, SLAUGHTERED),
                    "exported": net_exports(species),
                }
            )
            .rename_axis("area_code")
            .fillna(0.0)
            .query("stock > 0")
            .assign(species=species)
            for species, (milk, meat) in DRAUGHT.items()
        ]
    )
    rest = (draught["stock"] - draught["milked"]).clip(lower=0)
    kept_for_food = ((draught["slaughtered"] + draught["exported"]) / offtake).clip(upper=rest)
    working = gle.loc[gle["item_code"].isin(WORKING), ["area_code", "item_code"]].drop_duplicates()
    return pd.concat(
        [
            draught.assign(share=(rest - kept_for_food) / draught["stock"]).reset_index()[
                ["area_code", "species", "share"]
            ],
            working.rename(columns={"item_code": "species"}).assign(share=1.0),
        ],
        ignore_index=True,
    ).query("share > 0")


def nonfood_emissions(gle: pd.DataFrame, shares: pd.DataFrame) -> pd.DataFrame:
    """kg by (area_code, gas, process) of the animals not raised for food."""
    by_species = gases(gle, LIVESTOCK_ELEMENTS).merge(
        shares, left_on=["area_code", "key"], right_on=["area_code", "species"]
    )
    return (
        by_species.assign(kg=by_species["kg"] * by_species["share"])
        .groupby(["area_code", "gas", "process"], as_index=False)["kg"]
        .sum()
    )


def livestock(
    gle: pd.DataFrame, qcl_production: pd.DataFrame, nonfood: pd.DataFrame | None = None
) -> pd.DataFrame:
    """Enteric fermentation, manure management, manure on pasture and manure applied, by item,
    less the `nonfood_shares` part. Species with milk and meat but no output in QCL give
    everything to meat."""
    species = gases(gle[gle["item_code"].isin(LIVESTOCK)], LIVESTOCK_ELEMENTS)
    held = (
        species.merge(
            nonfood, how="left", left_on=["area_code", "key"], right_on=["area_code", "species"]
        )["share"]
        .fillna(0.0)
        .to_numpy()
        if nonfood is not None and not nonfood.empty
        else 0.0
    )
    by_species = species.assign(kg=species["kg"] * (1 - held))
    shares = species_shares(qcl_production)
    everywhere = by_species.merge(
        shares[shares["area_code"].isna()].drop(columns="area_code"),
        left_on="key",
        right_on="species",
    )
    split = shares.dropna(subset=["area_code"]).assign(
        area_code=lambda d: d["area_code"].astype(int)
    )
    mixed_rows = by_species[by_species["key"].isin(split["species"].unique())]
    known = mixed_rows.merge(split, left_on=["area_code", "key"], right_on=["area_code", "species"])
    unknown = mixed_rows.merge(
        split[["area_code", "species"]].drop_duplicates(),
        left_on=["area_code", "key"],
        right_on=["area_code", "species"],
        how="left",
        indicator=True,
    )
    unknown = unknown[unknown["_merge"] == "left_only"]
    to_meat = unknown.assign(
        fbs_code=unknown["key"].map(
            {sp: out[1][1] for sp, out in LIVESTOCK.items() if isinstance(out, tuple)}
        ),
        share=1.0,
    )
    frames = [everywhere, known, to_meat]
    return (
        pd.concat([f.assign(kg=f["kg"] * f["share"]) for f in frames], ignore_index=True)
        .groupby(["area_code", "fbs_code", "gas", "process"], as_index=False)["kg"]
        .sum()
        .astype({"fbs_code": int})
    )


def ruminant_weights(livestock_kg: pd.DataFrame) -> pd.DataFrame:
    """Ruminant products weighted by their methane, to share fertiliser used on grassland."""
    rows = livestock_kg[
        (livestock_kg["gas"] == "ch4") & livestock_kg["fbs_code"].isin(RUMINANT_ITEMS)
    ]
    return (
        rows.groupby(["area_code", "fbs_code"], as_index=False)["kg"]
        .sum()
        .rename(columns={"fbs_code": "key", "kg": "weight"})[["area_code", "key", "weight"]]
    )


def coproducts(emissions: pd.DataFrame, production: pd.DataFrame) -> pd.DataFrame:
    """Share each country's meat emissions with offals and animal fats by mass, so that each
    tonne of carcass, offal or fat carries the same emissions and nothing is counted twice.
    `production` has columns area_code, fbs_code, production (t)."""
    mass = (
        production.pivot_table(
            index="area_code", columns="fbs_code", values="production", aggfunc="sum"
        )
        .reindex(columns=[*MEAT_ITEMS, *COPRODUCT_ITEMS])
        .fillna(0.0)
    )
    meat, co = mass[list(MEAT_ITEMS)].sum(axis=1), mass[list(COPRODUCT_ITEMS)].sum(axis=1)
    co_share = (co / (meat + co).where(meat + co > 0)).fillna(0.0)
    is_meat = emissions["fbs_code"].isin(MEAT_ITEMS)
    meat_rows = emissions[is_meat]
    keep = meat_rows.assign(
        kg=meat_rows["kg"] * (1 - meat_rows["area_code"].map(co_share).fillna(0.0))
    )
    moved = (
        meat_rows.assign(kg=meat_rows["kg"] * meat_rows["area_code"].map(co_share).fillna(0.0))
        .groupby(["area_code", "gas", "process"], as_index=False)["kg"]
        .sum()
    )
    co_parts = mass[list(COPRODUCT_ITEMS)].div(co.where(co > 0), axis=0).fillna(0.0)
    to_co = pd.concat(
        [
            moved.assign(fbs_code=c, kg=moved["kg"] * moved["area_code"].map(co_parts[c]))
            for c in COPRODUCT_ITEMS
        ],
        ignore_index=True,
    )
    return pd.concat([emissions[~is_meat], keep, to_co], ignore_index=True)


def summed(frames: list[pd.DataFrame]) -> pd.DataFrame:
    return (
        pd.concat(frames, ignore_index=True)
        .groupby(["area_code", "fbs_code", "gas", "process"], as_index=False)["kg"]
        .sum()
    )


def gt_totals(gt: pd.DataFrame, item: int) -> pd.DataFrame:
    rows = gt[(gt["item_code"] == item) & gt["element_code"].isin(GT_GASES)]
    return (
        rows.assign(
            gas=rows["element_code"].map(GT_GASES), process=PROCESSES[item], kg=rows["value"] * KT
        )[["area_code", "gas", "process", "kg"]]
        .groupby(["area_code", "gas", "process"], as_index=False)["kg"]
        .sum()
    )


def area_weights(area: pd.DataFrame, crops: pd.DataFrame) -> pd.DataFrame:
    """Harvested area (ha) of each listed QCL item, so that FAOSTAT's aggregate items (1717
    Cereals, primary...) do not count their crops' area a second time."""
    rows = area[area["qcl_code"].isin(crops["qcl_code"])]
    return rows.rename(columns={"qcl_code": "key", "ha": "weight"})[["area_code", "key", "weight"]]


def world_area(area: pd.DataFrame, crops: pd.DataFrame) -> pd.Series:
    """World harvested area by nitrogen class, over single countries only ("China" is the sum
    of mainland China, Hong Kong, Macao and Taiwan, each listed on its own)."""
    return (
        countries_only(area)
        .merge(crops[["qcl_code", "n_class"]].drop_duplicates("qcl_code"), on="qcl_code")
        .groupby("n_class")["ha"]
        .sum()
    )


def value_weights(qv: pd.DataFrame, crops: pd.DataFrame) -> pd.DataFrame:
    """Gross production value (constant 2014-2016 international $) of each listed QCL item."""
    rows = qv[(qv["element_code"] == 152) & qv["item_code"].isin(crops["qcl_code"])]
    return rows.rename(columns={"item_code": "key", "value": "weight"})[
        ["area_code", "key", "weight"]
    ]


def faostat_emissions(
    gce: pd.DataFrame,
    gle: pd.DataFrame,
    gt: pd.DataFrame,
    qcl: pd.DataFrame,
    qv: pd.DataFrame,
    crops: pd.DataFrame,
    production: pd.DataFrame,
    nonfood: pd.DataFrame | None = None,
) -> dict[str, pd.DataFrame]:
    """kg by (area_code, fbs_code, gas, process), for each scope, for one year's FAOSTAT data,
    less the `nonfood` shares (`nonfood_shares` without trade when None); `process` is the
    emission source (PROCESSES)."""
    area = qcl[qcl["element_code"] == 5312].rename(columns={"item_code": "qcl_code", "value": "ha"})
    area = area[["area_code", "qcl_code", "ha"]]
    crop_n = nitrogen_weights(area, crops, nitrogen_rates(world_area(area, crops)))
    qcl_production = qcl[qcl["element_code"] == PRODUCTION]
    animals = livestock(
        gle, qcl_production, nonfood_shares(gle, qcl) if nonfood is None else nonfood
    )
    grass = ruminant_weights(animals)

    def nitrogen_shared(totals: pd.DataFrame) -> pd.DataFrame:
        parts = with_grassland(totals, crop_n, grass)
        crop_part = to_fbs(parts[parts["kind"] == "crop"], crops)
        fbs_part = parts[parts["kind"] == "fbs"].rename(columns={"key": "fbs_code"})
        return pd.concat([crop_part, fbs_part[["area_code", "fbs_code", "gas", "process", "kg"]]])

    fert = gce[(gce["item_code"] == FERTILISER_ITEM) & (gce["element_code"] == FERTILISER_N2O)]
    fert_totals = fert.assign(gas="n2o", process=PROCESSES[FERTILISER_N2O], kg=fert["value"] * KT)[
        ["area_code", "gas", "process", "kg"]
    ]
    upstream_weights = {"area": area_weights(area, crops), "value": value_weights(qv, crops)}
    upstream = [
        nitrogen_shared(gt_totals(gt, item))
        if how == "nitrogen"
        else to_fbs(shared(gt_totals(gt, item), upstream_weights[how]), crops)
        for item, how in UPSTREAM.items()
    ]
    farm = summed([crop_process(gce, crops), animals, nitrogen_shared(fert_totals)])
    cradle = summed([farm, *upstream])
    return {
        "farmGate": coproducts(farm, production),
        "cradleToFarmGate": coproducts(cradle, production),
    }


# --- Per tonne ------------------------------------------------------------------------------


def faostat_items(crops: pd.DataFrame) -> set[int]:
    """FBS items FAOSTAT's emissions reach: grown crops, livestock products and co-products."""
    animal = {
        code
        for out in LIVESTOCK.values()
        for code in (out if isinstance(out, dict) else (out[0][1], out[1][1]))
    }
    return set(crops["fbs_code"].dropna().astype(int)) | animal | set(COPRODUCT_ITEMS)


def per_tonne(
    emissions: pd.DataFrame, production: pd.DataFrame, areas: set[int], items: set[int]
) -> pd.DataFrame:
    """kg per tonne of FBS production, wide by gas, for each of `items` a country produces, in
    the countries FAOSTAT covers (an item with no listed emission there gets zeros)."""
    produced = production[
        (production["production"] > 0)
        & production["area_code"].isin(areas)
        & production["fbs_code"].isin(items)
    ]
    wide = emissions.pivot_table(
        index=["area_code", "fbs_code"], columns="gas", values="kg", aggfunc="sum"
    ).reindex(columns=list(GASES))
    joined = produced.set_index(["area_code", "fbs_code"]).join(wide).fillna(0.0)
    return pd.DataFrame(
        {g: joined[g] / joined["production"] for g in GASES}, index=joined.index
    ).reset_index()


def co2e(df: pd.DataFrame) -> pd.Series:
    return sum(df[g] * w for g, w in GWP100.items())


def weighted_median(values: pd.Series, weights: pd.Series) -> float:
    order = np.argsort(values.to_numpy())
    v, w = values.to_numpy()[order], weights.to_numpy()[order]
    return float(
        v[np.searchsorted(np.cumsum(w), w.sum() / 2)]
        if w.sum() > 0
        else (np.median(v) if len(v) else 0.0)
    )


def without_outliers(intensity: pd.DataFrame, production: pd.DataFrame) -> pd.DataFrame:
    """Drop tier-3 cells more than OUTLIER_FACTOR times their item's production-weighted
    world median, in CO2e."""
    df = intensity.merge(production, on=["area_code", "fbs_code"]).assign(co2e=lambda d: co2e(d))
    medians = df.groupby("fbs_code")[["co2e", "production"]].apply(
        lambda g: weighted_median(g["co2e"], g["production"])
    )
    limit = df["fbs_code"].map(medians) * OUTLIER_FACTOR
    return intensity[(df["co2e"] <= limit) | (limit <= 0)].reset_index(drop=True)


# --- Merging the tiers ----------------------------------------------------------------------


def candidates_from(
    df: pd.DataFrame,
    countries: list[str],
    members: dict[str, list[str]],
    tier_country: int,
    tier_wide: int,
) -> pd.DataFrame:
    """External intensities (columns fbs_item_code, area, scope, co2, ch4, n2o, url) as
    candidates per country: the country's own at `tier_country`, then its smallest region,
    then the world, at `tier_wide` (rank orders them within a tier)."""
    cols = ["iso3", "fbs_code", "scope", *GASES, "tier", "rank", "source"]
    return (
        pd.DataFrame(columns=cols)
        if df is None or df.empty
        else ranked(df, countries, members, tier_country, tier_wide)[cols]
    )


def ranked(
    df: pd.DataFrame,
    countries: list[str],
    members: dict[str, list[str]],
    tier_country: int,
    tier_wide: int,
) -> pd.DataFrame:
    """Each country's own intensities, then its regions', then the world's, ranked."""
    df = df.rename(columns={"fbs_item_code": "fbs_code", "url": "source"})
    own = df[df["area"].isin(countries)].assign(iso3=lambda d: d["area"], tier=tier_country, rank=0)
    regional = [
        df[df["area"] == f"region:{rid}"].assign(iso3=iso3, tier=tier_wide, rank=1 + len(isos))
        for rid, isos in members.items()
        for iso3 in isos
        if iso3 in countries
    ]
    world = df[df["area"] == "World"]
    worldwide = world.merge(pd.DataFrame({"iso3": countries}), how="cross").assign(
        tier=tier_wide, rank=10_000
    )
    return pd.concat([own, *regional, worldwide], ignore_index=True)


def best(candidates: pd.DataFrame) -> pd.DataFrame:
    """The lowest tier (then lowest rank) per country, item and scope."""
    return (
        candidates.sort_values(["tier", "rank"], kind="stable")
        .drop_duplicates(["iso3", "fbs_code", "scope"])
        .drop(columns="rank")
        .reset_index(drop=True)
    )


def proxied(
    chosen: pd.DataFrame, grid: pd.DataFrame, proxies: dict[int, list[int]], max_tier: int = 4
) -> pd.DataFrame:
    """Tier 5: for cells of `grid` (iso3, fbs_code, scope) without a value, the first listed
    proxy's best value for the same country and scope."""
    have = chosen[chosen["tier"] <= max_tier].set_index(["iso3", "fbs_code", "scope"])
    missing = grid.merge(chosen[["iso3", "fbs_code", "scope"]], how="left", indicator=True)
    missing = missing[missing["_merge"] == "left_only"].drop(columns="_merge")
    options = pd.DataFrame(
        [
            {"fbs_code": code, "proxy": p, "order": i}
            for code, ps in proxies.items()
            for i, p in enumerate(ps)
        ],
        columns=["fbs_code", "proxy", "order"],
    )
    tried = missing.merge(options, on="fbs_code").merge(
        have.reset_index().rename(columns={"fbs_code": "proxy"}), on=["iso3", "proxy", "scope"]
    )
    first = tried.sort_values("order").drop_duplicates(["iso3", "fbs_code", "scope"])
    return first.assign(
        tier=5, source="proxy " + first["proxy"].astype(str) + ": " + first["source"]
    )[["iso3", "fbs_code", "scope", *GASES, "tier", "source"]]


def group_medians(
    chosen: pd.DataFrame, groups: dict[int, str], production: pd.DataFrame, max_tier: int = 4
) -> pd.DataFrame:
    """Production-weighted world median per group, scope and gas, over cells of tiers 1-4."""
    df = chosen[chosen["tier"] <= max_tier].merge(production, on=["iso3", "fbs_code"], how="left")
    df = df.assign(group=df["fbs_code"].map(groups), production=df["production"].fillna(0.0))
    rows = [
        {
            "group": group,
            "scope": scope,
            **{gas: weighted_median(g[gas], g["production"]) for gas in GASES},
        }
        for (group, scope), g in df.groupby(["group", "scope"])
    ]
    return pd.DataFrame(rows, columns=["group", "scope", *GASES])


def missing_from(grid: pd.DataFrame, chosen: pd.DataFrame) -> pd.DataFrame:
    keys = ["iso3", "fbs_code", "scope"]
    left = grid[keys].merge(chosen[keys], how="left", indicator=True)
    return left[left["_merge"] == "left_only"].drop(columns="_merge")


def from_primaries(
    missing: pd.DataFrame,
    resolved: pd.DataFrame,
    extraction: dict[int, list[tuple[int, float]]],
    processing: pd.DataFrame,
    oil_shares: dict[int, float] | None = None,
) -> pd.DataFrame:
    """Tier 5 for processed items: the primary item's intensity divided by the extraction rate,
    so that a tonne of oil carries the emissions of the seed crushed to make it, times the oil's
    share of the crush's value when it has a cake (`oil_shares`). With several primaries (sugar
    from cane and beet), they are weighted by how much of each the country processes times its
    rate, or equally when it processes none."""
    links = pd.DataFrame(
        [{"fbs_code": d, "primary": k, "rate": r} for d, ks in extraction.items() for k, r in ks],
        columns=["fbs_code", "primary", "rate"],
    )
    rows = missing.merge(links, on="fbs_code").merge(
        resolved.rename(columns={"fbs_code": "primary"}), on=["iso3", "primary", "scope"]
    )
    rows = rows.merge(
        processing.rename(columns={"fbs_code": "primary"}), on=["iso3", "primary"], how="left"
    )
    weight = rows["processing"].fillna(0.0) * rows["rate"]
    total = weight.groupby([rows["iso3"], rows["fbs_code"], rows["scope"]]).transform("sum")
    count = rows.groupby(["iso3", "fbs_code", "scope"])["primary"].transform("count")
    rows = rows.assign(w=np.where(total > 0, weight / total.where(total > 0, 1), 1 / count))
    value_share = rows["fbs_code"].map(oil_shares or {}).fillna(1.0)
    rows = rows.assign(**{g: rows[g] / rows["rate"] * rows["w"] * value_share for g in GASES})
    rows = rows.assign(
        note=rows["primary"].astype(str) + " / " + rows["rate"].map(lambda r: f"{r:g}")
    )
    keys = ["iso3", "fbs_code", "scope"]
    out = (
        rows.groupby(keys)
        .agg(
            **{g: (g, "sum") for g in GASES},
            note=("note", " + ".join),
            source=("source", "first"),
        )
        .reset_index()
    )
    share = out["fbs_code"].map(oil_shares or {})
    valued = share.map(lambda v: f" × {v:.2f} (oil's value share)").where(share < 1, "")
    return out.assign(
        tier=5,
        source="processed from "
        + out["note"]
        + " (extraction rate)"
        + valued
        + ": "
        + out["source"],
    )[[*keys, *GASES, "tier", "source"]]


def merge(
    grid: pd.DataFrame,
    candidates: list[pd.DataFrame],
    proxies: dict[int, list[int]],
    extraction: dict[int, list[tuple[int, float]]],
    groups: dict[int, str],
    production: pd.DataFrame,
    processing: pd.DataFrame,
    zero_items: dict[int, str],
    oil_shares: dict[int, float] | None = None,
) -> pd.DataFrame:
    """One intensity per cell of `grid` (iso3, fbs_code, scope).

    Tiers 1-4 come from the candidates. For an item without, tier 5 is a proxy item's tiers 1-4
    value, or for a processed item its primary items' final value over the extraction rate (an
    oil's times its share of the crush's value, `oil_shares`, the rest going to the cake);
    then tier 6 is the group's production-weighted world median of tiers 1-4. Items in
    `zero_items` (by-products counted on the item they come from) get zeros at tier 5."""
    cols = ["iso3", "fbs_code", "scope", *GASES, "tier", "source"]
    zeros = grid[grid["fbs_code"].isin(zero_items)].assign(
        co2=0.0, ch4=0.0, n2o=0.0, tier=5, source=lambda d: d["fbs_code"].map(zero_items)
    )
    rest = grid[~grid["fbs_code"].isin(zero_items)]
    pool = pd.concat(candidates, ignore_index=True).merge(rest, on=["iso3", "fbs_code", "scope"])
    chosen = best(pool)
    is_derived = rest["fbs_code"].isin(extraction)
    base, derived = rest[~is_derived], rest[is_derived]
    base_chosen = chosen[~chosen["fbs_code"].isin(extraction)]
    medians = group_medians(base_chosen, groups, production)

    def sixth(cells: pd.DataFrame) -> pd.DataFrame:
        cells = cells.assign(group=cells["fbs_code"].map(groups)).merge(
            medians, on=["group", "scope"], how="left"
        )
        return cells.assign(
            tier=6, source="median of " + cells["group"].astype(str) + " worldwide"
        ).fillna({g: 0.0 for g in GASES})[cols]

    with_proxies = pd.concat([base_chosen[cols], proxied(base_chosen, base, proxies)])
    resolved = pd.concat([with_proxies, sixth(missing_from(base, with_proxies))], ignore_index=True)
    derived_chosen = chosen[chosen["fbs_code"].isin(extraction)][cols]
    by_primary = from_primaries(
        missing_from(derived, derived_chosen), resolved, extraction, processing, oil_shares
    )
    derived_done = pd.concat([derived_chosen, by_primary])
    return pd.concat(
        [zeros[cols], resolved, derived_done, sixth(missing_from(derived, derived_done))],
        ignore_index=True,
    )


def oilcake_emissions(
    merged: pd.DataFrame,
    oilcakes: pd.DataFrame,
    extraction: dict[int, list[tuple[int, float]]],
    rows: pd.DataFrame,
) -> pd.DataFrame:
    """kg of each gas a year the cake of a crushed oilseed carries, by country and scope: the
    oilseed's intensity over the oil's extraction rate, times the oil made (production −
    processing), times the cake's share of the crush's value. `oilcakes` has oil_code,
    primary_code and oil_share; `rows` iso3, fbs_code, production and processing."""
    rates = pd.DataFrame(
        [
            {"oil_code": o, "primary_code": p, "rate": r}
            for o, ps in extraction.items()
            for p, r in ps
        ],
        columns=["oil_code", "primary_code", "rate"],
    )
    made = rows.assign(made=(rows["production"] - rows["processing"]).clip(lower=0)).rename(
        columns={"fbs_code": "oil_code"}
    )[["iso3", "oil_code", "made"]]
    seed = merged.rename(columns={"fbs_code": "primary_code"})[
        ["iso3", "primary_code", "scope", *GASES]
    ]
    df = (
        oilcakes.merge(rates, on=["oil_code", "primary_code"])
        .merge(made, on="oil_code")
        .merge(seed, on=["iso3", "primary_code"])
    )
    factor = df["made"] / df["rate"] * (1 - df["oil_share"])
    out = (
        df.assign(**{g: df[g] * factor for g in GASES})
        .groupby(["iso3", "primary_code", "scope"], as_index=False)[list(GASES)]
        .sum()
    )
    return out[out[list(GASES)].sum(axis=1) > 0].reset_index(drop=True)


def oilcake_json(cake: pd.DataFrame) -> dict:
    """oilcake[iso3][oilseedCode][scope] = kg of each gas a year."""
    return {
        iso3: {
            str(int(code)): {
                row.scope: {g: significant(getattr(row, g)) for g in GASES}
                for row in cells.itertuples()
            }
            for code, cells in country.groupby("primary_code")
        }
        for iso3, country in cake.sort_values(["iso3", "primary_code", "scope"]).groupby("iso3")
    }


def nonfood_json(kg: pd.DataFrame, iso3: dict[int, str]) -> dict:
    """nonFood[iso3] = kg of each gas a year from the animals not raised for food."""
    wide = (
        kg[kg["area_code"].isin(iso3)]
        .pivot_table(index="area_code", columns="gas", values="kg", aggfunc="sum")
        .reindex(columns=list(GASES))
        .fillna(0.0)
    )
    return {
        iso3[area]: {g: significant(row[g]) for g in GASES}
        for area, row in sorted(wide.iterrows(), key=lambda r: iso3[r[0]])
    }


def significant(x: float, digits: int = 3) -> float:
    return float(f"{x:.{digits}g}") if x else 0.0


def intensities_json(merged: pd.DataFrame) -> dict:
    """sources: each distinct source once, sorted; byCountry[iso3][itemCode][scope] =
    {kgPerTonne, tier, source}, source an index into sources."""
    sources = sorted(merged["source"].unique())
    index = {s: i for i, s in enumerate(sources)}
    return {
        "sources": sources,
        "byCountry": {
            iso3: {
                str(code): {
                    row.scope: {
                        "kgPerTonne": {g: significant(getattr(row, g)) for g in GASES},
                        "tier": int(row.tier),
                        "source": index[row.source],
                    }
                    for row in cells.itertuples()
                }
                for code, cells in country.groupby("fbs_code")
            }
            for iso3, country in merged.groupby("iso3")
        },
    }
