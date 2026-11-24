# Terres : cultures, prairies et repousse

Planetshift indique, pays par pays, combien de terres agricoles chaque scénario utilise et combien il en libère. Manger moins d'aliments d'origine animale libère surtout des prairies. Un changement complet vers le végétal en libère presque toutes, 3,0 milliards d'hectares, tandis que les terres cultivées baissent de 0,13 milliard d'hectares, soit 8 %. Planetshift peut aussi compter le dioxyde de carbone que les terres libérées pourraient absorber si on les laissait redevenir forêt. Cette option est désactivée par défaut.

## Les terres agricoles aujourd'hui

L'agriculture utilise environ 4,7 milliards d'hectares, un tiers des terres du monde. Cela fait à peu près 1,6 milliard d'hectares de terres cultivées et 3,1 milliards d'hectares de prairies et pâturages permanents. Ces chiffres viennent des données actuelles d'utilisation des terres de FAOSTAT pour 2024. Our World in Data présente les mêmes données : 36,9 % des terres du monde en 2023 ([graphique](https://ourworldindata.org/grapher/share-of-land-area-used-for-agriculture)).

Les notes antérieures de la FAO donnaient environ 4,8 et 3,2 milliards d'hectares. Elles reposaient sur des versions plus anciennes des mêmes données. Le pipeline lit la surface totale des « prairies et pâturages permanents », pas seulement leur partie cultivée. La différence vient de la révision de la série par FAOSTAT.

## Pourquoi un changement de régime modifie les terres

Quand on mange moins de produits animaux, moins de prairies sont pâturées et moins de cultures fourragères sont produites. Quand on mange plus d'aliments végétaux, plus de cultures alimentaires sont produites. Planetshift compte les deux, pays par pays, et en donne le solde.

Les terres libérées sont des terres qu'un pays n'utilise plus pour l'agriculture, quoi qu'il leur arrive ensuite. Les surfaces sont données en milliards d'hectares ou en millions d'hectares (Mha).

Les chiffres sont dans `land.json`. Le code est `pipeline/planetshift_pipeline/land.py`.

## Quelles terres sont comptées

- **Cultures** : la surface récoltée de chaque culture alimentaire des bilans alimentaires (céréales, légumineuses, oléagineux, racines et tubercules, plantes sucrières, fruits, légumes, fruits à coque, café, cacao, thé et épices), d'après les statistiques des cultures de FAOSTAT. La surface récoltée compte un champ deux fois quand il donne deux récoltes dans l'année (cultures multiples). Elle laisse de côté les jachères, les cultures fourragères et les cultures non alimentaires (fibre de coton, tabac, caoutchouc). Les terres cultivées de FAOSTAT mesurent la surface physique, et sont un peu plus grandes pour ces raisons. Les cultures alimentaires du modèle font en tout 1,55 milliard d'hectares en 2024. Pour la même année, FAOSTAT donne 1,44 milliard d'hectares récoltés et 1,58 milliard d'hectares de terres cultivées (voir les vérifications ci-dessous).
- **Tourteaux** : la part des terres des oléagineux triturés qui va au tourteau donné aux animaux (voir plus bas) : 0,12 milliard d'hectares.
- **Fourrage** : les « prairies et pâturages temporaires » de FAOSTAT, c'est-à-dire de l'herbe semée sur des terres arables pour la pâture ou le foin : 0,14 milliard d'hectares. Elles sont comptées comme terres cultivées, et réparties entre les groupes de ruminants comme leurs prairies.
- **Prairies** : les « prairies et pâturages permanents » de FAOSTAT dans chaque pays : 3,02 milliards d'hectares dans les pays du modèle, sur 3,10 milliards dans le monde. Une grande partie est constituée de parcours : prairies sèches, steppes et broussailles pâturées à faible densité, qui n'ont jamais été des forêts.

