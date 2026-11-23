# Hypothèses

Toutes les hypothèses et valeurs de départ de Planetshift, réunies en un seul endroit. Chaque ligne donne la valeur, la raison de ce choix, et la section qui l'explique. Les valeurs signalées comme valeurs de départ sont des choix de jugement à revoir ; la dernière partie de cette page liste ce qui doit être vérifié avant une publication.

## Données et pays

- **Année de référence 2023** : la dernière année dont les bilans alimentaires couvrent au moins 95 % autant de pays que l'année la mieux couverte, pour que le système alimentaire d'aujourd'hui soit le plus récent qui soit presque complet. Voir [Données](#method-data).
- **Le bilan de l'année de référence représente le système alimentaire d'aujourd'hui** : la série actuelle de FAOSTAT (à partir de 2010) telle que publiée ; rien n'est moyenné sur plusieurs années. Voir [Données](#method-data).
- **`other` boucle le bilan de chaque produit** : production + importations − exportations = alimentation humaine + alimentation animale + pertes + transformation + semences + autres, si bien que les variations de stocks et les résidus statistiques sont gardés plutôt que répartis sur les autres utilisations. Voir [Données](#method-data).
- **Les kcal et les protéines par tonne sont des valeurs mondiales** : l'apport alimentaire mondial en kcal et en protéines selon FAOSTAT divisé par l'apport alimentaire mondial en tonnes, pour l'année de référence, le même dans chaque pays. Voir [Données](#method-data).
- **188 pays** : les pays isolés seulement (codes de zone FAOSTAT inférieurs à 5000), sans la somme « Chine » de ses quatre parties et sans les zones qui n'existent plus, pour que rien ne soit compté deux fois. Voir [Données](#method-data).
- **Les pays absents de l'année de référence gardent leur dernière alimentation par personne** : Cuba (2019), la République populaire démocratique de Corée (2018) et dix pays de la série historique qui s'arrête en 2013, chacun mis à l'échelle de la croissance de sa population depuis, plutôt que laissés vides. Voir [Données](#method-data).
- **Les pays sans aucun bilan sont exclus** : dont la Somalie, le Burundi, le Soudan du Sud, Singapour, la Palestine et l'Érythrée. Voir [Données](#method-data).
- **La région d'un pays est sa sous-région M49**, utilisée pour la répartition de l'alimentation animale et les moyennes régionales, comme Natural Earth et FAOSTAT l'utilisent tous deux. Voir [Données](#method-data).
- **Le revenu élevé est la classification de la Banque mondiale pour l'exercice 2027**, pour le scénario des pays à revenu élevé et les rations alimentaires des animaux. Voir [Données](#method-data).
- **La population jusqu'en 2100 est la population annuelle de FAOSTAT**, qui reprend les estimations des Perspectives de la population mondiale des Nations unies et leur projection moyenne. Voir [Données](#method-data).
- **Les projections basse et haute de la population sont celles des WPP 2024**, appliquées à chaque pays sous forme de rapport à la projection moyenne en 2025, en 2030 puis tous les dix ans jusqu'en 2100, avec une interpolation linéaire entre ces années ; l'histoire du monde avant 1950, pour le graphique seulement, est la série de long terme d'Our World in Data. Voir [Options](#method-options).

## Groupes et produits

- **90 produits des bilans alimentaires en 17 groupes**, 6 animaux (viande de ruminants, viande porcine, volaille, produits laitiers, œufs, poissons et fruits de mer) et 11 végétaux, d'après `pipeline/groups.csv`. Voir [Données](#method-data).
- **Le riz est un groupe à part**, pour le méthane de ses rizières. Voir [Données](#method-data).
- **Les « autres viandes » (chameaux, lamas, chevaux, lapins, gibier) sont de la viande de ruminants**, comme viandes d'autres herbivores. Voir [Données](#method-data).
- **Les abats comestibles vont avec la viande de ruminants et les graisses animales crues avec la viande porcine**, leur principale source respective, bien que les deux viennent de plusieurs espèces. Voir [Données](#method-data).
- **Les poissons et fruits de mer sont un groupe animal**, pêche et aquaculture mélangées selon la production de chaque pays dans FishStat ; les plantes aquatiques, les mammifères aquatiques et les huiles de poisson sont laissés de côté. Voir [Poissons et fruits de mer](#method-seafood).
- **Le miel, l'alcool non alimentaire, les aliments pour nourrissons et le produit « divers » sont laissés de côté** : le miel n'a pas d'émissions agricoles dans FAOSTAT et presque pas de protéines ; les autres sont faits de produits déjà comptés. Voir [Données](#method-data).
- **Chaque produit dont la production mondiale dépasse 100 kt a un groupe**, ce qu'un test vérifie. Voir [Données](#method-data).

## Intensités d'émission et les six niveaux

- **Trois gaz, gardés séparés** : kg de CO₂, de CH₄ et de N₂O par tonne de chaque produit, jamais additionnés avant le modèle climatique. Voir [Émissions](#method-emissions).
- **À la ferme par défaut** : les seuls processus biologiques de la ferme ; le périmètre du berceau à la sortie de ferme ajoute l'énergie et la fabrication des engrais et des pesticides. Aucun des deux ne comprend le changement d'usage des terres, les sols organiques drainés ni rien de ce qui suit la ferme. Voir [Émissions](#method-emissions).
- **Les intensités animales excluent l'alimentation animale**, parce que le modèle la retire par les intensités propres des cultures ; la compter aussi sur l'animal la compterait deux fois. Voir [Émissions](#method-emissions).
- **Les émissions d'un produit primaire sont comptées sur la production − la transformation**, et la part transformée sur les produits qui en sont tirés, pour que chaque tonne soit comptée une seule fois. Voir [Émissions](#method-emissions).
- **Un produit transformé sans valeur propre prend l'intensité de son produit primaire divisée par le taux d'extraction**, le plus souvent la production mondiale 2023 du produit rapportée au produit primaire transformé (huile de soja 0,19, sucre 0,11 à partir de la canne et 0,16 à partir de la betterave, beurre 0,056 pour 85 % du lait transformé), le même dans chaque pays. Voir [Émissions](#method-emissions).
- **L'huile de son de riz et l'huile de germe de maïs ne portent pas d'émissions** : elles viennent de grain déjà compté en alimentation humaine. Voir [Émissions](#method-emissions).
- **Six niveaux, du meilleur au moins bon** : HESTIA pour le pays, HESTIA pour sa région ou le monde, FAOSTAT pour le pays, une moyenne mondiale publiée, un substitut, et la médiane mondiale du groupe. Chaque case prend la première valeur disponible. Voir [Émissions](#method-emissions).
- **Chaque pays a une valeur pour chaque produit**, y compris les produits qu'il ne produit pas, pour que la production puisse se déplacer n'importe où. Voir [Émissions](#method-emissions).
- **Version HESTIA v1.2 (2026-04-30), fixée** : la plus récente version publique, si bien que les chiffres ne changent que si la constante change. Voir [HESTIA](#method-hestia).
- **Seulement les agrégations HESTIA validées, la période la plus récente de chaque produit et zone** : HESTIA ne publie pas celles qui ne sont pas validées. Voir [HESTIA](#method-hestia).
- **Les produits HESTIA qui partagent un produit des bilans sont moyennés sans pondération**, la meilleure priorité disponible dans la zone l'emportant. Voir [HESTIA](#method-hestia).
- **Facteurs de conversion HESTIA** : avoine vêtue en gruau 0,7, rendements en carcasse de Poore & Nemecek pour la viande comptée en poids vif (52–55 % pour les bovins et les buffles, 47 % pour les moutons et les chèvres, 75 % pour les porcs, 72 % pour les volailles), 16,7 œufs par kg, lait corrigé en matières grasses et en protéines tenu pour du lait entier. Voir [HESTIA](#method-hestia).
- **Dans les données HESTIA, l'usage des terres, le brûlage de la végétation naturelle, le CO₂ biogénique et le flux naturel de fond de N₂O sont exclus des deux périmètres**, et la production des intrants agricoles (aliments pour animaux, semences, animaux, cultures, aliments transformés) du périmètre du berceau à la sortie de ferme ; les additifs alimentaires et les engrais organiques sont gardés. Voir [HESTIA](#method-hestia).
- **Les agrégations HESTIA des produits transformés ne sont pas utilisées** : elles comptent toute la culture comme une seule entrée d'arrière-plan. Voir [HESTIA](#method-hestia).
- **Les estimations de niveau 1 propres à FAOSTAT, et non les inventaires des pays**, pour l'année d'émissions la plus proche de 2023, pour que chaque pays soit estimé de la même façon. Voir [Émissions](#method-emissions).
- **L'azote de synthèse est réparti selon la surface récoltée × une dose mondiale par classe de cultures**, d'après les parts de l'azote utilisé dans le monde selon Heffer et al. (2017) (blé 18 %, maïs 16 %, riz 16 %, légumes 10 %, fruits 7 %, etc.) ; les doses réelles varient d'un pays à l'autre. Voir [Émissions](#method-emissions).
- **3,6 % de l'azote de synthèse de chaque pays va aux prairies**, attribué aux produits des ruminants en proportion de leur méthane, comme dans la moyenne mondiale de la même enquête. Voir [Émissions](#method-emissions).
- **Les émissions d'un troupeau laitier vont à 85 % au lait et à 15 % au bœuf** partout, une allocation physique proche de la valeur mondiale par défaut de la Fédération internationale de laiterie. Voir [Émissions](#method-emissions).
- **Les cheptels mixtes (buffles, moutons, chèvres, chameaux) sont répartis entre lait et viande selon les protéines**, avec 15 % de protéines dans la viande en carcasse et de 3,2 à 5,5 % dans le lait selon l'espèce. Voir [Émissions](#method-emissions).
- **Les chevaux, les ânes et les mulets sont laissés de côté** : ils sont surtout gardés pour le travail. Voir [Émissions](#method-emissions).
- **Les abats et les graisses animales portent les mêmes émissions par tonne que la carcasse**, partageant les émissions de la viande au prorata de la masse. Voir [Émissions](#method-emissions).
- **L'énergie utilisée sur la ferme est répartie selon la valeur brute de la production, la fabrication des engrais comme l'azote de synthèse, la fabrication des pesticides selon la surface récoltée**, dans le périmètre du berceau à la sortie de ferme. Voir [Émissions](#method-emissions).
- **Une intensité plus de 20 fois supérieure à la médiane mondiale du produit (en CO₂e) est un décalage de données** et passe au niveau suivant (93 valeurs sur environ 5 600). Voir [Émissions](#method-emissions).
- **L'étape agricole de Poore & Nemecek équivaut au berceau à la sortie de ferme sans l'alimentation animale ni le changement d'usage des terres** ; le périmètre à la ferme en est le produit par la part à la ferme de HESTIA pour le même produit, et pour les produits animaux les deux périmètres prennent toute l'étape agricole. Voir [Données ACV publiées](#method-literature).
- **Le CO₂e de Poore & Nemecek est réparti entre les gaz avec un profil de gaz mondial**, celui de HESTIA pour les cultures et celui des émissions de l'élevage à la ferme selon FAOSTAT pour les animaux, et les facteurs de l'AR5 avec rétroactions climat-carbone (34 pour le CH₄, 298 pour le N₂O), comme l'étude les a utilisés ; les produits animaux ne portent pas de CO₂. Voir [Données ACV publiées](#method-literature).
- **Les unités de Poore & Nemecek sont converties vers les bilans actuels** : riz usiné 0,667 du paddy, graines d'arachide 0,7 de l'arachide en coque, sucre brut 0,11 par kg de canne et 0,15 par kg de betterave ; les produits qui partagent un produit des bilans sont pondérés par leur alimentation et leur gaspillage de 2009–11. Voir [Données ACV publiées](#method-literature).
- **Pas de deuxième source de la littérature** : la licence des données de Clune et al. (2017) n'est pas confirmée et Agribalyse ne couvre que la France. Voir [Données ACV publiées](#method-literature).
- **Les substituts sont des choix de jugement**, listés produit par produit pour être revus ; un substitut n'emprunte jamais un autre substitut ni une médiane, et le lait n'en a pas. Voir [Émissions](#method-emissions).
- **La médiane de groupe est pondérée par la production sur les niveaux 1 à 4** ; aucune case n'en a besoin pour l'instant. Voir [Émissions](#method-emissions).
- **Une intensité qui manque dans le périmètre choisi prend celle de l'autre périmètre ; si elle manque dans les deux, le produit n'ajoute rien.** Voir [Options](#method-options).
- **Les intensités par tonne ne changent pas avec la quantité produite.** Voir [Le changement](#method-shift).

## Alimentation animale

- **Seuls les produits des bilans alimentaires sont répartis** : l'herbe, le foin, les résidus de culture et les tourteaux ne sont pas des produits, ils sont donc hors de la répartition, bien que l'herbe et les résidus soient l'essentiel de ce que mangent les ruminants. Voir [Alimentation animale](#method-feed).
- **Par espèce (par défaut) : une seule répartition mondiale pour chaque produit**, viande de ruminants 11 %, produits laitiers 16 %, viande porcine 28 %, volaille 28 %, œufs 17 %, arrondie à partir de GLEAM et de l'enquête de la filière sur les aliments composés ; la répartition d'une région suit ce qu'elle produit. Voir [Alimentation animale](#method-feed).
- **Rations de type GLEAM : aliments concentrés par tonne de produit, revenu élevé / ailleurs** : bœuf 3,0 / 0,8 t, lait 0,35 / 0,12 t, viande porcine 3,3 / 2,5 t, volaille 2,6 / 2,3 t, œufs 2,2 / 2,0 t. Voir [Alimentation animale](#method-feed).
- **Parts des rations par classe d'aliments** : le grain fait 55 à 70 % des concentrés de chaque groupe, les graines oléagineuses 12 à 30 %, le reste étant des légumineuses, des racines, des plantes sucrières et du lait (le lait n'est donné qu'aux bovins et aux porcs), dans l'esprit de GLEAM 2.0, sans copier ses tables. Voir [Alimentation animale](#method-feed).
- **Deux niveaux de revenu représentent les nombreux systèmes de production que GLEAM distingue.** Voir [Alimentation animale](#method-feed).
- **Les produits dont aucune ration ne contient la classe suivent la répartition par espèce.** Voir [Alimentation animale](#method-feed).
- **Une région sans production animale prend les parts mondiales** (aucune pour l'instant). Voir [Alimentation animale](#method-feed).
- **L'alimentation animale baisse en proportion de la production de chaque groupe dans le même pays** ; un groupe qu'un pays n'élève pas n'a pas d'alimentation à perdre. Voir [Le changement](#method-shift).
- **Le lait et le poisson donnés aux animaux changent une fois, avec les animaux qu'ils nourrissent** : le poisson pêché pour la farine est sauvage et ne mange aucun aliment, si bien que sa variation ne change pas de nouveau l'alimentation animale. Voir [Le changement](#method-shift) et [Poissons et fruits de mer](#method-seafood).

## Le changement

- **Les protéines sont maintenues égales par défaut** (les calories en alternative), exactement dans chaque pays ; l'autre nutriment varie. Voir [Le changement](#method-shift).
- **Un changement retire une part des disponibilités alimentaires de chaque groupe animal** ; le mélange des produits au sein d'un groupe ne change pas. Voir [Le changement](#method-shift).
- **Le remplacement se fait par défaut avec le mélange de végétaux riches en protéines propre à chaque pays** (céréales, riz, légumineuses, fruits à coque, oléagineux riches en protéines), si bien que personne n'est censé manger des aliments nouveaux pour lui, et les fruits, les légumes, le sucre, les huiles et les boissons ne sont pas augmentés pour remplacer des protéines qu'ils n'apportent pas. Voir [Le changement](#method-shift).
- **Surtout des légumineuses : 60 % de légumineuses, 20 % de soja, 20 % de céréales**, chaque part étant répartie selon le mélange actuel du pays : une valeur de départ à revoir, qui ne vient pas d'une étude. Voir [Le changement](#method-shift).
- **Boissons soja et avoine : 50 % de soja, 50 % d'avoine**, les deux principales bases des boissons végétales : une valeur de départ à revoir. Voir [Le changement](#method-shift).
- **Une part du mélange qu'un pays ne mange pas suit le mélange mondial** ; une part qu'aucun produit ne remplit est abandonnée et les autres sont augmentées d'autant. Voir [Le changement](#method-shift).
- **Les pertes et les semences sont des parts fixes des disponibilités intérieures de chaque produit** : une tonne d'aliments en plus demande 1 ÷ (1 − cette part) tonnes de disponibilités en plus ; le multiplicateur est plafonné à 3, par précaution contre les lignes aberrantes. Voir [Le changement](#method-shift).
- **La transformation est fixe en tonnes** : un changement de la demande d'un produit transformé change la production de ce produit, et non la culture transformée pour le produire. Voir [Le changement](#method-shift).
- **Parts du commerce fixes (par défaut)** : la variation mondiale d'un produit est répartie entre les pays selon leur part de la production mondiale moins la transformation ; pas de changement dans qui exporte quoi. Voir [Le changement](#method-shift).
- **Chaque pays pour lui-même (alternative)** : chaque pays produit son propre changement dans la limite de sa propre production ; le reste va aux producteurs du monde selon leurs parts. Voir [Le changement](#method-shift).
- **La production ne peut pas descendre sous ce qui est transformé** ; ces cas sont arrêtés là et signalés comme écrêtés. Voir [Le changement](#method-shift).
- **Un produit qu'aucun pays ne produit reste là où il est consommé.** Voir [Le changement](#method-shift).
- **La rampe est linéaire** : 0 l'année en cours, 1 l'année choisie (2035 par défaut, de 2025 à 2050), puis maintenue jusqu'en 2100. Voir [Le changement](#method-shift).
- **La référence est le régime actuel × la population mondiale** par défaut, ou les émissions agricoles de SSP2-4.5 gaz par gaz rapportées à l'année de référence ; la variation due au changement est mise à l'échelle de la même façon. Voir [Le changement](#method-shift).
- **Les émissions évitées affichées sont celles de l'année où le changement est atteint.** Voir [Le changement](#method-shift).
- **La population mondiale est une option de méthode, pas un levier** : la projection moyenne de l'ONU par défaut, ou sa projection basse ou haute ; la référence et le scénario ont la même population, si bien qu'elle n'est jamais comptée comme du réchauffement évité, et avec la trajectoire SSP2 des émissions agricoles elle ne change rien. Voir [Options](#method-options).
- **La population choisie ne change pas le monde du scénario** : les combustibles fossiles, les aérosols et l'usage des terres gardent la population du SSP ; la projection basse avec SSP3-7.0 et la haute avec SSP1-2.6 sont permises, avec une mention. Voir [Options](#method-options).

## Leviers

- **Chaque levier est une part adoptée, de 0 à 100 %, qui monte linéairement** de l'année en cours à l'année *Tous les leviers en place en*, puis se maintient jusqu'en 2100 ; le changement de régime monte de la même façon. Voir [Leviers](#method-levers).
- **La répartition par groupe de leviers est la valeur de Shapley de chaque groupe** sur les groupes actifs, répartie entre les causes par gaz et par source (les émissions agricoles dans l'agriculture ; le défrichement, la repousse et le carbone stocké dans l'usage des terres ; le CO₂ fossile et le forçage de l'aviation dans les combustibles fossiles et l'industrie) ; le panneau classe les causes selon le réchauffement qu'elles causent à l'horizon choisi, et les groupes selon ce que chacun évite seul et en entier. Voir [Leviers](#method-levers).
- **Les pratiques agricoles retirent une part des sources sur lesquelles elles agissent** (`breakdown.json`), soit adoption × la part des émissions qui pourrait les adopter dans chaque pays (un jugement) × une réduction publiée ; les pratiques sur une même source se multiplient. Voir [Pratiques agricoles](#method-practices).
- **Gaspillage et pertes** : le gaspillage après les magasins réduit l'offre alimentaire du levier × la part de gaspillage de chaque pays, les pertes avant les magasins réduisent la part de pertes de chaque produit ; ce que mangent les gens ne change pas. Voir [Pertes et gaspillage](#method-waste).
- **Le CO₂ de la déforestation est un flux constant** qui varie avec la production de chaque produit dans le pays défriché, entre zéro et le double d'aujourd'hui ; le levier arrête sa part du reste. Voir [Déforestation](#method-deforestation).
- **Carbone dans les terres agricoles** : adoption × la plus grande part des terres qu'une pratique peut atteindre × les hectares × le taux du pays, pendant 20 ans à partir de l'adoption de chaque hectare (couverts végétaux, arbres) ou jusqu'en 2100 (biochar, poudre de roche). Voir [Carbone dans les terres agricoles](#method-removals).

## Énergie et transport

- **Les secteurs font partie du CO₂ fossile de chaque SSP, ramené aux inventaires de 2023** : route 6,1 (passagers 60 %, marchandises 40 %), aviation 0,95, transport maritime 0,85 et électricité 14,15 Gt de CO₂ ; un levier retire une part des émissions d'un secteur. Voir [Énergie et transport](#method-sectors).
- **Un véhicule électrique économise son CO₂ d'échappement × (1 − kWh par kg évité × l'intensité du réseau après l'électricité renouvelable)**, 1,11 kWh/kg pour les passagers et 1,47 pour les marchandises, chaque année ; la fabrication des véhicules et des batteries n'est pas comptée. Voir [Énergie et transport](#method-sectors).
- **L'électricité renouvelable réduit le CO₂ du secteur électrique et l'intensité du réseau de la part adoptée** ; l'intensité ne descend jamais sous zéro. Voir [Énergie et transport](#method-sectors).
- **Le forçage de l'aviation hors CO₂ est de 6,44 × 10⁻¹⁴ W/m² par kg par an de CO₂ de l'aviation**, le rapport de 2018, et cesse avec les vols ; moins d'avion le réduit, le carburant propre non. Voir [Énergie et transport](#method-sectors).
- **Moins d'avion et le carburant propre se combinent** : le carburant propre agit sur les vols qui restent. Voir [Énergie et transport](#method-sectors).
- **L'électricité des centres de données de l'IA au-delà de 2024 est ajoutée à la référence par défaut** (cas de base de l'AIE, 785 TWh à partir de 2035, puis constante), à l'intensité du réseau de chaque année ; le levier « Centres de données à l'énergie propre » la retire dans le scénario. Voir [Options](#method-options).
- **La réponse de la température au forçage est celle de FaIR à un forçage solaire sur SSP2-4.5 en 2035**, utilisée pour chaque année et chaque scénario. Voir [Énergie et transport](#method-sectors).
- **Chaque kg de CO₂ fossile retiré à un secteur emporte le méthane, le SO₂, le carbone noir et organique et les NOx de ce secteur selon CEDS en 2022**, de la production de son combustible et de sa combustion, qui évoluent avec les facteurs d'émission du scénario (jamais au-dessus de ceux d'aujourd'hui, figés une fois que le CO₂ du secteur a diminué de moitié) ; l'électricité consommée apporte celle du réseau. L'aviation ne compte que l'approvisionnement de son carburant (le reste est dans son forçage hors CO₂) ; le transport maritime propre garde ses NOx. Voir [Énergie et transport](#method-sectors).
- **Le forçage de la pollution de l'air par kg est celui de FaIR, linéarisé autour des émissions du scénario de chaque année, et un kg de NOx en moins laisse chaque année 0,4 à 4 kg de méthane dans l'air** (durée de vie du méthane de FaIR), mis à l'échelle selon le lieu d'émission (terre 0,69, mer 2,75 en 2023, d'après le rapport de 4,0 entre navires et route de Hoor et al. 2009), en moyenne égal au coefficient de FaIR sur les NOx de chaque année ; les deux comptent dans la *pollution de l'air*, le méthane du combustible dans les *combustibles fossiles et l'industrie*. Voir [Énergie et transport](#method-sectors).
- **Le bas de la fourchette prend le plus d'électricité par kg évité, le moins de forçage hors CO₂ et la plus faible demande des centres de données.** Voir [Leviers](#method-levers).

## Bâtiments et industrie

- **Le CO₂ direct des bâtiments et de l'industrie fait partie du CO₂ fossile de chaque SSP, rapporté à 2023** : 3,0 et 9,0 Gt de CO₂ (AIE) ; l'acier représente 28,9 % et le ciment 28,7 % de celui de l'industrie, chaque année et dans chaque scénario. Voir [Bâtiments et industrie](#method-industry).
- **Une pompe à chaleur économise le CO₂ de la chaudière × (1 − 1,49 kWh par kg évité × l'intensité du réseau après l'électricité renouvelable).** Voir [Bâtiments et industrie](#method-industry).
- **L'acier et le ciment propres réduisent de 90 % et 80 % leur CO₂ direct à adoption complète, moins 1,5 et 0,25 kWh d'électricité par kg évité sur le même réseau** ; la fabrication des équipements n'est pas comptée. Voir [Bâtiments et industrie](#method-industry).

## Climat

- **La température est calculée gaz par gaz** ; le CO₂e (GWP100 de l'AR6 : 27 pour le CH₄, 273 pour le N₂O) n'est affiché que comme total. Voir [Climat](#method-climate).
- **Le réchauffement par kilogramme (AGTP) vient de FaIR v2.2.5 avec l'ensemble fair-calibrate v1.4.1**, ses 841 membres ; l'application garde la médiane et les 5e et 95e centiles. Voir [Climat](#method-climate).
- **Impulsions de 1 Gt de CO₂, 1 Mt de CH₄ et 0,1 Mt de N₂O sur SSP2-4.5 en 2035**, utilisées pour toutes les années et tous les scénarios ; des impulsions en 2025 et 2045 donnent des courbes à 7 % près. Voir [Climat](#method-climate).
- **La réponse est proportionnelle à la variation des émissions** : le réchauffement est la convolution de la variation de chaque année avec l'AGTP ; une impulsion dix fois plus grande concorde à 0,2 % près. Voir [Climat](#method-climate).
- **Le méthane agricole est biogénique** (pas de CO₂ issu de son oxydation), **et le CO₂ agricole (urée, chaulage) est du CO₂ fossile** dans FaIR. Voir [Climat](#method-climate).
- **Les émissions d'une année sont réparties uniformément sur l'année** ; la température d'une année civile est la moyenne des valeurs de FaIR à ses deux extrémités. Voir [Climat](#method-climate).
- **L'alternative AR6 est une seule courbe**, tirée des expressions du chapitre 7 de l'AR6 : sa fourchette est nulle, et non inconnue. Voir [Climat](#method-climate) et [Options](#method-options).
- **La bande ne couvre que la réponse du climat**, et non l'incertitude sur les intensités, les régimes ou l'alimentation animale : la fourchette réelle est plus large. Voir [Climat](#method-climate).
- **Les températures des scénarios sont celles des 841 membres de FaIR sur les émissions RCMIP v5.1.0**, historique compris, par rapport à 1850–1900 ; SSP2-4.5 par défaut. Voir [Climat](#method-climate).
- **Avec la référence population, le réchauffement dû à l'écart entre les émissions agricoles mises à l'échelle de la population et la trajectoire agricole propre au SSP est ajouté** à la température du SSP, pour que la courbe de référence corresponde à ses émissions. Voir [Le changement](#method-shift).
- **Le pergélisol est désactivé par défaut ; activé, il libère 18,3 (3,2–41,7) PgC par °C de réchauffement, dont 1,6 % sous forme de méthane (les 2,8 PgCeq de rétroaction du méthane de l'AR6 font environ 0,28 PgC de méthane), sur 20 ans**, à partir de la température de référence et de celle du scénario, sans rien restituer quand la température baisse, en un seul passage. Voir [Climat](#method-climate).
- **La température observée est HadCRUT5 par défaut, Berkeley Earth en alternative**, chacune ramenée à sa propre moyenne de 1850–1900 ; l'année en cours de HadCRUT5 est laissée de côté tant qu'elle n'est pas complète. Voir [Climat](#method-climate).

## Causes du réchauffement

- **Attribution par retrait** : FaIR est lancé avec tout, puis avec les émissions d'une cause retirées ; la différence est le réchauffement dû à cette cause, par rapport à 1850–1900, pour les 841 membres. Voir [Causes du réchauffement climatique](#method-link).
- **L'agriculture est la catégorie M.AG du GIEC dans PRIMAP-hist v2.8**, total mondial, scénario des données déclarées par les pays (HISTCR), de 1750 à 2023 ; le changement d'usage des terres en est exclu. Voir [Causes du réchauffement climatique](#method-link).
- **À partir de 2024, le CH₄ et le N₂O agricoles de chaque scénario sont mis à l'échelle par une seule constante** pour rejoindre PRIMAP-hist en 2023 ; 2024 et 2025 viennent des scénarios, car PRIMAP-hist extrapole ses dernières années. Voir [Causes du réchauffement climatique](#method-link).
- **Le CO₂ agricole (urée, chaulage) est maintenu à son niveau de 2023 après 2023** ; PRIMAP-hist n'en a pas avant 1990. Voir [Causes du réchauffement climatique](#method-link).
- **L'usage des terres est le CO₂ d'usage des terres de RCMIP avec son effet d'albédo** (Global Carbon Budget 2016 à partir de 1959, PRIMAP-hist v1.0 avant), pour rester cohérent avec les émissions de FaIR ; la catégorie LULUCF de PRIMAP-hist n'est pas utilisée. Voir [Causes du réchauffement climatique](#method-link).
- **Les combustibles fossiles et l'industrie sont le CO₂ fossile de FaIR moins l'urée et le chaulage**, avec le CH₄ et le N₂O de l'énergie et de l'industrie de PRIMAP-hist jusqu'en 2023, puis ceux du scénario mis à l'échelle pour les rejoindre. Voir [Causes du réchauffement climatique](#method-link).
- **La pollution de l'air est une cause à part entière** : le dioxyde de soufre, le carbone noir et organique, l'ammoniac et les oxydes d'azote de toutes les sources, ammoniac agricole compris, ramenés aux niveaux de 1750 ; le monoxyde de carbone et les composés organiques volatils restent dans les *autres émissions humaines*. Voir [Causes du réchauffement climatique](#method-link).
- **Les facteurs naturels sont la simulation de FaIR avec le seul forçage naturel**, par rapport à sa moyenne de 1850–1900, si bien que les éruptions volcaniques apparaissent comme naturelles. Voir [Causes du réchauffement climatique](#method-link).
- **Les *autres émissions humaines* sont le total moins chaque cause nommée et les facteurs naturels**, leur médiane étant fixée pour que les médianes fassent le total ; les interactions entre les causes s'y trouvent (0,03 °C aujourd'hui entre les trois causes liées aux gaz à effet de serre, davantage avec la pollution de l'air). Voir [Causes du réchauffement climatique](#method-link).
- **Le réchauffement dû à l'agriculture avant 1850–1900 (environ 0,10 °C) fait partie de la référence**, et non de la part de l'agriculture. Voir [Causes du réchauffement climatique](#method-link).
- **Un retrait ne fait jamais passer les émissions d'une espèce chimique sous zéro.** Voir [Causes du réchauffement climatique](#method-link).

## Valeurs par défaut et alternatives

| Choix | Par défaut | Alternatives |
| --- | --- | --- |
| Émissions comptées | sur la ferme (`farmGate`) | avec les intrants (`cradleToFarmGate`) |
| Répartition des aliments du bétail | par espèce (`species`) | rations régionales (`gleam`) |
| Avenir de l'agriculture sans les leviers | croissance démographique (`population`) | trajectoire SSP2 (`ssp2`) |
| Où la production change | parts du commerce fixes (`fixedTrade`) | chaque pays pour lui-même (`domestic`) |
| Maintenus égaux | protéines (`protein`) | calories (`kcal`) |
| Remplacés par | les végétaux riches en protéines d'aujourd'hui (`current`) | surtout des légumineuses (`legumes`), boissons soja et avoine (`plantMilk`) |
| Température observée | HadCRUT5 (`hadcrut5`) | Berkeley Earth (`berkeley`) |
| Réponse du climat | FaIR (`fair`) | tables AR6 (`ar6`) |
| Émissions du reste du monde | moyen, SSP2-4.5 (`ssp245`) | bas, SSP1-2.6 (`ssp126`) ; haut, SSP3-7.0 (`ssp370`) |
| Terres libérées | laissées en l'état (`none`) | végétation spontanée (`natural`) |
| Centres de données de l'IA | croissance ajoutée (AIE) (`iea`) | comme dans le scénario (`ssp`) |
| Pergélisol | non compté (`off`) | dégèle (`on`) |
| Population mondiale | projection moyenne de l'ONU (`medium`) | basse de l'ONU (`low`), haute de l'ONU (`high`) |
| Tous les leviers en place en | 2035 | toute année de 2025 à 2050 |

Les clés d'URL des options, des réglages du régime et des leviers sont listées dans les [Options](#method-options).

## À revoir avant une publication

### Licences de données qui restreignent la réutilisation

- **PRIMAP-hist v2.8 est sous CC BY-NC-SA 4.0** : non commerciale et partage dans les mêmes conditions. Ses totaux agricoles mondiaux sont dans le fichier publié `climate.json`, et l'attribution en est calculée.
- **Berkeley Earth est sous CC BY-NC 4.0** : non commerciale ; sa série observée est dans le fichier publié `climate.json`.
- **RCMIP v5.1.0 est sous CC BY-SA 4.0** : partage dans les mêmes conditions ; les émissions et les températures des scénarios en dérivent.

Les autres sources sont sous CC BY 4.0, dans le domaine public, sous Open Government Licence, Apache 2.0 ou MIT.

### Valeurs reprises de mémoire plutôt que vérifiées à la source

- La répartition de l'alimentation animale par espèce (11/16/28/28/17) et les consommations de concentrés et rations de type GLEAM. Voir [Alimentation animale](#method-feed).
- Les parts de l'azote utilisé dans le monde par classe de cultures et sur les prairies, d'après Heffer et al. (2017). Voir [Émissions](#method-emissions).
- Les 85 % des émissions d'un troupeau laitier attribués au lait, présentés comme proches de la valeur par défaut de la Fédération internationale de laiterie. Voir [Émissions](#method-emissions).
- Les facteurs de conversion techniques de la FAO dans la table des taux d'extraction (sucre non centrifugé, autres huiles d'oléagineux, boissons fermentées et alcoolisées). Voir [Émissions](#method-emissions).
- Les tonnes de tourteau par tonne d'huile de `oilcakes.csv`, tirées des facteurs de conversion techniques de la FAO, qui fixent le partage des terres d'un oléagineux trituré entre l'huile et le tourteau. Voir [Terres](#method-land).
- Les taux d'extraction du sucre utilisés pour convertir les unités de Poore & Nemecek (11 % pour la canne, 15 % pour la betterave) ; le bilan mondial de la page sur les émissions donne 0,16 pour la betterave. Voir [Données ACV publiées](#method-literature).
- Le mélange de légumineuses (60 % de légumineuses, 20 % de soja, 20 % de céréales). Voir [Le changement](#method-shift).
- Le mélange de boissons végétales (50 % de soja, 50 % d'avoine). Voir [Le changement](#method-shift).
- La part applicable de chaque pratique par pays et la plus grande part des terres de chaque stockage. Voir [Pratiques agricoles](#method-practices) et [Carbone dans les terres agricoles](#method-removals).

### HESTIA n'a pas encore de produits animaux

HESTIA n'a pas publié d'agrégations de produits animaux : elles sont en cours de développement, et les agrégations non validées de son index ne sont pas utilisées. Les intensités du bœuf, du mouton et de la chèvre, de la viande porcine, de la volaille, du lait et des œufs viennent donc de FAOSTAT (niveau 3) et de Poore & Nemecek (2018) (niveau 4), et non de HESTIA. Voir [HESTIA](#method-hestia) et [Données ACV publiées](#method-literature).
