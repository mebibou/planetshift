"""land.json: cropland per tonne, pasture and its sharing, natural regrowth rates and each
country's land area."""

import numpy as np
import pandas as pd

from .. import albedo as A
from .. import groups as G
from .. import intensities as I
from .. import land as L
from ..cache import fetched
from ..inputs import Build, log, write
from ..sources import naturalearth, rcmip


def build(b: Build) -> None:
    y = b.year
    rl = b.read("RL", y - 2, y)
    pasture = L.latest(rl, L.PASTURE, y)
    cropland = L.latest(rl, L.CROPLAND, y)
    farmland = {
        iso3: (float(pasture.get(area, 0.0)), float(cropland.get(area, 0.0)))
        for area, iso3 in b.iso3.items()
    }
    rows = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    ha_per_t, cake = L.shared_with_cake(ha_per_tonne(b), rows, L.load_oilcakes())
    fodder = L.latest(rl, L.TEMPORARY_MEADOWS, y)
    rates = regrowth(b, rl, farmland)
    lsu = L.lsu_by_group(b.read("EK", y, y), b.read("QCL", y, y), y)
    in_model = pasture[pasture.index.isin(b.iso3)]
    log_land(b, ha_per_t, cake, fodder, rates, farmland)
    write(
        b.out,
        "land.json",
        {
            "cropHaPerTonne": L.crop_json(ha_per_t),
            "oilcakeHa": L.cake_json(cake),
            "crush": L.crush_json(L.load_oilcakes()),
            "pasture": L.pasture_json(in_model, L.pasture_shares(lsu), b.iso3),
            "fodderHa": L.hectares_json(fodder, b.iso3),
            "landArea": L.hectares_json(L.latest(rl, L.LAND_AREA, y), b.iso3),
            "regrowth": L.regrowth_json(rates),
            "regrowthYears": L.REGROWTH_YEARS,
            "albedoPerHa": albedo_per_ha(b, rates, farmland),
        },
    )


def albedo_per_ha(b: Build, rates: pd.DataFrame, farmland: dict) -> dict[str, float]:
    """Each country's albedo forcing per hectare of farmland, where forest would grow back."""
    lat = A.latitudes(naturalearth.geojson(b.cache), naturalearth.iso3_of)
    per_ha = A.per_hectare(dict(zip(rates["iso3"], rates["share"], strict=True)), lat)
    world = float(rcmip.albedo_forcing(rcmip.load_forcing(b.cache), "ssp245", np.array([2019]))[0])
    farmed = sum(per_ha.get(i, 0.0) * (p + c) for i, (p, c) in farmland.items())
    log.info(
        "albedo: today's farmland %.3f W/m2 at these values, RCMIP's 2019 forcing %.3f; per Mha "
        "%s mW/m2",
        farmed,
        world,
        {i: round(per_ha[i] * 1e9, 3) for i in ("BRA", "FRA", "CAN", "USA") if i in per_ha},
    )
    return per_ha


def ha_per_tonne(b: Build) -> pd.DataFrame:
    """Cropland ha per tonne for every country and plant item (land.py)."""
    y, countries = b.year, sorted(set(b.iso3.values()))
    kept = G.kept(b.groups)
    plant = kept[~kept["group"].isin(G.ANIMAL_GROUPS)]["fbs_code"]
    _, extraction = I.load_proxies()
    byproducts = G.byproducts(kept)
    production = b.production[["area_code", "fbs_code", "production"]]
    sums = L.crop_sums(b.read("QCL", y - 1, y + 1), I.load_crops(), y)
    own = L.without_outliers(L.own_ha_per_tonne(sums, production), production)
    own = own.assign(iso3=own["area_code"].map(b.iso3)).dropna(subset=["iso3"])
    primary = L.filled(
        own[["iso3", "fbs_code", "ha_per_t"]],
        countries,
        [c for c in plant if c not in extraction and c not in byproducts],
        b.regions,
        b.production[["iso3", "fbs_code", "production"]],
    )
    derived = L.derived(
        primary,
        [c for c in plant if c in extraction],
        countries,
        extraction,
        b.uses("processing"),
    )
    out = pd.concat([primary, derived], ignore_index=True)
    log.info("cropland ha/t by how it was found:\n%s", out["how"].value_counts())
    return out


def regrowth(b: Build, rl: pd.DataFrame, farmland: dict) -> pd.DataFrame:
    countries = sorted(set(b.iso3.values()))
    forest = (L.latest(rl, L.FOREST, b.year) / L.latest(rl, L.LAND_AREA, b.year)).dropna()
    forest_share = {b.iso3[a]: v for a, v in forest.items() if a in b.iso3}
    text = fetched(b.cache, L.REGROWTH_URL, L.REGROWTH_FILE).read_text(encoding="utf-8")
    rates = L.regrowth_rates(L.read_regrowth(text), regrowth_names(b, countries))
    out = L.regrowth_filled(rates, countries, b.regions, forest_share, farmland)
    log.info("regrowth rates by how they were found:\n%s", out["how"].value_counts())
    return out


def log_land(
    b: Build,
    ha_per_t: pd.DataFrame,
    cake: pd.DataFrame,
    fodder: pd.Series,
    regrowth: pd.DataFrame,
    farmland: dict,
) -> None:
    rows = b.uses("production").merge(b.uses("processing"), on=["iso3", "fbs_code"])
    uses = pd.concat(
        [b.uses(f).set_index(["iso3", "fbs_code"]) for f in L.USE_FIELDS], axis=1
    ).reset_index()
    pasture = sum(ha for ha, _ in farmland.values())
    fodder_ha = float(fodder[fodder.index.isin(b.iso3)].sum())
    summary = L.animal_share(L.cropland(ha_per_t, rows), uses, pasture, cake["ha"].sum(), fodder_ha)
    rate = regrowth.set_index("iso3")["median"]
    log.info(
        "land: food crops %.0f Mha with %.0f Mha of oilcake, fodder %.0f Mha (FAOSTAT cropland "
        "%.0f Mha), pasture %.0f Mha, feed cropland %.0f Mha, animal products %.0f%% of "
        "farmland; regrowth if all pasture were freed %.1f Gt CO2/yr",
        summary["cropland"] / 1e6,
        cake["ha"].sum() / 1e6,
        fodder_ha / 1e6,
        sum(c for _, c in farmland.values()) / 1e6,
        pasture / 1e6,
        summary["feedCropland"] / 1e6,
        100 * summary["animalShare"],
        sum(rate.get(iso3, 0.0) * ha for iso3, (ha, _) in farmland.items()) / 1e9,
    )


def regrowth_names(b: Build, countries: list[str]) -> dict[str, str]:
    """Cook-Patton's country names to ISO3: FAOSTAT's English names, then the aliases."""
    named = dict(zip(b.area_table["area"], b.area_table["iso3"], strict=True))
    return {**{n: c for n, c in named.items() if c in countries}, **L.load_names()}
