# Comment un changement de régime devient un changement de production

Cette page suit un changement de régime de l'assiette à la ferme, puis jusqu'au réchauffement évité. On mange moins de produits animaux et on reçoit les mêmes protéines (ou les mêmes calories) de produits végétaux. Moins d'animaux demandent alors moins d'aliments, si bien que la production végétale peut baisser comme la production animale, et le changement de ce que produisent les fermes devient un changement des émissions et de la température.

Les curseurs de Planetshift changent ce que l'on mange. La carte montre ce que les fermes produisent, et le graphique le réchauffement dû à cette production.

## Les étapes en bref

1. **La base maintenue.** Chacun garde les mêmes protéines (par défaut) ou les mêmes calories.
2. **Ce qui est retiré.** Chaque groupe animal perd la part de ses disponibilités alimentaires que fixent les curseurs.
3. **Ce qui est ajouté.** Les protéines (ou les calories) retirées reviennent sous forme de produits végétaux, selon le mélange choisi.
4. **Pertes et semences.** Plus d'aliments demandent un peu plus de disponibilités, car une partie se perd et une partie du grain est gardée comme semence.
5. **Alimentation animale.** Moins d'animaux mangent moins, et les cultures qui les nourrissaient baissent.
6. **Où la production change.** La variation de la demande mondiale de chaque produit est répartie entre les pays qui le produisent.
7. **Émissions.** La variation de production de chaque pays est multipliée par les émissions par tonne de chaque produit.
8. **Terres.** La variation de production donne les cultures et les prairies utilisées ou libérées et, en option, le CO₂ que les terres libérées absorbent.
9. **Au fil du temps.** Le changement monte de cette année à l'année choisie, au-dessus d'une référence qui, par défaut, suit la population.
10. **Température.** La variation annuelle de chaque gaz est convertie en variation de température.

Tout part des bilans alimentaires de FAOSTAT (FBS) de l'année de référence, la dernière année aux données complètes (voir [Données](#method-data)). Pour chaque pays et chaque produit, ils donnent la production, les importations et les exportations. Ils donnent aussi l'usage des disponibilités : alimentation humaine, alimentation animale, pertes, transformation, semences et autres utilisations. Les quantités sont en tonnes d'équivalent primaire : un produit transformé est compté comme la quantité de culture ou de produit animal brut qu'il représente.

## Exemple chiffré

Cet exemple utilise les données de test (`app/public/fixtures/`), des chiffres inventés mais plausibles. Il prend la France, un changement de 10 %, protéines maintenues, les végétaux riches en protéines d'aujourd'hui comme remplacement, et chaque pays pour lui-même :

