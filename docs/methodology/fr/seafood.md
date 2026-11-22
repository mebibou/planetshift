# Poissons et fruits de mer

Les poissons et les autres animaux aquatiques forment un sixième groupe animal, `seafood`. Un changement de régime peut les remplacer par des végétaux, comme la viande, le lait et les œufs. Les poissons viennent de deux systèmes très différents, la pêche et l'aquaculture, dans des proportions qui varient selon le pays et l'espèce ; Planetshift mélange donc les deux selon la production propre de chaque pays. Le code est `pipeline/planetshift_pipeline/seafood.py` et `pipeline/planetshift_pipeline/sources/fishstat.py` ; les tables sont `pipeline/seafood_isscaap.csv` et `pipeline/seafood_factors.csv`.

## Produits

Les bilans alimentaires listent huit produits d'animaux aquatiques, tous désormais dans le groupe `seafood` :

| Produit des bilans | Ce qu'il contient | Production mondiale, 2021–2023 (Mt par an) : pêche / aquaculture |
| --- | --- | --- |
| 2761 Poissons d'eau douce | carpes, tilapias, poissons-chats, saumons, truites et autres poissons d'eau douce et diadromes | 12,4 / 57,9 |
| 2762 Poissons démersaux | morues, merlus, poissons plats, poissons côtiers | 19,6 / 2,4 |
| 2763 Poissons pélagiques | harengs, sardines, anchois, thons, maquereaux | 36,8 / 0,5 |
| 2764 Autres poissons marins | requins, raies, poissons marins non identifiés | 9,1 / 0,9 |
| 2765 Crustacés | crevettes, crabes, homards, krill | 6,1 / 12,8 |
| 2766 Céphalopodes | calmars, seiches, poulpes | 4,0 / 0,0 |
| 2767 Autres mollusques | huîtres, moules, palourdes, coquilles Saint-Jacques | 2,3 / 18,9 |
| 2769 Autres animaux aquatiques | holothuries, oursins, grenouilles, tortues | 0,4 / 1,3 |

Leurs lignes d'approvisionnement, leurs kcal et leurs protéines par tonne viennent des bilans alimentaires, comme pour tout autre produit. La FAO tient les produits de la pêche en équivalent poids vif (le poisson entier tel que pêché, les mollusques avec leur coquille), qui est aussi l'unité de FishStat, de Parker et al. et de MacLeod et al. : aucune conversion n'est nécessaire. C'est pourquoi les mollusques ne portent que 0,036 t de protéines par tonne.

Sont laissés de côté, chacun avec sa raison dans `groups.csv` :

- **Les plantes aquatiques (2775)** : les algues, environ 36 Mt par an, dont un tiers va aux gommes (agar, carraghénane, alginate) et à d'autres usages non alimentaires. Elles n'apportent presque ni énergie ni protéines à l'alimentation (0,2 g de protéines par personne et par jour), ne sont pas un aliment animal qu'un changement remplacerait, et aucune des sources utilisées ici ne donne leurs émissions, qui ne viennent que des bateaux et des cordes qui servent à les cultiver. Les mettre dans `otherPlant` leur aurait donné les émissions médianes et les surfaces cultivées de ce groupe, qu'elles n'ont pas.
- **Les mammifères aquatiques (2768)** : baleines et phoques, sans approvisionnement l'année de référence.
- **L'huile de corps et l'huile de foie de poisson (2781, 2782)** : faites de poissons transformés en farine, dont la pêche est déjà comptée dans les produits de la pêche ; ces huiles nourrissent surtout les poissons d'élevage, et leur usage alimentaire est inférieur à 0,1 Mt.

## Pêche et aquaculture dans chaque pays

FishStat de la FAO (production mondiale, version 2025.1.0) donne la production de chaque pays par espèce et par source : pêche, ou aquaculture en eau douce, saumâtre ou marine. Chaque espèce appartient à un groupe ISSCAAP, et `seafood_isscaap.csv` place chaque groupe dans un produit des bilans, un groupe de Parker et al. pour la pêche et un groupe de MacLeod et al. pour l'aquaculture. Pour chaque pays et chaque produit, Planetshift additionne les trois années jusqu'à l'année de référence (2021–2023) et pondère les facteurs des groupes par les tonnes de chacun. L'intensité des crustacés d'un pays, par exemple, est celle de son propre mélange de crevettes d'élevage et de crevettes, crabes et homards pêchés au chalut.

