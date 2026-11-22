# Intensités d'émission de HESTIA

Planetshift préfère les données agrégées de HESTIA pour les émissions de la production de chaque aliment (niveaux 1 et 2 des intensités). Cette page explique ce que sont ces agrégations, comment Planetshift les lit et ce qu'il laisse de côté. Le code est `pipeline/planetshift_pipeline/sources/hestia.py` ; la table des produits est `pipeline/hestia_terms.csv`.

## Ce qu'est une agrégation HESTIA

HESTIA rassemble des données à l'échelle de la ferme (des Cycles), recalcule chaque émission avec les mêmes modèles, et publie des agrégations : l'impact moyen de la production d'un produit dans un pays sur une période, pondéré entre les systèmes de production (conventionnel ou biologique, irrigué ou non, selon leur part de la production). Une agrégation Monde combine les agrégations nationales validées d'un produit, pondérées par la production FAOSTAT de chaque pays. Chaque agrégation est une ImpactAssessment dont les émissions sont exprimées par kg du produit (son unité fonctionnelle). L'équipe de HESTIA valide une agrégation avant de la publier, en la comparant à d'autres sources comme Poore & Nemecek (2018).

HESTIA publie ses données par versions. Une version est réservée aux utilisateurs en accès prioritaire pendant ses 182 premiers jours, puis devient publique. Planetshift fixe la plus récente version publique, v1.2 (2026-04-30), dans `RELEASE` : une nouvelle version ne change les chiffres que si quelqu'un change cette constante.

## Comment Planetshift les lit

1. Une recherche (`POST https://api.hestia.earth/search`, avec l'en-tête `X-Data-Version` réglé sur la date de la version) liste toutes les ImpactAssessment agrégées dont `aggregatedDataValidated` est renseigné. Les agrégations non validées sont aussi dans l'index, mais HESTIA ne les publie pas : elles ne sont pas utilisées.
2. Pour chaque produit présent dans `hestia_terms.csv` et chaque zone (pays ou Monde), l'agrégation de la période la plus récente est gardée ; les périodes plus anciennes (1990–2009) sont écartées.
3. Chaque agrégation gardée est téléchargée sous sa forme recalculée (`GET /impactassessments/<id>?dataState=recalculated`), quatre à la fois, 400 au plus en tout, avec de nouvelles tentatives à intervalle croissant en cas d'erreur réseau et de réponse 429 ou 5xx. Une requête qui échoue encore, ou qui répond 401 ou 404, ne donne pas de ligne pour ce produit et cette zone ; elle n'arrête jamais le pipeline.
4. Les émissions de CO₂, de CH₄ et de N₂O dans l'air sont sommées par gaz et par périmètre (ci-dessous), converties en kg de gaz par tonne du produit des bilans alimentaires de FAOSTAT (FBS), et écrites avec l'URL de la page de l'agrégation sur hestia.earth.

Chaque réponse est mise en cache dans `pipeline/cache/hestia/<release>/` : les résultats de la recherche dans `aggregations.json`, et chaque agrégation dans `nodes/`, réduite à ses lignes de CO₂, de CH₄ et de N₂O sans leurs distributions (un nœud entier fait environ 10 Mo, le nœud réduit moins de 100 ko). Les termes de régions du glossaire sont mis en cache dans `pipeline/cache/hestia/glossary/`.

La zone est le code ISO 3166-1 alpha-3 d'une agrégation nationale (`GADM-FRA` donne `FRA`), `World` pour l'agrégation Monde, et `region:<identifiant de région HESTIA>` pour une agrégation régionale ; `region_members` liste les pays de chaque région HESTIA, à partir de la chaîne `subClassOf` des termes de pays du glossaire (qui suit les régions M49 des Nations unies). La version v1.2 n'a pas d'agrégation régionale, seulement des pays et le Monde.

## Faire correspondre les produits aux produits des bilans alimentaires

`hestia_terms.csv` associe à chaque produit des bilans les termes de produits HESTIA qui le représentent, avec les kilogrammes de produit HESTIA par kilogramme de produit des bilans (`kg_product_per_kg_item`) et une note pour chacun. L'intensité par tonne du produit des bilans est l'intensité par kg du produit HESTIA × ce facteur × 1000. Les facteurs ont été vérifiés par rapport aux bilans eux-mêmes (production mondiale 2022) :

- Riz : les bilans actuels comptent le riz et ses produits en paddy (788,8 Mt en 2022, à peu près la production de paddy) ; le riz paddy (`riceGrainInHuskFlooded`) est donc utilisé avec un facteur de 1.
- Arachides (code FBS 2552) : comptées en coque (55,1 Mt) ; `peanutInShell` a donc un facteur de 1.
- Palmistes (2562) : sa production égale la récolte de fruits du palmier à huile (408,9 Mt) ; `oilPalmFruit` est donc utilisé avec un facteur de 1.
- Avoine : FAOSTAT compte l'avoine vêtue ; l'avoine décortiquée (`oatGrain`) est un repli à 0,7 kg de gruau par kg d'avoine vêtue, toutes les émissions étant portées par le gruau.
- Viande : les bilans comptent le poids de carcasse. Le poids de carcasse froide est utilisé tel quel ; le poids vif, un repli, est converti avec les rendements en carcasse de Poore & Nemecek (2018, tableau S5) : 52–55 % pour les bovins et les buffles, 47 % pour les moutons et les chèvres, 75 % pour les porcs, 72 % pour les volailles.
- Lait : lait entier frais ; le lait corrigé en matières grasses et en protéines (4 % de matières grasses, 3,3 % de protéines) est un repli tenu pour égal.
- Œufs : avec coquille ; les œufs comptés à l'unité sont un repli à 16,7 œufs par kg (60 g l'œuf).

