# Décharges et eaux usées

Les déchets qui pourrissent sans air dégagent du méthane. L'essentiel vient de deux endroits : les déchets alimentaires, les déchets verts et le papier enfouis en décharge ou en dépôt sauvage, et les eaux usées laissées dans les latrines, les fosses septiques, les lagunes et les rivières. Deux leviers agissent sur ce méthane. Ce sont les premiers sur la cause de réchauffement *Déchets* (voir [Causes du réchauffement](#method-link)). **Décharges** capte le gaz que produisent les décharges et en tient les déchets organiques à l'écart. **Eaux usées** traite les eaux usées pour qu'une moindre part pourrisse sans air, et brûle le gaz des eaux usées qui pourrissent encore.

## D'où vient le méthane

CEDS v_2024_07_08 donne le méthane de chaque pays par secteur. En 2022, les déchets du monde ont émis 82,1 Mt de méthane : 38,1 Mt par le stockage des déchets solides (décharges et dépôts sauvages), 41,9 Mt par les eaux usées, 1,6 Mt par l'incinération et 0,5 Mt par les autres traitements. Les leviers agissent sur les deux premiers. La Chine, l'Inde, le Brésil, les États-Unis et la Russie en émettent le plus. CEDS donne aussi 0,46 Mt de N₂O des eaux usées. Les leviers le laissent tel quel, car le traitement aérobie réduit le méthane mais peut augmenter le N₂O.

L'avenir suit la cause *Déchets* des [causes du réchauffement](#method-link) : PRIMAP-hist jusqu'en 2023, puis le méthane des déchets de chaque scénario (le *Fossil and Industrial|Waste* de RCMIP) mis à l'échelle pour le rejoindre. Sur SSP2-4.5, c'est 66,2 Mt en 2023, 44,6 Mt en 2050 et 26,9 Mt en 2100. SSP1-2.6 garde 63,1 Mt en 2050 et 45,1 Mt en 2100, et SSP3-7.0 monte à 90,9 et 128,5 Mt. PRIMAP-hist compte moins de méthane des déchets que CEDS (65,8 Mt en 2022). Le méthane des décharges et des eaux usées d'un pays une année donnée est donc le méthane des déchets du scénario fois sa part des 82,1 Mt de CEDS.

## Décharges

Le levier fait deux choses à pleine adoption :

- **Captage du gaz.** Les décharges sont équipées d'une collecte du gaz, qui est brûlé ou valorisé. Un site équipé collecte 50 à 90 % de ce qu'il produit tant qu'il fonctionne, et moins sur toute sa vie. Planetshift retient 60 % (50–75 %). On ne peut pas collecter le gaz d'un dépôt sauvage, ni celui de déchets jamais collectés. Le captage n'agit donc que sur la part *gérée* d'un pays. C'est la part de ses déchets qui va en décharge, parmi tous ceux qui vont en décharge, vont en dépôt sauvage ou ne sont jamais collectés, d'après What a Waste 3.0 de la Banque mondiale. Pondérée par le méthane des décharges, la part gérée du monde est de 82 %. Un pays que What a Waste ne couvre pas reçoit la part du monde.
- **Détournement.** Les déchets alimentaires et verts sont compostés ou méthanisés au lieu d'être enfouis. Planetshift retient 40 % (30–50 %) des déchets dégradables tenus à l'écart des décharges et des dépôts. Le détournement agit partout, dépôts compris.

Les deux se combinent sur ce que l'autre laisse :

$$
\text{réduction} = 1 - (1 - a_c \times \text{captage} \times \text{gérée}) \times (1 - a_d \times \text{détournement})
$$

Avec le levier en place et les déchets déjà enfouis décomposés, un pays dont tous les déchets vont en décharge perd 1 − 0,4 × 0,6 = 76 % du méthane de ses décharges. Un pays qui n'a que des dépôts sauvages en perd 40 %. Sur les données réelles, le monde en perd 70 %.

### Les déchets déjà enfouis continuent de pourrir