1. Retiré : 10 % de chaque produit animal, par exemple 152 kt de viande bovine et 1 724 kt de lait, ainsi que le poisson.
2. Ajouté : les mêmes protéines réparties selon les végétaux riches en protéines de la France, surtout du blé. Les disponibilités alimentaires de blé augmentent de 1 261 kt, celles de maïs de 115 kt, de riz de 80 kt, d'avoine de 34 kt et de haricots de 23 kt.
3. Disponibilités : les pertes et semences du blé font 8 % de ses disponibilités, qui doivent donc augmenter de 1 261 × 1,087 tonnes.
4. Alimentation animale : avec 10 % d'animaux en moins, l'alimentation animale baisse de 10 %. Le maïs fourrager représente 9,9 Mt, si bien que la production de maïs baisse de 959 kt, alors que le maïs alimentaire augmente de 115 kt. La production de blé n'augmente que de 702 kt, car son usage fourrager (6,0 Mt) baisse.
5. Résultat : les protéines restent à 107,8 g par jour, et l'énergie passe de 2 437 à 2 545 kcal. Les émissions agricoles de la France baissent d'environ 195 kt de CH₄ (méthane), 4,8 kt de N₂O (protoxyde d'azote) et 0,5 Mt de CO₂ par an.

## 1. La base maintenue : protéines ou calories

Un changement retire une partie des disponibilités alimentaires de chaque groupe animal. Il rajoute la même quantité de protéines (par défaut) ou d'énergie (kcal). L'apport de chaque pays sur cette base ne change donc pas.

L'autre varie. Remplacer des protéines de viande par des protéines de blé apporte plus de calories. Remplacer calorie pour calorie apporte moins de protéines.

Les teneurs en protéines et en calories par tonne sont celles des bilans eux-mêmes : les disponibilités alimentaires en protéines et en kcal, divisées par les disponibilités alimentaires en tonnes.

## 2. Ce qui est retiré

Les groupes animaux sont la viande de ruminants, la viande porcine, la volaille, les produits laitiers, les œufs, et les poissons et fruits de mer. Pour chaque groupe, les réglages donnent une part : celle du curseur principal, ou celle d'un curseur par groupe qui la remplace. Chaque produit animal du groupe perd cette part de ses disponibilités alimentaires.

Avec *pays à revenu élevé seulement*, les pays hors du groupe à revenu élevé de la Banque mondiale gardent leur alimentation.

## 3. Ce qui est ajouté

Les protéines (ou les kcal) retirées sont ajoutées à des produits végétaux selon le mélange de remplacement choisi :

- **Les végétaux riches en protéines d'aujourd'hui** (par défaut) : les végétaux riches en protéines que le pays mange aujourd'hui, chacun selon sa part des protéines (ou kcal) qu'ils lui apportent actuellement. Ce sont les aliments qui fournissent l'essentiel des protéines végétales : céréales, riz, légumineuses, fruits à coque et oléagineux mangés pour leurs protéines (soja, arachide, sésame et autres à au moins 10 % de protéines). Les fruits, les légumes, les racines, le sucre, les huiles, les boissons, le café, le cacao et les épices gardent leurs quantités actuelles.
- **Surtout des légumineuses** : 60 % aux légumineuses, 20 % au soja et 20 % aux céréales. Chaque part est répartie selon le mélange actuel du pays en son sein. Ces poids sont une valeur de départ à revoir, pas le résultat d'une étude.
- **Boissons soja et avoine** : moitié au soja, moitié à l'avoine, les deux principales bases des boissons végétales.

Quand un pays ne mange aucun des produits d'une part du mélange, cette part suit le mélange mondial. Quand aucun produit n'existe du tout, la part est abandonnée et les autres sont augmentées d'autant.

### Pourquoi le mélange par défaut se limite aux aliments riches en protéines

Le mélange par défaut a changé en novembre 2026. Il augmentait auparavant tous les aliments végétaux de la même façon. Remplacer les protéines de la viande faisait alors monter les fruits de 80 %, les légumes de 74 %, et le sucre, la bière et les huiles végétales en proportion, alors qu'ils n'apportent presque pas de protéines. Les terres cultivées augmentaient d'un quart avec un changement complet vers le végétal, contre une baisse d'un cinquième chez Poore et Nemecek (2018).

Le remplacement se limite désormais aux aliments qu'on mange pour leurs protéines, et les terres des tourteaux et du fourrage sont comptées (voir [Terres](#method-land)). Ensemble, ces deux choix transforment cette hausse en une baisse de 6 % à protéines égales et de 22 % à calories égales.

## 4. Des aliments aux disponibilités : pertes et semences

Une tonne d'aliments en plus demande plus d'une tonne de disponibilités. Une partie se perd entre la ferme et le magasin, et une partie du grain est gardée comme semence. Les pertes et les semences sont tenues pour des parts fixes des disponibilités intérieures de chaque produit. Un changement d'usage alimentaire ou fourrager change donc les disponibilités de ce changement ÷ (1 − la part des pertes et semences). Ce multiplicateur est plafonné à 3, par précaution contre les lignes aberrantes.

La transformation est tenue fixe : elle ne suit pas le changement. Un produit peut être transformé en un autre : le soja trituré en huile et en tourteau, la canne à sucre en sucre, le lait en beurre. Le produit dérivé figure dans les bilans, avec sa propre production et sa propre intensité d'émission (émissions par tonne). Un changement de la demande d'huile de soja change donc la production d'huile de soja, et ses émissions, et non le soja trituré pour la produire.

Les tourteaux ne sont pas des produits des bilans. Les terres des oléagineux triturés pour les produire, et la part de leurs émissions que porte le tourteau, suivent les animaux qui les mangent (voir [Terres](#method-land)).

## 5. Moins d'animaux, moins d'aliments pour animaux

Les animaux mangent des cultures. Prenons la production d'un groupe animal dans un pays, moins ce qui est transformé : c'est le cheptel dont les émissions et les terres sont comptées. Quand elle baisse d'une fraction, l'usage fourrager de chaque aliment pour animaux baisse de cette fraction × la part de cet aliment donnée à ce groupe.

Les parts viennent de `feed.json`, par région. Une région qui n'en a pas prend les parts mondiales. L'option *Répartition des aliments du bétail* choisit la table (voir [Alimentation animale](#method-feed) et [Options](#method-options)).

L'herbe et les pâturages ne sont pas dans les bilans, ils n'apparaissent donc pas ici. L'alimentation animale baisse souvent plus que l'alimentation humaine n'augmente : la surface cultivée totale et la production végétale peuvent donc reculer avec un changement.

La production animale est placée d'abord (étape 6). La variation de l'alimentation animale est calculée là où se trouvent les animaux, avant que la production végétale soit placée.

Certains produits fourragers sont des produits animaux : le lait donné aux veaux et aux porcelets, et le poisson transformé en farine et donné aux poissons d'élevage, aux porcs et aux volailles. Leur usage fourrager varie de la même façon. Cette variation est placée comme une variation de la demande, en plus de la variation de l'alimentation humaine. Elle est faite une seule fois : le poisson pêché pour la farine est sauvage et ne mange aucun aliment, si bien qu'une variation de sa production ne change pas de nouveau l'alimentation animale, et la variation du lait donné aux veaux est faible. Voir [Poissons et fruits de mer](#method-seafood).

## 6. Où la production change

- **Parts du commerce fixes** (par défaut) : la variation mondiale des disponibilités d'un produit est répartie entre les pays selon leur part de la production mondiale de ce produit. Seul compte ce qui n'est pas transformé en un autre produit (production − transformation). Un pays qui produit 10 % du bœuf mondial perd 10 % de la baisse de la demande mondiale de bœuf, où que soit cette demande. Les parts sont prises sur la production moins la transformation parce que c'est la partie dont le modèle compte les émissions. Un pays qui importe du soja pour le triturer en cultive peu lui-même, et ne prend donc qu'une petite part d'un changement de la demande de soja.
- **Chaque pays pour lui-même** : la production de chaque pays change de sa propre variation de disponibilités, comme s'il produisait tout ce qu'il mange, dans la limite de sa propre production. Une baisse peut être plus grande que ce qu'un pays produit, pour un pays qui mange plus de bœuf qu'il n'en élève. Elle retombe alors sur ses fournisseurs : la part qu'il ne peut pas faire lui-même est répartie entre les producteurs du monde, comme avec les parts du commerce fixes.

Un produit qu'aucun pays ne produit reste là où il est consommé.

Un changement pourrait faire passer la production d'un pays sous ce qu'il transforme (production − transformation inférieure à zéro). Il est arrêté là, et le pays est signalé comme écrêté. Avec les deux options, cela n'arrive que lorsqu'un changement retire un groupe entier (100 %). La baisse d'un produit primaire comme le lait atteint alors sa part transformée, qui est comptée sur le produit transformé (beurre, fromage) et retirée là.

## 7. Émissions

Les émissions d'un pays, pour chaque produit et chaque gaz, sont l'intensité (kg de CO₂, de CH₄ et de N₂O par tonne) × (production − transformation). Soustraire la transformation évite de compter une culture deux fois : la part transformée est comptée sur le produit dérivé. La variation due à un changement est la variation de production × la même intensité.

Les gaz restent séparés jusqu'à la température. L'équivalent CO₂ (CO₂e) les additionne avec leurs poids de réchauffement sur 100 ans (GWP100, voir [Climat](#method-climate)). Il n'est affiché que comme total.

## 8. Les terres

Les terres agricoles d'un pays ont deux parts, tirées de `land.json` (voir [Terres](#method-land)) :

- **Cultures** : pour chaque produit, ses hectares récoltés par tonne × sa production moins la transformation. Ce sont les mêmes tonnes dont on compte les émissions. La surface d'une culture transformée est donc comptée sur le produit dérivé, quand les données donnent à ce produit ses propres hectares.
- **Prairies** : les prairies et pâturages permanents du pays, répartis entre les groupes de ruminants qui les pâturent (viande de ruminants et lait).

Au changement complet, les cultures varient de la variation de production de chaque produit × ses hectares par tonne. La part des prairies de chaque groupe de ruminants varie de la même fraction que la production de ce groupe dans le pays. Par exemple, si la production de bœuf baisse de 40 % et que les bovins à viande pâturent 80 % des prairies, les prairies baissent de 32 %. Les prairies ne descendent jamais sous zéro.

Un pays libère la baisse de ses cultures et de ses prairies prises ensemble. Un pays à qui il faut plus de terres au total n'en libère aucune.

### La repousse sur les terres libérées

Avec la *végétation spontanée* dans les Options, les terres libérées se couvrent à nouveau de végétation naturelle. Elles absorbent du CO₂ au rythme du pays (tonnes de CO₂ par hectare et par an) pendant `regrowthYears` ans après leur libération (30 dans les données).

Les terres se libèrent au rythme de la rampe. Celles libérées une année commencent à absorber du CO₂ cette année-là et s'arrêtent 30 ans plus tard. L'absorption de l'année t est :

absorption(t) = somme sur les pays des hectares libérés nets × le rythme × (rampe(t) − rampe(t − 30))

Un pays qui cultive au total plus de terres qu'avant a des hectares libérés nets négatifs. Il est chargé de l'absorption à laquelle ces terres renoncent (voir [Terres](#method-land)).

Cette absorption est retirée du CO₂ du scénario avant le calcul de la température (étape 10). Elle se voit donc dans la température, dans le réchauffement évité et dans le CO₂ évité.

La température médiane utilise le rythme médian. La borne de 5 % utilise le bas de la fourchette du rythme, et la borne de 95 % le haut. Une réponse faible du climat va ainsi avec une repousse lente, et la fourchette est la plus large que les deux permettent.

### Ce que montre le résumé

Le résumé montre les terres agricoles libérées au changement complet, réparties entre cultures et prairies, et en part des terres agricoles du monde l'année de base. Avec la repousse, il montre aussi le CO₂ absorbé l'année où le changement est complet, par an. C'est l'absorption à son maximum, et elle fait déjà partie du CO₂ évité affiché au-dessus.

## 9. Au fil du temps

Le modèle calcule la variation au changement complet. Sur les années d'aujourd'hui à 2100 :

- **Référence** : avec le choix par défaut, *le régime actuel × la population*, les émissions de chaque année sont celles de l'année de référence × la population mondiale de l'année ÷ la population mondiale de l'année de référence. Avec la *trajectoire SSP2*, elles suivent les émissions agricoles de SSP2-4.5, gaz par gaz, rapportées à l'année de référence. SSP2-4.5 est l'avenir intermédiaire parmi les trajectoires socio-économiques partagées (SSP), les scénarios publiés qu'utilise le GIEC (voir [Climat](#method-climate)).
- **Changement** : la référence plus rampe(t) × la variation au changement complet, mise à l'échelle comme la référence. La rampe vaut 0 l'année en cours. Elle monte en ligne droite jusqu'à 1 l'année choisie (2035 par défaut), et reste à 1. Avec la végétation spontanée, le CO₂ absorbé par les terres libérées (étape 8) est retranché ; il n'est pas mis à l'échelle comme la référence.

Les émissions évitées affichées dans le résumé sont celles de l'année où le changement est atteint.

## 10. Température

Chaque gaz réchauffe le monde à sa façon au fil du temps. Le potentiel absolu de changement de température mondiale (AGTP) d'un gaz est de combien le monde est plus chaud, année après année, après l'émission d'un kilogramme de ce gaz (voir [Climat](#method-climate)). Le réchauffement dû à une variation des émissions additionne, sur les gaz et les années, la variation de chaque année × l'AGTP du gaz après les années écoulées :

ΔT(t) = Σ_gaz Σ_τ≤t ΔE_gaz(τ) · AGTP_gaz(t − τ)

Les courbes d'AGTP viennent d'impulsions simulées avec FaIR, un modèle climatique simple, ou de l'alternative AR6 ; voir [Options](#method-options).

La température de référence est la température publiée du SSP choisi. Avec la référence *population*, on y ajoute une correction : le réchauffement dû à l'écart entre les émissions agricoles mises à l'échelle de la population et la trajectoire agricole propre au SSP, à partir de l'année de référence. La courbe de référence correspond alors aux émissions de référence. La courbe du changement est la référence + ΔT, pour la médiane et pour la fourchette de 5 à 95 % de l'AGTP.

## Hypothèses

- Les régimes changent par parts des disponibilités actuelles de chaque groupe animal ; le mélange au sein d'un groupe ne change pas.
- La base maintenue est conservée exactement dans chaque pays ; l'autre nutriment ne l'est pas.
- Le remplacement par défaut est le mélange actuel de végétaux riches en protéines (céréales, riz, légumineuses, fruits à coque, oléagineux à au moins 10 % de protéines). Le mélange de légumineuses est à 60 % de légumineuses, 20 % de soja et 20 % de céréales, et les boissons soja et avoine à 50 % de soja et 50 % d'avoine : des valeurs de départ à revoir.
- Les pertes et semences sont des parts fixes des disponibilités ; la transformation est fixe en tonnes ; le multiplicateur des disponibilités est plafonné à 3.
- L'alimentation animale baisse en proportion de la production moins la transformation de chaque groupe dans le même pays, comme les prairies et le fourrage. Un groupe animal qu'un pays ne produit pas n'a pas d'alimentation à perdre.
- Le lait et le poisson donnés aux animaux changent une fois, avec les animaux qu'ils nourrissent ; cette variation ne change pas de nouveau l'alimentation animale.
- Parts du commerce fixes ou production nationale : pas de changement dans qui exporte quoi.
- La production ne peut pas descendre sous ce qui est transformé ; ces cas sont écrêtés et signalés.
- Les intensités par tonne ne changent pas avec la quantité produite.
- Les hectares par tonne et les parts des prairies restent ceux de l'année de base : ni les rendements ni le chargement des prairies ne changent avec le changement de régime.
- Les terres d'un oléagineux sont partagées entre son huile et son tourteau selon leur valeur. La part du tourteau suit les animaux qui le mangent, et les prairies temporaires suivent les ruminants, comme les prairies permanentes.
- Les prairies suivent la production des ruminants du même pays, groupe par groupe ; elles ne descendent jamais sous zéro.
- Avec la repousse, les terres libérées et nouvellement utilisées sont compensées dans chaque pays. Les terres nouvellement utilisées nettes sont chargées de l'absorption à laquelle elles renoncent au rythme de repousse du pays, pas du CO₂ du défrichement d'une forêt sur pied. Sans la repousse, ni les unes ni les autres ne comptent.
- Avec la repousse, toutes les terres libérées sont laissées à la végétation naturelle. Elles absorbent du CO₂ à un rythme constant pendant 30 ans, puis plus rien. Un pays sans rythme dans les données prend le rythme médian des autres. L'absorption n'est pas mise à l'échelle de la population.
- La référence garde le régime actuel ; la population et la trajectoire SSP2 sont les seuls moteurs de changement jusqu'en 2100.
- La rampe est linéaire à partir de l'année en cours.
- La réponse de la température est linéaire par rapport à la variation des émissions (de petites variations autour du scénario SSP).

## Où se trouve le code

Le code se trouve dans `app/src/model/` : `diet.ts`, `replacement.ts`, `feed.ts`, `supplyChain.ts`, `location.ts`, `emissions.ts`, `land.ts`, `timePath.ts` et `run.ts`.

## Sources

- FAOSTAT, Bilans alimentaires : https://www.fao.org/faostat/en/#data/FBS
- FAO, Global Livestock Environmental Assessment Model (GLEAM), rations alimentaires : https://www.fao.org/gleam/en/
- Leach N. J. et al. (2021), FaIR v2.0.0, Geoscientific Model Development : https://doi.org/10.5194/gmd-14-3007-2021
- GIEC AR6 GT1, chapitre 7, métriques et AGTP : https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/
- UN DESA (2024). World Population Prospects 2024: Summary of Results. UN DESA/POP/2024/TR/NO. 9 ; les données des WPP 2024 : <https://population.un.org/wpp/>, CC BY 3.0 IGO.
- KC, S., Lutz, W. (2017). The human core of the shared socioeconomic pathways: population scenarios by age, sex and level of education for all countries to 2100. Global Environmental Change 42, 181–192 : <https://doi.org/10.1016/j.gloenvcha.2014.06.004>.
- KC, S. et al. (2024). Updating the Shared Socioeconomic Pathways (SSPs) global population and human capital projections. IIASA Working Paper WP-24-003.
- Our World in Data, Population (série de long terme tirée de HYDE 3.3, Gapminder v7 et des WPP 2024) : <https://ourworldindata.org/population-growth>, CC BY 4.0.
- Klein Goldewijk, K. et al. (2017). Anthropogenic land use estimates for the Holocene: HYDE 3.2. Earth System Science Data 9, 927–953 : <https://doi.org/10.5194/essd-9-927-2017>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992 : https://doi.org/10.1126/science.aaq0216