Quand plusieurs produits correspondent à un même produit des bilans, les produits de meilleure `priority` disponibles dans la zone sont moyennés sans pondération (le blé et le blé dur, les légumes des « Autres légumes »). L'URL est celle du premier d'entre eux par identifiant de terme.

Les produits transformés (huiles, tourteaux, riz blanchi, farine, vin) ne sont pas utilisés : leurs agrégations comptent toute la culture comme une seule entrée d'arrière-plan, si bien qu'on ne peut séparer les émissions de la ferme de celles de la transformation, ni le changement d'usage des terres du reste. Les huiles végétales n'ont donc pas de ligne HESTIA.

## Des émissions aux trois gaz

Chaque terme d'émission du glossaire qui commence par `co2ToAir`, `ch4ToAir` ou `n2OToAir` est compté comme ce gaz, en kg de gaz (et non en équivalent CO₂). Chacun tombe dans l'une de quatre catégories :

| Catégorie | Termes | Compté dans |
| --- | --- | --- |
| À la ferme | `ch4ToAir` : `EntericFermentation`, `Excreta`, `FloodedRice`, `CropResidueBurning`, `CropResidueDecomposition`, `FuelCombustion`, `AquacultureSystems`, `WasteTreatment`, `SoilFlux`, `Reservoirs`, `IndustrialProcessesNonFossil` ; `n2OToAir` : `InorganicFertiliser`, `OrganicFertiliser`, `Excreta`, `CropResidueDecomposition`, `CropResidueBurning`, `FuelCombustion`, `AquacultureSystems`, `WasteTreatment`, `IndustrialProcesses` (chacun direct et indirect), `SoilFlux` ; `co2ToAir` : `FuelCombustion`, `UreaHydrolysis`, `LimeNeutralisation`, `WasteTreatment` | les deux périmètres |
| Arrière-plan | `ch4ToAirInputsProductionFossil`, `ch4ToAirInputsProductionNonFossil`, `n2OToAirInputsProduction`, `co2ToAirInputsProduction` : les émissions de la production de chaque intrant, une ligne par intrant | du berceau à la sortie de ferme, sauf les intrants d'origine agricole |
| Usage des terres | chaque terme `…StockChange…`, `…LandUseChange…` et `…ManagementChange…` (biomasse, matière organique morte, carbone du sol, N₂O de la perte de carbone du sol), `…NaturalVegetationBurning…`, `…OrganicSoilBurning…`, `…OrganicSoilCultivation…` | aucun |
| Non compté | `co2ToAirCropResidueDecomposition` et `co2ToAirSoilFlux` (CO₂ biogénique), `n2OToAirBackgroundSoilFluxDirect` (flux naturel de fond) | aucun |

