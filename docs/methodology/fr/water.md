# Eau douce

L'agriculture prélève environ 70 % de l'eau douce prélevée dans le monde (FAO AQUASTAT). Planetshift donne l'eau douce que prélève l'agriculture de chaque pays, aujourd'hui et une fois les leviers pleinement en place. Le résumé donne le chiffre mondial, *Eau douce prélevée pour l'agriculture*. La couche *Prélèvements d'eau douce* de la carte donne les litres par an de chaque pays. Une seconde couche, *Rareté de l'eau (cultures)*, donne la consommation d'eau pondérée par la rareté des cultures que couvre HESTIA.

L'eau ne change pas le réchauffement. Les leviers ne la changent qu'en changeant ce qui est cultivé.

Les chiffres sont dans `water.json`. Le code est `pipeline/planetshift_pipeline/water.py`, avec la part de HESTIA dans `sources/hestia.py` (`fetch_water`), et `app/src/model/water.ts`.

## Ce qui est compté

Les prélèvements sont l'eau prise dans les rivières, les lacs et les nappes, qu'elle y retourne ou non. C'est ce que mesurent les chiffres nationaux d'AQUASTAT et Poore & Nemecek (2018). La pluie qui tombe sur un champ n'est pas prélevée : les cultures pluviales ne prélèvent presque rien à la ferme.

Pour chaque produit et chaque pays, Planetshift garde une valeur, en litres par tonne du produit des bilans alimentaires (FBS) :

- l'eau prélevée à la ferme, surtout pour l'irrigation, et pour l'abreuvement et le nettoyage des animaux ;
- l'eau prélevée pour fabriquer les intrants de la ferme (engrais, carburant, électricité, machines), sauf les intrants agricoles : semences, aliments du bétail et animaux, que leurs propres produits comptent, comme pour les émissions.

L'eau d'un pays est la somme, sur ses produits, des litres par tonne multipliés par la production, moins l'eau de la part transformée en un autre produit, que ce produit compte (le sucre de la canne, l'huile des oléagineux), comme pour les émissions. Le tourteau d'un oléagineux trituré porte la part de l'eau de la graine que l'huile ne prend pas, selon la valeur de la trituration. Comme ses terres, le tourteau suit les animaux qu'il nourrit.

Les litres par tonne ne changent avec aucun levier. L'eau suit donc la production : le changement de régime, le gaspillage et les autres leviers qui changent ce qui est cultivé.

## D'où viennent les valeurs : les niveaux

Les niveaux sont ceux des intensités d'émission (voir [Émissions](#method-emissions)) :

1. HESTIA, l'agrégation du pays lui-même.
2. HESTIA, celle de sa région ou du monde.
4. Poore & Nemecek (2018), moyennes mondiales.
5. La valeur d'un produit de substitution (`proxies.csv`), ou pour un produit transformé celle de ses produits primaires divisée par le taux d'extraction (les huiles multipliées par leur part de la valeur de la trituration).
6. La médiane mondiale du groupe, pondérée par la production, des niveaux 1 à 4.

Il n'y a pas de niveau 3 : FAOSTAT ne publie pas l'eau par culture.

### HESTIA

Les agrégations de HESTIA (version v1.3) donnent, par kg de produit à la sortie de la ferme :

- `freshwaterWithdrawalsDuringCycle` : l'eau prélevée à la ferme ;
- `freshwaterWithdrawalsInputsProduction` : l'eau prélevée pour fabriquer chaque intrant, une ligne par intrant. Les lignes sont additionnées, sauf celles des intrants agricoles (types de termes `crop`, `forage`, `animalProduct`, `liveAnimal`, `liveAquaticSpecies`, `processedFood`, `seed`). Les semences comptent : elles font 20 des 25 L/kg du riz en Chine.