Le captage agit tout de suite : $a_c$ est l'adoption du levier à mesure qu'elle monte. Le détournement ne fait qu'empêcher d'enfouir de nouveaux déchets. Les déchets déjà en décharge continuent de dégager du méthane pendant des décennies en se décomposant, ce que les inventaires du GIEC modélisent par une décomposition du premier ordre. Avec un taux $k$, le méthane des déchets d'une année baisse de $1 - e^{-k t}$ dans les $t$ années qui suivent l'arrêt de leur enfouissement. $a_d$ est donc l'adoption à mesure qu'elle monte, et chacune de ses hausses annuelles prend effet à ce rythme. La valeur par défaut du GIEC pour les déchets en vrac est $k$ = 0,09 par an en climat tempéré humide, 0,05 en climat sec et 0,17 en climat tropical humide (Lignes directrices 2006, vol. 5, tableau 3.3). Planetshift retient 0,09, une constante de temps de 11 ans, avec 0,05 et 0,17 aux bornes de la fourchette. Avec le levier en place en 2035, le détournement atteint 28 % de son effet cette année-là, 71 % en 2045, 81 % en 2050 et 99 % en 2085.

## Eaux usées

Des égouts et des stations d'épuration remplacent les latrines, les fosses septiques et les rejets non traités. Les lagunes et digesteurs de boues qui restent sont couverts, et leur gaz est brûlé. À pleine adoption, le levier réduit de 45 % (40–50 %) le méthane des eaux usées de chaque pays. L'évaluation du GIEC situe le potentiel des eaux usées à 0,22 Gt CO₂e par an (AR6 WGIII, tableau 12.SM.1.1). La réduction agit tout de suite, à mesure que le levier monte.

## Aucune tonne réduite deux fois