Le classement se fait par identifiant de terme (`category_of`) : un terme ajouté plus tard au glossaire tombe dans la bonne catégorie s'il suit la même convention de nommage. Un test compare la somme des trois gaz au GWP100 propre à chaque agrégation (GIEC AR6, comme HESTIA le calcule) : le blé en France donne 0,407 kg CO₂e/kg des deux façons, ce qui montre qu'aucune ligne n'est comptée deux fois. L'usage des terres est laissé de côté ici parce que le changement d'usage des terres a son propre levier, [Déforestation](#method-deforestation) ; les sols organiques drainés sont laissés de côté avec lui, comme dans les domaines de FAOSTAT.

## Les deux périmètres, et pourquoi l'alimentation animale est exclue

- `farmGate` : les émissions à la ferme seulement.
- `cradleToFarmGate` : les émissions à la ferme plus les émissions de la production des intrants de la ferme (engrais, pesticides, carburant, électricité, machines, plastiques, eau, chaux), **sauf les intrants d'origine agricole** : aliments pour animaux, semences, animaux vivants et autres cultures ou produits animaux.

L'alimentation animale est exclue parce que Planetshift la compte ailleurs. Quand le changement retire des animaux, les aliments qu'ils auraient mangés sont retirés aussi, et les émissions de leurs cultures baissent par les intensités propres de ces cultures. Ajouter les émissions d'arrière-plan des aliments au produit animal compterait deux fois la même culture. Les semences et les animaux sont dans le même cas : ce sont des produits agricoles que le modèle tient déjà comme usages des bilans (les semences sont un élément des bilans). La règle s'applique ligne par ligne : chaque ligne d'arrière-plan d'une agrégation HESTIA nomme l'intrant dont elle vient (`inputs`), et une ligne est écartée quand le type de terme de cet intrant est `crop`, `forage`, `animalProduct`, `liveAnimal`, `liveAquaticSpecies`, `processedFood` ou `seed`. Aucune approximation n'est nécessaire. Les additifs alimentaires (`feedFoodAdditive`, comme les acides aminés de synthèse) et les engrais organiques sont gardés, car ce ne sont pas des cultures que le modèle compte.

## Couverture

Avec la version v1.2 (exécution du 2026-11-21) : 380 agrégations validées, 236 téléchargées (la période la plus récente de chaque produit et zone pris en compte), qui donnent 37 produits des bilans, 47 pays et le Monde :

- niveau 1 (pays) : 184 cases produit × pays par périmètre ;
- niveau 2 (Monde) : 11 produits : blé, maïs, pommes de terre, canne à sucre, betterave sucrière, arachides, soja, colza et moutarde, olives, bananes, raisin ;
- aucune agrégation régionale.