FishStat est publié sous licence CC BY 4.0 (conditions d'utilisation des bases de données statistiques de la FAO). Le pipeline le télécharge dans son cache et n'écrit dans les fichiers de l'application que des intensités dérivées et des tonnages d'aquaculture, pas les enregistrements de FishStat eux-mêmes.

## Intensités

Les domaines d'émissions de FAOSTAT ne couvrent ni la pêche ni l'aquaculture, il n'y a donc pas de niveau 3, et la version actuelle de HESTIA n'a pas d'agrégations aquatiques, il n'y a donc pas de niveaux 1 et 2. L'intensité d'un produit de la mer est fixée au niveau 4 à partir de la littérature, mélangée selon la production propre du pays comme ci-dessus. Un pays dont le bilan contient un produit que FishStat ne liste pas pour lui reçoit le premier substitut de `proxies.csv` (un autre poisson, ou un autre fruit de mer, au niveau 5), et à défaut la médiane mondiale du groupe pondérée par la production (niveau 6). L'année de référence, 1 018 des 1 504 cases des produits de la mer sont au niveau 4, 208 au niveau 5 et 278 au niveau 6 ; les cases de niveau 6 sont presque toutes des pays sans littoral qui importent tout leur poisson.

**La pêche** brûle du carburant en mer. Parker et al. (2018) donnent le carburant utilisé par tonne débarquée pour chaque groupe d'espèces en 2011 (Table 1), de 42 litres pour les petits poissons pélagiques à 1 739 litres pour les crustacés ; leurs Methods comptent 2,8 kg CO₂e par litre brûlé et 0,5 kg pour son extraction, son raffinage et sa livraison. Planetshift les utilise comme du CO₂. Parker et al. ajoutent aussi 1,1 kg CO₂e par litre pour les navires, les engins de pêche et les fuites de réfrigérant ; Planetshift laisse cela de côté, comme il laisse de côté la fabrication des tracteurs et des bâtiments agricoles, et les réfrigérants ne sont pas l'un de ses trois gaz. La pêche continentale est hors des données de Parker et al. ; elle se fait surtout avec de petits bateaux, souvent sans moteur, et reçoit l'intensité marine la plus basse, celle des petits poissons pélagiques.

| Groupe de pêche | Litres par tonne débarquée | kg CO₂ par tonne, du berceau à la sortie de ferme |
| --- | --- | --- |
| Poissons pélagiques de moins de 30 cm (harengs, sardines, anchois) | 42 | 139 |
| Poissons pélagiques de plus de 30 cm (thons, maquereaux, carangues, requins) | 430 | 1 419 |
| Mollusques démersaux | 523 | 1 726 |
| Poissons démersaux | 539 | 1 779 |
| Céphalopodes | 613 | 2 023 |
| Crustacés | 1 739 | 5 739 |
| Toutes pêcheries (poissons non identifiés, espèces d'eau douce pêchées en mer) | 489 | 1 614 |
| Pêche continentale (hypothèse) | 42 | 139 |

**L'aquaculture** n'a pas de méthane entérique. MacLeod et al. (2020) comptent, outre l'alimentation, le protoxyde d'azote dégagé par l'eau de l'élevage, 1,69 g de N₂O-N par kg de poids vif produit (2,66 kg de N₂O par tonne), et l'énergie utilisée sur l'exploitation pour le pompage, l'aération, l'éclairage et les véhicules (leur Supplementary Table D, par groupe d'espèces, en électricité, diesel et essence). Le diesel et l'essence émettent 0,074 et 0,070 kg CO₂ par MJ (leur Table E) ; l'électricité est prise à la moyenne mondiale de 480 g de CO₂ par kWh en 2023 (Ember). Les engrais des étangs, qu'ils comptent et qui sont faibles, sont laissés de côté.

| Groupe d'aquaculture | Énergie sur l'exploitation (MJ par tonne) : électricité / diesel / essence | kg CO₂ par tonne, du berceau à la sortie de ferme | kg N₂O par tonne |
| --- | --- | --- | --- |
| Bivalves (et autres invertébrés non nourris) | 1 067 / 1 790 / 0 | 275 | 2,66 |
| Cyprinidés | 258 / 424 / 119 | 74 | 2,66 |
| Tilapias, et poissons d'eau douce en général | 2 653 / 586 / 207 | 412 | 2,66 |
| Salmonidés, et poissons marins | 0 / 551 / 617 | 84 | 2,66 |
| Crevettes (tous les crustacés) | 14 068 / 4 511 / 2 | 2 210 | 2,66 |

**Périmètres.** Comme pour les cultures et l'élevage, le périmètre à la ferme compte ce qu'émet la biologie de l'exploitation, et celui du berceau à la sortie de ferme y ajoute l'énergie. Le N₂O aquatique est dans les deux ; le carburant et l'électricité seulement dans le second. Les poissons sauvages n'ont donc rien à la ferme : leurs émissions sont presque entièrement du carburant, qui n'apparaît que quand le lecteur choisit « Avec les intrants » dans les Options. C'est la même règle qui garde le diesel des tracteurs hors de l'intensité à la ferme du blé, mais son effet est plus grand ici ; l'interface le dit donc, dans l'aide de *Émissions comptées* sous Options et dans la note du résumé sur ce qui est compté.

Pondérées par la production mondiale de 2021–2023, les intensités sont (kg CO₂e par tonne, du berceau à la sortie de ferme, facteurs de l'AR6) : poissons d'eau douce 817 (18 % pêchés), poissons démersaux 1 666 (89 % pêchés), poissons pélagiques 807 (99 % pêchés), autres poissons marins 1 527, crustacés 3 729 (32 % pêchés), céphalopodes 2 023 (tous pêchés), autres mollusques 1 065 (11 % pêchés), autres animaux aquatiques 1 225. À la ferme, il ne reste que le N₂O de la part élevée : 597 pour les poissons d'eau douce, 646 pour les mollusques, 492 pour les crustacés, de 0 à 80 pour les produits surtout sauvages.

## Alimentation animale

L'alimentation de l'aquaculture suit la règle de l'élevage : l'intensité d'un poisson d'élevage exclut la culture de ses aliments, comptée sur les cultures et les poissons qu'il mange. L'usage fourrager du maïs, du soja, du blé et des autres produits fourragers dans les bilans alimentaires comprend déjà ce qui entre dans les aliments aquacoles ; `feed.json` en donne donc maintenant une part aux produits de la mer. La production des produits de la mer dans la répartition des aliments est l'aquaculture d'espèces nourries de chaque pays (FishStat, poissons et crustacés ; les bivalves et les autres filtreurs ne sont pas nourris), 75 Mt par an en 2021–2023, et non la production des bilans, en grande partie sauvage ou non nourrie.

- **Par espèce** : les produits de la mer prennent 5,5 % des aliments concentrés du monde, les autres groupes gardant leurs proportions publiées ramenées aux 94,5 % restants (`feed_species.csv`). Les aliments aquacoles composés atteignaient 69,4 Mt en 2023 (Tacon et al., 2025), face à quelque 1,2 à 1,3 Gt d'aliments composés pour tous les animaux. La part était de 4 % jusqu'en novembre 2026, d'après environ 50 Mt d'aliments aquacoles en 2017 (Tacon, 2020), un chiffre daté par rapport à l'année de référence 2023.
- **Rations de type GLEAM** : les poissons d'élevage mangent 1,6 t d'aliments par tonne dans les pays à revenu élevé (saumons et truites, nourris de granulés) et 0,87 t ailleurs (carpes et tilapias, en partie nourris par ce que produit l'étang), ce qui donne environ 69 Mt d'aliments aquacoles pour le monde, le total de 2023. Leur ration est de 30 % de grain, 40 % d'oléagineux, 5 % de légumineuses et 25 % de poisson, en tonnes de poids vif comme les bilans les utilisent pour le poisson (`feed_gleam_intake.csv`, `feed_gleam_rations.csv`).

**Le poisson donné aux animaux.** Les bilans enregistrent le poisson transformé en farine et en huile comme usage fourrager des produits de la pêche (24 Mt de poisson en 2023, dont 20 Mt de pélagiques) : les produits de la pêche sont donc aussi des produits fourragers. Leur usage fourrager va à environ 70 % à l'aquaculture, 23 % aux porcs et 7 % aux volailles : une répartition propre (`fishmeal` dans `feed_species.csv`) dans la méthode par espèce, et une classe `fish` des rations (0,25 de la ration aquacole, 0,01 de celle des porcs, 0,003 de celle des volailles) dans la méthode de type GLEAM, qui donne 74 %, 20 % et 6 %. Quand on mange moins de poisson d'élevage, on pêche moins de poisson pour le nourrir, et les émissions de cette pêche baissent avec. Les huiles de poisson elles-mêmes sont laissées de côté (voir Produits).

**Ce qui a changé pour les autres groupes.** Pour chaque produit fourrager qui existait déjà, dans chaque région et avec les deux méthodes, les cinq groupes d'élevage gardent les mêmes proportions entre eux : leurs parts sont les anciennes multipliées par un moins la part des produits de la mer. `tests/test_seafood_built.py` le vérifie par rapport aux dernières données sans produits de la mer, à l'arrondi des parts près (plus grand écart 0,0003). Les parts mondiales des produits de la mer sont de 5,5 % de chaque culture dans la méthode par espèce, et dans celle de type GLEAM de 2,6 % du grain et du riz, 5,9 % des légumineuses et 9,1 % du soja.

## Répartition par source et terres

Dans `breakdown.json`, tout le CO₂ des produits de la mer est de l'`energy` (carburant de pêche, carburant et électricité de l'élevage) et tout leur N₂O est `other` (l'eau des élevages de poissons, qu'aucune autre source ne nomme). Rien n'est `inputsManufacture`, puisque navires, engins et engrais des étangs sont laissés de côté. La pratique « Énergie propre à la ferme » agit donc sur les produits de la mer dans le périmètre du berceau à la sortie de ferme, comme sur l'énergie des autres exploitations.

Les produits de la mer n'ont ni prairies ni cultures propres : les surfaces de leurs aliments sont celles des cultures et passent par les parts fourragères, comme pour les porcs et les volailles. `land.py` ne compte les surfaces cultivées que pour les produits végétaux et les prairies que pour les ruminants : les produits de la mer ne sont dans aucun des deux, et `land.json` ne change pas.

## Validation

| Vérification | Planetshift | Valeur publiée |
| --- | --- | --- |
| Approvisionnement alimentaire mondial en poissons et fruits de mer, année de référence 2023 | 20,1 kg par personne et par an | 20,7 kg en 2022 (FAO, SOFIA 2024) |
| Part des produits de la mer dans les protéines animales | 14,2 % | environ 15 % (FAO, SOFIA 2024 ; 17 % dans les éditions antérieures, qui comptaient autrement) |
| Part des produits de la mer dans toutes les protéines | 6,0 % | environ 6 % (FAO, SOFIA 2024) |
| Production mondiale de la pêche, FishStat 2023 | 90 Mt | environ 91 Mt en 2022, animaux aquatiques (SOFIA 2024) |
| Carburant brûlé par la pêche | 39 milliards de litres (captures de 2023) | 40 milliards de litres en 2011 (Parker et al.) |
| Émissions de la pêche, du berceau à la sortie de ferme | 130 Mt CO₂ | 132 Mt CO₂e du carburant et 179 Mt CO₂e au total en 2011 (Parker et al.) |
| Émissions de l'aquaculture sans l'alimentation | 120 Mt CO₂e pour 98 Mt (1,22 t par tonne) | 43 % de 263 Mt CO₂e pour environ 80 Mt en 2017 (1,40 t par tonne ; MacLeod et al.) |
| Émissions de l'aquaculture avec l'alimentation | alimentation comptée sur les cultures et les poissons | 263 Mt CO₂e en 2017, dont 57 % pour l'alimentation (MacLeod et al.) |
| Aliments aquacoles composés | environ 69 Mt (consommation de type GLEAM) | 69,4 Mt en 2023 (Tacon et al., 2025) ; environ 50 Mt en 2017 (Tacon, 2020) |

Tous les produits de la mer ensemble, pondérés par la production des bilans, donnent 66 Mt CO₂e par an à la ferme et 236 Mt CO₂e du berceau à la sortie de ferme. Le total de la pêche est à quelques pour cent des émissions de carburant de Parker et al. parce que les captures mondiales n'ont presque pas changé depuis 2011. L'aquaculture ressort plus basse par tonne que la part hors alimentation de MacLeod et al. parce que le N₂O est pondéré avec le facteur 273 de l'AR6 au lieu de 298 et que les engrais des étangs sont laissés de côté. Les intensités de tous les autres produits, l'approvisionnement, les produits et la répartition par source de tous les autres produits, et `land.json` sont les mêmes qu'avant l'ajout des produits de la mer (`tests/test_seafood_built.py`).

## Dans l'application

Les poissons et fruits de mer changent comme les autres aliments animaux : le curseur principal les fait varier, et *Poissons et fruits de mer* sous « Régler chaque aliment animal » fixe leur propre part (`sea` dans l'adresse). Les protéines ou les calories qu'ils apportent sont remplacées par des végétaux, comme pour la viande. Comme les poissons sauvages émettent peu à la ferme (rien) et modérément avec les intrants, les remplacer par des végétaux peut éviter peu de réchauffement, voire en ajouter un peu : les végétaux qui les remplacent ont leurs propres émissions.

Les produits de la pêche sont aussi des produits fourragers. Quand les animaux qu'ils nourrissent (poissons d'élevage, porcs, volailles) produisent moins, le poisson qui leur est donné baisse de la même part de son usage fourrager, et cette variation est placée comme une variation de la demande de poisson, en plus de la variation de ce que mangent les gens. Elle est faite une seule fois, sans boucle : le poisson pêché pour la farine est sauvage et ne mange lui-même aucun aliment, si bien qu'en pêcher moins ne change aucun aliment (`run.ts`, `productionChanges` ; la même étape s'applique au lait donné aux veaux). La part de l'aquaculture dans les cultures fourragères baisse avec la production de tout le groupe, pêche comprise, car l'application ne garde pas de répartition de la production du groupe par système.

## Manger moins de poisson permet-il à l'océan de stocker plus de carbone ?

Deux mécanismes sont parfois avancés ; aucun n'est dans les chiffres de Planetshift.

**Le carbone des poissons.** Un grand poisson qui meurt en mer coule, et le carbone de son corps atteint l'océan profond, où il reste des siècles ; un poisson pêché libère son carbone en quelques jours. Mariani et al. (2020) estiment que la pêche a retiré 318 Mt de thons, maquereaux, poissons à rostre et requins entre 1950 et 2014, contenant 37,5 Mt de carbone, dont 21,8 Mt auraient coulé sous les profondeurs qui le gardent, une fois la prédation prise en compte. Avec le carburant brûlé pour les pêcher, cela fait leurs 0,73 Gt de CO₂ depuis 1950 mis en avant, mais le carburant en est l'essentiel : le carbone qui n'a pas coulé représente environ 80 Mt de CO₂ en 65 ans, à peu près 1 Mt par an, moins de 1 % des émissions de carburant de la pêche mondiale. Les baleines font de même, à plus grande échelle par animal, et fertilisent la surface de leurs excréments (la « pompe à baleines ») ; les mammifères aquatiques ne sont pas mangés en quantité et sont hors du modèle.

**Le chalutage de fond.** Les chaluts traînés sur le fond de la mer remuent ses sédiments, et une partie de leur carbone peut être oxydée en CO₂. Sala et al. (2021) estimaient de 0,6 à 1,5 Gt de CO₂ par an dissous dans l'eau, autant que tout le CO₂ des fermes du monde ; Hiddink et al. (2023) ont répondu que les taux de reminéralisation utilisés étaient bien trop élevés et que le vrai chiffre pourrait être dix fois plus petit, et la part du CO₂ dissous qui atteint l'air, et à quelle vitesse, reste débattue. Il n'existe pas de chiffre admis par tonne de poisson.

**Pourquoi ils sont laissés de côté.** Le mécanisme du carbone des poissons est faible, et celui du chalutage de fond contesté ; les deux dépendent bien plus de l'endroit et de la façon dont un poisson est pêché que de la quantité mangée. Un facteur par tonne découle de Mariani et al. pour un levier ultérieur : 21,8 Mt de carbone pour 318 Mt de poisson, c'est environ 0,25 t de CO₂ par tonne de thon, poisson à rostre, maquereau ou requin pêché en eaux profondes, environ un sixième de plus que le carburant brûlé pour le pêcher (1,42 t de CO₂ par tonne). Il n'agirait que sur une partie des produits « Poissons pélagiques » et « Autres poissons marins », et compterait comme du carbone non stocké plutôt que comme une émission, comme la repousse sur les terres agricoles libérées. Il n'est pas mis en œuvre.

## Hypothèses

- Les produits de la pêche et de l'aquaculture sont en poids vif, comme la FAO les tient dans les bilans et dans FishStat ; les mollusques comprennent leur coquille.
- Le mélange de pêche et d'aquaculture de chaque pays, et de groupes d'espèces, est la moyenne des trois années de FishStat jusqu'à l'année de référence.
- Le carburant par tonne par groupe d'espèces est celui de Parker et al. pour 2011, le même dans chaque pays ; les flottes nationales diffèrent (ils montrent 1,6 t CO₂e par tonne pour les États-Unis contre 5,2 pour l'Australie, dont les flottes ciblent les langoustes et les crevettes), et cette variation est perdue.
- La pêche continentale brûle aussi peu de carburant par tonne que la pêche des petits pélagiques.
- Les espèces d'eau douce pêchées en mer, les poissons marins non identifiés et les invertébrés aquatiques divers prennent la moyenne de toutes les pêcheries ou celle des mollusques démersaux ; maquereaux et carangues comptent avec les thons comme poissons pélagiques de plus de 30 cm, et les requins avec eux ; le krill avec les crustacés.
- Les crustacés d'élevage consomment tous l'énergie des crevettes, les mollusques et autres invertébrés non nourris d'élevage celle des bivalves, les poissons marins d'élevage celle des saumons, et les grenouilles et tortues d'élevage celle des poissons d'eau douce.
- Le facteur de N₂O de l'eau des élevages s'applique à chaque espèce élevée, bivalves compris, comme chez MacLeod et al. ; il est incertain, et ils demandent de le traiter avec prudence. Le méthane des étangs, que certaines études trouvent important, n'est pas compté, comme MacLeod et al. ne le comptent pas.
- L'électricité des élevages de poissons émet la moyenne mondiale par kWh, dans chaque pays.
- Les navires, les engins, les réfrigérants, les engrais des étangs et la construction des élevages sont laissés de côté, comme la transformation après débarquement, le transport et la chaîne du froid.
- La pêche n'a pas d'émissions à la ferme ; son carburant compte du berceau à la sortie de ferme.
- Les aliments aquacoles font 5,5 % des aliments concentrés du monde ; le poisson donné aux animaux va à 70 % à l'aquaculture, 23 % aux porcs et 7 % aux volailles. Les parts, ainsi que les consommations et la ration de type GLEAM, sont des valeurs arrondies, choisies pour retrouver le total publié d'aliments aquacoles.
- Les huiles de poisson et les plantes aquatiques sont laissées de côté ; le poisson transformé en farine et en huile est dans les produits de la pêche.
- Les mécanismes du carbone océanique (carcasses de poissons, sédiments) ne sont pas comptés.

## Sources

- FAO FishStat, Global production by production source 1950–2023, version 2025.1.0 : <https://www.fao.org/fishery/en/collection/global_production>, CC BY 4.0.
- FAOSTAT, Bilans alimentaires (2010–) : <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Parker, R. W. R., Blanchard, J. L., Gardner, C., Green, B. S., Hartmann, K., Tyedmers, P. H. and Watson, R. A. (2018). Fuel use and greenhouse gas emissions of world fisheries. Nature Climate Change 8, 333–337. <https://doi.org/10.1038/s41558-018-0117-x>
- MacLeod, M. J., Hasan, M. R., Robb, D. H. F. and Mamun-Ur-Rashid, M. (2020). Quantifying greenhouse gas emissions from global aquaculture. Scientific Reports 10, 11679. <https://doi.org/10.1038/s41598-020-68231-8>, CC BY 4.0.
- Ember (2024). Global Electricity Review 2024 : <https://ember-energy.org/latest-insights/global-electricity-review-2024/>.
- Tacon, A. G. J. et al. (2025), production d'aliments aquacoles composés en 2023 (69,4 Mt) : <https://doi.org/10.1080/23308249.2025.2568830>
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56. <https://doi.org/10.1080/23308249.2019.1649634>
- Naylor, R. L. et al. (2021). A 20-year retrospective review of global aquaculture. Nature 591, 551–563. <https://doi.org/10.1038/s41586-021-03308-6>
- FAO (2024). The State of World Fisheries and Aquaculture 2024. <https://doi.org/10.4060/cd0683en>
- Mariani, G. et al. (2020). Let more big fish sink: fisheries prevent blue carbon sequestration—half in unprofitable areas. Science Advances 6, eabb4848. <https://doi.org/10.1126/sciadv.abb4848>
- Sala, E. et al. (2021). Protecting the global ocean for biodiversity, food and climate. Nature 592, 397–402. <https://doi.org/10.1038/s41586-021-03371-z>
- Hiddink, J. G. et al. (2023). Quantifying the carbon benefits of ending bottom trawling. Nature 617, E1–E2. <https://doi.org/10.1038/s41586-023-06014-7>