Une agrégation sans ligne de prélèvement à la ferme ne donne pas de valeur. Les kg de produit sont convertis en tonnes du produit FBS avec les facteurs des émissions (`hestia_terms.csv`, voir [HESTIA](#method-hestia)), et les produits d'un même poste sont moyennés de la même façon.

Les termes de consommation de HESTIA (l'eau qui ne retourne pas au milieu) ne sont pas utilisés : prélèvements et consommation ne sont jamais mélangés.

### Poore & Nemecek

Poore & Nemecek (2018) donnent une valeur mondiale par aliment, en litres prélevés par kg de produit vendu au détail. Planetshift les lit dans l'extrait d'Our World in Data (CC BY 4.0). Il fait correspondre les produits de l'étude aux postes FBS comme le niveau tiré de la littérature des émissions (`literature_terms.csv`). Il moyenne les produits d'un poste en pondérant chacun par son alimentation et ses pertes en 2009–2011.

**Du produit vendu au poste FBS.** Les valeurs de HESTIA sont par kg à la sortie de la ferme. Le niveau littérature des émissions est par kg de l'unité FBS de l'étude (carcasse, grain, lait frais). L'extrait sur l'eau est par kg de produit vendu (viande désossée, pain, farine). Planetshift le convertit avec les propres chiffres de l'étude. Il divise les émissions de l'étape agricole par kg de l'unité FBS, transcrites dans `literature_terms.csv`, par les émissions de l'étape agricole par kg de produit vendu, tirées de l'extrait d'Our World in Data sur les étapes de la chaîne. Ce rapport est le nombre de kg de produit vendu par kg de l'unité FBS : 0,70 pour le bœuf, 0,68 pour le porc, 0,72 pour la volaille, 0,97 pour le lait, et environ 1 pour le blé, le riz et les œufs. La valeur par kg de l'unité FBS est ensuite convertie au poste FBS actuel avec `kg_product_per_kg_item`, comme pour les émissions (0,667 pour le riz, compté aujourd'hui en paddy).

Les produits sans eau dans l'extrait sont exclus de la moyenne de leur poste : le buffle, les huiles végétales, le soja, et les céréales, oléagineux et stimulants divers. Leurs postes prennent le niveau 5 ou 6.

**Produits animaux.** La valeur de Poore & Nemecek pour un produit animal comprend l'eau de ses aliments. Planetshift compte l'eau des cultures fourragères sur les cultures, comme leurs émissions. Un changement qui retire des animaux retire alors une seule fois l'eau de leurs aliments. La valeur de chaque produit animal est donc celle de l'étude, moins l'eau de ses aliments concentrés :

$$
W_{g,c} = \max\left(0,\; W^{PN}_g - F_{g,c} \sum_k r_{k,g}\, w_k\right)
$$

avec $W^{PN}_g$ les litres par tonne de l'étude, $F_{g,c}$ le concentré par tonne de produit dans le pays $c$ (à revenu élevé ou non) et $r_{k,g}$ la part de la classe d'aliments $k$ dans la ration, toutes deux les valeurs de type GLEAM de [Alimentation animale](#method-feed), et $w_k$ les litres par tonne de la classe $k$ : les valeurs des cultures du modèle (niveaux 1 à 6), moyennées sur le monde, pondérées par l'usage fourrager de chaque culture dans les bilans alimentaires. Les classes donnent 228 000 L/t pour les céréales, 202 000 pour les oléagineux, 562 000 pour les légumineuses, 19 000 pour les racines et 93 000 pour les plantes sucrières. Le lait et le poisson donnés aux animaux ne reçoivent pas d'eau ici.

Ce qui reste est l'eau de la ferme elle-même : abreuvement, nettoyage, et prairies et fourrages irrigués, que les bilans alimentaires ne comptent pas comme cultures. Le bœuf garde 800 000 L/t dans les pays à revenu élevé et 1 260 000 ailleurs, le lait 538 000 et 583 000, le porc 531 000 et 700 000, les œufs 85 000 et 130 000, et la volaille rien, car ses aliments représentent toute la valeur de l'étude.

**Œufs.** HESTIA a des agrégations d'œufs pour le Canada et les États-Unis, à 8,5 et 23 L/kg, bien en dessous des 578 L/kg de l'étude. Elles n'ont pas de lignes d'aliments : elles comptent l'eau de la ferme elle-même, le périmètre retenu ici. Elles sont gardées au niveau 1 pour ces deux pays. La valeur de l'étude moins ses aliments est plus grande (85–130 L/kg) : les œufs des autres pays sont peut-être comptés haut.

### Pisciculture

Les produits de la mer valent 0. Les piscicultures d'eau douce prélèvent de l'eau pour remplir et compléter leurs bassins. Poore & Nemecek comptent cette eau, environ 3 700 L/kg de poisson d'élevage. Les postes de produits de la mer du modèle mêlent poissons sauvages et d'élevage, d'eau douce et de mer, si bien qu'ils sont laissés de côté (voir [Limites](#method-limitations)).

## Couverture

Avec la version v1.3 :

- HESTIA donne le niveau 1 pour 35 produits dans 56 pays (230 cases produit × pays), et le niveau 2, moyennes mondiales, pour 15 produits : blé, maïs, riz, pommes de terre, canne à sucre, betterave sucrière, fruits à coque, arachides, soja, tournesol, colza et moutarde, olives, autres légumes, raisins et autres fruits.
- Poore & Nemecek donnent le niveau 4 pour 26 produits, dont la viande bovine, ovine et caprine, le porc, la volaille, le lait, les œufs, l'avoine, le seigle, les légumineuses, le manioc, les agrumes, les bananes, les pommes, le café et le cacao.
- Les substituts et les produits transformés (niveau 5) couvrent l'essentiel du reste : huiles, sucre, beurre et autres produits laitiers, bière et spiritueux, et les cultures sans valeur propre. Le niveau 6 sert pour 366 cases.

Sur les 2 812 km³ annuels du monde, les pays de HESTIA en donnent 1 364, les moyennes mondiales de HESTIA 294, Poore & Nemecek 783 et les substituts et produits transformés 321 ; les tourteaux en représentent 49.

**Soja brésilien.** Dans la v1.2, HESTIA ne donnait presque aucun prélèvement (0,000656 L/kg) mais 255 L éq de consommation pondérée par la rareté. Dans la v1.3, celle-ci vaut 18,9 L éq, en accord avec les prélèvements : 0,00078 L/kg à la ferme, plausible pour un soja pluvial, et environ 7 L/kg pour fabriquer les intrants.

## Comparaison avec AQUASTAT

La construction compare les totaux aux prélèvements agricoles d'AQUASTAT, dans son journal : les prélèvements totaux multipliés par la part de l'agriculture, tels que les sert la Banque mondiale (indicateurs `ER.H2O.FWTL.K3` et `ER.H2O.FWAG.ZS`, 2022). La construction n'échoue jamais sur cette comparaison.

Les 2 812 km³ annuels du monde font 1,03 fois les 2 736 km³ d'AQUASTAT. Les pays diffèrent davantage : le pays médian fait 1,7 fois son chiffre AQUASTAT. La Chine donne 612 km³ contre 353, l'Inde 552 contre 585, le Pakistan 163 contre 168, les États-Unis 123 contre 176, le Viet Nam 80 contre 78 et l'Indonésie 79 contre 190. Le Bangladesh donne 185 km³ contre 32 : l'agrégation HESTIA de son riz inondé prélève 2 680 L/kg de paddy, plus du double de celle de l'Inde (1 110), et le riz est l'essentiel de ce qu'il cultive. Après le Bangladesh, les pays les moins fiables sont ceux dont les cultures prennent des moyennes mondiales, et donc l'irrigation du monde.

L'agriculture d'AQUASTAT compte aussi l'aquaculture et l'irrigation des cultures non alimentaires, que le modèle laisse de côté. Le modèle compte l'eau de fabrication des intrants, qu'AQUASTAT range dans l'industrie.

## Consommation d'eau pondérée par la rareté

Un litre prélevé là où l'eau est rare pèse plus qu'un litre là où elle abonde. HESTIA pondère chaque litre consommé par le facteur AWARE 2.0 du lieu où il est utilisé (`scarcityWeightedWaterUse`, méthode `aware2-0`), en litres-équivalent (L éq). Planetshift ne le garde que là où un pays a sa propre agrégation HESTIA d'une culture : les facteurs AWARE sont locaux, et une moyenne mondiale appliquée à un pays n'aurait pas de sens. Cela couvre 228 cases produit × pays dans 55 pays, cultures seulement.

La carte le montre dans sa propre couche, *Rareté de l'eau (cultures)*. Il ne s'ajoute jamais aux litres prélevés : il compte la consommation, pas les prélèvements, et son unité est pondérée. Les pays ne se comparent pas sur ce chiffre, chacun ne comptant que les cultures que HESTIA y couvre.

## Surface équipée pour l'irrigation

L'infobulle de la couche *Prélèvements d'eau douce* donne la surface équipée pour l'irrigation de chaque pays, tirée du domaine Utilisation des terres de FAOSTAT (élément 6690, *Surface équipée pour l'irrigation*, l'année de base ou la dernière année avant). Elle n'est donnée que comme repère et n'entre pas dans les litres.

## Ce que fait un changement complet de régime

Un changement complet de régime fait passer les prélèvements mondiaux de 2 811 à 2 736 km³ par an (−2,7 %). Moins d'animaux demandent moins de prairies et de fourrages irrigués, et moins d'aliments. Les aliments végétaux qui les remplacent en compensent une partie, le riz et les légumineuses surtout, irrigués dans les pays qui en produisent le plus. Les États-Unis prélèvent 58 km³ de moins et le Brésil 34 km³ de moins. Le Bangladesh prélève 85 km³ de plus, l'Inde 11 et le Pakistan 21. La consommation pondérée par la rareté des cultures que couvre HESTIA augmente, car davantage de cultures de remplacement poussent là où l'eau est rare.

## Sources

- HESTIA, évaluations d'impact agrégées, version v1.3 : `freshwaterWithdrawalsDuringCycle`, `freshwaterWithdrawalsInputsProduction` et `scarcityWeightedWaterUse` ([hestia.earth/guide](https://www.hestia.earth/guide/freshwaterWithdrawalsDuringCycle)). Licence : CC BY 4.0.
- Poore & Nemecek (2018), *Reducing food's environmental impacts through producers and consumers*, Science 360, 987–992, [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216), via Our World in Data, *Freshwater withdrawals per kilogram of food product* ([ourworldindata.org](https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore)) et *Food: greenhouse gas emissions across the supply chain*. Licence : CC BY 4.0.
- Boulay et al. (2018), *The WULCA consensus characterization model for water scarcity footprints: assessing impacts of water consumption based on available water remaining (AWARE)*, International Journal of Life Cycle Assessment 23, 368–378, [doi:10.1007/s11367-017-1333-8](https://doi.org/10.1007/s11367-017-1333-8), tel que HESTIA applique AWARE 2.0.
- FAOSTAT, Utilisation des terres (RL) : surface équipée pour l'irrigation, [fao.org/faostat](https://www.fao.org/faostat/fr/#data/RL). Licence : CC BY 4.0.
- FAO AQUASTAT, prélèvements d'eau totaux et agricoles, via les Indicateurs du développement dans le monde de la Banque mondiale ([data.worldbank.org](https://data.worldbank.org/indicator/ER.H2O.FWAG.ZS)). Licence : CC BY 4.0. Utilisé seulement pour la comparaison du journal.
