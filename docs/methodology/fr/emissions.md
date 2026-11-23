# Émissions par tonne d'aliment

Pour traduire un changement de production en changement d'émissions, Planetshift a besoin, pour chaque pays et chaque produit alimentaire, des kilogrammes de dioxyde de carbone (CO₂), de méthane (CH₄) et de protoxyde d'azote (N₂O) émis par tonne produite. Ce sont les intensités d'émission de `intensities.json`. Les gaz restent séparés jusqu'au modèle climatique. Cette page explique d'où vient chaque intensité, ce qu'elle couvre et comment les manques sont comblés. Le code est `pipeline/planetshift_pipeline/intensities.py` ; ses tables sont `pipeline/qcl_items.csv` et `pipeline/proxies.csv`.

## Deux périmètres

- **À la ferme** (par défaut) : les émissions des processus biologiques de la ferme : fermentation entérique dans l'estomac des ruminants, gestion des effluents, effluents laissés au pâturage et épandus sur les champs, engrais de synthèse, résidus de culture, rizières et brûlage des résidus.
- **Du berceau à la sortie de ferme** : les mêmes, plus l'énergie utilisée sur la ferme (carburant et électricité) et la fabrication des engrais et des pesticides.

Aucun des deux ne comprend le changement d'usage des terres, les sols organiques drainés, ni rien de ce qui suit la ferme (transformation, transport, distribution, cuisine, gaspillage).

## Pourquoi les intensités animales excluent l'alimentation animale

