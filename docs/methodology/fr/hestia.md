# Intensités d'émission de HESTIA

Pour traduire un changement de production alimentaire en changement d'émissions, Planetshift a besoin des émissions de la production de chaque aliment, par tonne : son intensité d'émission. Quand il le peut, il les prend dans HESTIA, une base de données ouverte qui recalcule les données des fermes avec les mêmes modèles partout. Avec la version actuelle, HESTIA donne des valeurs pour 37 produits alimentaires dans 47 pays et pour le monde entier. Les produits animaux et les huiles végétales ne sont pas encore couverts, et prennent leurs valeurs d'autres sources (voir [Émissions par tonne d'aliment](#method-emissions)).

## Ce que fournit HESTIA

Les valeurs de HESTIA sont les deux premiers niveaux des intensités, ceux que Planetshift préfère. Le niveau 1 est une valeur pour un aliment dans un pays. Le niveau 2 est une valeur pour la plus petite région HESTIA qui contient le pays, ou sinon pour le monde. Les niveaux suivants viennent d'autres sources (voir [Émissions par tonne d'aliment](#method-emissions)).

### Ce qu'est une agrégation HESTIA

HESTIA rassemble des données à l'échelle de la ferme, appelées Cycles. Il recalcule chaque émission avec les mêmes modèles, et publie des agrégations.

Une agrégation est l'impact moyen de la production d'un produit dans un pays sur une période. Elle est pondérée entre les systèmes de production (conventionnel ou biologique, irrigué ou non) selon leur part de la production. Une agrégation Monde combine les agrégations nationales validées d'un produit, pondérées par la production FAOSTAT de chaque pays.

Chaque agrégation est une ImpactAssessment, la fiche de HESTIA qui décrit les impacts d'un produit. Ses émissions sont exprimées par kg du produit (son unité fonctionnelle). L'équipe de HESTIA valide une agrégation avant de la publier, en la comparant à d'autres sources comme Poore & Nemecek (2018).

### Les versions

HESTIA publie ses données par versions. Une version est réservée aux utilisateurs en accès prioritaire pendant ses 182 premiers jours, puis devient publique. Les données de Planetshift sont construites à partir de la version v1.3 (2026-11-17), réservée aux utilisateurs en accès prioritaire jusqu'au 2027-05-18. Le pipeline la lit avec un jeton d'API HESTIA, dans `HESTIA_API_TOKEN`. Sans jeton, il lit la plus récente version publique, v1.2 (2026-04-30). Les deux versions sont fixées dans `sources/hestia.py` : une nouvelle version ne change les chiffres que si quelqu'un les change. Les chiffres publiés ici sont des moyennes par pays et par produit tirées de v1.3, pas les enregistrements de HESTIA eux-mêmes.

### Ce qui est compté

Planetshift garde trois gaz : le dioxyde de carbone (CO₂), le méthane (CH₄) et le protoxyde d'azote (N₂O). Il les compte en kg de chaque gaz, sans les additionner en un seul chiffre. Il garde les émissions de la ferme elle-même et, dans le périmètre le plus large, celles de la fabrication des intrants de la ferme, comme les engrais et le carburant (les deux périmètres sont décrits plus bas et sur la page [Émissions par tonne d'aliment](#method-emissions)). Il laisse de côté le changement d'usage des terres, qui a son propre levier, et les émissions de la production des aliments pour animaux, que le modèle compte déjà par les cultures fourragères.

Les mêmes agrégations donnent l'eau douce prélevée à la ferme et pour fabriquer ses intrants, et la consommation d'eau pondérée par la rareté selon AWARE 2.0. Elles sont gardées à part des gaz. La page [Eau douce](#method-water) les lit, avec les mêmes niveaux.

### La couverture en bref

Avec la version v1.3, 39 produits des bilans ont une valeur HESTIA, dans 61 pays et pour le Monde. Les œufs sont le seul produit animal avec une agrégation validée, pour le Canada et les États-Unis. La viande et le lait, les huiles végétales, le sucre et quelques cultures prennent donc leurs intensités dans les autres niveaux. La liste complète est sous *La couverture en détail*, plus bas.

## Comment Planetshift lit les agrégations

1. Une recherche (`POST https://api.hestia.earth/search`, avec l'en-tête `X-Data-Version` réglé sur la date de la version) liste toutes les ImpactAssessment agrégées dont `aggregatedDataValidated` est renseigné. Les agrégations non validées sont aussi dans l'index, mais HESTIA ne les publie pas : elles ne sont pas utilisées.
2. Pour chaque produit présent dans `hestia_terms.csv` et chaque zone (pays ou Monde), l'agrégation de la période la plus récente est gardée. Les périodes plus anciennes (1990–2009) sont écartées.
3. Le pipeline télécharge chaque agrégation gardée sous sa forme recalculée (`GET /impactassessments/<id>?dataState=recalculated`), quatre requêtes à la fois. Une requête est retentée à intervalle croissant en cas d'erreur réseau et de réponse 429 ou 5xx. Quand la requête d'une agrégation reçoit 401, 403 ou 404, ce produit et cette zone n'ont pas de ligne. Une requête qui échoue encore après les nouvelles tentatives arrête la construction. Avec `--allow-missing`, la construction se poursuit sans HESTIA, et aussi sans le palier de la littérature, qui lit les valeurs de HESTIA.
4. Les émissions de CO₂, de CH₄ et de N₂O dans l'air sont sommées par gaz et par périmètre (ci-dessous). Elles sont converties en kg de gaz par tonne du produit des bilans alimentaires de FAOSTAT (FBS), et écrites avec l'URL de la page du Cycle de l'agrégation sur hestia.earth.

### Le cache

Chaque réponse est mise en cache dans `pipeline/cache/hestia/<release>/` :

- les résultats de la recherche dans `aggregations.json` ;
- chaque agrégation dans `nodes/<clé>/`, réduite à ses lignes de CO₂, de CH₄ et de N₂O, à ses lignes de prélèvements d'eau douce, à son GWP100 et à sa consommation d'eau pondérée par la rareté selon AWARE 2.0, sans leurs distributions. Un nœud entier fait environ 10 Mo, le nœud réduit moins de 100 ko. La clé est une empreinte du code qui les réduit, si bien qu'un changement de ce qui est gardé les télécharge à nouveau.

Les termes de régions du glossaire sont mis en cache dans `pipeline/cache/hestia/glossary/`.

### Les zones

- La zone d'une agrégation nationale est son code ISO 3166-1 alpha-3 (`GADM-FRA` donne `FRA`).
- La zone de l'agrégation Monde est `World`.
- La zone d'une agrégation régionale est `region:<identifiant de région HESTIA>`. `region_members` liste les pays de chaque région HESTIA, à partir de la chaîne `subClassOf` des termes de pays du glossaire (qui suit les régions M49 des Nations unies). La version v1.2 n'a pas d'agrégation régionale, seulement des pays et le Monde.

## Faire correspondre les produits aux produits des bilans alimentaires

HESTIA décrit des produits (le riz paddy, les arachides en coque) ; les bilans alimentaires décrivent leurs propres produits (voir [Données](#method-data)). `hestia_terms.csv` associe à chaque produit des bilans les termes de produits HESTIA qui le représentent. Pour chacun, il donne les kilogrammes de produit HESTIA par kilogramme de produit des bilans (`kg_product_per_kg_item`) et une note.

L'intensité par tonne du produit des bilans est :

intensité par kg du produit HESTIA × `kg_product_per_kg_item` × 1000

Les facteurs ont été vérifiés par rapport aux bilans eux-mêmes (production mondiale 2022) :

- Riz : les bilans actuels comptent le riz et ses produits en paddy (788,8 Mt en 2022, à peu près la production de paddy). Le riz paddy (`riceGrainInHuskFlooded`) est utilisé avec un facteur de 1. Le paddy pluvial (`riceGrainInHuskUpland`) vient en second : il n'est utilisé que là où un pays n'a pas d'agrégation de riz inondé.
- Thé (code 2635 des bilans) : compté en thé préparé, si bien que les thés secs (`blackTeaDry`, `greenTeaDry`, `oolongTeaDry`) ont un facteur de 1. La feuille de thé fraîche (`teaLeaf`) n'est pas associée, car il faudrait un rapport entre feuille et thé préparé.
- Arachides (code FBS 2552) : comptées en coque (55,1 Mt) ; `peanutInShell` a donc un facteur de 1.
- Palmistes (2562) : leur production égale la récolte de fruits du palmier à huile (408,9 Mt) ; `oilPalmFruit` est donc utilisé avec un facteur de 1.
- Avoine : FAOSTAT compte l'avoine vêtue. L'avoine décortiquée (`oatGrain`) est un repli à 0,7 kg de gruau par kg d'avoine vêtue. Le gruau porte toutes les émissions.
- Viande : les bilans comptent le poids de carcasse. Le poids de carcasse froide est utilisé tel quel. Le poids vif, un repli, est converti avec les rendements en carcasse de Poore & Nemecek (2018, tableau S5) : 52–55 % pour les bovins et les buffles, 47 % pour les moutons et les chèvres, 75 % pour les porcs, 72 % pour les volailles.
- Lait : lait entier frais. Le lait corrigé en matières grasses et en protéines (4 % de matières grasses, 3,3 % de protéines) est un repli tenu pour égal.
- Œufs : avec coquille. Les œufs comptés à l'unité sont un repli à 16,7 œufs par kg (60 g l'œuf).

Quand plusieurs produits correspondent à un même produit des bilans, les produits de meilleure `priority` disponibles dans la zone sont moyennés sans pondération (le blé et le blé dur, les légumes des « Autres légumes »). L'URL est celle du premier d'entre eux par identifiant de terme.

Les produits transformés (huiles, tourteaux, riz blanchi, farine, vin) ne sont pas utilisés. Leurs agrégations comptent toute la culture comme une seule entrée d'arrière-plan. On ne peut alors pas séparer les émissions de la ferme de celles de la transformation. On ne peut pas non plus séparer le changement d'usage des terres du reste. Les huiles végétales n'ont donc pas de ligne HESTIA.

## Des émissions aux trois gaz

Chaque terme d'émission du glossaire qui commence par `co2ToAir`, `ch4ToAir` ou `n2OToAir` est compté comme ce gaz, en kg de gaz. Il n'est pas converti en équivalent CO₂ (CO₂e, les gaz pondérés par leur réchauffement sur 100 ans). Chaque terme tombe dans l'une de cinq catégories :

| Catégorie | Termes | Compté dans |
| --- | --- | --- |
| À la ferme | `ch4ToAir` : `EntericFermentation`, `Excreta`, `FloodedRice`, `CropResidueBurning`, `CropResidueDecomposition`, `AquacultureSystems`, `WasteTreatment`, `SoilFlux`, `Reservoirs`, `IndustrialProcessesNonFossil` ; `n2OToAir` : `InorganicFertiliser`, `OrganicFertiliser`, `Excreta`, `CropResidueDecomposition`, `CropResidueBurning`, `AquacultureSystems`, `WasteTreatment`, `IndustrialProcesses` (chacun direct et indirect), `SoilFlux` ; `co2ToAir` : `UreaHydrolysis`, `LimeNeutralisation`, `WasteTreatment` | les deux périmètres |
| Énergie de la ferme | chaque terme `…FuelCombustion…` : le carburant brûlé sur la ferme, par les tracteurs, les pompes et le chauffage | du berceau à la sortie de ferme |
| Arrière-plan | `ch4ToAirInputsProductionFossil`, `ch4ToAirInputsProductionNonFossil`, `n2OToAirInputsProduction`, `co2ToAirInputsProduction` : les émissions de la production de chaque intrant, une ligne par intrant | du berceau à la sortie de ferme, sauf les intrants d'origine agricole |
| Usage des terres | chaque terme `…StockChange…`, `…LandUseChange…` et `…ManagementChange…` (biomasse, matière organique morte, carbone du sol, N₂O de la perte de carbone du sol), `…NaturalVegetationBurning…`, `…OrganicSoilBurning…`, `…OrganicSoilCultivation…` | aucun |
| Non compté | `co2ToAirCropResidueDecomposition` et `co2ToAirSoilFlux` (CO₂ biogénique), `n2OToAirBackgroundSoilFluxDirect` (flux naturel de fond) | aucun |

Le classement se fait par identifiant de terme (`category_of`). Un terme ajouté plus tard au glossaire tombe donc dans la bonne catégorie s'il suit la même convention de nommage.

Un test compare la somme des trois gaz au GWP100 propre à chaque agrégation, tel que HESTIA le calcule avec les facteurs du GIEC AR6 (le GWP100 est la pondération sur 100 ans qui donne le CO₂e ; voir [Des émissions à la température](#method-climate)). Le blé en France donne 0,407 kg CO₂e/kg par les deux sommes, ce qui montre qu'aucune ligne n'est comptée deux fois.

L'usage des terres est laissé de côté ici parce que le changement d'usage des terres a son propre levier, [Déforestation](#method-deforestation). Les sols organiques drainés sont laissés de côté aussi : ils sont comptés à partir de FAOSTAT avec la déforestation.

## Les deux périmètres, et pourquoi l'alimentation animale est exclue

- `farmGate` : les émissions des processus biologiques de la ferme, sans le carburant brûlé sur la ferme.
- `cradleToFarmGate` : les émissions à la ferme, le carburant brûlé sur la ferme et les émissions de la production des intrants de la ferme (engrais, pesticides, carburant, électricité, machines, plastiques, eau, chaux), **sauf les intrants d'origine agricole** : aliments pour animaux, semences, animaux vivants et autres cultures ou produits animaux.

L'alimentation animale est exclue parce que Planetshift la compte ailleurs. Quand le changement retire des animaux, les aliments qu'ils auraient mangés sont retirés aussi. Les émissions des cultures fourragères concernées baissent alors par les intensités propres de ces cultures. Ajouter les émissions d'arrière-plan des aliments au produit animal compterait deux fois la même culture.

Il en va de même pour les semences et les animaux. Ce sont des produits agricoles que le modèle compte déjà comme usages des bilans (les semences sont un élément des bilans).

La règle s'applique ligne par ligne : aucune approximation n'est nécessaire. Chaque ligne d'arrière-plan d'une agrégation HESTIA nomme l'intrant dont elle vient (`inputs`). Une ligne est écartée quand le type de terme de cet intrant est `crop`, `forage`, `animalProduct`, `liveAnimal`, `liveAquaticSpecies`, `processedFood` ou `seed`. Les additifs alimentaires (`feedFoodAdditive`, comme les acides aminés de synthèse) et les engrais organiques sont gardés, car ce ne sont pas des cultures que le modèle compte.

## La couverture en détail

Avec la version v1.3 (exécution du 2026-11-24), il y a 649 agrégations validées. 327 sont téléchargées (la période la plus récente de chaque produit et zone pris en compte). Elles donnent 39 produits des bilans, 61 pays et le Monde :

- niveau 1 (pays) : 261 cases produit × pays par périmètre ;
- niveau 2 (Monde) : 15 produits : blé, maïs, riz, pommes de terre, canne à sucre, betterave sucrière, fruits à coque, arachides, soja, graines de tournesol, colza et moutarde, olives, autres légumes, raisin, autres fruits ;
- aucune agrégation régionale.

Les œufs sont le seul produit animal avec une agrégation validée, pour le Canada et les États-Unis. La viande bovine, la viande de mouton et de chèvre, la viande porcine, la volaille et le lait n'ont pas de ligne HESTIA, bien que la table les associe déjà pour une version future. Les huiles végétales, le sucre, les patates douces, les plantains, les ananas et les dattes n'ont pas de ligne HESTIA non plus. v1.3 a des agrégations validées d'huiles de colza et de tournesol raffinées et de sucre de canne brut, mais la table ne les associe pas : le modèle tire les huiles et le sucre de leurs cultures (voir [Émissions](#method-emissions)), et une valeur directe court-circuiterait ce calcul. v1.3 n'en a aucune pour les patates douces, que v1.2 avait. La table laisse aussi de côté les sous-produits de v1.3 (brisures de riz, son de blé), les semences, l'ensilage et les poulettes, qui ne sont pas des produits des bilans, ses algues, pour lesquelles le modèle n'a pas de produit, ses ormeaux et bivalves, car les produits de la mer ont leur propre méthode, et les capsules de coton, dont il faudrait partager les émissions entre fibre et graine.

### Quelques valeurs

Le tableau donne des valeurs du berceau à la sortie de ferme, en kg par tonne du produit des bilans. La colonne CO₂e utilise les facteurs AR5 (34 pour le CH₄ et 298 pour le N₂O), seulement pour comparaison.

| Produit | Zone | CO₂ | CH₄ | N₂O | CO₂e |
| --- | --- | --- | --- | --- | --- |
| Blé | Monde | 258 | 1,3 | 0,77 | 532 |
| Blé | France | 144 | 1,7 | 1,0 | 500 |
| Maïs | Monde | 173 | 0,84 | 0,64 | 391 |
| Riz (paddy) | Inde | 209 | 18,6 | 0,31 | 933 |
| Riz (paddy) | Chine | 239 | 26,8 | 0,41 | 1272 |
| Soja | Monde | 212 | 1,7 | 0,42 | 395 |

### Comparaison avec d'autres sources

Poore & Nemecek (2018) donnent, pour l'étape agricole sans changement d'usage des terres, environ 850 kg CO₂e par tonne de blé, 475 pour le maïs et 2 370 par tonne de riz paddy. Les valeurs de HESTIA sont plus basses. L'écart n'a pas été étudié.

Pour le méthane du riz, les émissions de la riziculture de FAOSTAT en 2022 divisées par la production de paddy donnent environ 25 kg par tonne en Chine (HESTIA : 26,8), 25 en Inde (HESTIA : 18,6) et 31 pour le monde.

## Hypothèses

- La version v1.3 est utilisée, et fixée, lue avec un jeton d'accès prioritaire. Elle est réservée jusqu'au 2027-05-18 ; sans jeton, le pipeline lit v1.2.
- Seules les agrégations validées sont utilisées.
- La période la plus récente de chaque produit et zone est utilisée, quelle que soit sa durée (2010–2026 pour toutes les lignes gardées).
- Les produits qui partagent un produit des bilans sont moyennés sans pondération. Seuls les produits de meilleure priorité disponibles dans la zone sont moyennés.
- Les facteurs de conversion des produits HESTIA vers les produits des bilans sont ceux listés ci-dessus et dans `hestia_terms.csv`. Les rendements en carcasse sont les moyennes de Poore & Nemecek.
- Le changement d'usage des terres, les sols organiques drainés, le brûlage de la végétation naturelle et le CO₂ biogénique sont exclus des deux périmètres.
- Les émissions d'arrière-plan des intrants agricoles (aliments pour animaux, semences, animaux, cultures, aliments transformés) sont exclues du périmètre du berceau à la sortie de ferme. Les additifs alimentaires et les engrais organiques sont gardés.
- Le CH₄ d'origine fossile et non fossile est sommé en une seule valeur de CH₄.
- Un produit sans ligne de gaz, ou une zone qui n'est ni un pays ni une région HESTIA, ne donne pas de ligne.

## Le code

Le code est `pipeline/planetshift_pipeline/sources/hestia.py`. La table des produits est `pipeline/hestia_terms.csv`.

## Sources

- HESTIA, [Data Releases](https://www.hestia.earth/guide/guide-accessing-data-data-releases) et [Using the HESTIA Data API](https://www.hestia.earth/guide/guide-accessing-data-data-api) : l'en-tête de version, les agrégations validées, l'état recalculé des données.
- HESTIA, [HESTIA Aggregated Data](https://www.hestia.earth/guide/guide-aggregated-data) et [Crop Aggregation](https://www.hestia.earth/guide/guide-aggregated-data-crop) : comment les agrégations et les agrégations Monde sont calculées.
- HESTIA, [glossaire](https://www.hestia.earth/glossary) : termes d'émission et termes de régions.
- HESTIA, [Citation and Data Licence](https://www.hestia.earth/guide/guide-accessing-data-citation) : les données publiques de HESTIA sont sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Une agrégation se cite avec HESTIA et les sources listées sur sa page, vers laquelle pointe l'`url` de chaque ligne.
- FAOSTAT, [Bilans alimentaires (2010-)](https://www.fao.org/faostat/en/#data/FBS) : les codes de produits et les unités par rapport auxquelles les facteurs de conversion ont été vérifiés.
- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216) : rendements en carcasse (tableau supplémentaire S5).
