# Limites

Planetshift répond à une question étroite avec des règles simples et explicites. Les fourchettes de température affichées sont plus étroites que l'incertitude réelle : le réchauffement évité se lit comme un ordre de grandeur.

## Ce qui est laissé de côté

**Les poissons et fruits de mer.** Les poissons et fruits de mer sont dans le modèle, mais leurs intensités (émissions par tonne) ne viennent pas d'inventaires nationaux. Ce sont des valeurs mondiales publiées par groupe d'espèces : carburant de la pêche, énergie et N₂O (protoxyde d'azote) des élevages. Elles sont pondérées selon la part de pêche et d'aquaculture de chaque pays. Les poissons sauvages n'ont pas d'émissions à la ferme, puisque le carburant ne compte que du berceau à la sortie de ferme. Sont laissés de côté : le méthane des étangs, les navires et les réfrigérants, les plantes aquatiques, et les sédiments remués par les chaluts. Le carbone que les grands poissons non pêchés font couler vers l'océan profond est une option, désactivée par défaut (*Grands poissons non pêchés*). C'est moins de 1 % des émissions des poissons et fruits de mer, et cela repose sur deux hypothèses : la part de la pêche faite en eaux profondes (0,44) et une reconstitution des stocks avec une constante de temps de 10 ans. Leurs excréments et leurs migrations quotidiennes ne sont pas comptés. Voir [Poissons et fruits de mer](#method-seafood).

**L'usage des terres.** Planetshift compte les terres agricoles qu'un changement libère. Si on le choisit dans *Autres options*, il compte aussi le CO₂ que ces terres absorbent quand la végétation naturelle repousse. Avec la repousse, on retire aux terres qu'un scénario utilise en plus l'absorption qu'elles auraient eue. Deux choses ne sont comptées qu'en partie, ou pas du tout :

- le défrichement des forêts sur pied pour de nouveaux pâturages et cultures n'est compté que dans la mesure où les données de déforestation le lient à la production ;
- le carbone que les terres libérées pourraient stocker autrement (forêts plantées, tourbières restaurées) n'est pas compté.

Les deux peuvent dépasser l'ensemble des émissions agricoles. Sans la repousse, le bénéfice d'un changement est donc plus petit qu'il pourrait l'être, pas plus grand. Le graphique *Causes du réchauffement* montre tout de même le changement d'usage des terres comme une cause du réchauffement passé, à partir de données publiées.

Pour donner un ordre de grandeur, Eisen et Brown (2022) abandonnent l'élevage en 15 ans, et la végétation se reconstitue entièrement sur les terres libérées (environ 790 Gt de CO₂ absorbées en 30 ans). Ils trouvent en 2100 un forçage radiatif de 3,8 au lieu de 4,9 W/m², « le même effet […] qu'une réduction de 68 % des émissions de CO₂ ». Leur repousse absorbe environ 26 Gt de CO₂ par an. Le changement complet de Planetshift avec la repousse en absorbe environ 8,9 Gt, nettes des terres nouvellement utilisées. Il ne compte qu'une jeune forêt naturelle là où elle peut pousser, et rien sur les parcours arides. Le changement complet de Planetshift évite 0,35 °C (0,25–0,49) en 2100 sans la repousse et 0,38 °C (0,24–0,76) avec.

**La pollution de l'air et le méthane des combustibles.** Les leviers d'énergie, de chauffage et d'industrie réduisent le CO₂, le méthane et le N₂O émis pendant la production du combustible. Ils réduisent aussi la pollution de l'air due à sa combustion. Les deux sont comptés avec un seul rapport par secteur et un forçage mondial par kg (voir [Énergie et transport](#method-sectors)). Le forçage est la variation de l'énergie que la Terre retient, qui la réchauffe. Trois simplifications comptent le plus :

- Le combustible que consomment les raffineries, les cokeries et les champs de pétrole et de gaz eux-mêmes est compté avec le combustible qu'ils fournissent. Il est partagé entre le pétrole et le charbon selon une hypothèse, car les inventaires ouverts ne le séparent pas.
- L'endroit où la pollution est émise compte, mais il n'est modélisé que pour le méthane des NOx. Dans le modèle, une tonne de SO₂ (dioxyde de soufre) a le même effet où qu'elle soit émise. En réalité, elle refroidit davantage au-dessus de l'air pur de l'océan qu'au-dessus d'une région polluée.
- Le méthane des NOx reste le plus grand et le plus incertain de ces termes. Le site le prend dans les modèles de chimie plutôt que dans FaIR, le modèle climatique.

Le détail et les chiffres sont dans *La pollution de l'air et le méthane des NOx en détail*, plus bas. L'effet propre du monoxyde de carbone sur le méthane, que FaIR laisse de côté, n'est pas compté. C'est une question ouverte (voir [Énergie et transport](#method-sectors)). Aucun levier ne vise la pollution de l'air seule (filtres, foyers de cuisson plus propres). Voir [Causes du réchauffement climatique](#method-link).

**Les fuites de méthane que les inventaires ne voient pas.** Les satellites et les avions trouvent plus de méthane que n'en déclarent les pays. L'AIE estime le méthane de l'énergie environ 80 % au-dessus des inventaires nationaux remis à l'ONU (Global Methane Tracker 2025). Des relevés aériens du pétrole et du gaz aux États-Unis trouvent des pertes environ trois fois supérieures à l'inventaire national (Sherwin et al. 2024). Le méthane de l'approvisionnement de Planetshift ne vient pas de ces inventaires, mais de CEDS. CEDS compte 131 millions de tonnes venant des combustibles fossiles en 2022. Le chiffre de l'AIE dépasse 120, et CEDS l'égale ou le dépasse donc. Les inversions atmosphériques donnent 115 Tg par an (100–124) pour les combustibles fossiles, contre 120 d'après les inventaires, sur 2010–2019 (Saunois et al. 2025). Le méthane de l'approvisionnement des leviers est donc probablement juste à environ un dixième près. Les puits et mines abandonnés émettent environ 8 millions de tonnes par an (AIE 2025). Ces émissions ne baissent pas quand baisse la consommation actuelle de combustible, et CEDS en compte peut-être une partie dans ses rapports. Les leviers sur les [fuites de méthane](#method-leaks) réduisent les fuites de CEDS dues à la production du pétrole, du gaz et du charbon. Ils ne bouchent pas les puits abandonnés et ne noient ni ne scellent les mines abandonnées : ces 8 millions de tonnes restent. Si les fuites réelles dépassent celles de CEDS, comme le suggèrent les mesures ci-dessus pour certains gisements, les leviers éviteraient plus qu'ils ne le montrent, aux mêmes parts.

**Ce que laissent les combustibles propres.** Chacun des points suivants serait un écart par rapport à FaIR :

- L'effet du carburant d'aviation propre sur les traînées de condensation n'est pas compté. Des carburants contenant moins d'aromatiques ont produit 50 à 70 % de particules de suie et de glace en moins lors de mesures en vol (Voigt et al. 2021), et un carburant entièrement propre 35 % de particules de suie en moins (Märkl et al. 2024). Aucune estimation du forçage pour une part mondiale de ce carburant n'a été trouvée.
- L'hydrogène qui fuit de la filière de réduction directe de l'acier propre réchauffe le climat. Son potentiel de réchauffement à 100 ans est de 11,6 ± 2,8 (Sand et al. 2023). FaIR n'a pas d'hydrogène. Une tonne d'acier exige environ 50 kg d'hydrogène. Avec 1 à 10 % de fuites, il annulerait 0,3 à 3 % du CO₂ économisé, d'après une estimation grossière de Planetshift.
- Les navires à l'ammoniac peuvent laisser échapper du N₂O et de l'ammoniac qui annulent une partie de leur gain. Aucun chiffre mondial fiable n'a été trouvé.

**Le transport, la transformation, l'emballage et la distribution des aliments.** Par défaut, ce qui se passe à la ferme est compté avec la fabrication des engrais et l'énergie utilisée sur la ferme. Dans *Autres options*, on peut ne garder que les processus biologiques de la ferme. Les émissions des aliments après la sortie de ferme sont comptées à partir des totaux par pays de FAOSTAT. Chaque aliment en reçoit une part selon les étapes de Poore et Nemecek ou selon la masse, et les émissions sont placées là où l'aliment est produit (voir [Émissions](#method-emissions), *Après la ferme*). Les réfrigérants de la chaîne du froid comptent comme du HFC-134a, et le modèle ne suit pas leur réduction par l'amendement de Kigali. Les leviers d'énergie et de transport agissent sur l'ensemble des véhicules, des vols, des navires et des centrales du monde, pas sur la part qui revient à l'alimentation. L'énergie après la ferme ne devient donc pas plus propre avec eux.

**L'énergie au-delà de quelques secteurs.** Les leviers d'énergie couvrent le transport routier, l'aviation, le transport maritime, l'électricité et la demande supplémentaire des centres de données. Il n'y a pas de levier pour les réseaux de chaleur, le rail, les industries autres que l'acier, le ciment et la chimie, ni la fabrication des véhicules, des batteries, des panneaux solaires et des puces. Les leviers ne changent le méthane et les aérosols du scénario que par le combustible qu'ils retirent. Les véhicules électriques ne deviennent pas plus efficaces avec le temps. Le forçage de l'aviation hors CO₂ garde son rapport de 2018 au CO₂. Les leviers sont des parts d'adoption, pas des politiques ni des coûts.

**La fabrication des équipements.** Les leviers comptent le combustible et l'électricité utilisés. Ils ne comptent pas les émissions de la fabrication des véhicules et de leurs batteries, des éoliennes et des panneaux solaires, des centres de données et de leurs puces, ni des machines agricoles. Pour les voitures électriques, le gain en est trop grand. Les analyses de cycle de vie qui comptent la batterie trouvent qu'une voiture électrique émet environ moitié moins qu'une voiture à essence sur sa durée de vie, dans le monde (AIE 2024). Elle émet 66 à 69 % de moins en Europe, mais 19 à 34 % de moins en Inde (Bieker 2021). Les émissions de cycle de vie de l'éolien et du solaire sont de quelques pour cent de celles du charbon (Schlömer et al. 2014). Voir [Énergie et transport](#method-sectors).

**Les leviers agricoles.** Les pratiques, le gaspillage, la déforestation et le carbone dans les terres agricoles sont des parts adoptées, et chaque effet vient d'études publiées. La possibilité d'adopter une pratique dans un pays relève d'un jugement. Le carbone du sol peut être reperdu. Moins gaspiller libère de l'argent dépensé pour autre chose. Le modèle laisse de côté cet effet rebond. Voir [Leviers](#method-levers).

**Les pratiques agricoles comparées à En-ROADS.** Avec toutes les pratiques agricoles adoptées en entier, Planetshift supprime environ 13 % du méthane agricole et 7 % du N₂O agricole. Sur le SSP3-7.0, cela évite 0,009 °C de réchauffement en 2050 et 0,036 °C en 2100. Le curseur « Methane and nitrous oxide from agriculture » d'En-ROADS à 100 % en évite environ 0,03 °C et 0,06 °C. Les deux ne répondent pas à la même question. À 100 %, En-ROADS ramène en 30 ans les émissions par tonne de nourriture de chaque ferme à celles des systèmes agricoles les moins émetteurs ([guide d'utilisation d'En-ROADS](https://docs.climateinteractive.org/projects/en-roads/en/latest/guide/ag_emissions.html)). Planetshift n'adopte chaque pratique que là où les systèmes agricoles le permettent. Les additifs alimentaires, par exemple, ne touchent que les animaux nourris d'une ration quotidienne. Son adoption complète est plus proche de ce que le GIEC juge possible à 100 \$ la tonne au plus que du potentiel technique (voir [Pratiques agricoles](#method-practices)). L'essentiel de l'écart vient d'une part plus petite des mêmes sources, surtout le méthane que rotent les bovins. Le reste vient de sources qu'aucune pratique n'atteint : le brûlage des résidus de culture, et le N₂O du fumier déposé sur les pâturages ou épandu sur les champs (près de la moitié du N₂O agricole). L'écart est plus grand en 2050, car Planetshift ajoute les pratiques à un rythme régulier jusqu'à leur adoption complète.

**Le pergélisol et les autres rétroactions.** L'option du pergélisol ajoute une rétroaction du système Terre, de façon simple. Ce que libère chaque degré est étalé sur 20 ans et calculé en un seul passage. Le dégel brutal est laissé de côté. Sa fourchette couvre un facteur dix. Les autres rétroactions au-delà du cycle du carbone de FaIR (dépérissement des forêts, hydrates de méthane) ne sont pas comprises.

**La réaction du commerce.** Les fermes de chaque pays changent en proportion de leur part de la production mondiale. En réalité, une baisse de la demande de bœuf toucherait certains exportateurs plus que d'autres, et les prix modifieraient qui produit quoi.

**Les prix et les revenus.** Une alimentation moins chère ou plus chère change ce que les gens achètent. Planetshift ne le modélise pas. Un changement est un choix que l'on règle, pas une prévision de ce que les gens feront.

**La santé.** Planetshift maintient les protéines ou les calories égales. Il ne vérifie pas le régime au regard des recommandations de santé et n'estime pas les effets sur la santé.

**L'eau douce.** Les prélèvements sont comptés, pas l'eau consommée, sauf dans la couche de rareté limitée aux cultures. Les litres de HESTIA couvrent 35 cultures dans 56 pays, et ses moyennes mondiales 15 de plus. Le reste vient des valeurs mondiales de Poore & Nemecek : l'irrigation d'un pays n'est comptée que là où HESTIA a sa propre agrégation. Les produits animaux prennent la valeur de l'étude moins l'eau de leurs aliments concentrés, une estimation de l'eau de la ferme elle-même qui dépend des rations de type GLEAM. L'eau de la pisciculture n'est pas comptée. Les pays s'écartent d'AQUASTAT plus que le monde (le pays médian fait 1,7 fois son chiffre, le Bangladesh presque six). Voir [Eau douce](#method-water).

**Les cultures non alimentaires.** Le coton, le tabac, le caoutchouc et les cultures pour biocarburants ne sont pas pris en compte.

**L'échelle infranationale.** La production et les émissions sont par pays. Il n'y a pas de carte de l'endroit où, dans un pays, les aliments sont produits.

## Quelle est la précision des chiffres

La fourchette de température vient de la dispersion de la réponse du modèle climatique à chaque gaz : du 5e au 95e centile d'un ensemble calibré de simulations. Elle ne comprend pas l'incertitude sur les émissions par tonne de chaque aliment, qui peut être grande. Elle ne comprend pas non plus l'incertitude sur les régimes et les parts de l'alimentation animale. La fourchette réelle est plus large que celle affichée.

Les émissions par tonne viennent de la meilleure source disponible pour chaque aliment et chaque pays. Elle va des données HESTIA pour ce pays jusqu'à une médiane mondiale du groupe d'aliments. La carte de qualité des données montre laquelle. Là où la qualité des données est faible, les chiffres de ce pays sont à prendre comme des approximations.

Le réchauffement évité en 2050 est petit : quelques centièmes de degré pour un changement modeste. Les leviers d'énergie au maximum en évitent plusieurs dixièmes d'ici 2100. Le réchauffement évité se lit avec sa fourchette et comme un ordre de grandeur, pas comme un chiffre exact. Les variations d'émissions sont plus robustes que les variations de température. Le sens du changement est plus robuste que son ampleur.

## La pollution de l'air et le méthane des NOx en détail

### L'endroit où la pollution est émise

L'endroit où la pollution est émise n'est modélisé que pour le méthane des NOx. Il est pris pour la terre et pour la mer dans une seule étude multimodèle du transport (Hoor et al. 2009). L'ozone des NOx est le même partout. Les centrales, les bâtiments et l'industrie prennent la valeur de la route sur terre, parce qu'il n'existe pas de chiffres comparables pour eux.

Une tonne de SO₂ au-dessus de l'air pur de l'océan refroidit davantage qu'une tonne au-dessus d'une région polluée :

- Quatre modèles donnent de −3,1 à −10,7 mW/m² par Tg de SO₂ par an, selon la région et la saison. Ils trouvent qu'il est « more efficient to perturb European or shipping aerosol emissions than East Asian emissions » (Bellouin et al. 2016).
- Dans un modèle, les émissions de la Chine refroidissaient le monde environ quatorze fois plus quand elles étaient libérées au-dessus de l'Europe de l'Ouest qu'au-dessus de l'Inde (Persad et Caldeira 2018). Leur forçage réchauffait ou refroidissait aussi le monde de 0,24 à 1,3 K par W/m², selon l'endroit où elles étaient émises. Le modèle prend 1 partout.

Le SO₂ des centrales est aujourd'hui surtout émis en Inde, en Indonésie, en Türkiye et en Arabie saoudite, et celui de l'acier et du ciment en Chine et en Inde (CEDS). L'air y est pollué. Le forçage mondial surestime donc probablement le refroidissement que les leviers suppriment dans ces régions, et le sous-estime pour les navires. Les estimations régionales couvrent trop peu de régions, et divergent trop, pour le corriger.

### Pourquoi le méthane des NOx vient des modèles de chimie

Le site prend le méthane des NOx dans les modèles de chimie plutôt que dans FaIR. C'est la valeur `chemistry` de l'écart `noxMethane` (voir la [page sur la température](#method-climate)). Une étude multimodèle de chimie de chaque secteur du transport est plus réaliste qu'un seul coefficient mondial.

Dans FaIR, la réponse du méthane aux NOx est d'environ 2 kg de méthane par kg de NO₂. C'est plusieurs fois la réponse des modèles de chimie pour le trafic routier. Ces modèles trouvent que l'ozone du trafic routier l'emporte sur son méthane : +16 ± 13 mW/m² net, contre −18 ± 10 pour le transport maritime (Myhre et al. 2011). Avec la réponse de FaIR, les voitures et camions électriques semblaient ajouter du réchauffement d'ici 2100 dans SSP3-7.0.

### Comment la valeur est obtenue

Hoor et al. donnent le forçage du méthane et de l'ozone qu'il entraîne par kg de NO₂, le méthane des COV et du CO rendu. Ce forçage est converti en l'émission de méthane qui le donnerait, à 2,9 mW/m² par million de tonnes par an (ACCMIP, Stevenson et al. 2013). On obtient :

- 0,70 kg de méthane pour le trafic routier (0,63–0,76 selon les cinq modèles) ;
- 1,27 kg pour les navires ;
- contre 1,49 pour toute source chez FaIR en 2000, l'année des modèles.

Chacun suit ensuite l'évolution de FaIR avec le scénario.

### Ce que change ce choix

| Voitures et camions électriques, d'ici 2100 | SSP3-7.0 | SSP2-4.5 |
| --- | --- | --- |
| Modèles de chimie (réglage du site) | 0,018 et 0,011 °C évités | 0,100 et 0,066 °C évités |
| Coefficient unique de FaIR | 0,035 et 0,025 °C ajoutés | 0,089 et 0,059 °C évités |
| Coefficient de FaIR partagé entre terre et mer selon le rapport de Hoor et al. | 0,025 et 0,018 °C ajoutés | 0,095 et 0,063 °C évités |

Une copie de Planetshift peut garder le coefficient unique de FaIR (`fair`) ou le partage entre terre et mer du total de FaIR (`hoor`).

### Ce qui reste incertain

- Ces valeurs viennent d'une seule étude, de cinq modèles et d'une seule année.
- Elles sont portées aux autres années et scénarios par l'évolution propre de FaIR, qui croît avec le méthane du scénario. Les 0,70 kg de la route deviennent 2,0 kg en 2100 dans SSP3-7.0.
- Les centrales, les bâtiments et l'industrie prennent la valeur de la route.
- Ce choix ne garde pas le total mondial de FaIR. Sa calibration contraint ce total avec le reste de son bilan de méthane. Il ramène le méthane de tous les NOx du monde à environ la moitié de celui de FaIR.

## Hypothèses

- Laisser de côté l'usage des terres, comme le fait le réglage par défaut, est prudent, car compter la repousse rend le réchauffement évité plus grand.
- FaIR tourne dans l'application sur le CO₂, le méthane, le N₂O et le HFC-134a des leviers : leur réponse n'est pas linéarisée, même pour les leviers d'énergie au maximum. Ce que les leviers changent en dehors de ces gaz (pollution de l'air, traînées des avions, albédo de la repousse, pergélisol) est encore ajouté selon sa réponse autour du scénario de référence. La répartition par famille partage le total de FaIR en proportion de la réponse linéaire de chaque famille (voir [Leviers](#method-levers)).

## Sources

- Poore, J. and Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992.
- Hayek, M. N. et al. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24.
- Hoor, P. et al. (2009). The impact of traffic emissions on atmospheric ozone and OH: results from QUANTIFY. Atmospheric Chemistry and Physics 9, 3113–3136.
- Myhre, G. et al. (2011). Radiative forcing due to changes in ozone and methane caused by the transport sector. Atmospheric Environment 45, 387–394.
- Stevenson, D. S. et al. (2013). Tropospheric ozone changes, radiative forcing and attribution to emissions in the Atmospheric Chemistry and Climate Model Intercomparison Project (ACCMIP). Atmospheric Chemistry and Physics 13, 3063–3085, [doi:10.5194/acp-13-3063-2013](https://doi.org/10.5194/acp-13-3063-2013), as tabulated in Bellouin, N. et al. (2016), Atmospheric Chemistry and Physics 16, 13885–13910, Table 1.
- Persad, G. G. and Caldeira, K. (2018). Divergent global-scale temperature effects from identical aerosols emitted in different regions. Nature Communications 9, 3289, [doi:10.1038/s41467-018-05838-6](https://doi.org/10.1038/s41467-018-05838-6).
- AIE (2025). Global Methane Tracker 2025, [iea.org/reports/global-methane-tracker-2025](https://www.iea.org/reports/global-methane-tracker-2025). Licence : CC BY 4.0.
- Sherwin, E. D. et al. (2024). US oil and gas system emissions from nearly one million aerial site measurements. Nature 627, 328–334, [doi:10.1038/s41586-024-07117-5](https://doi.org/10.1038/s41586-024-07117-5).
- Saunois, M. et al. (2025). Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958, [doi:10.5194/essd-17-1873-2025](https://doi.org/10.5194/essd-17-1873-2025).
- Voigt, C. et al. (2021). Cleaner burning aviation fuels can reduce contrail cloudiness. Communications Earth & Environment 2, 114, [doi:10.1038/s43247-021-00174-y](https://doi.org/10.1038/s43247-021-00174-y).
- Märkl, R. S. et al. (2024). Powering aircraft with 100 % sustainable aviation fuel reduces ice crystals in contrails. Atmospheric Chemistry and Physics 24, 3813–3837, [doi:10.5194/acp-24-3813-2024](https://doi.org/10.5194/acp-24-3813-2024).
- Sand, M. et al. (2023). A multi-model assessment of the Global Warming Potential of hydrogen. Communications Earth & Environment 4, 203, [doi:10.1038/s43247-023-00857-8](https://doi.org/10.1038/s43247-023-00857-8).
- Eisen, M. B. and Brown, P. O. (2022). Rapid global phaseout of animal agriculture has the potential to stabilize greenhouse gas levels for 30 years and offset 68 percent of CO₂ emissions this century. PLOS Climate 1, e0000010.
- Bieker, G. (2021). A global comparison of the life-cycle greenhouse gas emissions of combustion engine and electric passenger cars. ICCT white paper, [theicct.org](https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/).
- AIE (2024). Global EV Outlook 2024, [iea.org/reports/global-ev-outlook-2024](https://www.iea.org/reports/global-ev-outlook-2024). Licence : CC BY 4.0.
- Schlömer, S. et al. (2014). Annex III: Technology-specific cost and performance parameters. In Climate Change 2014: Mitigation of Climate Change, contribution of Working Group III to the IPCC's Fifth Assessment Report, Cambridge University Press, table A.III.2.