Le modèle retire l'alimentation des animaux qui ne sont plus élevés par les cultures : moins d'animaux, c'est moins de maïs, de soja et d'orge cultivés (voir la page sur l'alimentation animale), et chaque culture porte ses propres émissions. Si l'intensité d'un produit animal comprenait aussi les émissions de la culture de ses aliments, ces émissions seraient comptées deux fois, une fois sur l'animal et une fois sur les cultures. L'intensité d'un animal ne couvre donc que ce qui se passe dans l'élevage : méthane entérique, effluents, et engrais épandus sur les prairies (l'herbe n'est pas une culture des bilans alimentaires). Les émissions de FAOSTAT sont déjà réparties ainsi ; les pages HESTIA et données ACV publiées expliquent comment leurs valeurs excluent l'alimentation animale. Les poissons d'élevage suivent la même règle : leur intensité est celle de l'eau et de l'énergie de l'élevage, et leurs aliments sont comptés sur les cultures et les poissons dont ils sont faits.

## Poissons et fruits de mer

Les émissions de FAOSTAT ne couvrent ni la pêche ni l'aquaculture, et HESTIA n'a pas d'agrégations aquatiques : les produits de la mer sont donc fixés au niveau 4, d'après Parker et al. (2018) pour le carburant de la pêche et MacLeod et al. (2020) pour le N₂O de l'eau et l'énergie de l'aquaculture, mélangés selon la pêche et l'aquaculture de chaque groupe d'espèces dans chaque pays d'après FishStat de la FAO ; puis un substitut (niveau 5) ou la médiane du groupe (niveau 6). Le carburant et l'électricité ne comptent que du berceau à la sortie de ferme, comme pour les fermes : les poissons sauvages n'ont donc pas d'émissions à la ferme. La page [Poissons et fruits de mer](#method-seafood) donne la méthode, les facteurs et les vérifications.

## Compter une seule fois les produits transformés

Une tonne de soja triturée en huile apparaît deux fois dans les bilans alimentaires : comme production de soja, et comme production d'huile. La règle est la suivante :

- les émissions d'un produit primaire sont son intensité × (production − transformation) ;
- un produit transformé (huiles végétales, sucre, édulcorants, beurre, crème, vin, bière et autres boissons) porte sa propre intensité, par tonne de sa propre production.

Quand un produit transformé n'a pas d'intensité propre (niveaux 1 à 4 ci-dessous), il prend l'intensité de son produit primaire divisée par le taux d'extraction, c'est-à-dire les tonnes de produit tirées d'une tonne de produit primaire. Une tonne d'huile de soja, tirée de 1 / 0,19 ≈ 5,3 t de soja, porte alors les émissions de ces 5,3 t. Pour le sucre, tiré de la canne et de la betterave, les deux sont pondérées par la quantité de chacune que le pays transforme. Les taux sont dans `proxies.csv` ; la plupart sont le rapport entre la production mondiale 2023 du produit et le produit primaire transformé, de sorte que la part transformée de chaque culture soit comptée sur ses produits une fois, entièrement :

| Produit transformé | Produit primaire et taux (t par t) | Base |
| --- | --- | --- |
| 2541 Sucre non centrifugé | 2536 canne : 0,10 | facteurs de conversion techniques de la FAO |
| 2542 Sucre (équivalent brut) | 2536 canne : 0,11 ; 2537 betterave : 0,16 | bilan mondial 2023 |
| 2543 Autres édulcorants | 2514 maïs : 1,7 | bilan mondial 2023 (la mélasse, un coproduit du sucre, fait partie du produit) |
| 2571 Huile de soja | 2555 soja : 0,19 | bilan mondial 2023 |
| 2572 Huile d'arachide | 2552 arachides : 0,26 | bilan mondial 2023 |
| 2573 Huile de tournesol | 2557 graines de tournesol : 0,44 | bilan mondial 2023 |
| 2574 Huile de colza et de moutarde | 2558 colza : 0,41 | bilan mondial 2023 |
| 2575 Huile de coton | 2559 graines de coton : 0,17 | bilan mondial 2023 |
| 2576 Huile de palmiste | 2562 fruit du palmier à huile : 0,22 | bilan mondial 2023, un dixième du fruit transformé |
| 2577 Huile de palme | 2562 fruit du palmier à huile : 0,23 | bilan mondial 2023, neuf dixièmes du fruit transformé |
| 2578 Huile de coco | 2560 noix de coco : 0,13 | bilan mondial 2023 |
| 2579 Huile de sésame | 2561 sésame : 0,46 | bilan mondial 2023 |
| 2580 Huile d'olive | 2563 olives : 0,16 | bilan mondial 2023 |
| 2586 Autres huiles d'oléagineux | 2570 autres oléagineux : 0,35 | facteurs de conversion techniques de la FAO (le rapport mondial dépasse 1 : le produit contient des huiles de graines listées ailleurs) |
| 2655 Vin | 2620 raisin : 0,63 | bilan mondial 2023 |
| 2656 Bière | 2513 orge : 5,8 | bilan mondial 2023 |
| 2657 Boissons fermentées | 2518 sorgho : 4 | facteurs de conversion techniques de la FAO |
| 2658 Boissons alcoolisées | 2514 maïs : 0,9 | facteurs de conversion techniques de la FAO |
| 2740 Beurre, ghee | 2848 lait : 0,056 | bilan mondial 2023, 85 % du lait transformé |
| 2743 Crème | 2848 lait : 0,09 | bilan mondial 2023, 15 % du lait transformé |

Dans les bilans alimentaires actuels, le produit 2562 (« Palmistes ») contient tout le fruit du palmier à huile, dont on presse l'huile de palme et l'huile de palmiste ; les émissions du palmier à huile sont comptées sur lui.

Une huile obtenue ainsi à partir de sa graine partage les émissions de la trituration avec le tourteau selon leur valeur, comme ses terres (voir [Terres](#method-land), `pipeline/oilcakes.csv`) : elle garde la part de l'huile dans la valeur (huile d'arachide 80 %, de coton 66 %, de palmiste 87 %, de coprah 93 %, de sésame 92 %), et le reste, celui du tourteau, est écrit par pays et par oléagineux dans `oilcake` de `intensities.json`, en kg de chaque gaz par an l'année de base. Les huiles de soja, de tournesol, de colza et des autres oléagineux prennent les valeurs de Poore et Nemecek (palier 4), qui partagent déjà la culture avec le tourteau selon leur valeur.

Deux coproduits de la meunerie, l'huile de son de riz et l'huile de germe de maïs, sont tirés de grain déjà compté en alimentation humaine, et non d'une transformation ; leur intensité est nulle. Les abats comestibles et les graisses animales crues ne sont pas non plus transformés à partir de la viande dans les bilans : ils partagent avec la carcasse les émissions des animaux de boucherie, au prorata de la masse (ci-dessous).

## Niveaux

Chaque combinaison pays × produit × périmètre prend la première valeur disponible dans cet ordre, et enregistre le niveau dont elle vient :

1. **HESTIA, pays** : l'évaluation d'impact agrégée de HESTIA pour le produit dans ce pays (voir la page HESTIA).
2. **HESTIA, région ou monde** : la plus petite région HESTIA contenant le pays, puis le monde.
3. **FAOSTAT, pays** : les émissions FAOSTAT du pays divisées par sa production (ci-dessous).
4. **ACV publiée** : moyennes mondiales de Poore et Nemecek (2018) (voir la page sur les données ACV publiées).
5. **Substitut** : pour un produit transformé, son produit primaire divisé par le taux d'extraction (ci-dessus) ; sinon la valeur de niveau 1 à 4 d'un produit similaire dans le même pays, d'après la liste ci-dessous. Un substitut n'emprunte jamais un autre substitut ni une médiane.
6. **Médiane du groupe** : la médiane, pondérée par la production, sur tous les pays, des valeurs de niveau 1 à 4 des produits du groupe.

Chaque pays du modèle a une valeur pour chaque produit et les deux périmètres, y compris les produits qu'il ne produit pas, pour que le modèle puisse déplacer la production vers n'importe quel pays.

## Niveau 3 : les émissions de FAOSTAT par produit

FAOSTAT estime les émissions agricoles de chaque pays avec les méthodes de niveau 1 du GIEC. Planetshift lit ses propres estimations (source « FAO TIER 1 »), et non les inventaires nationaux à la CCNUCC que FAOSTAT liste aussi pour les mêmes lignes, pour l'année d'émissions la plus proche de l'année de référence (2023).

- **Cultures** (*Emissions from Crops*, GCE) : le méthane des rizières, le N₂O des résidus de culture, et le CH₄ et le N₂O du brûlage des résidus, donnés par culture pour les principales cultures, vont au produit des bilans correspondant par `qcl_items.csv`.
- **Le N₂O des engrais azotés de synthèse** est un total national dans FAOSTAT. Il est réparti entre les cultures en proportion de la surface récoltée de chaque culture × une dose d'azote par hectare pour sa classe de cultures. La dose est la part de la classe dans l'azote utilisé dans le monde selon l'enquête de l'International Fertilizer Association sur l'usage des engrais par culture (Heffer et al., 2017 : blé 18 %, maïs 16 %, riz 16 %, légumes 10 %, fruits 7 %, etc.), divisée par la surface récoltée mondiale de la classe : un hectare de maïs ou de légumes reçoit donc plus qu'un hectare de légumineuses. Les 3,6 % de l'azote que la même enquête trouve épandus sur les prairies vont aux produits des ruminants (bœuf, mouton, autres viandes, lait) en proportion de leur méthane, dans les pays qui ont à la fois des cultures et des ruminants. Les parts conservent le total de chaque pays ; la partie qui tombe sur des cultures non alimentaires (fibres, tabac, caoutchouc, et 85 % du coton-graine, sa fibre) est laissée hors du modèle.
- **Élevage** (*Emissions from Livestock*, GLE) : le CH₄ de la fermentation entérique et de la gestion des effluents, le N₂O de la gestion des effluents, des effluents au pâturage et des effluents épandus, par espèce :
  - vaches laitières : 85 % au lait et 15 % au bœuf, celui des vaches de réforme et des veaux en surplus, une allocation physique proche de la valeur mondiale par défaut de la Fédération internationale de laiterie ;
  - autres bovins : bœuf ;
  - buffles, moutons, chèvres et chameaux : répartis entre lait et viande selon les protéines que produit le cheptel de chaque pays (production FAOSTAT × teneur en protéines), entièrement à la viande là où aucun lait n'est enregistré ;
  - porcs à la viande porcine, poulets de chair, canards et dindes à la volaille, poules pondeuses aux œufs, lamas aux autres viandes ;
  - chevaux, ânes et mulets sont laissés de côté : ils sont surtout gardés pour le travail.
- **Les abats et les graisses animales** partagent les émissions de la viande de chaque pays avec la carcasse, au prorata de la masse : si les abats et les graisses pèsent un dixième de la viande, ils prennent un dixième de ses émissions, et chaque tonne de carcasse, d'abats ou de graisse porte les mêmes émissions.
- **Du berceau à la sortie de ferme** ajoute l'énergie utilisée sur la ferme selon FAOSTAT (répartie entre tous les produits selon leur valeur brute de production), la fabrication des engrais (répartie comme l'azote de synthèse) et la fabrication des pesticides (répartie selon la surface récoltée).

Les émissions de chaque produit sont divisées par sa production dans les bilans alimentaires : par tonne de riz usiné, d'équivalent lait entier, de carcasse. Une intensité plus de 20 fois supérieure à la médiane mondiale du produit pondérée par la production (en équivalent CO₂) signale un décalage entre les émissions de FAOSTAT et la production du bilan, le plus souvent une culture à grande surface et à faible production enregistrée, et n'est pas utilisée (93 valeurs sur environ 5 600, surtout manioc, ignames, bananes plantain, cacao et « autres viandes ») ; la case passe au niveau suivant.

## Combien de cases chaque niveau remplit

Périmètre à la ferme, cases pays × produit, par groupe, pour les 188 pays et 90 produits (le périmètre du berceau à la sortie de ferme est proche). Seuls les poissons et fruits de mer ont besoin du niveau 6 : 278 de leurs 1 504 cases, presque toutes des pays sans littoral qui importent tout leur poisson et dont le bilan contient un produit que FishStat ne leur attribue pas (voir [Poissons et fruits de mer](#method-seafood)). Pour tous les autres produits, les moyennes mondiales publiées du niveau 4 couvrent ce qui n'a pas de substitut.

| Groupe | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| céréales | 44 | 347 | 439 | 354 | 320 | 0 |
| produits laitiers | 0 | 0 | 169 | 19 | 376 | 0 |
| œufs | 0 | 0 | 172 | 16 | 0 | 0 |
| fruits | 31 | 363 | 727 | 947 | 0 | 0 |
| fruits à coque | 3 | 0 | 100 | 85 | 0 | 0 |
| oléagineux | 39 | 722 | 388 | 1225 | 1950 | 0 |
| autres végétaux | 0 | 0 | 155 | 0 | 1349 | 0 |
| viande porcine | 0 | 0 | 285 | 45 | 46 | 0 |
| volaille | 0 | 0 | 168 | 20 | 0 | 0 |
| légumineuses | 16 | 0 | 294 | 254 | 0 | 0 |
| riz | 11 | 0 | 95 | 82 | 0 | 0 |
| racines et tubercules | 8 | 182 | 283 | 109 | 358 | 0 |
| viande de ruminants | 0 | 0 | 540 | 68 | 144 | 0 |
| poissons et fruits de mer | 0 | 0 | 0 | 1018 | 208 | 278 |
| café, cacao et thé | 8 | 0 | 121 | 435 | 0 | 0 |
| plantes sucrières | 12 | 364 | 0 | 188 | 376 | 0 |
| légumes | 12 | 0 | 451 | 101 | 0 | 0 |
| Total | 184 | 1978 | 4387 | 4966 | 5127 | 278 |

Pondérés par les émissions plutôt que par les cases, FAOSTAT (niveau 3) donne les deux tiers des émissions mondiales à la ferme du modèle, HESTIA (niveaux 1 et 2) un cinquième, et les moyennes publiées et les substituts le reste. Les niveaux 4 et 5 remplissent surtout des produits qu'un pays ne produit pas, et des produits transformés.

## Substituts

| Produit | Substituts, dans l'ordre | Pourquoi |
| --- | --- | --- |
| 2511 Blé | 2513 orge, 2515 seigle | une autre céréale tempérée |
| 2513 Orge | 2511 blé, 2516 avoine | une autre céréale tempérée |
| 2514 Maïs | 2518 sorgho, 2511 blé | une autre céréale cultivée avec des intrants semblables |
| 2515 Seigle | 2513 orge, 2511 blé | une autre céréale tempérée |
| 2516 Avoine | 2513 orge, 2511 blé | une autre céréale tempérée |
| 2517 Millet | 2518 sorgho, 2514 maïs | une autre céréale des zones sèches |
| 2518 Sorgho | 2517 millet, 2514 maïs | une autre céréale des zones sèches |
| 2520 Autres céréales | 2513 orge, 2511 blé | surtout triticale, sarrasin et méteil, cultivés comme l'orge |
| 2807 Riz | 2514 maïs, 2511 blé | une autre céréale (sans le méthane des rizières) |
| 2531 Pommes de terre | 2533 patates douces, 2534 autres racines | une autre racine ou tubercule |
| 2532 Manioc | 2535 ignames, 2533 patates douces | une autre racine tropicale |
| 2533 Patates douces | 2531 pommes de terre, 2532 manioc | une autre racine ou tubercule |
| 2534 Autres racines | 2535 ignames, 2531 pommes de terre | taro, yautia et autres tubercules, cultivés comme l'igname |
| 2535 Ignames | 2532 manioc, 2534 autres racines | une autre racine tropicale |
| 2536 Canne à sucre | 2537 betterave sucrière | l'autre plante sucrière |
| 2537 Betterave sucrière | 2536 canne à sucre | l'autre plante sucrière |
| 2546 Haricots | 2547 pois, 2549 autres légumineuses | une autre légumineuse |
| 2547 Pois | 2546 haricots, 2549 autres légumineuses | une autre légumineuse |
| 2549 Autres légumineuses | 2546 haricots, 2547 pois | pois chiches, lentilles et autres légumineuses, cultivées comme les haricots |
| 2551 Fruits à coque | 2625 autres fruits | cultures arboricoles, conduites comme les vergers |
| 2552 Arachides | 2555 soja, 2561 sésame | une autre légumineuse oléagineuse |
| 2555 Soja | 2552 arachides, 2546 haricots | une autre légumineuse |
| 2557 Graines de tournesol | 2558 colza, 2570 autres oléagineux | un autre oléagineux annuel |
| 2558 Colza et moutarde | 2557 tournesol, 2570 autres oléagineux | un autre oléagineux annuel |
| 2559 Graines de coton | 2555 soja, 2557 tournesol | un oléagineux annuel |
| 2560 Noix de coco | 2562 fruit du palmier à huile, 2570 autres oléagineux | une autre culture oléagineuse arboricole tropicale |
| 2561 Sésame | 2552 arachides, 2570 autres oléagineux | un autre petit oléagineux annuel |
| 2562 Fruit du palmier à huile | 2560 noix de coco, 2570 autres oléagineux | une autre culture oléagineuse arboricole tropicale |
| 2563 Olives | 2625 autres fruits, 2560 noix de coco | une culture arboricole |
| 2570 Autres oléagineux | 2557 tournesol, 2558 colza | lin, carthame et autres oléagineux annuels |
| 2601 Tomates | 2605 autres légumes, 2602 oignons | un autre légume |
| 2602 Oignons | 2605 autres légumes, 2601 tomates | un autre légume |
| 2605 Autres légumes | 2601 tomates, 2602 oignons | un autre légume |
| 2611 Oranges, mandarines | 2614 autres agrumes, 2625 autres fruits | un autre agrume |
| 2612 Citrons, limes | 2611 oranges, 2614 autres agrumes | un autre agrume |
| 2613 Pamplemousses | 2611 oranges, 2614 autres agrumes | un autre agrume |
| 2614 Autres agrumes | 2611 oranges, 2625 autres fruits | un autre agrume |
| 2615 Bananes | 2616 bananes plantain, 2625 autres fruits | l'autre banane |
| 2616 Bananes plantain | 2615 bananes, 2625 autres fruits | l'autre banane |
| 2617 Pommes | 2625 autres fruits, 2620 raisin | un autre fruit de verger |
| 2618 Ananas | 2625 autres fruits, 2615 bananes | un autre fruit tropical |
| 2619 Dattes | 2625 autres fruits, 2620 raisin | un autre fruit d'arbre |
| 2620 Raisin | 2625 autres fruits, 2617 pommes | un autre fruit pérenne |
| 2625 Autres fruits | 2617 pommes, 2611 oranges | un autre fruit |
| 2630 Café | 2633 cacao, 2635 thé | une autre culture tropicale de café, cacao ou thé |
| 2633 Fèves de cacao | 2630 café, 2635 thé | une autre culture tropicale de café, cacao ou thé |
| 2635 Thé | 2630 café, 2633 cacao | une autre culture de café, cacao ou thé |
| 2640 Poivre, 2641 Piment de la Jamaïque, 2642 Clous de girofle, 2645 Autres épices | 2605 autres légumes | des épices, cultivées comme des légumes |
| 2731 Viande bovine | 2732 mouton et chèvre, 2735 autres viandes | une autre viande de ruminant |
| 2732 Viande de mouton et de chèvre | 2731 bovine, 2735 autres viandes | une autre viande de ruminant |
| 2733 Viande porcine | 2734 volaille | l'autre viande de monogastrique |
| 2734 Volaille | 2733 viande porcine | l'autre viande de monogastrique |
| 2735 Autres viandes | 2732 mouton et chèvre, 2731 bovine | chameaux, lamas et lapins : d'autres herbivores |
| 2736 Abats | 2731 bovine, 2733 viande porcine | la viande correspondante (les abats de bovins et de porcs dominent) |
| 2737 Graisses animales | 2733 viande porcine, 2731 bovine | la viande correspondante (surtout graisse de porc) |
| 2744 Œufs | 2734 volaille | les mêmes oiseaux et les mêmes aliments |

Le lait n'a pas de substitut : aucun autre produit n'est un équivalent honnête à la tonne, si bien qu'un pays sans valeur prend la médiane des produits laitiers.

## Vérifications par rapport aux totaux de FAOSTAT

`pipeline/tests/test_validation.py` recalcule les émissions mondiales à partir des fichiers produits, intensité × (production − transformation) sommée sur chaque pays et chaque produit, et les compare aux totaux mondiaux de FAOSTAT pour les mêmes processus en 2023 :

| | Planetshift | FAOSTAT | Tolérance |
| --- | --- | --- | --- |
| À la ferme, CH₄ (Mt) | 136,6 | 141,8 | 10 % |
| À la ferme, N₂O (Mt) | 7,69 | 7,26 | 20 % |
| Du berceau à la sortie de ferme, CH₄ (Mt) | 139,1 | 142,3 | 10 % |
| Du berceau à la sortie de ferme, N₂O (Mt) | 7,82 | 7,56 | 20 % |
| Du berceau à la sortie de ferme, CO₂ (Mt) | 1 505 | 1 348 | 50 % |

Le méthane à la ferme reste dans les bilans publiés : la fermentation entérique et les effluents donnent ensemble 112 Mt (102 + 10), les 112 (107–118) Tg par an du Global Methane Budget pour 2010–2019 (Saunois et al., 2025), et le total à la ferme de la FAO pour 2023 est de 8,1 Gt d'équivalent CO₂ avec les sols organiques drainés et l'électricité de la ferme, que Planetshift laisse de côté (FAOSTAT Analytical Brief 115). Le N₂O agricole direct était de 6,1 Mt en 2020 (3,9 Tg N, Tian et al., 2024) ; les 7,7 Mt de Planetshift comprennent aussi les émissions indirectes, comme le total de FAOSTAT.

**Le méthane du riz** est de 22,6 Mt dans le modèle, contre 24,9 Mt dans FAOSTAT pour 2023 et 32 (25–37) Tg dans le Global Methane Budget. L'essentiel de l'écart vient de l'Inde. Son intensité est celle de HESTIA (niveau 1) : 16,7 kg de méthane dû à l'inondation par tonne de paddy, 17,1 kg avec le reste, contre 24,6 kg pour FAOSTAT (5,08 Mt pour 206,7 Mt de paddy). Les deux sont par tonne de paddy, l'unité du riz des bilans : ce n'est donc pas une erreur de conversion ; par hectare, HESTIA donne environ 72 kg de méthane et FAOSTAT environ 106. Le modèle de HESTIA applique l'affinement de 2019 du GIEC aux régimes hydriques et aux amendements de ses données sur le riz indien, FAOSTAT la méthode de niveau 1 du GIEC avec ses propres hypothèses sur les régimes hydriques ; la différence tient à la méthode, et la valeur de HESTIA est gardée comme le niveau le mieux documenté. Avec l'intensité de FAOSTAT pour l'Inde, le total mondial serait d'environ 24,1 Mt.

À partir des seules données de FAOSTAT (niveau 3 partout, avant la fusion des autres niveaux), la répartition retrouve 98 % du méthane à la ferme de FAOSTAT et 96 % de son N₂O ; ce qui manque, ce sont les animaux de travail, les cultures non alimentaires et les pays hors du modèle. Le mélange des niveaux déplace les totaux de quelques pour cent dans un sens ou dans l'autre, car HESTIA et les ACV publiées utilisent d'autres méthodes ; c'est le CO₂ qui diffère le plus, parce que les périmètres de HESTIA comptent du CO₂ (urée, chaux, machines) que FAOSTAT classe ailleurs.

## Émissions par source

Chaque intensité est aussi répartie par source (fermentation entérique, gestion des effluents, riz, engrais de synthèse et organiques, résidus, énergie, fabrication des intrants, autres) dans `breakdown.json`, à partir du même calcul : l'allocation de FAOSTAT ci-dessus garde chaque processus séparé, et les lignes de HESTIA gardent leurs termes d'émission. La page [Pratiques agricoles](#method-practices) explique cette répartition et les pratiques qui l'utilisent.

## Hypothèses

- Les estimations de niveau 1 de FAOSTAT valent pour chaque pays, plutôt que les inventaires propres aux pays.
- L'azote de synthèse est réparti selon la surface × une dose mondiale par classe de cultures ; les doses réelles varient d'un pays à l'autre.
- 3,6 % de l'azote de synthèse de chaque pays va aux prairies, comme dans la moyenne mondiale.
- 85 % des émissions d'un troupeau laitier vont au lait partout.
- Les cheptels mixtes (buffles, moutons, chèvres, chameaux) sont répartis selon les protéines, avec 15 % de protéines dans la viande en carcasse.
- L'énergie est répartie selon la valeur de la production, la fabrication des pesticides selon la surface.
- Les abats et les graisses portent les mêmes émissions par tonne que la carcasse.
- Les taux d'extraction sont des valeurs mondiales, les mêmes dans chaque pays.
- Une intensité plus de 20 fois supérieure à la médiane mondiale du produit est un décalage de données, pas une valeur réelle.
- Les substituts sont des choix de jugement, listés ci-dessus pour être revus.
- Les intensités des produits de la mer sont des valeurs de la littérature mélangées selon la production de chaque pays ; voir [Poissons et fruits de mer](#method-seafood) pour leurs propres hypothèses.

## Sources

- FAOSTAT, Emissions from Crops : <https://www.fao.org/faostat/en/#data/GCE>, CC BY 4.0.
- FAOSTAT, Emissions from Livestock : <https://www.fao.org/faostat/en/#data/GLE>, CC BY 4.0.
- FAOSTAT, Emissions totals : <https://www.fao.org/faostat/en/#data/GT>, CC BY 4.0.
- FAOSTAT, Cultures et produits de l'élevage (surfaces et production) : <https://www.fao.org/faostat/en/#data/QCL>, CC BY 4.0.
- FAOSTAT, Valeur de la production agricole : <https://www.fao.org/faostat/en/#data/QV>, CC BY 4.0.
- FAOSTAT, Bilans alimentaires (production et transformation) : <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Heffer, P., Gruère, A., Roberts, T. (2017). Assessment of Fertilizer Use by Crop at the Global Level 2014–2014/15. International Fertilizer Association et International Plant Nutrition Institute : <https://www.ifastat.org/>.
- Fédération internationale de laiterie (2015). A common carbon footprint approach for the dairy sector. Bulletin of the IDF 479/2015 : <https://fil-idf.org/>.
- FAO, Technical Conversion Factors for Agricultural Commodities : <https://www.fao.org/statistics/en/>.
- GIEC (2006, affinées en 2019). Lignes directrices pour les inventaires nationaux de gaz à effet de serre, volume 4 : <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992 : <https://doi.org/10.1126/science.aaq0216>.
- Saunois, M. et al. (2025). The Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958 : <https://doi.org/10.5194/essd-17-1873-2025>.
- Tian, H. et al. (2024). Global nitrous oxide budget (1980–2020). Earth System Science Data 16, 2543–2604 : <https://doi.org/10.5194/essd-16-2543-2024>.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115 : <https://doi.org/10.4060/cd7300en>.
