# Émissions par tonne d'aliment

Pour traduire un changement de production en changement d'émissions, Planetshift doit savoir ce qu'émet chaque aliment. Pour chaque pays et chaque produit alimentaire, il connaît les kilogrammes de dioxyde de carbone (CO₂), de méthane (CH₄) et de protoxyde d'azote (N₂O) émis par tonne produite : c'est l'intensité d'émission du produit. Les estimations de FAOSTAT donnent les deux tiers des émissions agricoles mondiales du modèle. HESTIA en donne un cinquième, et les moyennes publiées et les valeurs de substitution donnent le reste. Additionnées sur le monde, elles sont proches des totaux de FAOSTAT : 137,7 Mt de méthane par an, contre 142,4 Mt.

Les trois gaz restent séparés jusqu'au modèle climatique.

## Ce qui est compté

L'application propose deux périmètres :

- **À la ferme** (*Processus biologiques seulement* dans l'application) : les émissions des processus biologiques de la ferme. Ce sont la fermentation entérique (le méthane produit dans l'estomac des ruminants pendant la digestion), la gestion des effluents, les effluents laissés au pâturage et épandus sur les champs, les engrais de synthèse, les résidus de culture, les rizières et le brûlage des résidus.
- **Du berceau à la sortie de ferme** (*Avec les intrants*, par défaut) : les mêmes, plus l'énergie utilisée sur la ferme (carburant et électricité) et la fabrication des engrais et des pesticides. Le carburant brûlé sur la ferme est compté ici, quelle que soit la source de l'intensité.

