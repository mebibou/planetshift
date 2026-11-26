# Options

Cette page présente chaque réglage de *Autres options*, ce qu'il change et quelle valeur est celle par défaut. Là où deux méthodes sont toutes deux raisonnables, Planetshift construit les deux et permet de passer de l'une à l'autre. La première indiquée est la valeur par défaut. Les options changent la méthode et l'avenir par rapport auquel les leviers sont mesurés. Elles ne changent pas les leviers eux-mêmes.

## Comment les réglages sont gardés dans l'adresse

Chaque option, chaque réglage du régime et chaque levier est gardé dans l'adresse de la page, si bien qu'un lien rouvre la même vue. Les valeurs par défaut n'y figurent pas. La clé d'URL de chaque réglage est donnée entre parenthèses dans les tableaux ci-dessous.

Quelques termes employés sur cette page :

- **SSP** : l'une des trajectoires socio-économiques partagées (Shared Socioeconomic Pathways), des scénarios publiés de l'évolution possible des émissions mondiales. SSP2-4.5 est celui du milieu. SSP1-2.6 est bas et SSP3-7.0 haut.
- **FaIR** : le modèle climatique simple qu'utilise Planetshift pour passer des émissions à la température, avec le calibrage du sixième rapport d'évaluation du GIEC (AR6). Voir [Climat](#method-climate).
- **Fourchette de 5 à 95 %** : la dispersion des simulations du modèle climatique, sans leurs 5 % les plus bas ni leurs 5 % les plus hauts.

## Options de méthode

| Option (clé d'URL) | Par défaut | Alternative | Ce qui change |
| --- | --- | --- | --- |
| Émissions comptées (`scope`) | avec les intrants (`cradleToFarmGate`) | processus biologiques seulement (`farmGate`) | Retire les émissions de la fabrication des intrants (engrais, énergie), surtout du CO₂, et le carburant brûlé sur la ferme. Les émissions de base et les émissions évitées baissent toutes deux. Les poissons sauvages n'ont alors aucune émission : presque toutes les leurs viennent du carburant que brûlent leurs bateaux, qui n'est compté qu'avec les intrants (voir [Poissons et fruits de mer](#method-seafood)). Les liens qui portent `scope=farmGate` gardent ce choix. |
| Répartition des aliments du bétail (`feed`) | par espèce (`species`) | rations régionales, de type GLEAM (`gleam`) | À quels groupes animaux va chaque culture fourragère, donc quelle quantité de maïs, de blé ou de soja est libérée quand un groupe diminue. |
| Avenir de l'agriculture sans les leviers (`base`) | croissance démographique : régime actuel × population (`population`) | trajectoire SSP2 des émissions agricoles (`ssp2`) | Les émissions de référence jusqu'en 2100, et l'ampleur des émissions évitées, mises à l'échelle de la même façon. |
| Où la production change (`loc`) | parts du commerce fixes (`fixedTrade`) | chaque pays pour lui-même (`domestic`) | Quelles fermes changent sur la carte. Les totaux mondiaux des produits animaux sont les mêmes ; les cultures fourragères diffèrent, car l'alimentation animale baisse là où sont les animaux. Une baisse qu'un pays ne peut pas faire dans sa propre production va à ses fournisseurs. |
| Température observée (`temp`) | HadCRUT5 (`hadcrut5`) | Berkeley Earth (`berkeley`) | Seulement la courbe observée du graphique. Les projections ne changent pas. L'ensemble de FaIR est contraint sur la moyenne de quatre séries observées, qui incluent ces deux-là. Les années qu'une série ne couvre pas sont laissées vides. |
| Réponse du climat (`clim`) | FaIR (`fair`) | tables AR6 (`ar6`) | Comment les émissions deviennent du réchauffement. FaIR tourne dans l'application, avec une fourchette de 5 à 95 % sur ses membres. L'alternative AR6 additionne le réchauffement par tonne de chaque gaz selon une seule courbe, si bien que sa fourchette se confond avec la médiane. |
| Terres libérées (`regrow`) | laissées en l'état (`none`) | végétation spontanée (`natural`) | Si les terres agricoles libérées par le changement absorbent du CO₂ à mesure que la végétation naturelle repousse, pendant 30 ans après la libération de chaque hectare. Le CO₂ du scénario baisse d'autant, si bien que le réchauffement et le CO₂ évités augmentent ; le méthane et le protoxyde d'azote ne changent pas. Voir la page [Le changement](#method-shift), étape 8, et la page [Terres](#method-land). |
| Grands poissons non pêchés (`deadfall`) | non compté (`off`) | compté (`on`) | Si les thons, maquereaux et requins laissés en mer, quand la pêche baisse, font couler une part de leur carbone vers l'océan profond en mourant. Le stockage s'accumule avec une constante de temps de 10 ans à mesure que les stocks se reconstituent, et compte comme du CO₂ négatif dans l'agriculture, crédité au régime et au gaspillage réduit. C'est moins de 1 % des émissions des poissons et fruits de mer : un changement complet des poissons et fruits de mer stocke 1,6 Mt de CO₂ par an une fois accumulé. Voir [Poissons et fruits de mer](#method-seafood). |
| Centres de données de l'IA (`dc`) | croissance ajoutée (AIE) (`iea`) | comme dans le scénario (`ssp`) | Avec `iea`, l'électricité que les centres de données consomment au-delà des 415 TWh de 2024 est ajoutée à l'avenir sans aucun levier, à l'intensité du réseau de chaque année. Cette électricité suit le rapport *Energy and AI* de l'AIE jusqu'en 2035, puis reste constante. La température de référence monte de quelques millièmes de degré, et le levier « Électricité renouvelable » peut la réduire. Avec `ssp`, l'électricité du scénario est utilisée telle que publiée, sans demande supplémentaire à réduire. Voir [Énergie et transport](#method-sectors). |
| Pergélisol (`pf`) | dégèle (`on`) | non compté (`off`) | Avec `on`, chaque hausse annuelle de la température libère du carbone du pergélisol qui dégèle sur les 20 années suivantes, sous forme de CO₂ et de méthane. Ce dégel est calculé sur la température de référence, qui monte, et sur la température avec les leviers. Le refroidissement dû aux leviers en libère moins, si bien que le réchauffement évité augmente un peu. Voir [Climat](#method-climate). |
| Émissions du reste du monde (`ssp`) | moyen, SSP2-4.5 (`ssp245`) | bas, SSP1-2.6 (`ssp126`) ; haut, SSP3-7.0 (`ssp370`) | La courbe de température totale, la part de l'agriculture dans celle-ci, et, avec la référence population, l'ajustement entre les deux trajectoires agricoles. |
| Population mondiale (`pop`) | projection moyenne de l'ONU (`medium`) | projection basse (`low`) ou haute (`high`) de l'ONU | Avec la référence population, la population mondiale qui fait évoluer les émissions agricoles jusqu'en 2100, dans la référence comme avec les leviers : 10,2 milliards de personnes en 2100 avec la projection moyenne, 7,0 avec la basse et 14,4 avec la haute. Voir *Population mondiale* ci-dessous. |

Quand une intensité manque dans le périmètre choisi, celle de l'autre périmètre est utilisée. Quand elle manque dans les deux, le produit n'ajoute pas d'émissions, et la qualité des données du pays affiche le niveau le plus bas.

## Population mondiale

Les émissions agricoles de la référence croissent avec le nombre de personnes à nourrir. Avec *Population mondiale*, on choisit laquelle des projections de l'ONU ce nombre suit. Avec la référence par défaut, une population plus grande augmente à la fois la référence et ce qu'évitent le changement de régime et les leviers agricoles.

Avec la référence par défaut, *régime actuel × population*, les émissions agricoles de chaque année sont celles de l'année de référence × la population mondiale de l'année ÷ la population mondiale de l'année de référence (voir [Le changement](#method-shift)).

### Ce qu'elle change

L'option change les émissions agricoles de la référence à partir de l'année de référence, et donc sa température. Avec SSP2-4.5 et la réponse de FaIR, la référence atteint 2,83 °C en 2100 avec la projection moyenne, 2,74 °C avec la basse et 2,92 °C avec la haute. En 2050, les projections basse et haute sont à moins de 0,01 °C de la moyenne.

Le changement de régime et les leviers agricoles modifient des émissions mises à l'échelle de la même façon. Ce qu'ils évitent grandit ou diminue donc avec la population. Un changement de 50 % évite 0,176 °C en 2100 avec la projection moyenne, 0,149 °C avec la basse et 0,207 °C avec la haute (0,070, 0,067 et 0,072 °C en 2050).

Le levier du gaspillage agit sur les mêmes disponibilités mises à l'échelle. Le défrichement (déforestation), le carbone stocké dans les terres agricoles, la repousse naturelle, le carbone des grands poissons non pêchés et les leviers d'énergie ne sont pas mis à l'échelle de la population : ils ne changent pas.

Avec la référence *Trajectoire SSP2*, les émissions agricoles suivent la trajectoire propre à SSP2-4.5, et la population choisie ne change rien.

### D'où viennent les chiffres

La population de chaque pays est celle de FAOSTAT, qui reprend la projection moyenne des Perspectives de la population mondiale 2024 des Nations unies (WPP 2024). Les WPP 2024 publient aussi une projection basse et une haute. Dans celles-ci, les femmes ont en moyenne un demi-enfant de moins ou de plus que dans la projection moyenne. Elles diffèrent de la projection moyenne à partir de 2024.

Pour chaque pays, le pipeline divise la population de chaque projection par celle de la projection moyenne en 2025, en 2030 puis tous les dix ans jusqu'en 2100 (`population.json`). L'application multiplie la population propre du pays par ce rapport. Entre ces années, le rapport est interpolé linéairement, à partir de 1 en 2023, la dernière année d'estimations. Un pays sans projection dans les WPP prend le rapport du monde.

Additionnées sur les 187 pays, ces populations donnent les populations mondiales ci-dessous. Le graphique montre le total mondial des WPP eux-mêmes, qui comprend les quelques pays que le modèle laisse de côté.

| Projection de l'ONU (WPP 2024, monde) | 2050 | 2100 | Pic |
| --- | --- | --- | --- |
| Moyenne (par défaut) | 9,66 milliards | 10,18 milliards | 10,29 milliards en 2084 |
| Basse | 8,94 milliards | 6,99 milliards | 8,95 milliards en 2052 |
| Haute | 10,40 milliards | 14,40 milliards | encore en hausse en 2100 |

### Pourquoi ce n'est pas un levier

La population n'est pas une chose que fixe un gouvernement. Le nombre d'enfants dépend des choix des familles, liés à l'éducation, à la survie des enfants, à l'accès aux soins et à la planification familiale volontaire. L'écart entre les projections de l'ONU est d'un demi-enfant par femme.

L'option fixe l'avenir par rapport auquel les leviers sont mesurés. La référence et le scénario ont la même population, si bien que le réchauffement évité ne compte jamais la population elle-même, et la répartition par famille ne montre que les leviers. Les régimes par personne restent les mêmes dans toutes les projections.

### Le reste du monde reste celui du scénario

Les combustibles fossiles, les aérosols et l'usage des terres du scénario (`ssp`) vont avec la population que leurs auteurs ont supposée : les projections des SSP de 2017, environ 6,9 milliards en 2100 pour SSP1, 9,0 pour SSP2 et 12,6 pour SSP3. L'option ne les change pas.

Les associations qui vont à peu près ensemble sont la basse avec SSP1-2.6, la moyenne avec SSP2-4.5 et la haute avec SSP3-7.0. Les deux qui se contredisent, la projection basse avec SSP3-7.0 et la haute avec SSP1-2.6, sont permises.

### Personnes sur Terre

Le réglage *Personnes sur Terre*, dans le panneau, remplace la projection de l'ONU par un nombre de personnes que vous choisissez, comme une expérience de pensée. Par défaut, sa case *Suivre les projections de population de l’ONU* est cochée. Décochez-la, et son curseur fixe le nombre de personnes, de 0 à 14 milliards, atteint l'année où tous les leviers sont en place. La population va en ligne droite de son effectif actuel jusqu'à ce nombre, puis s'y maintient. Des repères sur le curseur montrent ce que donnent cette année-là les projections basse, moyenne et haute de l'ONU. Tant qu'un nombre est fixé, l'option *Population mondiale* est masquée, et l'adresse garde le nombre sous la clé `ppl`, en milliards.

Chaque émission humaine change avec le nombre de personnes. Les émissions agricoles le suivent par la référence de population, quelle que soit l'option de référence. Toute autre émission est l'émission du scénario par personne, multipliée par le nombre de personnes. Cela couvre les gaz à effet de serre des combustibles fossiles, de l'industrie, des déchets et de l'usage des terres, par leur réponse en température. Cela couvre aussi la pollution de l'air, par son forçage et par le méthane que laissent dans l'air ses NOx et COV. La population propre au scénario est d'abord ramenée à l'effectif actuel, pour que les émissions ne sautent pas l'année en cours. La référence et le scénario bougent ensemble : le réchauffement évité par les leviers ne compte donc pas les personnes elles-mêmes. Sur le graphique des causes du réchauffement, chaque changement est compté dans la cause dont il vient.

À 0, les émissions humaines cessent. La planète se réchauffe quelques années, car la pollution de l'air ne la refroidit plus. Ensuite, le dioxyde de carbone déjà dans l'air maintient la température. Elle ne baisse que lentement, à mesure que le méthane disparaît.

### La population sur le graphique de la température

La population mondiale est dessinée en aire claire derrière les courbes de température, sur un axe en milliards à droite. Elle montre la population mondiale recensée et estimée jusqu'en 2023 : la série de long terme d'Our World in Data, tirée de HYDE 3.3 et de Gapminder, jusqu'en 1949, puis les estimations des WPP 2024. Elle montre ensuite la projection utilisée, ou le chemin des personnes sur Terre quand il est fixé. Les autres projections ne sont pas dessinées. Leurs chiffres sont dans le tableau plus haut. Le survol du graphique donne la population de chaque année.

## Réglages du régime

| Réglage (clé d'URL) | Par défaut | Valeurs |
| --- | --- | --- |
| Changement (`shift`) | 0 | 0–100, en pour cent |
| Changement par groupe (`rum`, `pig`, `pou`, `dai`, `egg`, `sea`) | non réglé : suit le changement | 0–100, en pour cent, pour la viande de ruminants, la viande porcine, la volaille, les produits laitiers, les œufs, les poissons et fruits de mer |
| Maintenus égaux (`basis`) | `protein` | `kcal` |
| Remplacés par (`with`) | les végétaux riches en protéines d'aujourd'hui (`current`) | surtout des légumineuses (`legumes`), boissons soja et avoine (`plantMilk`) |
| Tous les leviers en place en (`ramp`) | 2035 | 2025–2050 |
| Où (`where`) | `world` | `highIncome` |

## Leviers

L'adoption de chaque levier va de 0 à 100, en pour cent. Elle est omise de l'adresse à 0.

| Famille | Leviers (clé d'URL) |
| --- | --- |
| Pratiques agricoles | additifs alimentaires (`fa`), sélection et alimentation (`bf`), gestion des effluents (`mm`), rizières drainées (`rw`), moins d'azote, mieux employé (`ne`), énergie propre à la ferme (`fe`) |
| Gaspillage alimentaire | gaspillage après les magasins (`fw`), pertes avant les magasins (`sl`) |
| Déforestation | déforestation arrêtée (`df`), tourbières drainées remouillées (`pr`) |
| Carbone dans les terres agricoles | couverts végétaux (`cc`), arbres dans les fermes (`af`), biochar (`bc`), poudre de roche, expérimentale (`ew`) |
| Énergie et transport | voitures électriques (`ev`), camions électriques (`et`), moins d'avion (`fl`), carburant d'aviation propre (`saf`), transport maritime propre (`cs`), électricité renouvelable (`re`) |
| Bâtiments et industrie | chauffage propre (`ch`), industrie propre (`ci`) |
| Fuites de méthane | fuites de pétrole et de gaz (`ogm`), méthane des mines de charbon (`cmm`) |

Une valeur que la page ne reconnaît pas revient à sa valeur par défaut.

**Exemple.** `?shift=10&dai=100&basis=kcal&ev=50&ssp=ssp126` est un changement de 10 % avec tous les produits laitiers remplacés, calories maintenues, et la moitié du transport routier de passagers électrique, sous SSP1-2.6.

## Hypothèses

- Les deux valeurs de chaque option sont construites et testées. Les valeurs par défaut suivent les choix du plan et sont à revoir avant publication.
- La référence SSP2 suit toujours les émissions agricoles de SSP2-4.5, quelles que soient les émissions du reste du monde choisies pour la température.
- L'alternative AR6 n'a pas de fourchette. La fourchette affichée avec elle est nulle, et non inconnue.
- La croissance des centres de données est ajoutée par défaut. Elle a déjà lieu, et les scénarios, faits vers 2016, ne l'avaient pas prévue : la référence est donc plus réaliste avec elle. La désactiver reproduit les températures publiées des scénarios.
- Le pergélisol est activé par défaut. La plupart des modèles derrière les températures publiées des scénarios le laissent de côté, si bien que ces températures manquent un réchauffement que l'AR6 évalue. Désactivé, la référence leur correspond. Un seul passage de la rétroaction est calculé. Le dégel supplémentaire que causerait le réchauffement de cette rétroaction elle-même ne l'est pas.
- La population mondiale suit par défaut la projection moyenne de l'ONU, celle que porte déjà la population de chaque pays. Les projections basse et haute sont celles de l'ONU, pas celles des SSP, pour que la population puisse être choisie indépendamment du scénario.
- Les grands poissons non pêchés sont désactivés par défaut. Le mécanisme est faible, et dépend plus de l'endroit où le poisson est pêché que de la quantité mangée ; sa part en eaux profondes et son accumulation sont des hypothèses.
- La repousse est désactivée par défaut. Laisser ou non les terres libérées se reboiser est un choix sur les terres, au-delà de l'alimentation, et leur absorption est moins certaine que les émissions agricoles. Avec l'alternative AR6, la fourchette affichée avec la repousse ne vient que des rythmes de repousse.

## Sources

- HadCRUT5, Met Office Hadley Centre : https://www.metoffice.gov.uk/hadobs/hadcrut5/
- Berkeley Earth : https://berkeleyearth.org/data/
- Leach N. J. et al. (2021), FaIR v2.0.0 : https://doi.org/10.5194/gmd-14-3007-2021
- GIEC AR6 GT1, chapitre 7 : https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/
- Émissions RCMIP v5.1.0 (scénarios SSP) : https://doi.org/10.5281/zenodo.4589756
- AIE (2025), Energy and AI : https://www.iea.org/reports/energy-and-ai
- GIEC AR6 GT1, chapitre 5 (rétroaction du carbone du pergélisol) : https://doi.org/10.1017/9781009157896.007
- FAO GLEAM : https://www.fao.org/gleam/en/
- UN DESA (2024), World Population Prospects 2024, CC BY 3.0 IGO : https://population.un.org/wpp/
- Our World in Data, Population (HYDE 3.3, Gapminder v7, UN WPP 2024), CC BY 4.0 : https://ourworldindata.org/grapher/population
- Klein Goldewijk K. et al. (2017), HYDE 3.2 : https://doi.org/10.5194/essd-9-927-2017
- KC S., Lutz W. (2017), The human core of the shared socioeconomic pathways : https://doi.org/10.1016/j.gloenvcha.2014.06.004
