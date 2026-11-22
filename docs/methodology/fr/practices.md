# Pratiques agricoles

Au-delà de ce que l'on mange, les émissions peuvent être réduites là où les aliments sont produits. Planetshift permet d'appliquer sept pratiques agricoles, chacune agissant sur une ou plusieurs sources d'émissions de la ferme. Pour chacune, `practices.json` indique les sources et les gaz sur lesquels elle agit, les groupes d'aliments concernés (quand elle est limitée à certains), de combien elle réduit les émissions qu'elle atteint dans une ferme qui l'adopte (une médiane avec une valeur basse et une valeur haute), et, dans chaque pays, la part de ces émissions qui pourrait l'adopter. Les paramètres, chacun avec une ligne de justification et sa référence, sont dans `pipeline/practices.csv` ; le code est `pipeline/planetshift_pipeline/practices.py`.

## Émissions par source

Une pratique doit savoir quelle partie des émissions d'un produit elle peut atteindre : les additifs alimentaires agissent sur le méthane du rumen d'une vache, pas sur celui de ses effluents. `breakdown.json` répartit chaque intensité de `intensities.json`, pour chaque pays, produit, périmètre et gaz, entre neuf sources : fermentation entérique, gestion des effluents, rizières, engrais de synthèse, engrais organiques, résidus de culture, énergie, fabrication des intrants, et autres. La répartition suit le niveau qui a fixé l'intensité (voir [Émissions par tonne d'aliment](#method-emissions)) :

- **HESTIA** (niveaux 1 et 2) : chaque terme d'émission que l'intensité additionne reçoit une source d'après son identifiant : `EntericFermentation` fermentation entérique, `Excreta` effluents, `FloodedRice` rizières, `InorganicFertiliser` et `UreaHydrolysis` engrais de synthèse, `OrganicFertiliser` engrais organiques, `CropResidue…` résidus, `FuelCombustion` énergie ; les émissions d'arrière-plan de la production du carburant et de l'électricité vont à l'énergie, celles de tous les autres intrants (engrais, pesticides, machines, plastiques) à la fabrication des intrants ; la chaux, l'aquaculture, le traitement des déchets et le reste vont aux autres (voir [Intensités d'émission de HESTIA](#method-hestia)).
- **FAOSTAT** (niveau 3) : l'allocation même qui produit l'intensité garde ses processus séparés : fermentation entérique ; gestion des effluents (bâtiments et stockage) aux effluents ; effluents laissés au pâturage et effluents épandus sur les sols aux engrais organiques, puisque les deux sont de l'azote déposé sur les sols ; culture du riz ; engrais de synthèse ; résidus de culture et leur brûlage aux résidus ; énergie utilisée sur la ferme à l'énergie ; fabrication des engrais et des pesticides à la fabrication des intrants.
- **ACV publiée** (niveau 4) : la répartition FAOSTAT du même produit dans le pays, ou à défaut dans le monde (voir [Intensités d'émission tirées d'ACV publiées](#method-literature)).
- **Substituts** (niveau 5) : la répartition du produit substitut dans le même pays ; un produit transformé prend la répartition de ses produits primaires, pondérée par les émissions que chacun apporte par tonne du produit.

Un gaz que cela laisse sans répartition prend, dans l'ordre, la répartition FAOSTAT du produit dans le pays, puis dans le monde, la répartition mondiale de HESTIA, les mêmes pour ses produits primaires et ses substituts, la répartition mondiale du produit, et enfin « autres ». `world[item]` est la répartition de chaque produit sur tous les pays, pondérée par leurs émissions pour ce produit (intensité × (production moins transformation)). Pour garder le fichier léger, le produit d'un pays est omis quand le pays ne le produit pas ou quand sa répartition est égale à celle du monde ; l'application lit alors celle du monde. Les parts sont arrondies à trois décimales et leur somme vaut 1.

À la ferme, le méthane mondial du modèle (137 Mt) vient à 75 % de la fermentation entérique (102 Mt), à 16 % des rizières (22 Mt), à 7 % de la gestion des effluents (10 Mt) et à 2 % des résidus de culture ; les totaux de FAOSTAT pour 2023 sont de 106, 25 et 10 Mt pour les trois premiers. Le protoxyde d'azote (7,7 Mt) vient à 49 % des engrais organiques, c'est-à-dire des effluents au pâturage et sur les champs (3,7 Mt), à 37 % des engrais de synthèse (2,9 Mt), à 8 % des résidus et à 6 % de la gestion des effluents. Le CO₂ à la ferme (370 Mt) est celui du carburant brûlé sur les fermes (232 Mt), de l'urée (100 Mt) et, dans les autres, du chaulage (38 Mt). Du berceau à la sortie de ferme, le CO₂ monte à 1 505 Mt, dont 746 Mt pour l'énergie et 648 Mt pour la fabrication des intrants.

## Additifs alimentaires

**Ce que font les agriculteurs.** Ils ajoutent à la ration quotidienne un inhibiteur du méthane, le mieux étudié étant le 3-nitrooxypropanol (3-NOP), qui bloque la dernière enzyme qu'utilisent les microbes producteurs de méthane du rumen. L'algue rouge (*Asparagopsis*), les nitrates et les huiles agissent de façon semblable, avec des effets moins réguliers.

**Ce qu'elle réduit.** Le méthane entérique des bovins laitiers et à viande. Une méta-analyse de 14 essais sur vaches laitières trouve que le 3-NOP réduit le méthane de 33 % à la dose habituelle (Kebreab et al. 2023). Une autre, sur des essais avec vaches laitières et bovins à viande, trouve 39,0 % (± 5,4) chez les vaches laitières et 22,2 % (± 3,3) chez les bovins à viande, qui mangent plus de fibres et répondent moins (Dijkstra et al. 2018). Planetshift retient 28 % (20–38 %).

**Où elle s'applique.** L'additif doit être consommé chaque jour : seuls les animaux nourris avec une ration en bâtiment ou en parc d'engraissement peuvent le recevoir. Planetshift suppose que 45 % du méthane visé pourrait l'adopter dans les pays à revenu élevé, où la plupart des vaches laitières sont en bâtiment ou reçoivent une ration complète et où les bovins à viande sont finis en parcs d'engraissement, même si les troupeaux naisseurs pâturent ; 15 % dans les pays à revenu intermédiaire de la tranche supérieure (25 % en Chine, dont la production laitière est passée à de grandes exploitations en bâtiment) ; 7 % dans les pays à revenu intermédiaire de la tranche inférieure et 3 % dans les pays à faible revenu, où les troupeaux sont pastoraux ou tenus par de petits exploitants sans ration quotidienne ; et moins dans les pays à revenu élevé où les animaux pâturent : 5 % en Nouvelle-Zélande, 10 % en Uruguay, 15 % en Australie, 20 % en Irlande.

**Limites.** Les animaux au pâturage ne peuvent pas recevoir l'additif aujourd'hui ; des bolus à libération lente sont à l'essai. L'effet s'atténue avec le temps dans certains essais, et la sécurité et l'acceptation de l'additif diffèrent d'un pays à l'autre. C'est un coût sans gain de rendement : son adoption demande une politique publique ou un prix.

## Sélection et alimentation

**Ce que font les agriculteurs.** Ils donnent un meilleur fourrage (herbe plus jeune, ensilage plus digestible), équilibrent la ration, et sélectionnent des animaux qui grandissent ou donnent du lait plus vite, ou qui produisent moins de méthane pour la même alimentation.

**Ce qu'elle réduit.** Le méthane entérique par kilogramme de lait ou de viande des bovins, des moutons et des chèvres. Une méta-analyse de 430 études trouve qu'un niveau d'alimentation plus élevé, une herbe plus jeune et moins de fourrage dans la ration réduisent l'intensité en méthane de 12 % en moyenne. Planetshift retient 12 % (5–20 %), la valeur haute ajoutant la sélection là où l'écart de productivité est grand.

**Où elle s'applique.** Presque partout : 50 % du méthane visé dans les pays à revenu élevé, où les rations et la génétique sont déjà proches des meilleures ; 70 % dans les pays à revenu intermédiaire, qui ont le plus grand écart et quelques moyens de le combler ; 60 % dans les pays à faible revenu, où les aliments, les services de sélection et le conseil sont rares.

**Limites.** La réduction est par tonne de produit : si les troupeaux gardent leur taille en produisant plus, le total ne baisse pas. Plus d'aliments concentrés, c'est plus de cultures, dont Planetshift compte les émissions sur les cultures. Les additifs alimentaires et la sélection agissent sur le même méthane : leur effet combiné est inférieur à leur somme.

## Gestion des effluents

**Ce que font les agriculteurs.** Ils collectent et traitent les effluents stockés : méthaniseurs qui brûlent le méthane ou le transforment en énergie, couvertures étanches au gaz ou croûtes sur les fosses à lisier, acidification du lisier, séparation des solides, et vidange fréquente des préfosses sous les animaux.

**Ce qu'elle réduit.** Le méthane et le protoxyde d'azote de la gestion des effluents (bâtiments et stockage) de tout le bétail, pas des effluents déposés au pâturage ni épandus sur les champs. Une méta-analyse de 89 études des filières d'effluents liquides trouve que l'évacuation fréquente, les méthaniseurs et l'acidification réduisent le méthane de 29 à 74 % et le N₂O de 21 à 55 %. Planetshift retient 45 % (25–70 %).

**Où elle s'applique.** Les effluents doivent être collectés et stockés dans des fermes assez grandes pour un méthaniseur ou une fosse couverte : 60 % des émissions visées dans les pays à revenu élevé, 40 % dans les pays à revenu intermédiaire de la tranche supérieure (45 % en Chine, dont les porcs sont maintenant surtout élevés dans de grandes exploitations sur lisier), 20 % dans les pays à revenu intermédiaire de la tranche inférieure et 10 % dans les pays à faible revenu, où les effluents sont surtout séchés, gardés en petits tas ou brûlés comme combustible.

**Limites.** Un méthaniseur laisse fuir un peu de méthane, et le digestat peut perdre plus d'ammoniac à l'épandage ; les couvertures réduisent l'ammoniac plus que le méthane. L'essentiel du méthane des effluents vient des systèmes liquides des bovins laitiers et des porcs ; les effluents secs émettent peu.

## Rizières drainées

**Ce que font les agriculteurs.** Ils drainent leurs rizières pendant la saison au lieu de les garder inondées : une fois, en milieu de saison, ou plusieurs fois, en laissant l'eau descendre sous la surface du sol avant de les inonder à nouveau (alternance d'humectation et d'assèchement, AWD).

**Ce qu'elle réduit.** Le méthane des rizières. Le GIEC multiplie le méthane par 0,71 pour un seul drainage et par 0,55 pour des drainages multiples, par rapport à une inondation continue. L'assèchement du sol augmente le N₂O : une méta-analyse trouve que l'inondation non continue réduit le méthane de 53 % et augmente le N₂O de 105 %, ce qui réduit les deux ensemble de 44 % en équivalents CO₂. Le contrat prévoit une seule réduction par pratique : Planetshift déduit donc la hausse du N₂O de la baisse du méthane, soit 45 % du méthane des rizières (25 % pour un seul drainage, 55 % au bas de la fourchette du GIEC pour des drainages multiples).

**Où elle s'applique.** Seulement dans les rizières irriguées où les agriculteurs maîtrisent l'eau, et qui sont encore maintenues inondées : 70 % aux États-Unis et en Égypte, 60 % au Pakistan, au Viet Nam, en Italie et en Espagne, 50 % en Indonésie, aux Philippines et au Brésil, 45 % en Inde et au Bangladesh, 35 % en Chine (irriguée, mais le drainage en milieu de saison y est déjà courant), 30 % en Corée et 20 % au Japon (où c'est la norme), 25 % en Thaïlande, 20 % au Myanmar, 15 % au Cambodge, 10 % au Laos et 5 à 15 % en Afrique subsaharienne, où le riz est surtout pluvial. Ailleurs, 50 % dans les pays à revenu élevé, 40 % dans les pays à revenu intermédiaire de la tranche supérieure, 35 % dans ceux de la tranche inférieure et 10 % dans les pays à faible revenu.

**Limites.** Déduire le N₂O du méthane passe par les équivalents CO₂ sur 100 ans, ce qui sous-estime un peu l'effet à court terme de la baisse du méthane. Un assèchement trop poussé fait baisser les rendements. Là où FAOSTAT compte déjà des rizières drainées, le méthane qui reste à réduire est plus faible que supposé.

## Moins d'azote, mieux employé

**Ce que font les agriculteurs.** Ils donnent aux cultures l'azote dont elles ont besoin, et pas plus : analyses de sol et de plantes, dose juste, apports fractionnés au bon moment, placement près des racines, engrais à efficacité améliorée, légumineuses dans la rotation.

**Ce qu'elle réduit.** Le N₂O des engrais de synthèse au champ, le CO₂ de l'urée, et les émissions de la fabrication de l'engrais qui n'est plus acheté. Une synthèse de 1 521 observations au champ trouve que onze mesures de ce type réduisent ensemble l'usage d'engrais de 21 % et les pertes d'azote de 32 % à rendement égal ou supérieur ; le N₂O baisse plus vite que la dose là où l'azote est en excès, car sa réponse à l'azote n'est pas linéaire. Planetshift retient 25 % (12–35 %).

**Où elle s'applique.** Là où l'on épand plus d'azote que les cultures n'en prélèvent : 80 % des émissions visées en Chine et 70 % en Inde, qui ont les plus grands excédents ; 60 % dans les pays à revenu intermédiaire de la tranche supérieure, 50 % dans les pays à revenu élevé et dans ceux de la tranche inférieure ; 20 % dans les pays à faible revenu et en Afrique de l'Ouest, de l'Est et centrale, où les sols reçoivent trop peu d'azote et où de meilleurs rendements en demandent plus.

**Limites.** La fabrication des intrants de `breakdown.json` comprend aussi les pesticides, les machines et les plastiques, que la pratique ne réduit pas ; appliquer la même réduction à l'ensemble surestime un peu l'effet. « Moins d'azote, mieux employé » et les inhibiteurs de nitrification agissent sur le même N₂O : leur effet combiné est inférieur à leur somme.

## Inhibiteurs de nitrification

**Ce que font les agriculteurs.** Ils achètent un engrais enrobé d'un inhibiteur de nitrification (DCD, DMPP, nitrapyrine), qui ralentit la transformation de l'ammonium en nitrate, d'où se forme le N₂O.

**Ce qu'elle réduit.** Le N₂O des engrais de synthèse. Une méta-analyse trouve que les inhibiteurs réduisent le N₂O direct de 38 % en moyenne ; une autre revue trouve 8 à 57 % selon les études, mais plus d'ammoniac se volatilise, et cet ammoniac ajoute ensuite du N₂O indirect. Le N₂O indirect, environ un cinquième du N₂O des engrais, est à peine réduit. Planetshift retient 30 % (10–45 %).

**Où elle s'applique.** Partout où l'engrais traité peut être acheté et payé : 60 % des émissions visées dans les pays à revenu élevé, 50 % dans les pays à revenu intermédiaire de la tranche supérieure, 30 % dans ceux de la tranche inférieure et 10 % dans les pays à faible revenu.

**Limites.** Des résidus de DCD ont été trouvés dans le lait en Nouvelle-Zélande en 2013, ce qui y a arrêté son usage. Les inhibiteurs coûtent plus que l'engrais économisé dans la plupart des endroits, et agissent moins dans les sols chauds et secs.

## Énergie propre à la ferme

**Ce que font les agriculteurs.** Ils consomment moins de carburant et d'électricité (pompes, moteurs et bâtiments efficaces), passent les pompes, le chauffage et les bâtiments d'élevage à l'électricité renouvelable, et font fonctionner certaines machines à l'électricité ou aux biocarburants.

**Ce qu'elle réduit.** Le CO₂ du carburant et de l'électricité utilisés sur les fermes (dans le périmètre du berceau à la sortie de ferme, aussi la production de ce carburant et de cette électricité). La revue de la FAO sur les systèmes alimentaires économes en énergie et l'évaluation du GIEC décrivent l'efficacité énergétique et les énergies renouvelables comme les principaux leviers ; Planetshift retient 50 % (25 % pour l'efficacité et un réseau plus propre seuls, 80 % avec des machines électriques ou aux biocarburants et une électricité entièrement renouvelable).

**Où elle s'applique.** 80 % des émissions visées dans les pays à revenu élevé, où le réseau et les capitaux sont disponibles, 70 % dans les pays à revenu intermédiaire de la tranche supérieure, dont une grande partie du pompage pour l'irrigation est sur des réseaux qui peuvent être décarbonés, 50 % dans ceux de la tranche inférieure et 40 % dans les pays à faible revenu, avec des pompes et des tracteurs au diesel et un accès moindre au réseau.

**Limites.** Une grande partie de la réduction dépend de la décarbonation du secteur électrique, qui est hors de la ferme ; les machines lourdes sont les plus difficiles à convertir.

## Toutes les pratiques ensemble

Avec toutes les pratiques adoptées en entier, partout où elles s'appliquent, le modèle évite environ 0,9 milliard de tonnes d'équivalent CO₂ par an (GWP100). Le sixième rapport d'évaluation du GIEC (groupe de travail III, chapitre 7, tableau 7.3) évalue le potentiel de réduction du méthane et du protoxyde d'azote agricoles à 0,6 (0,3–1,3) milliard de tonnes par an jusqu'à 100 $ la tonne d'équivalent CO₂, et à 1,7 milliard de tonnes techniquement : l'adoption complète de Planetshift se situe entre les deux.

## Hypothèses

- Une seule réduction par pratique s'applique à chaque source et à chaque gaz qu'elle vise ; la hausse du N₂O des rizières drainées est déduite de la baisse du méthane en équivalents CO₂ sur 100 ans.
- Les parts applicables sont des jugements fondés sur les systèmes agricoles de chaque groupe de revenu et de chaque région, avec une valeur propre pour les pays cités plus haut ; un pays prend sa propre valeur, sinon celle de sa région, sinon celle de son groupe de revenu (Banque mondiale), sinon celle du monde.
- Les pratiques qui agissent sur la même source (additifs alimentaires avec sélection et alimentation ; moins d'azote, mieux employé avec inhibiteurs de nitrification) devraient se combiner par multiplication, pas par addition.
- Les effluents laissés au pâturage et les effluents épandus sur les sols comptent comme engrais organiques, pas comme effluents : la gestion des effluents ne les atteint donc pas.
- La fabrication des intrants est une seule source : « Moins d'azote, mieux employé » réduit donc aussi la fabrication des pesticides et des machines.
- Les intensités tirées de la littérature et des substituts prennent la répartition FAOSTAT de leur produit ; un produit transformé prend la répartition de ses produits primaires ; les produits sans aucune répartition sont comptés dans « autres ».
- La répartition d'un pays pour un produit qu'il ne produit pas est celle du monde.

## Sources

- Kebreab, E. et al. (2023). A meta-analysis of effects of 3-nitrooxypropanol on methane production, yield, and intensity in dairy cattle. Journal of Dairy Science 106, 927–936 : <https://doi.org/10.3168/jds.2022-22211>.
- Dijkstra, J. et al. (2018). Short communication: Antimethanogenic effects of 3-nitrooxypropanol depend on supplementation dose, dietary fiber content, and cattle type. Journal of Dairy Science 101 : <https://doi.org/10.3168/jds.2018-14456>.
- Arndt, C. et al. (2022). Full adoption of the most effective strategies to mitigate methane emissions by ruminants can help meet the 1.5 °C target by 2030 but not 2050. PNAS 119, e2111294119 : <https://doi.org/10.1073/pnas.2111294119>.
- Gerber, P. J. et al. (2013). Tackling climate change through livestock: a global assessment of emissions and mitigation opportunities. FAO : <https://www.fao.org/3/i3437e/i3437e.pdf>.
- Sajeev, E. P. M., Winiwarter, W., Amon, B. (2018). Greenhouse gas and ammonia emissions from different stages of liquid manure management chains: abatement options and emission interactions. Journal of Environmental Quality 47, 30–41 : <https://doi.org/10.2134/jeq2017.05.0199>.
- GIEC (2019). 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories, volume 4, chapitre 5, tableau 5.12 : <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Jiang, Y. et al. (2019). Water management to mitigate the global warming potential of rice systems: a global meta-analysis. Field Crops Research 234, 47–54 : <https://doi.org/10.1016/j.fcr.2019.02.010>.
- Gu, B. et al. (2023). Cost-effective mitigation of nitrogen pollution from global croplands. Nature 613, 77–84 : <https://doi.org/10.1038/s41586-022-05481-8>.
- Shcherbak, I., Millar, N., Robertson, G. P. (2014). Global metaanalysis of the nonlinear response of soil nitrous oxide (N₂O) emissions to fertilizer nitrogen. PNAS 111, 9199–9204 : <https://doi.org/10.1073/pnas.1322434111>.
- Nabuurs, G.-J. et al. (2022). Agriculture, Forestry and Other Land Uses (AFOLU). Dans GIEC AR6, groupe de travail III, chapitre 7 (tableau 7.3, potentiels d'atténuation par mesure) : <https://doi.org/10.1017/9781009157926.009>.
- Akiyama, H., Yan, X., Yagi, K. (2010). Evaluation of effectiveness of enhanced-efficiency fertilizers as mitigation options for N₂O and NO emissions from agricultural soils: meta-analysis. Global Change Biology 16, 1837–1846 : <https://doi.org/10.1111/j.1365-2486.2009.02031.x>.
- Lam, S. K. et al. (2017). Using nitrification inhibitors to mitigate agricultural N₂O emission: a double-edged sword? Global Change Biology 23, 485–489 : <https://doi.org/10.1111/gcb.13338>.
- FAO (2011). Energy-smart food for people and climate. Issue paper : <https://www.fao.org/3/i2454e/i2454e.pdf>.
- FAOSTAT, Emissions from Crops, Emissions from Livestock et Emissions totals : <https://www.fao.org/faostat/en/#data/GT>, CC BY 4.0.
- Évaluations d'impact agrégées de HESTIA, version du 2026-04-30 : <https://hestia.earth/data>, CC BY 4.0.
- Banque mondiale, groupes de pays et de prêt : <https://datahelpdesk.worldbank.org/knowledgebase/articles/906519>, CC BY 4.0.