HESTIA n'a pas encore publié d'agrégations de produits animaux (sa documentation indique qu'elles sont en cours de développement) ; l'index en contient des non validées, qui ne sont pas utilisées. La viande bovine, la viande de mouton et de chèvre, la viande porcine, la volaille, le lait et les œufs n'ont donc pas de ligne HESTIA, bien que la table les associe déjà pour une version future. Pas plus que les huiles végétales, le sucre, le thé, les ignames, les bananes plantain, les ananas et les dattes.

Quelques valeurs (du berceau à la sortie de ferme, kg par tonne du produit des bilans ; CO₂e avec les facteurs AR5 34 et 298 seulement pour comparaison) :

| Produit | Zone | CO₂ | CH₄ | N₂O | CO₂e |
| --- | --- | --- | --- | --- | --- |
| Blé | Monde | 230 | 1,0 | 0,75 | 488 |
| Blé | France | 143 | 0,66 | 0,88 | 427 |
| Maïs | Monde | 176 | 0,81 | 0,61 | 385 |
| Riz (paddy) | Inde | 136 | 17,6 | 0,13 | 772 |
| Riz (paddy) | Chine | 243 | 26,6 | 0,40 | 1265 |
| Soja | Monde | 216 | 1,6 | 0,41 | 391 |

Poore & Nemecek (2018) donnent, pour l'étape agricole sans changement d'usage des terres, environ 850 kg CO₂e par tonne de blé, 475 pour le maïs et 2 370 par tonne de riz paddy ; les valeurs de HESTIA sont plus basses ; l'écart n'a pas été étudié. Pour le méthane du riz, les émissions de la riziculture de FAOSTAT en 2022 divisées par la production de paddy donnent environ 25 kg par tonne en Chine (HESTIA : 26,6), 25 en Inde (HESTIA : 17,6) et 31 pour le monde.

## Hypothèses

- La plus récente version publique (v1.2) est utilisée, et fixée ; la version v1.3 reste réservée jusqu'au 2027-05-18.
- Seules les agrégations validées sont utilisées.
- La période la plus récente de chaque produit et zone est utilisée, quelle que soit sa durée (2010–2026 pour toutes les lignes gardées).
- Les produits qui partagent un produit des bilans sont moyennés sans pondération ; la meilleure priorité disponible dans la zone l'emporte.
- Les facteurs de conversion des produits HESTIA vers les produits des bilans sont ceux listés ci-dessus et dans `hestia_terms.csv` ; les rendements en carcasse sont les moyennes de Poore & Nemecek.
- Le changement d'usage des terres, les sols organiques drainés, le brûlage de la végétation naturelle et le CO₂ biogénique sont exclus des deux périmètres.
- Les émissions d'arrière-plan des intrants agricoles (aliments pour animaux, semences, animaux, cultures, aliments transformés) sont exclues du périmètre du berceau à la sortie de ferme ; les additifs alimentaires et les engrais organiques sont gardés.
- Le CH₄ d'origine fossile et non fossile est sommé en une seule valeur de CH₄.
- Un produit sans ligne de gaz, ou une zone qui n'est ni un pays ni une région HESTIA, ne donne pas de ligne.

## Sources

- HESTIA, [Data Releases](https://www.hestia.earth/guide/guide-accessing-data-data-releases) et [Using the HESTIA Data API](https://www.hestia.earth/guide/guide-accessing-data-data-api) : l'en-tête de version, les agrégations validées, l'état recalculé des données.
- HESTIA, [HESTIA Aggregated Data](https://www.hestia.earth/guide/guide-aggregated-data) et [Crop Aggregation](https://www.hestia.earth/guide/guide-aggregated-data-crop) : comment les agrégations et les agrégations Monde sont calculées.
- HESTIA, [glossaire](https://www.hestia.earth/glossary) : termes d'émission et termes de régions.
- HESTIA, [Citation and Data Licence](https://www.hestia.earth/guide/guide-accessing-data-citation) : les données publiques de HESTIA sont sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) ; une agrégation se cite avec HESTIA et les sources listées sur sa page, vers laquelle pointe l'`url` de chaque ligne.
- FAOSTAT, [Bilans alimentaires (2010-)](https://www.fao.org/faostat/en/#data/FBS) : les codes de produits et les unités par rapport auxquelles les facteurs de conversion ont été vérifiés.
- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216) : rendements en carcasse (tableau supplémentaire S5).