Aucun des deux ne comprend le changement d'usage des terres, les sols organiques drainés, ni rien de ce qui suit la ferme : transformation, transport, distribution, cuisine et gaspillage. Ce qui suit la ferme est compté séparément, dans *Après la ferme* plus bas. La forêt défrichée pour l'agriculture est comptée par le module de déforestation (voir [Déforestation](#method-deforestation)). L'infobulle de la couche Émissions de la carte montre les émissions après la ferme et le CO₂ du défrichement, à côté des émissions de la ferme. Les sols organiques drainés sont laissés de côté.

## Pourquoi les produits animaux excluent leur alimentation

Quand moins d'animaux sont élevés, le modèle retire leur alimentation par les cultures : on cultive moins de maïs, de soja et d'orge (voir [Alimentation animale](#method-feed)), et chaque culture porte ses propres émissions. Si l'intensité d'un produit animal comprenait aussi les émissions de la culture de ses aliments, ces émissions seraient comptées deux fois, une fois sur l'animal et une fois sur les cultures.

L'intensité d'un animal ne couvre donc que ce qui se passe dans l'élevage : le méthane entérique, les effluents, et les engrais épandus sur les prairies. L'herbe n'est pas une culture des bilans alimentaires : ses engrais restent donc sur les animaux.

Les émissions de FAOSTAT sont déjà réparties ainsi. Les pages [HESTIA](#method-hestia) et [données ACV publiées](#method-literature) expliquent comment leurs valeurs excluent l'alimentation animale. Les poissons d'élevage suivent la même règle : leur intensité est celle de l'eau et de l'énergie de l'élevage, et leurs aliments sont comptés sur les cultures et les poissons dont ils sont faits.

## D'où vient chaque valeur

Chaque valeur est tirée de la meilleure source disponible. Pour chaque pays, produit et périmètre, Planetshift prend la première valeur qu'il trouve dans l'ordre suivant, par niveaux, et enregistre le niveau dont elle vient :

1. **HESTIA, pays** : l'évaluation d'impact agrégée de HESTIA pour le produit dans ce pays (voir [HESTIA](#method-hestia)).
2. **HESTIA, région ou monde** : la plus petite région HESTIA contenant le pays, puis le monde.
3. **FAOSTAT, pays** : les émissions de FAOSTAT pour le pays, divisées par sa production (voir *Niveau 3* plus bas).
4. **ACV publiée** : les moyennes mondiales de Poore et Nemecek (2018), une étude d'analyse du cycle de vie (ACV) (voir [Données ACV publiées](#method-literature)).
5. **Substitut** : une valeur de remplacement. Pour un produit transformé, c'est la valeur de son produit primaire divisée par le taux d'extraction (voir *Les produits transformés* plus bas). Sinon, c'est la valeur de niveau 1 à 4 d'un produit similaire dans le même pays, d'après la liste de la partie *Substituts* plus bas. Un substitut n'est jamais pris d'un autre substitut ni d'une médiane.
6. **Médiane du groupe** : la médiane, pondérée par la production, sur tous les pays, des valeurs de niveau 1 à 4 des produits du groupe.

Chaque pays du modèle a une valeur pour chaque produit et pour les deux périmètres, y compris pour les produits qu'il ne produit pas. Le modèle peut ainsi déplacer la production vers n'importe quel pays.

### Combien de cases chaque niveau remplit

Le tableau compte les cases pays × produit du périmètre à la ferme que remplit chaque niveau, par groupe, pour les 187 pays et 90 produits. Le périmètre du berceau à la sortie de ferme est proche.

Seuls les poissons et fruits de mer ont besoin du niveau 6 : 272 de leurs 1 496 cases. Ce sont presque toutes des pays sans littoral qui importent tout leur poisson. Leur bilan contient un produit que FishStat ne liste pas pour eux (voir [Poissons et fruits de mer](#method-seafood)). Pour tous les autres produits, les moyennes mondiales publiées du niveau 4 couvrent ce qui n'a pas de substitut.

| Groupe | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| céréales | 69 | 328 | 431 | 351 | 317 | 0 |
| produits laitiers | 0 | 0 | 171 | 16 | 374 | 0 |
| œufs | 2 | 0 | 170 | 15 | 0 | 0 |
| fruits | 37 | 358 | 650 | 1012 | 0 | 0 |
| fruits à coque | 4 | 183 | 0 | 0 | 0 | 0 |
| oléagineux | 50 | 891 | 327 | 1215 | 1818 | 0 |
| autres végétaux | 0 | 0 | 154 | 0 | 1342 | 0 |
| viande porcine | 0 | 0 | 285 | 47 | 42 | 0 |
| volaille | 0 | 0 | 167 | 20 | 0 | 0 |
| légumineuses | 28 | 0 | 287 | 246 | 0 | 0 |
| riz | 13 | 174 | 0 | 0 | 0 | 0 |
| racines et tubercules | 16 | 177 | 286 | 110 | 346 | 0 |
| viande de ruminants | 0 | 0 | 542 | 64 | 142 | 0 |
| poissons et fruits de mer | 0 | 0 | 0 | 1014 | 210 | 272 |
| café, cacao et thé | 9 | 0 | 123 | 429 | 0 | 0 |
| plantes sucrières | 14 | 360 | 0 | 187 | 374 | 0 |
| légumes | 19 | 180 | 271 | 91 | 0 | 0 |
| Total | 261 | 2651 | 3864 | 4817 | 4965 | 272 |

Pondérés par les émissions plutôt que par les cases, FAOSTAT (niveau 3) donne les deux tiers des émissions mondiales à la ferme du modèle, HESTIA (niveaux 1 et 2) un cinquième, et les moyennes publiées et les substituts le reste. Les niveaux 4 et 5 remplissent surtout des produits qu'un pays ne produit pas, et des produits transformés.

## Niveau 3 : les émissions de FAOSTAT par produit

FAOSTAT estime les émissions agricoles de chaque pays avec les méthodes de niveau 1 du GIEC, ses méthodes par défaut les plus simples. FAOSTAT liste aussi, pour les mêmes lignes, les inventaires nationaux déclarés par les pays à la CCNUCC. Planetshift lit les estimations propres de FAOSTAT (source « FAO TIER 1 »), pour l'année d'émissions la plus proche de l'année de référence (2024).

FAOSTAT donne la plupart des émissions par culture ou par espèce animale. Planetshift les répartit entre les produits alimentaires comme suit.

### Cultures

Le domaine *Emissions from Crops* (GCE) donne le méthane des rizières, le N₂O des résidus de culture, et le CH₄ et le N₂O du brûlage des résidus, par culture pour les principales cultures. Chacun va au produit des bilans correspondant par `qcl_items.csv`.

### Engrais de synthèse

Le N₂O des engrais azotés de synthèse est un total national dans FAOSTAT. Planetshift le répartit entre les cultures en proportion de la surface récoltée de chaque culture × une dose d'azote par hectare pour sa classe de cultures. Un hectare de maïs ou de légumes reçoit donc plus qu'un hectare de légumineuses.

La dose vient de l'enquête de l'International Fertilizer Association sur l'usage des engrais par culture (Heffer et al., 2017). C'est la part de la classe dans l'azote utilisé dans le monde (blé 18 %, maïs 18 %, riz 15 %, légumes 7 %, fruits 6 %, etc. : les parts mondiales d'azote de son annexe 2), divisée par la surface récoltée mondiale de la classe.

La même enquête trouve 4,7 % de l'azote épandus sur les prairies. Cette part va aux produits des ruminants (bœuf, mouton, autres viandes, lait) en proportion de leur méthane, dans les pays qui ont à la fois des cultures et des ruminants.

La somme des parts est égale au total de chaque pays. La partie qui tombe sur des cultures non alimentaires est laissée hors du modèle : les fibres, le tabac, le caoutchouc, et 85 % du coton-graine (sa fibre).

### Élevage

Le domaine *Emissions from Livestock* (GLE) donne, par espèce, le CH₄ de la fermentation entérique et de la gestion des effluents, et le N₂O de la gestion des effluents, des effluents au pâturage et des effluents épandus. Il va aux produits comme suit :

- **Vaches laitières** : 85 % au lait et 15 % au bœuf, celui des vaches de réforme et des veaux en surplus. C'est une allocation physique, comme le demande la norme de la Fédération internationale de laiterie ; son exemple chiffré donne 85,1 % pour une ferme, mais la norme ne fixe aucune valeur mondiale par défaut.
- **Autres bovins** : le bœuf, moins les animaux qui ne sont pas élevés pour l'alimentation (voir plus bas).
- **Buffles, moutons, chèvres et chameaux** : répartis entre lait et viande selon les protéines que produit le cheptel de chaque pays (production FAOSTAT × teneur en protéines). Là où aucun lait n'est enregistré, tout va à la viande. Pour les buffles, les animaux qui ne sont pas élevés pour l'alimentation sont d'abord retirés.
- Les **porcs** vont à la viande porcine, les **poulets de chair, canards et dindes** à la volaille, les **poules pondeuses** aux œufs, et les **lamas** aux autres viandes.
- **Chevaux, ânes et mulets** sont surtout gardés pour le travail. Leurs émissions ne sont sur aucun produit (voir plus bas).

**Les abats et les graisses animales** partagent les émissions de la viande de chaque pays avec la carcasse, au prorata de la masse. Si les abats et les graisses pèsent un dixième de la viande, ils prennent un dixième de ses émissions. Chaque tonne de carcasse, d'abats ou de graisse porte alors les mêmes émissions.

### Du berceau à la sortie de ferme

Ce périmètre ajoute trois sources de FAOSTAT :

- l'énergie utilisée sur la ferme, répartie entre tous les produits selon leur valeur brute de production ;
- la fabrication des engrais, répartie comme l'azote de synthèse ;
- la fabrication des pesticides, répartie selon la surface récoltée.

### Des émissions aux intensités

Les émissions de chaque produit sont divisées par sa production dans les bilans alimentaires : par tonne de riz usiné, d'équivalent lait entier ou de carcasse.

Certaines intensités dépassent 20 fois la médiane mondiale du produit pondérée par la production (en équivalent CO₂). Une telle valeur signale un décalage entre les émissions de FAOSTAT et la production du bilan. Les émissions sont rapportées à une faible production enregistrée. La valeur n'est pas utilisée, et la case passe au niveau suivant. Cela concerne 73 valeurs sur environ 5 600, surtout les « autres viandes » et la viande porcine.

## Les produits transformés comptés une seule fois

Une tonne de soja triturée en huile apparaît deux fois dans les bilans alimentaires : comme production de soja, et comme production d'huile. Pour ne compter ses émissions qu'une fois, Planetshift applique cette règle :

- les émissions d'un produit primaire sont son intensité × (production − transformation) ;
- un produit transformé porte sa propre intensité, par tonne de sa propre production. Les produits transformés sont les huiles végétales, le sucre, les édulcorants, le beurre, la crème, le vin, la bière et les autres boissons.

### Les produits transformés sans valeur propre

Certains produits transformés n'ont pas d'intensité des niveaux 1 à 4. Ils prennent l'intensité de leur produit primaire divisée par le taux d'extraction, c'est-à-dire les tonnes de produit tirées d'une tonne de produit primaire. Une tonne d'huile de soja est tirée de 1 / 0,19 ≈ 5,3 t de soja : elle porte donc les émissions de ces 5,3 t. Le sucre est tiré de la canne et de la betterave, et les deux sont pondérées par la quantité de chacune que le pays transforme.

Les taux sont dans `proxies.csv`. La plupart sont le rapport entre la production mondiale 2023 du produit et le produit primaire transformé. La part transformée de chaque culture est alors comptée une fois, entièrement, sur ses produits.

| Produit transformé | Produit primaire et taux (t par t) | Base |
| --- | --- | --- |
| 2541 Sucre non centrifugé | 2536 canne : 0,09 | facteurs de conversion techniques de la FAO (Inde, premier producteur) |
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
| 2586 Autres huiles d'oléagineux | 2570 autres oléagineux : 0,35 | facteurs de conversion techniques de la FAO, lin et carthame (le rapport mondial dépasse 1 : le produit contient des huiles de graines listées ailleurs) |
| 2655 Vin | 2620 raisin : 0,63 | bilan mondial 2023 |
| 2656 Bière | 2513 orge : 5,8 | bilan mondial 2023 |
| 2657 Boissons fermentées | 2518 sorgho : 4 | hypothèse (les facteurs de conversion techniques de la FAO n'en donnent aucun pour les boissons) |
| 2658 Boissons alcoolisées | 2514 maïs : 0,9 | hypothèse (les facteurs de conversion techniques de la FAO n'en donnent aucun pour les boissons) |
| 2740 Beurre, ghee | 2848 lait : 0,056 | bilan mondial 2023, 85 % du lait transformé |
| 2743 Crème | 2848 lait : 0,09 | bilan mondial 2023, 15 % du lait transformé |

Dans les bilans alimentaires actuels, le produit 2562 (« Palmistes ») contient tout le fruit du palmier à huile, dont on presse l'huile de palme et l'huile de palmiste. Les émissions du palmier à huile sont comptées sur lui.

### Les huiles et leur tourteau

Triturer une graine oléagineuse donne de l'huile et du tourteau (la farine donnée aux animaux). Une huile dont l'intensité est obtenue ainsi partage les émissions de la trituration avec le tourteau selon leur valeur, comme ses terres (voir [Terres](#method-land), `pipeline/oilcakes.csv`). L'huile garde sa part de la valeur : huile d'arachide 80 %, de coton 66 %, de palmiste 87 %, de coprah 93 %, de sésame 92 %.

Le reste est la part du tourteau. Elle est écrite par pays et par oléagineux dans `oilcake` de `intensities.json`, en kg de chaque gaz par an l'année de référence. Les huiles de soja, de tournesol, de colza et des autres oléagineux prennent les valeurs de Poore et Nemecek (niveau 4), qui partagent déjà la culture avec le tourteau selon leur valeur. La part de leur tourteau est aussi écrite dans `oilcake`.

Le modèle ajoute les émissions des tourteaux aux émissions agricoles de chaque pays. Le modèle fait varier les émissions des tourteaux comme les terres du tourteau : avec la production des groupes animaux qui le mangent. Un régime avec moins d'animaux les supprime donc. Une pratique agricole les réduit comme elle réduit l'intensité de l'oléagineux lui-même.

### Les coproduits sans émissions propres

Deux coproduits de la meunerie, l'huile de son de riz et l'huile de germe de maïs, sont tirés de grain déjà compté en alimentation humaine, et non d'une transformation. Leur intensité est nulle.

Les abats comestibles et les graisses animales crues ne sont pas non plus transformés à partir de la viande dans les bilans. Ils partagent avec la carcasse les émissions des animaux de boucherie, au prorata de la masse (voir *Élevage* plus haut).

## Poissons et fruits de mer

Les émissions de FAOSTAT ne couvrent ni la pêche ni l'aquaculture, et HESTIA n'a pas d'agrégations aquatiques. Les produits de la mer sont donc fixés au niveau 4 d'après deux études : Parker et al. (2018) pour le carburant de la pêche, et MacLeod et al. (2020) pour le N₂O de l'eau et l'énergie de l'aquaculture. Les deux sont combinées selon la pêche et l'aquaculture de chaque groupe d'espèces dans chaque pays, d'après FishStat de la FAO. Quand ce mélange n'est pas possible, un produit prend un substitut (niveau 5) ou la médiane du groupe (niveau 6).

Le carburant et l'électricité ne comptent que dans le périmètre du berceau à la sortie de ferme, comme pour les fermes. Les poissons sauvages n'ont donc pas d'émissions à la ferme. La page [Poissons et fruits de mer](#method-seafood) donne la méthode, les facteurs et les vérifications.

## Les animaux qui ne sont pas élevés pour l'alimentation

Certains animaux de ferme ne sont pas élevés pour l'alimentation : les bœufs et les buffles gardés pour labourer, les chevaux, les ânes et les mulets gardés pour le travail et le transport, et les bovins gardés pour d'autres raisons, comme la plupart de ceux de l'Inde. Leurs émissions restent dans les émissions agricoles de chaque pays, mais aucun produit ne les porte et aucun levier ne les change. Un changement de 100 % les laisse en place.

Elles sont écrites par pays dans `nonFood` de `intensities.json`. Elles s'élèvent à 211 Mt CO₂e par an l'année de référence, dont 113 Mt en Inde, puis le Niger (18), le Brésil (9), le Mexique (8) et l'Éthiopie (7).

### Comment on les repère

La part vient des données d'élevage et de commerce de FAOSTAT (CC BY 4.0), par espèce. Au sein d'une espèce, chaque tête émet autant : un animal qui n'est pas élevé pour l'alimentation prend les émissions par tête de l'espèce dans son pays.

- **Chevaux, ânes et mulets** : toutes leurs émissions, 70 Mt CO₂e. Certains chevaux sont mangés, mais les troupeaux sont surtout gardés pour le travail. Ils font l'essentiel de la base du Brésil, du Mexique, de l'Éthiopie et des États-Unis.
- **Bovins non laitiers et buffles** : un troupeau élevé pour l'alimentation sort chaque année une part de ses têtes, par abattage ou par vente. Cette part s'appelle le taux d'exploitation. Les animaux gardés pour l'alimentation sont comptés comme ci-dessous, et le reste n'est pas élevé pour l'alimentation. Cela donne 137 Mt CO₂e de bovins et 4 Mt de buffles.
- **Ovins, caprins, chameaux, porcs et volailles** sont tous comptés comme élevés pour l'alimentation.

Pour les bovins non laitiers et les buffles, les têtes gardées pour l'alimentation sont :

- les animaux traits (élément 5318 de QCL). Les vaches laitières de FAOSTAT forment une espèce à part, toute gardée pour l'alimentation ;
- les animaux abattus dans l'année (élément 5320) plus les animaux vivants exportés, nets de ceux importés (produits 866 bovins et 946 buffles de TCL, éléments 5908 et 5608, en têtes), divisés par 6,7 %.

Les exportations nettes ne comptent que si elles sont positives, et un pays sans ligne de commerce n'en compte aucune. Le reste du cheptel (élément 5111 de GLE) n'est pas élevé pour l'alimentation.

### Pourquoi le seuil est de 6,7 %

Otte et Chilonda (2002) ont passé en revue le taux d'exploitation des élevages bovins traditionnels d'Afrique subsaharienne, ceux qui gardent leurs bovins le plus longtemps. Ils le définissent comme la proportion d'animaux vendus ou consommés dans l'année. Ils trouvent une moyenne de 9,9 % (médiane 9 %, de 1,2 à 20 %), 12,0 % dans les systèmes pastoraux et 9,3 % dans les systèmes mixtes (chapitre 5). Par région, la moyenne est de 6,7 % en Afrique australe, 10,8 % en Afrique de l'Ouest, 12,3 % en Afrique de l'Est et 13,6 % en Afrique centrale.

Le modèle prend la plus basse de ces moyennes, les 6,7 % de l'Afrique australe, comme seuil. Seuls les troupeaux nettement en dessous de tout troupeau élevé pour l'alimentation comptent alors comme non élevés pour l'alimentation. Les annexes 6 et 7 de la revue ne donnent le taux d'exploitation de chaque zone que par le nombre d'études, la moyenne, la médiane, le minimum et le maximum, et non étude par étude. On ne peut donc pas en tirer un premier quartile.

Le seuil est un chiffre d'Afrique subsaharienne appliqué à tous les pays. Aucune revue comparable n'a été trouvée pour les autres régions.

L'Inde fait l'essentiel de la base, et ne dépend pas du seuil. FAOSTAT n'enregistre aucun abattage de bovins en Inde : ses 128 millions de bovins non laitiers sont donc tous dans la base, quel que soit le seuil. Le 20e recensement du cheptel de l'Inde compte 192,5 millions de bovins en 2019, dont 74,2 millions de vaches laitières (en lactation ou taries). Il reste 118,3 millions d'autres bovins, dont 47,4 millions de mâles (Department of Animal Husbandry and Dairying, 2019, tableaux 6 et 7). Le recensement ne dit pas à quoi ils servent.

Aucune source nationale n'a été trouvée sur le taux d'exploitation des bovins du Niger. FAOSTAT enregistre des exportations nettes de 36 000 têtes pour le Niger en 2024, et de 301 000 pour le Mali. À 9,9 %, ces exportations faisaient passer leur base de 20,2 et 9,0 Mt à 19,8 et 5,1 Mt. Avec le seuil à 6,7 %, elle est de 18,1 et 1,1 Mt.

### Ce que change le seuil

Le seuil change la base, mais à peine l'effet d'un changement de régime. Un troupeau compté comme non élevé pour l'alimentation est exclu à la fois des émissions des produits et de ce qu'un changement peut éviter. Le tableau donne les résultats d'une construction avec chaque seuil, sur SSP2-4.5 avec les options par défaut mais les processus biologiques seulement (`scope=farmGate`) :

| Seuil de taux d'exploitation | Base hors alimentation, Mt CO₂e | Inde | Niger | Éthiopie | Mali | Changement complet : émissions évitées, Gt CO₂e | Changement complet : réchauffement évité en 2100, °C |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6,7 % (Afrique australe, retenu) | 211 | 113 | 18,1 | 6,9 | 1,1 | 5,17 | 0,281 |
| 9 % (médiane) | 245 | 113 | 19,4 | 26,0 | 4,0 | 5,12 | 0,278 |
| 9,9 % (moyenne) | 257 | 113 | 19,8 | 31,1 | 5,1 | 5,11 | 0,277 |
| 12 % (systèmes pastoraux) | 285 | 113 | 20,4 | 39,9 | 7,1 | 5,08 | 0,275 |

Un demi-changement évite la moitié (de 2,53 à 2,58 Gt CO₂e, de 0,137 à 0,140 °C). La fourchette probable que montre l'application ne couvre que la réponse du climat, pas ce choix.

### Les limites de la règle

- Les exportations d'animaux vivants que FAOSTAT n'enregistre pas ressemblent encore à des animaux qui ne sont pas élevés pour l'alimentation. Le commerce d'animaux vivants à travers le Sahel n'est souvent pas enregistré.
- Les abattages que FAOSTAT n'enregistre pas (les buffles du Brésil) ont le même effet.
- La règle ne détecte pas les animaux de trait d'un pays qui abat aussi beaucoup de bovins.
- Un bœuf de travail et un veau comptent pareil par tête.

Aucun domaine de FAOSTAT ne compte les animaux de trait. La règle n'utilise donc que les cheptels, les animaux traits et abattus, et le commerce d'animaux vivants.

## Après la ferme

Les aliments causent aussi des émissions après avoir quitté la ferme. Ils sont transformés, transportés, emballés et vendus, cuisinés à la maison, puis jetés. *Emissions from pre- and post-production* de FAOSTAT donne le CO₂, le méthane, le N₂O et les gaz fluorés de chacune de ces étapes pour chaque pays, pour sa dernière année. En 2024, les pays du modèle émettent 6,0 Gt CO₂e après la ferme :

| Étape | Mt CO₂e (PRG100) | Partagée entre les aliments selon |
| --- | --- | --- |
| Déchets alimentaires : déchets solides, incinération et eaux usées de l'industrie alimentaire | 1 638 | la masse |
| Cuisine à la maison | 1 506 | la masse |
| Distribution | 1 105 | l'étape de Poore et Nemecek |
| Transport | 566 | l'étape de Poore et Nemecek |
| Transformation | 514 | l'étape de Poore et Nemecek |
| Eaux usées domestiques | 368 | la masse |
| Emballage | 277 | l'étape de Poore et Nemecek |

La fabrication des engrais et celle des pesticides sont laissées de côté, car elles sont déjà comptées du berceau à la sortie de ferme.

**Réfrigérants.** Les réfrigérants qui fuient de la chaîne du froid sont des gaz fluorés. FAOSTAT les donne pour chaque étape en CO₂e, avec le PRG100 de l'AR5. Planetshift les compte comme du HFC-134a, le principal réfrigérant : il ramène le CO₂e de chaque étape en kg de HFC-134a avec son PRG100 de l'AR5, 1 300. Leur réchauffement suit ensuite la réponse propre au HFC-134a, de FaIR ou des formules de l'AR6 (une durée de vie de 14 ans, une efficacité radiative de 0,167 W m⁻² ppb⁻¹). En CO₂e, ils pèsent 1 530 fois le CO₂ (AR6). Ils font l'essentiel des émissions de la distribution dans le tableau ci-dessus. Le modèle ne suit pas la réduction progressive de ces gaz prévue par l'amendement de Kigali. Comme le reste de la chaîne, ils suivent la référence.

**Partagées entre les aliments.** Pour la transformation, le transport, l'emballage et la distribution, la part de chaque aliment dans le total de son pays est sa production multipliée par les émissions par kg de cet aliment à cette étape selon Poore et Nemecek (2018). Our World in Data publie ces chiffres (CC BY 4.0). À la transformation, le bœuf a 1,81 kg CO₂e par kg et le blé 0,21. `pipeline/chain_items.csv` indique, pour chaque aliment, de lequel de leurs 42 aliments il prend les étapes, avec une note quand c'est un substitut (le thé utilise les étapes du café). La cuisine, les déchets alimentaires et les eaux usées sont partagés selon la masse, car les étapes de Poore et Nemecek s'arrêtent à la distribution. Un pays sans chiffres de FAOSTAT utilise ceux de l'ensemble des pays du modèle. Une étape que FAOSTAT laisse vide pour un pays compte pour zéro.

En France, une tonne de bœuf a environ 1,08 t CO₂e après la ferme, et une tonne de blé environ 0,31 t. Pour le bœuf, c'est peu par rapport aux émissions de la ferme. Pour le blé, c'est proche.

**Ce que changent les leviers.** Un changement de production (un changement de régime, moins de gaspillage, moins de pertes) change aussi les émissions après la ferme. Il le fait aliment par aliment, aux chiffres du pays. Comme les émissions de la ferme, elles suivent la référence et montent avec le changement. Elles comptent dans les [causes du réchauffement](#method-link) auxquelles elles appartiennent aujourd'hui : les étapes d'énergie dans *Combustibles fossiles et industrie* ; les déchets alimentaires, les eaux usées et les réfrigérants dans *Autres émissions humaines*. Avec elles, le changement de régime complet évite environ 1,6 Gt CO₂e de plus par an. Une fois les leviers en place, il évite 7,1 Gt en tout, dont 329 kt de HFC-134a, environ 0,5 Gt CO₂e. Il évite 0,36 °C en 2100 au lieu de 0,28 °C.

**Simplifications.** Tout est placé là où l'aliment est produit, comme les émissions de la ferme, bien que les magasins et les cuisines soient là où il est mangé. La cuisine et les déchets alimentaires suivent la masse d'un aliment, si bien qu'une tonne de blé et une tonne de bœuf ont les mêmes émissions à la maison. Moins de gaspillage réduit aussi les émissions de la cuisine des aliments qui ne sont plus gaspillés. Cela surestime un peu la réduction, car les aliments gaspillés ne sont pas toujours cuisinés. L'énergie après la ferme ne devient pas plus propre au fil des années, contrairement au réseau du scénario.

## Empreinte alimentaire par personne

La couche Émissions de la carte compte les émissions là où les aliments sont produits. Son infobulle donne aussi l'*Empreinte alimentaire par personne* : ce qu'émettent par personne et par an les aliments mangés dans le pays. La production par personne paraît élevée dans un pays exportateur et faible dans un pays importateur. L'empreinte repose donc sur ce que les gens mangent.

Pour chaque aliment, l'empreinte d'un pays additionne :

- **Ce qui est mangé** : la disponibilité alimentaire des bilans alimentaires, multipliée par l'offre nécessaire par tonne (pertes, transformation et semences). Le résultat est en tonnes à la ferme, l'unité qu'utilise le changement de régime.
- **D'où il vient** : la part que le pays produit prend l'intensité du pays. La part importée est le rapport des importations à la production et aux importations. La part importée prend l'intensité des pays d'où elle vient. Chaque origine compte selon sa part des importations du pays pour cet aliment dans la matrice détaillée du commerce de FAOSTAT, 2022–2024 (`origins.json`). Les principales origines sont gardées jusqu'à couvrir 95 % des importations, dix au plus, et aucune sous 1 %. Le reste prend l'intensité du monde, c'est-à-dire l'intensité de chaque produit moyennée sur les pays qui le produisent et pondérée par leur production. La matrice enregistre le dernier pays d'où l'aliment a été expédié, si bien qu'un aliment réexporté par les Pays-Bas est traité comme néerlandais. Elle ne couvre pas les poissons et fruits de mer, qui prennent l'intensité du monde.
- **Ce qu'émet une tonne** : les émissions de la ferme dans le périmètre choisi, plus la chaîne après la ferme, plus le CO₂ du défrichement de forêt pour cet aliment dans ce pays.
- **L'alimentation des animaux** : l'intensité d'un produit animal n'inclut pas son alimentation (voir plus haut). L'empreinte ajoute donc les émissions de ce que mange chaque groupe d'animaux par tonne produite. Les cultures fourragères que mangent les animaux d'un pays prennent l'intensité du pays pour la part qu'il produit, et l'intensité de ses importations pour le reste. La part importée d'un produit animal prend l'alimentation par tonne de ses pays d'origine, comme plus haut.
- **Les oléagineux** : la plupart des oléagineux sont triturés en huile et en tourteau, dont 90 % du soja du monde. Le défrichement pour un oléagineux est partagé de la même façon. La part de la récolte mondiale triturée est répartie entre l'huile et le tourteau selon leur valeur : le tourteau en reçoit 63 % pour le soja (`pipeline/oilcakes.csv`). Le reste est laissé sur la graine. Le modèle échange le tourteau et l'huile à l'échelle du monde, si bien que les émissions et le défrichement du tourteau sont mis en commun pour le monde. Les groupes d'animaux se les partagent selon ce qu'ils mangent, par tonne produite. Le défrichement de l'huile est mis en commun par tonne d'huile mangée.

Le total est divisé par la population du pays l'année de référence. Avec les leviers, le changement de régime et la réduction du gaspillage changent les aliments mangés. Les intensités de la ferme suivent les pratiques agricoles. La chaîne après la ferme et le défrichement par tonne ne changent pas.

En CO₂e par personne et par an, l'empreinte est de 2,03 t en France, 2,51 t aux États-Unis, 2,09 t en Chine, 0,92 t en Inde et 4,37 t au Brésil. Les réfrigérants en font 0,05 t en France et 0,15 t aux États-Unis. Au Brésil, le défrichement pour l'agriculture en représente environ la moitié, 2,19 t. En France, il représente 0,04 t. Le bœuf que la France importe vient surtout de ses voisins, les Pays-Bas, l'Irlande et le Royaume-Uni d'abord. Une grande part de son soja arrive en tourteau, qui prend la moyenne du monde. Avec tout le régime changé, l'empreinte de la France tombe à 0,90 t.

Les estimations publiées pour la France sont souvent plus élevées. La raison principale tient aux intensités de la ferme. Celles de Planetshift sont inférieures d'un tiers à la moitié à celles de Poore et Nemecek pour la plupart des aliments (voir *Par kilogramme, face à Poore et Nemecek*), car elles comptent moins de sources. Les sols organiques drainés sont aussi laissés de côté.

## Substituts

Un substitut est la valeur d'un produit similaire dans le même pays, utilisée quand un produit n'a pas de valeur propre des niveaux 1 à 4. Chaque produit essaie ses substituts dans l'ordre :

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

Le lait n'a pas de substitut : aucun autre produit n'est un équivalent honnête à la tonne. Un pays sans valeur pour le lait prend la médiane des produits laitiers.

## Vérifications par rapport aux totaux de FAOSTAT

Un test recalcule les émissions mondiales à partir des fichiers produits, et les compare aux totaux mondiaux de FAOSTAT pour les mêmes processus en 2024. Le méthane est à quelques pour cent près. Le N₂O est plus élevé, et c'est le CO₂ qui diffère le plus, pour les raisons données plus bas.

| | Planetshift, test | FAOSTAT | Tolérance | Planetshift avec les tourteaux, comme les compte l'appli |
| --- | --- | --- | --- | --- |
| À la ferme, CH₄ (Mt) | 137,7 | 142,4 | 10 % | 137,8 |
| À la ferme, N₂O (Mt) | 8,39 | 7,32 | 20 % | 8,53 |
| Du berceau à la sortie de ferme, CH₄ (Mt) | 142,0 | 142,9 | 10 % | 142,4 |
| Du berceau à la sortie de ferme, N₂O (Mt) | 8,71 | 7,61 | 20 % | 8,86 |
| Du berceau à la sortie de ferme, CO₂ (Mt) | 1 881 | 1 322 | 50 % | 1 941 |

### Le calcul de la vérification

`pipeline/tests/test_validation.py` somme intensité × (production − transformation) sur chaque pays et chaque produit, et ajoute les animaux qui ne sont pas élevés pour l'alimentation.

Le test laisse de côté les émissions des tourteaux, que le modèle ajoute aux émissions agricoles de chaque pays (`oilcake` dans `intensities.json`, voir *Les huiles et leur tourteau* plus haut) : 0,16 Mt de méthane, 0,14 Mt de N₂O et 8,5 Mt de CO₂ par an à la ferme, et 0,35 Mt, 0,15 Mt et 60 Mt du berceau à la sortie de ferme. La dernière colonne du tableau les ajoute. Cette colonne donne les émissions mondiales de l'année de référence dans un calcul du modèle sans levier. Sans les tourteaux, ces totaux sont à moins de 0,1 % de ceux du test.

À partir des seules données de FAOSTAT (niveau 3 partout, avant la fusion des autres niveaux), la répartition retrouve 99 % du méthane à la ferme de FAOSTAT et 97 % de son N₂O, avec les animaux qui ne sont pas élevés pour l'alimentation. Ce qui manque, ce sont les cultures non alimentaires et les pays hors du modèle. Le mélange des niveaux déplace les totaux de quelques pour cent dans un sens ou dans l'autre, car HESTIA et les ACV publiées utilisent d'autres méthodes. C'est le CO₂ qui diffère le plus, parce que les périmètres de HESTIA comptent du CO₂ (urée, chaux, machines) que FAOSTAT classe ailleurs.

### Par rapport aux bilans publiés

Le méthane à la ferme reste dans les bilans publiés. La fermentation entérique et la gestion des effluents donnent ensemble 114 Mt : 98 et 9 Mt pour les animaux élevés pour l'alimentation, et 6 Mt pour ceux qui ne le sont pas. Le Global Methane Budget donne 112 (107–118) Tg par an pour 2010–2019 (Saunois et al., 2025).

Le total à la ferme de la FAO pour 2023 est de 8,1 Gt d'équivalent CO₂ (FAOSTAT Analytical Brief 115). Il comprend les sols organiques drainés, que Planetshift laisse de côté, et l'énergie de la ferme, carburant et électricité, que Planetshift ne compte que du berceau à la sortie de ferme.

Le N₂O agricole direct était de 6,1 Mt en 2020 (3,9 Tg N, Tian et al., 2024). Les 8,4 Mt de Planetshift comprennent aussi les émissions indirectes, comme le total de FAOSTAT.

### Le méthane du riz

Le méthane du riz est de 20,8 Mt dans le modèle, contre 25,3 Mt dans FAOSTAT pour 2024 et 32 (25–37) Tg dans le Global Methane Budget. L'essentiel de l'écart vient de l'Inde.

L'intensité de l'Inde est celle de HESTIA (niveau 1) : 16,7 kg de méthane dû à l'inondation par tonne de paddy, et 17,1 kg avec le reste. Celle de FAOSTAT est de 24,5 kg (5,33 Mt pour 217,9 Mt de paddy). Les deux sont par tonne de paddy, l'unité qu'utilisent les bilans pour le riz : l'écart n'est donc pas une erreur de conversion. Par hectare, HESTIA donne environ 72 kg de méthane et FAOSTAT environ 106.

Le modèle de HESTIA applique l'affinement de 2019 du GIEC aux régimes hydriques et aux amendements de ses données sur le riz indien. FAOSTAT applique la méthode de niveau 1 du GIEC avec ses propres hypothèses sur les régimes hydriques. La différence tient à la méthode : le modèle garde donc la valeur de HESTIA, qui est mieux documentée. Avec l'intensité de FAOSTAT pour l'Inde, le total mondial serait d'environ 22,5 Mt.

### Par kilogramme, face à Poore et Nemecek

Our World in Data présente les émissions par kilogramme d'aliment de Poore et Nemecek (2018), réparties par étape de la chaîne. C'est leur étape de la ferme qui se compare aux intensités de Planetshift, qui laissent de côté l'alimentation des animaux (comptée sur les cultures), le changement d'usage des terres et tout ce qui suit la ferme. Moyennes mondiales pondérées par la production, du berceau à la sortie de la ferme, en kg d'équivalent CO₂ par kg :

| Produit | Planetshift | Poore et Nemecek, étape de la ferme |
| --- | --- | --- |
| Bœuf | 24,6 | 21,9 (troupeau laitier) à 56,2 (troupeau allaitant) |
| Viande ovine et caprine | 21,2 | 27,0 |
| Viande de porc | 1,68 | 2,48 |
| Volaille | 0,87 | 0,93 |
| Œufs | 0,77 | 1,32 |
| Lait | 1,18 | 1,51 |
| Riz | 1,17 par kg de paddy, 1,8 par kg de riz blanchi | 3,55 |
| Blé | 0,49 | 0,82 |
| Maïs | 0,37 | 0,72 |
| Pommes de terre | 0,13 | 0,19 |
| Pois | 0,40 | 0,72 |

Planetshift est plus bas pour chaque produit, d'un tiers à la moitié pour la plupart, et le bœuf se situe entre leurs deux troupeaux. Trois différences l'expliquent pour l'essentiel. Planetshift pondère le méthane et le N₂O avec les facteurs de l'AR6 (27 et 273), Poore et Nemecek avec ceux de l'AR5 avec rétroactions climat-carbone (34 et 298). Leurs données sont une méta-analyse d'études des années 2010 environ, celles de Planetshift viennent de la méthode de niveau 1 du GIEC de FAOSTAT et de HESTIA. Et les unités diffèrent : la viande de Planetshift est en poids de carcasse. Le riz est le plus éloigné, pour les raisons données plus haut et parce que leurs émissions des rizières viennent de mesures au champ.

## Émissions par source

Chaque intensité est aussi répartie par source dans `breakdown.json` : fermentation entérique, gestion des effluents, riz, engrais de synthèse et organiques, résidus, carburant, électricité, fabrication des intrants, et autres. La répartition vient du même calcul. L'allocation de FAOSTAT ci-dessus garde chaque processus séparé, et les lignes de HESTIA gardent leurs termes d'émission. La page [Pratiques agricoles](#method-practices) explique cette répartition et les pratiques qui l'utilisent.

## Code et tables

Le code est dans `pipeline/planetshift_pipeline/intensities.py`. Ses tables sont `pipeline/qcl_items.csv` et `pipeline/proxies.csv`. Les intensités sont dans `intensities.json`.

## Hypothèses

- Les estimations de niveau 1 de FAOSTAT valent pour chaque pays, plutôt que les inventaires propres aux pays.
- L'azote de synthèse est réparti selon la surface × une dose mondiale par classe de cultures. Les doses réelles varient d'un pays à l'autre.
- 4,7 % de l'azote de synthèse de chaque pays va aux prairies, comme dans la moyenne mondiale.
- 85 % des émissions d'un troupeau laitier vont au lait partout.
- Les cheptels mixtes (buffles, moutons, chèvres, chameaux) sont répartis selon les protéines, avec 15 % de protéines dans la viande en carcasse.
- L'énergie est répartie selon la valeur de la production, la fabrication des pesticides selon la surface.
- Les abats et les graisses portent les mêmes émissions par tonne que la carcasse.
- Parmi les bovins non laitiers et les buffles d'un pays, deux groupes sont élevés pour l'alimentation : les animaux traits, et les têtes qu'il faut pour fournir ses abattages et ses exportations nettes d'animaux vivants à 6,7 % par an. Le reste, et tous les chevaux, ânes et mulets, ne le sont pas. 6,7 % est le plus bas des taux d'exploitation moyens régionaux des bovins traditionnels d'Afrique subsaharienne, appliqué à tous les pays.
- Au sein d'une espèce, chaque tête d'un pays émet autant, qu'elle soit élevée pour l'alimentation ou non.
- Les taux d'extraction sont des valeurs mondiales, les mêmes dans chaque pays.
- Une intensité plus de 20 fois supérieure à la médiane mondiale du produit est un décalage de données, pas une valeur réelle.
- Les substituts sont des choix de jugement, listés ci-dessus pour être revus.
- Les intensités des produits de la mer sont des valeurs de la littérature combinées selon la production de chaque pays. Voir [Poissons et fruits de mer](#method-seafood) pour leurs propres hypothèses.

## Sources

- FAOSTAT, Emissions from Crops : <https://www.fao.org/faostat/en/#data/GCE>, CC BY 4.0.
- FAOSTAT, Emissions from Livestock : <https://www.fao.org/faostat/en/#data/GLE>, CC BY 4.0.
- FAOSTAT, Emissions totals : <https://www.fao.org/faostat/en/#data/GT>, CC BY 4.0.
- FAOSTAT, Cultures et produits de l'élevage (surfaces et production) : <https://www.fao.org/faostat/en/#data/QCL>, CC BY 4.0.
- FAOSTAT, Valeur de la production agricole : <https://www.fao.org/faostat/en/#data/QV>, CC BY 4.0.
- FAOSTAT, Commerce des cultures et produits de l'élevage (bovins et buffles vivants, en têtes) : <https://www.fao.org/faostat/en/#data/TCL>, CC BY 4.0.
- FAOSTAT, Bilans alimentaires (production et transformation) : <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Otte, M. J., Chilonda, P. (2002). Cattle and Small Ruminant Production Systems in sub-Saharan Africa: A Systematic Review. FAO, Rome : <https://www.fao.org/4/y4176e/y4176e00.htm> ; chapitre 5 : <https://www.fao.org/4/y4176e/y4176e08.htm> ; annexes 6 et 7 : <https://www.fao.org/4/y4176e/y4176e0i.htm>, <https://www.fao.org/4/y4176e/y4176e0j.htm>.
- Department of Animal Husbandry and Dairying, Government of India (2019). 20th Livestock Census 2019: Key Results, tableaux 6 et 7 : <https://static.pib.gov.in/WriteReadData/userfiles/key%20results.pdf>.
- Heffer, P., Gruère, A., Roberts, T. (2017). Assessment of Fertilizer Use by Crop at the Global Level 2014–2014/15. International Fertilizer Association et International Plant Nutrition Institute, annexe 2 : <https://www.fertilizer.org/wp-content/uploads/2023/01/2017_IFA_AgCom_17_134-rev_FUBC-assessment-2014.pdf>.
- Fédération internationale de laiterie (2015). A common carbon footprint approach for the dairy sector. Bulletin of the IDF 479/2015 : <https://fil-idf.org/>.
- Fédération internationale de laiterie (2022). The IDF global Carbon Footprint standard for the dairy sector. Bulletin of the IDF 520/2022, équation 2 et annexe 10.5.
- FAO, Technical Conversion Factors for Agricultural Commodities : <https://www.fao.org/statistics/en/>.
- GIEC (2006, affinées en 2019). Lignes directrices pour les inventaires nationaux de gaz à effet de serre, volume 4 : <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992 : <https://doi.org/10.1126/science.aaq0216>.
- Our World in Data, Food: greenhouse gas emissions across the supply chain (Poore et Nemecek, 2018) : <https://ourworldindata.org/grapher/food-emissions-supply-chain>.
- Saunois, M. et al. (2025). The Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958 : <https://doi.org/10.5194/essd-17-1873-2025>.
- Tian, H. et al. (2024). Global nitrous oxide budget (1980–2020). Earth System Science Data 16, 2543–2604 : <https://doi.org/10.5194/essd-16-2543-2024>.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115 : <https://doi.org/10.4060/cd7300en>.