Les autres cultures fourragères sur terres arables (maïs ensilage, luzerne, betterave fourragère) ne sont plus déclarées par culture dans FAOSTAT : elles ne sont donc pas comptées. Elles font partie de l'écart entre la surface récoltée et les terres cultivées. L'herbe et le foin ne sont pas non plus des produits des bilans alimentaires (voir la page [Alimentation animale](#method-feed)).

## Comment le modèle fait varier les terres

Pour chaque pays, les terres cultivées du modèle sont la somme sur les produits des hectares par tonne × la production. Pour les cultures primaires, c'est la production moins la transformation. On y ajoute les terres de tourteaux du pays et ses prairies temporaires.

Quand un scénario change la production, les terres cultivées changent avec elle, produit par produit, aux hectares par tonne propres au pays. Cela comprend les cultures fourragères qui ne sont plus produites pour des animaux moins nombreux. Les terres des tourteaux changent avec les animaux qui les mangent.

Les prairies changent avec la production des groupes de ruminants. La part des prairies d'un pays attribuée à chaque groupe varie en proportion de la production du groupe. Si un pays produit moitié moins de bœuf, les prairies attribuées au bœuf sont divisées par deux. Les prairies ne descendent jamais sous zéro. Les prairies temporaires changent de la même façon.

**Exemple.** Avec un changement de 50 %, à protéines égales et avec les options par défaut, le monde libère 1,51 milliard d'hectares de ses 3,02 milliards de prairies. Il libère aussi 65 Mha de ses 1,69 milliard d'hectares de terres cultivées, environ 4 %.

### Les terres cultivées avec un changement complet vers le végétal

Sans aucun produit animal et à protéines égales, les terres cultivées du modèle baissent de 0,13 milliard d'hectares, 8 % de ses 1,69 milliard. À calories égales, elles baissent de 24 %, et avec le mélange riche en légumineuses de 11 %. Presque toutes les prairies (3,0 milliards d'hectares) sont libérées.

Poore et Nemecek (2018) trouvent qu'un tel régime réduirait les terres agricoles de 76 % (3,1 milliards d'hectares), « dont une réduction de 19 % des terres arables ».

### Ce qui décide si les terres cultivées augmentent ou baissent

Trois choix de modélisation transforment une hausse des terres cultivées en baisse. Chacun a été testé sur les données réelles, en ajoutant un choix à la fois :

| Changement | Terres cultivées avec un changement complet, à protéines égales |
| --- | --- |
| Tous les aliments végétaux augmentés du même facteur, l'huile portant toutes les terres de son oléagineux, pas de fourrage | +361 Mha (+23 %) |
| Remplacement par les seuls végétaux riches en protéines d'aujourd'hui (céréales, riz, légumineuses, fruits à coque, oléagineux) | +122 Mha |
| Terres des oléagineux partagées entre huile et tourteau selon leur valeur, la part du tourteau libérée avec les animaux | +6 Mha |
| Prairies temporaires comptées comme fourrage des ruminants, et libérées avec eux. Avec les trois choix, c'est le modèle : la production alimentaire de chaque groupe animal à zéro, les animaux non élevés pour l'alimentation gardés | −129 Mha (−8 %) |