Le régime alimentaire et les leviers sur le gaspillage réduisent déjà le méthane des déchets. Moins de nourriture produite, c'est moins de nourriture jetée et moins d'eaux usées, et ce changement compte dans la cause *Déchets* (voir [Émissions](#method-emissions), *Après la ferme*). Son étape *déchets alimentaires* est celle de FAOSTAT pour les déchets solides, l'incinération et les eaux usées de l'industrie alimentaire. Les leviers ici la prennent pour du méthane de décharge. Son étape *eaux usées domestiques* est prise pour des eaux usées.

Les deux leviers agissent sur ce que ces leviers laissent. Dans chaque pays et chaque année, le méthane des décharges qu'ils réduisent est

$$
\text{réduction} \times \max(0,\ E + F)
$$

où $E$ est le méthane des décharges du pays dans le scénario et $F$ le changement qu'y apportent les leviers alimentaires, négatif. Il en va de même pour les eaux usées. Le changement des leviers alimentaires suit la production là où la nourriture est cultivée, comme le reste de la chaîne après la ferme. Il monte et suit le scénario de référence agricole de la même façon. Avec un changement de régime complet et les deux leviers sur le gaspillage à fond, les leviers alimentaires retirent 24 Mt de méthane par an aux 79 Mt de méthane des décharges et des eaux usées des pays selon CEDS. Une fois que le régime et le gaspillage ont agi, les deux leviers évitent encore 0,013 °C en 2050 et 0,014 °C en 2100, contre 0,023 et 0,033 °C seuls.

Dans la répartition par levier, les deux leviers comptent sous *Décharges et eaux usées*. Ils agissent sur ce que le régime et les leviers sur le gaspillage laissent, comme les pratiques agricoles, et le résumé répartit le recouvrement entre eux (voir [Leviers](#method-levers)). Ils comptent dans la cause *Déchets*.

## Dans l'application

Le volet **Décharges et eaux usées** de la section Leviers est sous son propre titre, *Déchets (décharges et eaux usées)*. Il compte deux curseurs, *Décharges* (`lf` dans l'URL) et *Eaux usées* (`ww`). Comme pour tous les leviers, chacun monte de l'année en cours jusqu'à l'année réglée par *Tous les leviers en place en* (`app/src/levers/wasteMethane/model.ts`).

Le changement de méthane est transmis à FaIR, que l'application fait tourner (voir la [page sur la température](#method-climate)). La fourchette probable est celle des membres de FaIR entre 5 et 95 %. Le bout à 95 % prend la borne haute de chaque facteur et la décomposition la plus rapide, et le bout à 5 % les bornes basses et la décomposition la plus lente.

La couche Déchets de la carte montre le méthane des décharges et des eaux usées de chaque pays (*Méthane des décharges et eaux usées*), celui de CEDS pour 2022. Avec les leviers, elle montre le changement une fois ceux-ci en place et les déchets déjà enfouis décomposés. Ce changement comprend celui des leviers alimentaires. L'infobulle montre les décharges et les eaux usées séparément.

## Résultats

Le tableau donne le réchauffement évité en °C : la médiane, puis la fourchette probable entre parenthèses. Chaque levier est à 100 % de 2026 à 2035, sur les données réelles et SSP2-4.5 avec les options par défaut.

| Leviers | Méthane évité en 2035 | 2050 | 2100 |
| --- | --- | --- | --- |
| Décharges | 15,0 Mt | 0,012 (0,008–0,023) | 0,019 (0,012–0,034) |
| Eaux usées | 13,5 Mt | 0,010 (0,007–0,017) | 0,014 (0,009–0,023) |
| Les deux | 28,4 Mt | 0,023 (0,015–0,040) | 0,033 (0,021–0,056) |

Sur SSP1-2.6, les deux leviers évitent 0,030 °C en 2050 et 0,056 °C en 2100, et sur SSP3-7.0 0,031 et 0,079 °C, car ces scénarios ont plus de méthane des déchets.

Les 28,4 Mt évitées par an en 2035 font environ 0,77 Gt CO₂e avec le PRG à 100 ans du méthane, 27. L'évaluation du GIEC situe le potentiel à 0,69 Gt CO₂e par an pour les déchets solides et 0,22 Gt pour les eaux usées (AR6 WGIII, tableau 12.SM.1.1). L'effet sur le réchauffement est plus faible qu'une première estimation qui maintenait la source à son niveau de 2022, et donnait 0,03–0,04 °C en 2050 et 0,05–0,07 °C en 2100. Il y a trois raisons. Le méthane des déchets de SSP2-4.5 tombe en 2100 à 40 % de celui d'aujourd'hui. Celui de PRIMAP-hist est d'un cinquième inférieur à celui de CEDS. Et le détournement met des décennies à produire tout son effet.

## Hypothèses

- Le méthane des décharges et des eaux usées de chaque pays est sa part du méthane des déchets de CEDS en 2022, fois le méthane des déchets du scénario chaque année.
- Le captage du gaz retire 60 % du méthane d'une décharge gérée, et agit sur la part des déchets enfouis d'un pays qui va en décharge (What a Waste 3.0). Les décharges qui collectent déjà leur gaz ne sont pas traitées à part, car les émissions de CEDS sont déjà nettes de ce qu'elles collectent.
- Le détournement tient 40 % des déchets dégradables à l'écart des décharges et des dépôts, et agit par une décomposition du premier ordre de constante de temps 11 ans.
- Le traitement des eaux usées réduit de 45 % leur méthane et laisse leur N₂O tel quel.
- Les leviers agissent sur le méthane des déchets que laissent le régime et les leviers sur le gaspillage, pays par pays, jamais en dessous de zéro.
- L'option du nombre d'humains sur Terre ne change pas ce que les leviers réduisent.
- La construction des collectes de gaz, des plateformes de compostage, des méthaniseurs et des égouts n'est pas comptée, ni l'énergie que le gaz fournit.

## Sources

- Community Emissions Data System (CEDS), v_2024_07_08, méthane par pays et par secteur : [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence : CC BY 4.0.
- PRIMAP-hist v2.8, émissions historiques nationales 1750–2025 : [doi:10.5281/zenodo.22876287](https://doi.org/10.5281/zenodo.22876287). Licence : CC BY-NC-SA 4.0.
- Protocole RCMIP v5.1.0, émissions des SSP par secteur : [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence : CC BY-SA 4.0.
- Banque mondiale (2026). What a Waste 3.0, jeu de données par pays, World Bank Data Catalog, jeu 0039597 : <https://datacatalog.worldbank.org/search/dataset/0039597>. Licence : CC BY 4.0.
- GIEC (2006). Lignes directrices 2006 du GIEC pour les inventaires nationaux de gaz à effet de serre, vol. 5, chap. 3, Stockage des déchets solides (décomposition du premier ordre, tableau 3.3) : <https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html>.
- GIEC (2022). Climate Change 2022: Mitigation of Climate Change, groupe de travail III, chap. 12 et tableau 12.SM.1.1 : <https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-12/>.
- US EPA. AP-42, Compilation of Air Emissions Factors, section 2.4, Municipal Solid Waste Landfills (efficacité de collecte du gaz) : <https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors>.