- Augmenter tous les aliments végétaux du même facteur pour remplacer les protéines de la viande ferait monter les fruits de 88 %, les légumes de 74 %, et le sucre, les boissons et les huiles végétales en proportion, alors qu'ils n'apportent presque pas de protéines. Plus d'huile de soja voudrait alors dire plus de champs de soja. Le remplacement par défaut n'ajoute des protéines qu'aux aliments végétaux qu'on mange pour elles (voir [Le changement](#method-shift)). Le restreindre davantage, aux aliments ayant au moins 5 % de protéines, donne environ −2 % avant le fourrage. Mais ce seuil est arbitraire. Il écarte le riz (4,8 %) et les fruits à coque, piliers des protéines végétales dans une grande partie du monde.
- Si les tourteaux ne portaient aucune terre, les champs de soja cultivés pour le tourteau ne pourraient pas être libérés. Le partage selon la valeur est la pratique habituelle des analyses de cycle de vie. Un partage selon la masse donnerait moins de terres à l'huile et plus au tourteau (l'huile de soja 19 % des terres au lieu de 37 %), et un changement complet en libérerait un peu plus.
- Les cultures fourragères sur terres arables sont comptées par les prairies temporaires, la seule culture fourragère que FAOSTAT déclare encore en surface.

### L'écart restant avec Poore et Nemecek

L'écart restant avec les −19 % de Poore et Nemecek a trois causes probables :

- Remplacer les protéines animales par des aliments de base riches en céréales ajoute des calories (de 2 437 à environ 2 545 kcal par jour dans l'exemple de la France) : on cultive donc plus que nécessaire. Garder plutôt les calories égales donne −24 %, proche de leur chiffre. Leur régime garde égales à la fois les protéines et les calories.
- Le maïs ensilage, la luzerne et les autres cultures fourragères ne sont toujours pas comptés.
- Leurs terres arables comptent la surface physique, jachères comprises, là où le modèle compte la surface récoltée.

## Surface cultivée par tonne

Pour chaque pays et chaque culture, le modèle utilise les hectares récoltés par tonne produite. Les cultures des statistiques de production de FAOSTAT sont regroupées en produits des bilans alimentaires avec la même table que pour les émissions (`qcl_items.csv`). Par exemple, le blé va à « Blé et produits », les lentilles et les pois chiches à « Légumineuses, autres », et 15 % d'un champ de coton graine à la graine de coton (le reste est la fibre, hors du modèle).

- Les hectares par tonne sont moyennés sur l'année de référence et les années qui l'encadrent que FAOSTAT a publiées, 2023 et 2024 (2025 n'est pas encore paru) : les hectares de ces années divisés par leurs tonnes. Ainsi, une sécheresse ou une récolte exceptionnelle une année donnée ne fixe pas la valeur. Seules les années-cultures ayant à la fois une surface et une production sont utilisées.
- Il est ensuite exprimé par tonne du produit des bilans alimentaires, qui n'est pas toujours la culture telle que récoltée. Les hectares par tonne de la culture sont multipliés par les tonnes de la culture en 2024 et divisés par la production du produit dans le bilan.
- Une valeur plus de 20 fois au-dessus ou en dessous de la médiane mondiale du produit, pondérée par la production, révèle un décalage entre les deux domaines de FAOSTAT. Elle n'est pas utilisée, comme pour les émissions.

Un pays peut n'avoir aucune valeur propre pour un produit, parce qu'il ne le cultive pas ou parce que sa valeur a été écartée. Il prend alors la médiane de sa région pondérée par la production, ou celle du monde si sa région n'en a pas. Environ 4 100 valeurs pays-produit sont propres au pays, 3 100 viennent de sa région et 2 300 du monde. Les valeurs empruntées remplissent surtout des produits qu'un pays ne cultive pas, qui ne comptent que si le scénario y déplace de la production.

Quelques valeurs mondiales, pondérées par la production : blé 0,28 ha par tonne, maïs 0,17, riz 0,21 (par tonne de production en équivalent paddy dans le bilan), soja 0,37, pommes de terre 0,044, café 1,0.

### Produits transformés

Les terres des produits transformés suivent la règle des émissions (voir la page [Émissions](#method-emissions)), pour qu'aucun hectare ne soit compté deux fois :

- Les terres d'une culture primaire sont ses hectares par tonne × (production − transformation).
- Un produit transformé (huiles végétales, sucre, édulcorants, vin, bière et autres boissons) porte les terres de la culture dont il est tiré. Ce sont les hectares par tonne de son produit primaire divisés par le taux d'extraction, avec les mêmes taux et les mêmes pondérations que pour les émissions.

Une tonne d'huile de soja, tirée d'environ 5,3 tonnes de soja, porte 2,2 ha. Une tonne d'huile de palme porte 0,29 ha, et une tonne de sucre brut 0,12 ha. L'huile de son de riz et l'huile de germe de maïs, sous-produits de la mouture, n'en portent aucune. Le beurre et la crème sont tirés du lait, qui n'utilise pas de terres cultivées propres.

### Huile et tourteau

La trituration d'un oléagineux donne de l'huile et un tourteau donné aux animaux. Le tourteau n'est pas un produit du bilan. Sans correction, les hectares par tonne de l'huile ci-dessus porteraient toute la culture, et aucune terre ne serait libérée quand moins d'animaux mangent du tourteau de soja.

Planetshift partage les terres entre les deux selon leur valeur, comme le font d'ordinaire les analyses de cycle de vie pour les coproduits. On parle d'allocation économique. L'huile garde sa part des hectares par tonne. Le reste des terres que l'huile portait l'année de référence va au tourteau (`oilcakeHa` dans `land.json`, par pays et par oléagineux).

Les parts viennent de `pipeline/oilcakes.csv` : les tonnes de tourteau par tonne d'huile d'après les facteurs de conversion techniques de la FAO (la médiane de leurs tableaux par pays), et les prix mondiaux d'après les données commerciales de FAOSTAT (valeur des exportations sur leur quantité, 2021–2023).

| Huile | Tourteau par tonne d'huile | Huile, \$/t | Tourteau, \$/t | Part des terres pour l'huile |
| --- | --- | --- | --- | --- |
| Soja | 4,4 | 1 277 | 495 | 37 % |
| Colza et moutarde | 1,4 | 1 413 | 354 | 74 % |
| Tournesol | 1,15 | 1 295 | 283 | 80 % |
| Arachide | 1,2 | 1 944 | 398 | 80 % |
| Graine de coton | 2,9 | 1 362 | 247 | 66 % |
| Palmiste | 1,1 | 1 321 | 182 | 87 % |
| Noix de coco (coprah) | 0,53 | 1 571 | 229 | 93 % |
| Sésame | 1,0 | 4 720 | 414 | 92 % |
| Autres oléagineux | 1,8 | 2 272 | 430 | 75 % |

L'huile de palme et l'huile d'olive gardent toutes leurs terres, car le tourteau de pressage du fruit du palmier et les grignons d'olive sont rarement donnés aux animaux.

Les terres du tourteau varient avec la production des groupes animaux qui le mangent, pondérée par les parts fourragères de l'oléagineux (`feed.json`). Avec des parts du commerce fixes, les terres du tourteau suivent la variation mondiale de la production de chaque groupe, puisque le tourteau s'échange comme son huile. Quand chaque pays produit son propre changement, elles suivent la variation du pays. Au total, les tourteaux portent 0,12 milliard d'hectares, surtout le tourteau de soja. Les émissions sont partagées de la même façon, et celles du tourteau suivent les animaux comme ses terres (voir la page [Émissions](#method-emissions)).

## Les prairies et les animaux qui les pâturent

Les prairies de chaque pays sont réparties entre la viande de ruminants et les produits laitiers, en proportion des unités de bétail de chacun, d'après les Livestock Patterns de FAOSTAT. Une unité de bétail pondère les animaux par leurs besoins alimentaires. Ses coefficients varient selon la région : une vache en Amérique du Nord compte plus qu'une vache en Afrique subsaharienne, et un mouton ou une chèvre compte environ un dixième de vache.

- Bovins : le troupeau laitier est la part des bovins qui sont des vaches traites (les « animaux laitiers » de FAOSTAT sur les effectifs de bovins). Comme pour les émissions, 85 % en vont aux produits laitiers et 15 % à la viande des vaches de réforme et des veaux. Le reste du troupeau va à la viande de ruminants.
- Buffles, moutons, chèvres et chameaux : répartis entre lait et viande selon les protéines que produit le troupeau de chaque pays, comme pour leurs émissions.
- Les chevaux, les ânes et les mulets pâturent aussi, mais sont laissés de côté comme pour les émissions (ils sont gardés pour le travail). Les prairies qu'ils utilisent sont réparties entre les ruminants alimentaires. Les porcs et les volailles n'ont pas de prairies.

Un pays absent des Livestock Patterns (le Nicaragua, actuellement) prend le nombre de ses animaux multiplié par les unités de bétail par tête du monde. Un pays qui a des ruminants mais pas de prairies dans FAOSTAT (l'Égypte, les petites îles) a 0 ha de prairies. Dans le monde, les produits laitiers prennent 16 % des prairies et la viande de ruminants 84 %.

## L'usage des terres sur la carte

La couche *Usage des terres* de la carte donne les terres agricoles comptées ici, cultures et prairies, en part de la superficie des terres de chaque pays (la *Superficie des terres* de FAOSTAT, eaux intérieures exclues). Elle donne cette part aujourd'hui et une fois les leviers pleinement en place. Elle montre la place que prend l'agriculture dans un pays : 80 % de l'Arabie saoudite (surtout des parcours), 75 % de l'Inde, 33 % du Brésil, 6 % du Canada. Les cultures sont comptées en surfaces récoltées : une terre cultivée deux fois par an compte deux fois, ce qui relève la part là où la double culture est courante, comme en Inde. Manger moins de viande la réduit là où des prairies et des cultures fourragères sont libérées. Les classes sont fixes (5 %, 10 %, 20 %, 30 %, 45 %, 60 %), pour qu'un changement de scénario se voie comme un changement de couleur. L'infobulle donne les hectares de cultures et de prairies.

## La repousse : une option, désactivée par défaut

Des terres agricoles qui ne sont plus cultivées peuvent, si on les laisse en paix, redevenir forêt ou autre végétation naturelle. En poussant, cette végétation retire du dioxyde de carbone de l'air. Planetshift peut compter cette absorption (*Autres options*, « Terres libérées » : « Végétation spontanée »), mais la laisse désactivée par défaut, pour plusieurs raisons :

- Les terres libérées peuvent ne pas être laissées en paix : elles peuvent servir à la bioénergie, au bois, à d'autres cultures, ou être construites.
- La repousse est lente et incertaine. Elle dépend du climat, du sol, des semenciers à proximité, du feu et du pâturage par les animaux sauvages. Les études trouvent des rythmes qui varient d'un facteur huit au sein d'un même type de forêt.
- Le carbone stocké dans la végétation peut être perdu à nouveau, par le feu, la sécheresse, les ravageurs ou le défrichement.
- Une grande partie des prairies sont des prairies naturelles ou des parcours secs qui ne deviendraient jamais des forêts.

Avec la repousse activée, les terres libérées d'un pays absorbent du CO₂ pendant 30 ans, à un rythme qui dépend de la façon dont la forêt y pousse. Les terres qu'un pays se met à cultiver sont chargées de l'absorption à laquelle elles renoncent.

### Les rythmes

Les rythmes de repousse viennent de Cook-Patton et al. (2020). Ils ont rassemblé 13 112 mesures du carbone absorbé par des forêts en repousse naturelle, et cartographié le rythme des 30 premières années de repousse à 1 km de résolution, dans les biomes de forêt et de savane. Leurs données supplémentaires donnent, pour chaque pays :

- le rythme aérien moyen, ainsi que le plus bas et le plus haut dans le pays ;
- le rythme souterrain (racinaire) moyen ;
- le carbone absorbé si la forêt repoussait sur toute la surface jugée capable de la porter (leur « scénario maximal », qui exclut les terres cultivées).

Planetshift utilise :

- le rythme là où la forêt repousse : aérien + souterrain, en tonnes de carbone par hectare et par an, × 44/12 pour obtenir des tonnes de CO₂. Les rythmes aériens le plus bas et le plus haut, avec les racines dans la même proportion qu'en moyenne, donnent la fourchette ;
- la surface où la forêt pourrait repousser : le carbone du scénario maximal divisé par le rythme moyen ;
- la part des terres agricoles du pays (prairies et cultures, d'après l'utilisation des terres de FAOSTAT) où la forêt repousserait. La plus petite part est cette seule surface, la plus grande est cette surface et toutes les terres cultivées, et la valeur centrale est à mi-chemin. Les prairies sur prairies sèches hors de cette surface n'absorbent rien.

Le rythme par hectare de terres agricoles libérées est alors le rythme de repousse × cette part. Le rythme central va avec la part centrale, le rythme le plus bas avec la plus petite part, et le plus haut avec la plus grande.

En Irlande, presque toutes les terres agricoles pourraient redevenir forêt, et le rythme central est de 12,5 t CO₂ par hectare et par an. Il est de 10,3 au Brésil et de 6,1 en France. Aux États-Unis, il est de 1,8, car une grande partie des prairies sont des parcours de l'Ouest. Il est de 0,3 au Kazakhstan et de 0,1 en Mongolie, surtout de la steppe.

Les pays absents de la table (53 des 187 du modèle, surtout des petites îles et des déserts) sont complétés ainsi :

- Un pays dont moins de 10 % des terres sont boisées (utilisation des terres de FAOSTAT) est considéré comme aride. Il prend le rythme le plus bas de la table, sur au plus ses terres cultivées.
- Un autre pays absent prend les rythmes du pays le plus bas de sa région dans la table, sur une part de ses terres agricoles allant de rien à la totalité.

Les rythmes s'appliquent pendant 30 ans après la libération des terres (`regrowthYears`), la période que cartographient Cook-Patton et al. Ensuite, le modèle ne compte plus d'absorption. Les forêts absorbent le carbone plus lentement en vieillissant, et les rythmes des forêts plus âgées ne font pas partie de la source.

### Ce que donnent les rythmes au total

Si toutes les prairies du modèle étaient libérées, la repousse absorberait environ 8,4 milliards de tonnes de CO₂ par an aux rythmes centraux (de 1,9 à 22 milliards sur la fourchette), et davantage avec les terres cultivées pour l'alimentation animale.

À titre de comparaison, Hayek et al. (2021) trouvent qu'un passage au régime EAT-Lancet permettrait à la végétation d'origine d'absorber 332 milliards de tonnes de CO₂ d'ici 2050 sur les terres qu'il libère, et un régime végétalien 547 milliards, dans la végétation. Le sol et la litière ajouteraient 135 et 225 milliards. Le chiffre végétalien fait environ 18 milliards de tonnes par an sur 30 ans dans la seule végétation. Le chiffre de Planetshift est plus bas, mais du même ordre de grandeur. Ses rythmes sont ceux d'une jeune forêt naturelle là où la forêt peut pousser, et nuls sur les parcours secs.

### Les terres nouvellement utilisées : l'absorption à laquelle elles renoncent

Un scénario peut aussi prendre des terres. Une substitution peut ajouter des cultures : remplacer du poisson par des légumineuses utilise des terres que le poisson n'utilisait pas. Un changement déplace aussi la production vers les pays qui exportent des aliments végétaux, qui cultivent alors davantage qu'avant.

Ne compter que les terres libérées créditerait ce qu'un scénario libère en ignorant ce qu'il prend. Avec la repousse, l'absorption est donc comptée nette, comme un coût d'opportunité carbone (Hayek et al., 2021) :

- Le changement des terres agricoles de chaque pays est d'abord compensé : les cultures qu'il gagne contre les prairies ou cultures qu'il libère. Le solde est soit libéré, soit nouvellement utilisé.
- Les terres libérées nettes absorbent du CO₂ au rythme du pays, comme ci-dessus.
- Les terres nouvellement utilisées nettes sont chargées de ce que le même hectare absorberait s'il était laissé à la repousse. La charge est le rythme du pays, compté comme CO₂ émis, pendant `regrowthYears` ans à partir de l'année où la terre est prise, avec la même rampe et la même borne du rythme. Sur 30 ans, la charge fait le rythme × 30 par hectare : environ 310 t de CO₂ au Brésil, 180 en France, 54 aux États-Unis.

La charge est l'absorption perdue, pas le CO₂ du défrichement d'une forêt sur pied :

- `deforestation.json` donne le CO₂ du défrichement par pays et par produit, mais pas les hectares défrichés : il ne donne donc aucun chiffre par hectare.
- Le défrichement lié à un produit dont la production augmente est déjà compté par le module de la déforestation, qui suit la production (voir [Déforestation](#method-deforestation)).

Chaque pays du modèle a un rythme dans `land.json`. Un pays absent de la table prend la médiane des pays de la table, borne par borne, plutôt que rien. Cela peut arriver dans une version des données ou dans les données de test. Les terres libérées et nouvellement utilisées sont additionnées sur les pays au rythme de chacun : un hectare libéré en Irlande et un hectare pris au Kazakhstan ne s'annulent pas.

Le tableau montre ce que change la compensation, sur les données réelles avec FaIR, SSP2-4.5 et les processus biologiques seulement (`scope=farmGate` ; voir [Climat](#method-climate) et [Options](#method-options)). « Avant » est le résultat sans compensation. Le réchauffement évité est la médiane, avec entre parenthèses, pour 2100, la fourchette de 5 à 95 % des simulations climatiques. Une Gt est un milliard de tonnes.

| Scénario, repousse activée | Absorption nette une fois complet (Gt de CO₂ par an) | Évité en 2050 (°C) | Évité en 2100 (°C) |
| --- | --- | --- | --- |
| Changement complet, avant | 9,20 | 0,186 | 0,379 (0,196–0,836) |
| Changement complet, net | 8,86 | 0,184 | 0,376 (0,196–0,822) |
| Moitié du changement, avant → net | 4,60 → 4,43 | 0,093 → 0,092 | 0,189 → 0,188 |
| Lait végétal pour le lait, avant → net | 1,11 → 1,03 | 0,041 → 0,040 | 0,083 → 0,082 |
| Moitié du poisson en légumineuses, avant → net | 0,01 → −0,09 | 0,0006 → −0,0002 | 0,0017 → 0,0006 |

Avec le changement complet, 14 pays cultivent au total plus de terres qu'avant, 41 Mha ensemble. Avec la substitution du poisson, 103 pays cultivent plus de terres qu'avant, 18 Mha ensemble. Sans la repousse, rien ne change.

## Le CO₂ de l'usage des terres par pays

La couche CO₂ des terres de la carte, à côté de la part des terres cultivées de la couche Usage des terres, donne le CO₂ net de tout changement d'usage des terres dans chaque pays : forêts défrichées pour quelque raison que ce soit, tourbières drainées et autres changements, moins l'absorption de la forêt qui repousse sur les terres abandonnées. C'est l'estimation nationale du Global Carbon Budget 2025, la moyenne de ses trois modèles de comptabilité (BLUE, OSCAR et LUCE), sur 2015–2024. Le total mondial est de 5,03 Gt de CO₂ par an, les 5,0 ± 2,6 Gt que le Global Carbon Budget donne pour cette décennie ; les trois modèles donnent 5,75, 4,73 et 4,60.

Les pays du modèle en portent 5,01 Gt : 5,41 Gt pour les 131 pays qui émettent plus qu'ils n'absorbent et −0,39 Gt pour les 46 puits nets. Le Brésil vient en tête (1,42 Gt), puis l'Indonésie (0,84), la République démocratique du Congo (0,61) et la Russie (0,35). La Chine est le plus grand puits (−0,19 Gt), avec l'Inde (−0,07) et la France (−0,03). Le fichier n'a pas de chiffre pour les Bermudes, Hong Kong, Macao, la Nouvelle-Calédonie, la Polynésie française et Taïwan, que la carte montre sans données ; le reste du total mondial, un peu de terres que la source n'attribue à aucun pays, reste dans `world`.

Le CO₂ du défrichement pour l'agriculture en est une partie (la couche Déforestation en montre la surface) : le défrichement de DeDuCE pour les aliments du modèle, environ 2,0 Gt (voir [Déforestation](#method-deforestation)), à peu près 40 % du total net. Le reste (défrichement pour le bois, les mines ou les villes, drainage des tourbières, autres changements d'usage, moins la repousse) figure dans la bande Usage des terres du graphique des causes comme une seule série mondiale, le CO₂ de l'usage des terres de RCMIP (voir [Causes du réchauffement climatique](#method-link)), et sur cette couche par pays. Le modèle ne change que le défrichement pour l'agriculture, par le changement de régime et le levier déforestation, et ce que stockent les terres libérées ou cultivées, par la repousse et les leviers du carbone des terres agricoles. La couche ajoute deux de ces changements au CO₂ net de l'usage des terres de chaque pays : la variation de son défrichement pour l'agriculture et, quand les terres agricoles libérées repoussent, le CO₂ qu'elles absorbent. Les leviers du carbone des terres agricoles stockent du carbone dans des terres qui restent cultivées, si bien que la couche les laisse de côté. Le reste du CO₂ de l'usage des terres du pays ne change pas, et la note le dit. L'infobulle donne les deux parts. La couche n'ajoute que la variation, elle ne retranche pas une estimation de l'autre. DeDuCE amortit chaque défrichement sur cinq ans et laisse de côté le drainage des tourbières, alors que les modèles de comptabilité comptent la repousse. Le défrichement d'un pays peut donc dépasser son CO₂ net de l'usage des terres. Dans ce cas, arrêter le défrichement peut faire passer la couche sous ce que les modèles de comptabilité donneraient pour ce pays sans lui.

Les totaux UTCATF des inventaires nationaux n'ont pas été utilisés : ils comptent l'absorption des forêts gérées et ne mesurent donc pas le changement d'usage des terres (voir [Causes du réchauffement climatique](#method-link)).

`pipeline/planetshift_pipeline/landuse.py` lit la feuille de chaque modèle et vérifie que ses pays et les colonnes qu'aucun pays ne porte s'additionnent à son total mondial, chaque année (à 0,1 % près ; ils le font à 10⁻⁷ près). Les noms de pays sont associés aux codes ISO3 par les noms anglais de FAOSTAT, puis par `pipeline/landuse_names.csv`.

## Vérifications

`pipeline/tests/test_land_validation.py` compare le `land.json` construit avec FAOSTAT et la littérature :

| | Planetshift | Référence | Tolérance |
| --- | --- | --- | --- |
| Terres cultivées des cultures alimentaires avec leurs tourteaux, 2024 (milliards d'ha) | 1,55 | 1,44 récoltés (FAOSTAT, mêmes pays et mêmes cultures) | 10 % |
| Prairies temporaires (milliards d'ha) | 0,14 | 0,14 (FAOSTAT, monde) | 10 % |
| Prairies (milliards d'ha) | 3,02 | 3,10 (FAOSTAT, monde) | 5 % |
| Blé, monde (ha par tonne) | 0,28 | de 0,25 à 0,4 | |
| Terres des produits animaux, part des terres agricoles | 77 % | environ 83 %, avec l'aquaculture (Poore et Nemecek, 2018) | de 65 % à 85 % |
| Repousse si toutes les prairies étaient libérées (milliards de t de CO₂ par an) | 8,4 | environ 11 (régime EAT-Lancet) à 18 (végétalien) dans la végétation, 2020–2050 (Hayek et al., 2021) | |

Les terres cultivées du modèle dépassent de 8 % la surface récoltée des mêmes cultures dans FAOSTAT. Les produits transformés portent les terres de leurs cultures aux taux d'extraction mondiaux. Ces taux ne correspondent pas exactement à la transformation propre de chaque pays, surtout pour les huiles végétales.

Les terres utilisées pour les produits animaux sont toutes les prairies, les terres des tourteaux et des prairies temporaires, et, pour chaque culture, ses terres cultivées multipliées par la part mondiale de ses usages qui va à l'alimentation animale. Cela fait 3,0 milliards d'hectares de prairies et 0,60 milliard de cultures fourragères, de tourteaux et de fourrage : 77 % des terres agricoles du modèle. Poore et Nemecek (2018) trouvent que la viande, l'aquaculture, les œufs et les produits laitiers utilisent environ 83 % des terres agricoles. Le modèle ne compte aucune culture fourragère hormis les prairies temporaires : sa part est donc un peu plus basse.

Les données d'utilisation des terres de FAOSTAT que lit le pipeline donnent 1,58 milliard d'hectares de terres cultivées en 2024, en accord avec la note de la FAO sur les statistiques des terres 2001–2023.

## Hypothèses

- La surface récoltée tient lieu de terres cultivées : un champ récolté deux fois compte deux fois. Les jachères, les cultures non alimentaires et les cultures fourragères autres que les prairies temporaires ne sont pas comptées.
- Les hectares par tonne sont moyennés sur 2023 et 2024, et exprimés par tonne de la production des bilans alimentaires de l'année de référence.
- Un produit transformé porte les terres de la culture dont il est tiré, aux taux d'extraction mondiaux. Les terres d'un oléagineux trituré sont partagées entre son huile et son tourteau selon leur valeur, et la part du tourteau change avec les animaux qui le mangent.
- Les prairies temporaires sont un fourrage des ruminants, réparti et modifié comme leurs prairies.
- Les pays empruntent la médiane des hectares par tonne de leur région, puis du monde, pondérée par la production, pour les produits qu'ils ne cultivent pas.
- Les prairies sont réparties entre la viande de ruminants et les produits laitiers selon les unités de bétail de FAOSTAT. 85 % du troupeau laitier va au lait. Les chevaux, les ânes et les mulets sont laissés de côté.
- Les prairies d'un pays varient en proportion de la production des groupes de ruminants qui les pâturent.
- Les rythmes de repousse sont les moyennes par pays et la fourchette de Cook-Patton et al. pour les 30 premières années de repousse naturelle de la forêt, aériennes et souterraines, sans le carbone du sol ni le bois mort.
- La forêt repousse sur la surface que Cook-Patton et al. cartographient comme capable de la porter, et sur une part des terres cultivées allant de rien à la totalité. Ailleurs (prairies naturelles, parcours secs), les terres libérées n'absorbent rien.
- Un pays absent de la table de Cook-Patton et al. prend le rythme le plus bas de sa région. Là où moins d'un dixième de ses terres est boisé, il prend le rythme le plus bas de la table, sur ses seules terres cultivées.
- La repousse est une option, désactivée par défaut. Quand elle est activée, chaque hectare qu'un pays libère en net est laissé à la repousse. Chaque hectare qu'il utilise en plus en net est chargé de l'absorption à laquelle il renonce, au même rythme.

## Sources

- FAOSTAT, Cultures et produits de l'élevage (surfaces récoltées, production, effectifs, animaux laitiers) : <https://www.fao.org/faostat/en/#data/QCL>, CC BY 4.0.
- FAOSTAT, Utilisation des terres (terres cultivées, prairies et pâturages permanents et temporaires, forêts, superficie des terres) : <https://www.fao.org/faostat/en/#data/RL>, CC BY 4.0.
- FAOSTAT, Livestock Patterns (unités de bétail par espèce) : <https://www.fao.org/faostat/en/#data/EK>, CC BY 4.0.
- FAOSTAT, Bilans alimentaires (production et transformation) : <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Cook-Patton, S. C. et al. (2020). Mapping carbon accumulation potential from global natural forest regrowth. Nature 585, 545–550, données supplémentaires 1 (rythmes par pays) : <https://doi.org/10.1038/s41586-020-2686-x>. L'article est publié sous licence exclusive à Springer Nature ; les rythmes par pays sont réutilisés avec cette citation, et les cartes sous-jacentes sont sur Global Forest Watch sous licence CC BY 4.0.
- Griscom, B. W. et al. (2017). Natural climate solutions. PNAS 114, 11645–11650 (la surface de reboisement derrière le scénario maximal de Cook-Patton et al.) : <https://doi.org/10.1073/pnas.1710465114>.
- Hayek, M. N., Harwatt, H., Ripple, W. J., Mueller, N. D. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24 : <https://doi.org/10.1038/s41893-020-00603-4>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992 : <https://doi.org/10.1126/science.aaq0216>.
- FAOSTAT, Commerce, cultures et produits de l'élevage (valeur et quantité des exportations d'huiles et de tourteaux, 2021–2023) : <https://www.fao.org/faostat/en/#data/TCL>, CC BY 4.0.
- FAO (2000). Technical Conversion Factors for Agricultural Commodities (huile et tourteau par tonne d'oléagineux trituré) : <https://www.fao.org/economic/the-statistics-division-ess/methodology/methodology-systems/technical-conversion-factors-for-agricultural-commodities/en/>.
- FAO (2025). Land statistics 2001–2023: global, regional and country trends. FAOSTAT Analytical Brief 107 : <https://doi.org/10.4060/cd5765en>.
- FAO (2023). Land statistics and indicators 2000–2021. FAOSTAT Analytical Brief 71 (prairies 3,2 et terres agricoles 4,8 milliards d'hectares en 2021, sur une version antérieure).
- Global Carbon Project (2025). Supplemental data of Global Carbon Budget 2025, National Land Use Change Carbon Emissions 2025 v1.0 (BLUE, OSCAR et LUCE) : <https://doi.org/10.18160/GCP-2025>, CC BY 4.0. Friedlingstein, P. et al. (2026). Global Carbon Budget 2025. Earth Syst. Sci. Data 18, 3211–3288.
