# Comment un changement de régime devient un changement de production

Un changement de régime change ce qu'on mange, puis ce que produisent les fermes, puis le réchauffement dû à l'agriculture. On mange moins de produits animaux et on reçoit les mêmes protéines (ou les mêmes calories) de produits végétaux. Moins d'animaux demandent alors moins d'aliments, si bien que la production végétale peut baisser comme la production animale. Le changement de ce que produisent les fermes devient un changement des émissions et de la température.

Les curseurs de Planetshift changent ce que l'on mange. La carte montre ce que les fermes produisent, et le graphique le réchauffement dû à cette production.

## Les étapes en bref

1. **La base maintenue.** Chacun garde les mêmes protéines (par défaut) ou les mêmes calories.
2. **Ce qui est retiré.** Chaque groupe animal perd la part de ses disponibilités alimentaires que fixent les curseurs.
3. **Ce qui est ajouté.** Les protéines (ou les calories) retirées reviennent sous forme de produits végétaux, selon le mélange choisi. Le riz et l'huile de palme peuvent ensuite être remplacés par d'autres céréales et d'autres huiles végétales à calories égales (voir « Remplacer le riz et l'huile de palme » plus bas).
4. **Pertes et semences.** Plus d'aliments demandent un peu plus de disponibilités, car une partie se perd et une partie du grain est gardée comme semence.
5. **Alimentation animale.** Moins d'animaux mangent moins, et la production des cultures fourragères baisse.
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
3. Disponibilités : les pertes et semences du blé font 8 % de ses disponibilités, qui augmentent donc de 1 261 × 1,087 tonnes.
4. Alimentation animale : la production animale de la France baisse d'un peu plus de 10 %. Chaque produit animal baisse de la part retirée de son usage mondial (étape 5), et l'alimentation animale baisse avec elle. Le maïs fourrager représente 9,9 Mt, si bien que la production de maïs baisse de 1 106 kt, alors que le maïs alimentaire augmente de 115 kt. La production de blé n'augmente que de 606 kt, car son usage fourrager (6,0 Mt) baisse.
5. Résultat : les protéines restent à 107,8 g par jour, et l'énergie passe de 2 437 à 2 545 kcal. Les émissions agricoles de la France baissent d'environ 224 kt de CH₄ (méthane), 5,6 kt de N₂O (protoxyde d'azote) et 0,6 Mt de CO₂ par an.

## 1. La base maintenue : protéines ou calories

Un changement retire une partie des disponibilités alimentaires de chaque groupe animal. Il rajoute la même quantité de protéines (par défaut) ou d'énergie (kcal). L'apport de chaque pays sur cette base ne change donc pas.

L'autre nutriment varie. Remplacer des protéines de viande par des protéines de blé apporte plus de calories. Remplacer calorie pour calorie apporte moins de protéines.

Les teneurs en protéines et en calories par tonne sont celles des bilans eux-mêmes : les disponibilités alimentaires en protéines et en kcal, divisées par les disponibilités alimentaires en tonnes.

## 2. Ce qui est retiré

Les groupes animaux sont la viande de ruminants, la viande porcine, la volaille, les produits laitiers, les œufs, et les poissons et fruits de mer. Pour chaque groupe, les réglages donnent une part : celle du curseur principal, ou celle d'un curseur par groupe qui la remplace. Chaque produit animal du groupe perd cette part de ses disponibilités alimentaires.

Un changement de 100 % signifie qu'aucun animal n'est plus élevé pour l'alimentation : la production de chaque groupe animal tombe à zéro. Les animaux qui ne sont pas élevés pour l'alimentation (bœufs et buffles de trait, chevaux et ânes, la plupart des bovins de l'Inde) restent, et leurs émissions aussi (voir [Émissions par tonne d'aliment](#method-emissions)).

Avec *pays à revenu élevé seulement*, les pays hors du groupe à revenu élevé de la Banque mondiale gardent leur alimentation.

## 3. Ce qui est ajouté

Les protéines (ou les kcal) retirées sont ajoutées à des produits végétaux selon le mélange de remplacement choisi :

- **Les végétaux riches en protéines d'aujourd'hui** (par défaut) : chacun de ces aliments reçoit une part des protéines (ou kcal) ajoutées égale à sa part des protéines (ou kcal) qu'ils apportent actuellement au pays. Ce sont les aliments qui fournissent l'essentiel des protéines végétales : céréales, riz, légumineuses, fruits à coque et oléagineux mangés pour leurs protéines (soja, arachide, sésame et autres à au moins 10 % de protéines). Les fruits, les légumes, les racines, le sucre, les huiles, les boissons, le café, le cacao et les épices gardent leurs quantités actuelles.
- **Surtout des légumineuses** : 60 % aux légumineuses, 20 % au soja et 20 % aux céréales. Chaque part est répartie selon le mélange actuel du pays en son sein. Ces poids sont une valeur de départ à revoir, pas le résultat d'une étude.
- **Boissons soja et avoine** : moitié au soja, moitié à l'avoine, les deux principales bases des boissons végétales.

Quand un pays ne mange aucun des produits d'une part du mélange, cette part suit le mélange mondial. Quand aucun produit n'existe du tout, la part est abandonnée et les autres sont augmentées d'autant.

### Pourquoi le mélange par défaut se limite aux aliments riches en protéines

Un mélange qui augmenterait tous les aliments végétaux du même facteur ferait monter les fruits de 88 % et les légumes de 74 % pour remplacer les protéines de la viande. Le sucre, la bière et les huiles végétales augmenteraient en proportion, alors qu'ils n'apportent presque pas de protéines. Les terres cultivées augmenteraient de près d'un quart avec un changement complet vers le végétal, contre une baisse d'un cinquième chez Poore et Nemecek (2018).

Le remplacement se limite donc aux aliments qu'on mange pour leurs protéines, et les terres des tourteaux et du fourrage sont comptées (voir [Terres](#method-land)). Ensemble, ces deux choix transforment cette hausse en une baisse de 8 % à protéines égales et de 24 % à calories égales.

## 4. Des aliments aux disponibilités : pertes et semences

Une tonne d'aliments en plus demande plus d'une tonne de disponibilités. Une partie se perd entre la ferme et le magasin, et une partie du grain est gardée comme semence. Les pertes et les semences sont tenues pour des parts fixes des disponibilités intérieures de chaque produit. Un changement d'usage alimentaire ou fourrager change donc les disponibilités de ce changement ÷ (1 − la part des pertes et semences). Ce multiplicateur est plafonné à 3, pour limiter l'effet des lignes aberrantes des données.

La transformation est tenue fixe : elle ne suit pas le changement. Un produit peut être transformé en un autre : le soja trituré en huile et en tourteau, la canne à sucre en sucre, le lait en beurre. Le produit dérivé figure dans les bilans, avec sa propre production et sa propre intensité d'émission (émissions par tonne). Un changement de la demande d'huile de soja change donc la production d'huile de soja, et ses émissions, et non le soja trituré pour la produire.

Les tourteaux ne sont pas des produits des bilans. Les terres des oléagineux triturés pour les produire, et la part de leurs émissions que porte le tourteau, suivent les animaux qui les mangent (voir [Terres](#method-land)).

## 5. Moins d'animaux, moins d'aliments pour animaux

Les animaux mangent des cultures. Pour chaque groupe animal, les émissions et les terres sont comptées sur la production du pays moins ce qui est transformé. Quand celle-ci baisse d'une fraction, l'usage fourrager de chaque aliment pour animaux baisse de cette fraction × la part de cet aliment donnée à ce groupe.

Les parts viennent de `feed.json`, par région. Une région qui n'en a pas prend les parts mondiales. L'option *Répartition des aliments du bétail* choisit la table (voir [Alimentation animale](#method-feed) et [Options](#method-options)).

L'herbe et les pâturages ne sont pas dans les bilans, ils n'apparaissent donc pas ici. L'alimentation animale baisse souvent plus que l'alimentation humaine n'augmente : la surface cultivée totale et la production végétale peuvent donc reculer avec un changement.

La production animale est placée d'abord (étape 6). La variation de l'alimentation animale est calculée là où se trouvent les animaux, avant que la production végétale soit placée.

Certains produits fourragers sont des produits animaux : le lait donné aux veaux et aux porcelets, et le poisson transformé en farine et donné aux poissons d'élevage, aux porcs et aux volailles. Leur usage fourrager suit la variation mondiale des groupes qu'ils nourrissent, qui vient de la variation de l'alimentation humaine. Cette variation est traitée comme une variation de la demande, en plus de la variation de l'alimentation humaine. Elle est faite une seule fois. Le poisson pêché pour la farine est sauvage et ne mange aucun aliment, si bien qu'une variation de sa production ne change pas de nouveau l'alimentation animale. La variation du lait donné aux veaux est faible. Voir [Poissons et fruits de mer](#method-seafood). L'alimentation animale tirée des cultures suit ensuite la variation de la production animale de chaque pays, lait et poisson donnés aux animaux compris.

Un produit animal a aussi des usages qui ne sont ni l'alimentation humaine ni l'alimentation animale : le suif et le saindoux pour le savon et le carburant, le lait pour l'industrie, et l'écart entre les importations et les exportations enregistrées dans le monde. Ils viennent d'animaux élevés pour l'alimentation, et varient donc avec eux. La production de chaque produit animal varie de la même fraction que son usage mondial en alimentation humaine et animale. Une variation de cet usage est multipliée par la production mondiale du produit moins la transformation, divisée par cet usage. Les graisses animales brutes, dont la moitié des disponibilités va à ces usages, baissent de moitié avec un changement de 50 %, et non d'un quart.

## 6. Où la production change

- **Parts du commerce fixes** (par défaut) : la variation mondiale des disponibilités d'un produit est répartie entre les pays selon leur part de la production mondiale de ce produit. Seul compte ce qui n'est pas transformé en un autre produit (production − transformation). Un pays qui produit 10 % du bœuf mondial perd 10 % de la baisse de la demande mondiale de bœuf, où que soit cette demande. Les parts sont prises sur la production moins la transformation parce que c'est la partie dont le modèle compte les émissions. Un pays qui importe du soja pour le triturer en cultive peu lui-même, et ne prend donc qu'une petite part d'un changement de la demande de soja.
- **Chaque pays pour lui-même** : la production de chaque pays change de sa propre variation de disponibilités, comme s'il produisait tout ce qu'il mange, dans la limite de sa propre production. Une baisse peut être plus grande que ce qu'un pays produit, pour un pays qui mange plus de bœuf qu'il n'en élève. Elle retombe alors sur ses fournisseurs : la part qu'il ne peut pas faire lui-même est répartie entre les producteurs du monde, comme avec les parts du commerce fixes.

Un produit qu'aucun pays ne produit reste là où il est consommé.

Un changement pourrait faire passer la production d'un pays sous ce qu'il transforme (production − transformation inférieure à zéro). La variation s'arrête là, et le pays est signalé comme écrêté. Un changement de régime seul ne le fait pas, même à 100 %, car la production animale baisse de la part retirée de son usage.

La production affichée par groupe est la production moins ce qui est transformé en un autre produit : les tonnes dont les émissions sont comptées. Le lait transformé en beurre ou en crème est compté sur le beurre et la crème, si bien qu'il n'est pas compté deux fois, et un changement de 100 % amène le groupe des produits laitiers à zéro.

## 7. Émissions

Les émissions d'un pays, pour chaque produit et chaque gaz, sont l'intensité (kg de CO₂, de CH₄ et de N₂O par tonne) × (production − transformation). Soustraire la transformation évite de compter une culture deux fois : la part transformée est comptée sur le produit dérivé. La variation due à un changement est la variation de production × la même intensité.

Les gaz restent séparés jusqu'au calcul de la température. L'équivalent CO₂ (CO₂e) les additionne avec leurs poids de réchauffement sur 100 ans (GWP100, voir [Climat](#method-climate)). Il n'est affiché que comme total.

## 8. Les terres

Les terres agricoles d'un pays ont deux parts, tirées de `land.json` (voir [Terres](#method-land)) :

- **Cultures** : pour chaque produit, ses hectares récoltés par tonne × sa production moins la transformation. Ce sont les mêmes tonnes dont on compte les émissions. La surface d'une culture transformée est donc comptée sur le produit dérivé, quand les données donnent à ce produit ses propres hectares.
- **Prairies** : les prairies et pâturages permanents du pays, répartis entre les groupes de ruminants qui les pâturent (viande de ruminants et lait).

Au changement complet, les cultures varient de la variation de production de chaque produit × ses hectares par tonne. La part des prairies de chaque groupe de ruminants varie de la même fraction que la production de ce groupe dans le pays. Par exemple, si la production de bœuf baisse de 40 % et que les bovins à viande pâturent 80 % des prairies, les prairies baissent de 32 %. La production d'un groupe compte le beurre et la crème en tonnes du lait dont ils sont faits, par leurs taux d'extraction. Une tonne de beurre compte pour 17,9 t de lait. Moins de beurre réduit donc les prairies du troupeau laitier, comme le ferait moins de ce lait. Les prairies ne descendent jamais sous zéro.

Les terres qu'un pays libère sont la baisse de ses cultures et de ses prairies, additionnées. Un pays à qui il faut plus de terres au total n'en libère aucune.

### La repousse sur les terres libérées

Avec la *végétation spontanée* dans *Autres options*, les terres libérées se couvrent à nouveau de végétation naturelle. Elles absorbent du CO₂ au rythme du pays (tonnes de CO₂ par hectare et par an) pendant `regrowthYears` ans après leur libération (30 dans les données).

Les terres se libèrent au rythme de la rampe. Celles libérées une année commencent à absorber du CO₂ cette année-là et s'arrêtent 30 ans plus tard. L'absorption de l'année $t$ est, sur les pays $c$, avec $h_c$ leurs hectares libérés nets :

$$
\text{absorption}(t) = \sum_{c} h_c \times \text{rythme} \times \big(\text{rampe}(t) - \text{rampe}(t - 30)\big)
$$

Un pays qui cultive au total plus de terres qu'avant a des hectares libérés nets négatifs. L'absorption à laquelle ces terres renoncent est comptée contre lui (voir [Terres](#method-land)).

Cette absorption est retirée du CO₂ du scénario avant le calcul de la température (étape 10). Elle se voit donc dans la température, dans le réchauffement évité et dans le CO₂ évité.

La température médiane utilise le rythme médian. La borne de 5 % utilise le bas de la fourchette du rythme, et la borne de 95 % le haut. Une réponse faible du climat est donc associée à une repousse lente, ce qui rend la fourchette aussi large que les deux le permettent.

### Ce que montre le résumé

Le résumé montre les terres agricoles libérées au changement complet, réparties entre cultures et prairies, et en part des terres agricoles du monde l'année de base. Avec la repousse, il montre aussi le CO₂ absorbé en une seule année, celle où le changement est complet. C'est l'absorption à son maximum, et elle fait déjà partie du CO₂ évité affiché au-dessus.

## 9. Au fil du temps

Le modèle calcule la variation au changement complet. Sur les années d'aujourd'hui à 2100 :

- **Référence** : avec le choix par défaut, *le régime actuel × la population*, les émissions de chaque année sont celles de l'année de référence × la population mondiale de l'année ÷ la population mondiale de l'année de référence. Avec la *trajectoire SSP2*, elles suivent les émissions agricoles de SSP2-4.5, gaz par gaz, rapportées à l'année de référence. SSP2-4.5 est l'avenir intermédiaire parmi les trajectoires socio-économiques partagées (SSP), les scénarios publiés qu'utilise le GIEC (voir [Climat](#method-climate)).
- **Changement** : la référence plus rampe(t) × la variation au changement complet, mise à l'échelle comme la référence. La rampe vaut 0 l'année en cours. Elle monte en ligne droite jusqu'à 1 l'année choisie (2035 par défaut), et reste à 1. Avec la végétation spontanée, le CO₂ absorbé par les terres libérées (étape 8) est retranché. Il n'est pas mis à l'échelle comme la référence.
- **Électricité des fermes** : la part de la variation qui est le CO₂ de l'électricité du réseau utilisée par les fermes (du berceau à la sortie de ferme, voir [Pratiques agricoles](#method-practices)) suit aussi le réseau. Chaque année, elle est multipliée par l'intensité du réseau mondial du SSP choisi cette année-là rapportée à celle de cette année : avec SSP2-4.5, 0,58 en 2050 et zéro en 2100. L'électricité qu'un changement de régime économise évite donc moins de CO₂ à mesure que le réseau devient plus propre. Sans `sectors.json`, elle reste au réseau de cette année.

Les émissions évitées affichées dans le résumé sont celles de l'année où le changement est atteint.

## 10. Température

Chaque gaz réchauffe le monde à sa façon au fil du temps. Le potentiel absolu de changement de température mondiale (AGTP) d'un gaz est de combien le monde est plus chaud, année après année, après l'émission d'un kilogramme de ce gaz (voir [Climat](#method-climate)). Le réchauffement dû à une variation des émissions s'additionne sur les gaz et les années. La variation de chaque année est multipliée par l'AGTP du gaz pour le nombre d'années écoulées depuis :

$$
\Delta T(t) = \sum_{\text{gaz}} \sum_{\tau \le t} \Delta E_{\text{gaz}}(\tau) \cdot \mathrm{AGTP}_{\text{gaz}}(t - \tau)
$$

Les courbes d'AGTP viennent d'impulsions simulées avec FaIR, un modèle climatique simple, ou de l'alternative AR6 (voir [Options](#method-options)).

La température de référence est la température publiée du SSP choisi. Avec la référence *population*, on y ajoute une correction : le réchauffement dû à l'écart entre les émissions agricoles mises à l'échelle de la population et la trajectoire agricole propre au SSP, à partir de l'année de référence. La courbe de référence correspond alors aux émissions de référence. La courbe du changement est la référence + ΔT, pour la médiane et pour la fourchette de 5 à 95 % de l'AGTP.

## Remplacer le riz et l'huile de palme

Deux aliments végétaux peuvent aussi être remplacés : le riz et l'huile de palme. Ils ne font pas partie du changement de régime, qui remplace des aliments animaux par des végétaux. Chacun a son propre levier dans le groupe *Substitution d'aliments végétaux*, sous Agriculture, avec sa propre famille dans la décomposition. À 0 %, on les mange comme aujourd'hui. À 100 %, on n'en mange plus, et d'autres aliments apportent les mêmes calories. Le levier agit sur ce qui est mangé une fois les aliments animaux déplacés. Le riz que le changement de régime ajoute est donc remplacé lui aussi. Il s'applique dans tous les pays, quel que soit le réglage *Où* du régime. C'est une étape de production qui vient avant la réduction du gaspillage. La nourriture qui n'est plus gaspillée est celle d'après la substitution.

### Quels aliments

Les aliments ont été choisis à partir des données du modèle. Pour chaque aliment végétal, ses émissions par tonne sont rapportées à ses calories par tonne dans les FBS. Les émissions sont des moyennes mondiales et comprennent la ferme, les intrants et les terres qu'il occupe : forêt défrichée et sols organiques drainés (voir [Déforestation](#method-deforestation)). En kg de CO₂e (à 100 ans) pour 1 000 kcal :

| Aliment | Total | Dont méthane | Dont terres | Calories mangées, 10¹² kcal par an |
| --- | --- | --- | --- | --- |
| Thé | 59 | 3,2 | 3,3 | 1 |
| Café | 15 | 0,5 | 7,5 | 5 |
| Tomates, autres légumes, fruits | 2 à 4 | moins de 0,1 | moins de 1 | 34 à 249 chacun |
| Cacao | 1,8 | 0,04 | 1,4 | 22 |
| Riz | 0,83 | 0,35 | 0,07 | 1 527 |
| Huile de palme | 0,69 | 0,02 | 0,38 | 211 |
| Blé | 0,44 | 0,01 | 0,03 | 1 613 |
| Huiles de colza, de tournesol | 0,37 à 0,38 | 0,01 | 0,05 à 0,09 | 102 à 131 |
| Maïs | 0,31 | 0,01 | 0,04 | 421 |
| Huile de soja | 0,26 | 0,02 | 0,05 | 277 |

Un aliment vaut d'être remplacé quand il émet bien plus par calorie que les aliments qui prendraient sa place, et qu'on en tire beaucoup de calories. Le riz émet par calorie environ deux fois plus que le blé et près de trois fois plus que le maïs, surtout à cause du méthane des rizières inondées. C'est la deuxième source de calories après le blé. L'huile de palme émet environ deux fois plus que les autres huiles végétales, surtout à cause de la forêt défrichée et de la tourbe drainée pour le palmier à huile en Indonésie et en Malaisie.

D'autres aliments sont laissés de côté :

- **Le café, le thé et le cacao** émettent le plus par calorie, mais on ne boit pas le café ou le thé pour leurs calories, et aucun aliment ne les remplace calorie pour calorie. Les remplacer à masse égale demanderait un substitut, et aucun ne s'impose. Leurs empreintes alimentaires sont faibles : 0,04 à 0,09 Gt de CO₂e par an chacun.
- **Les légumes et les fruits** émettent beaucoup par calorie parce qu'ils apportent peu de calories. On les mange pour leurs vitamines et leurs fibres, et la plupart des régimes sains en demandent plus, pas moins.
- **Le sucre**, à 0,33 kg pour 1 000 kcal, n'émet pas plus que les céréales. Le défrichement pour la canne à sucre est compté sur le sucre qu'on en tire.
- **Le manioc** émet 0,75 kg pour 1 000 kcal, en bonne partie par les terres. C'est un aliment de base des pays les plus pauvres. Le remplacer par des céréales demanderait des importations, et la plupart de ces pays ne peuvent pas compter dessus.

### Leurs substituts

- **Riz → les autres céréales du pays** : blé, maïs, millet, sorgho, orge, avoine, seigle et autres céréales, chacune selon sa part des calories que le pays en tire. En Inde, Davis et al. (2018) trouvent que remplacer le riz par du maïs, du millet ou du sorgho à calories égales réduirait l'eau d'irrigation et augmenterait les apports en fer et en zinc. Les substituts gardent le mélange propre au pays : le blé en Inde, en Chine et en Indonésie, le blé et le maïs aux Philippines et au Viêt Nam, le maïs et le sorgho au Nigeria. Un pays qui ne mange aucune de ces céréales prend le mélange mondial.
- **Huile de palme → les autres huiles végétales du pays** : huiles de soja, de colza, de tournesol, d'arachide, de coton, de coco, de sésame, d'olive, de son de riz, de germe de maïs et autres huiles, chacune selon sa part des calories que le pays en tire. L'huile de palmiste vient des mêmes plantations : elle est remplacée en même temps que l'huile de palme. Meijaard et al. (2020) et Beyer et al. (2021) notent que les autres huiles donnent moins d'huile par hectare. Le modèle en tient compte, puisque chaque substitut apporte ses propres terres, son défrichement et ses émissions par tonne.

Les substituts suivent la même chaîne que les aliments ajoutés par le changement des aliments animaux. Elle couvre les pertes et semences, le pays qui les cultive (commerce fixe par défaut), leurs émissions, leurs terres et leur défrichement. Le défrichement et les sols drainés du palmier à huile varient avec l'huile de palme, par son taux d'extraction (voir [Déforestation](#method-deforestation)).

### Ce que cela change

À 100 %, avec les réglages par défaut (SSP2-4.5, montée jusqu'en 2035), remplacer le riz évite 0,021 °C en 2050 et 0,049 °C en 2100. Le méthane des rizières baisse de 71 % en Thaïlande, 69 % aux Philippines, 55 % au Viêt Nam, 46 % en Indonésie, 30 % en Chine et 16 % en Inde. Remplacer l'huile de palme évite moins de 0,001 °C en 2050 et 0,002 °C en 2100. La forêt défrichée pour l'agriculture baisse de 17 % en Indonésie et de 22 % en Malaisie, et le CO₂ des sols drainés de 22 % et 18 %. L'huile de palme ajoute peu de réchauffement à cette échelle : l'alimentation représente environ un quart de l'huile de palme utilisée dans le monde, et son défrichement et sa tourbe drainée émettent du CO₂, qui s'accumule lentement, tandis que le méthane du riz réchauffe fortement en quelques décennies.

### Limites

- Les protéines affichées après le changement sont celles du régime. Elles n'incluent pas la petite variation de protéines due à la substitution, ni celle due à la réduction du gaspillage.
- Seul l'usage alimentaire du riz et de l'huile de palme change. Les FBS comptent environ un quart de l'huile de palme du monde comme aliment. Le reste, brûlé comme biodiesel, utilisé dans les savons et les cosmétiques ou transformé, n'est pas couvert.
- Les substituts sont mangés dans les proportions d'aujourd'hui. Leurs prix ne sont pas modélisés, ni les habitudes de cuisine et de goût liées au riz.
- La demande supplémentaire de substituts n'augmente ni leurs rendements ni leurs prix. Elle ne change pas non plus l'endroit où ils sont cultivés, en dehors de l'option de commerce.
- Les huiles de son de riz et de germe de maïs, sous-produits de la mouture, sont des substituts comme les autres.

## Hypothèses

- Les régimes changent par parts des disponibilités actuelles de chaque groupe animal ; le mélange au sein d'un groupe ne change pas.
- La base maintenue est conservée exactement dans chaque pays. L'autre nutriment ne l'est pas.
- Le remplacement par défaut est le mélange actuel de végétaux riches en protéines (céréales, riz, légumineuses, fruits à coque, oléagineux à au moins 10 % de protéines). Le mélange de légumineuses est à 60 % de légumineuses, 20 % de soja et 20 % de céréales, et les boissons soja et avoine à 50 % de soja et 50 % d'avoine : des valeurs de départ à revoir.
- Le riz est remplacé par les autres céréales du pays, et les huiles de palme et de palmiste par ses autres huiles végétales, à calories égales et dans les proportions actuelles des substituts dans le pays, ou celles du monde là où le pays n'en mange aucun.
- Les pertes et semences sont des parts fixes des disponibilités. La transformation est fixe en tonnes. Le multiplicateur des disponibilités est plafonné à 3.
- L'alimentation animale baisse en proportion de la production moins la transformation de chaque groupe dans le même pays, comme les prairies et le fourrage. Le beurre et la crème comptent comme le lait dont ils sont faits. Un groupe animal qu'un pays ne produit pas n'a pas d'alimentation à perdre.
- Le lait et le poisson donnés aux animaux changent une fois, avec les animaux qu'ils nourrissent. Cette variation ne change pas de nouveau l'alimentation animale.
- Parts du commerce fixes ou production nationale : pas de changement dans qui exporte quoi.
- La production ne peut pas descendre sous ce qui est transformé. Ces cas sont écrêtés et signalés.
- Les usages d'un produit animal autres que l'alimentation humaine et animale, et l'écart du commerce mondial, suivent sa production.
- Les intensités par tonne ne changent pas avec la quantité produite.
- Les hectares par tonne et les parts des prairies restent ceux de l'année de base : ni les rendements ni le chargement des prairies ne changent avec le changement de régime.
- Les terres d'un oléagineux sont partagées entre son huile et son tourteau selon leur valeur. La part du tourteau suit les animaux qui le mangent, et les prairies temporaires suivent les ruminants, comme les prairies permanentes.
- Les prairies suivent la production des ruminants du même pays, groupe par groupe. Elles ne descendent jamais sous zéro.
- Avec la repousse, les terres libérées et nouvellement utilisées sont compensées dans chaque pays. Les terres nouvellement utilisées nettes sont chargées de l'absorption à laquelle elles renoncent au rythme de repousse du pays, pas du CO₂ du défrichement d'une forêt sur pied. Sans la repousse, ni les unes ni les autres ne comptent.
- Avec la repousse, toutes les terres libérées sont laissées à la végétation naturelle. Elles absorbent du CO₂ à un rythme constant pendant 30 ans, puis plus rien. Un pays sans rythme dans les données prend le rythme médian des autres. L'absorption n'est pas mise à l'échelle de la population.
- La référence garde le régime actuel. La population et la trajectoire SSP2 sont les seuls moteurs de changement jusqu'en 2100.
- La rampe monte en ligne droite à partir de l'année en cours.
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
- Davis, K. F. et al. (2018). Alternative cereals can improve water use and nutrient supply in India. Science Advances 4, eaao1108 : https://doi.org/10.1126/sciadv.aao1108
- Meijaard, E. et al. (2020). The environmental impacts of palm oil in context. Nature Plants 6, 1418–1426 : https://doi.org/10.1038/s41477-020-00813-w
- Beyer, R. M. et al. (2021). Species richness and carbon footprints of vegetable oils: can high yields outweigh palm oil's environmental impact? Sustainability 13, 1813 : https://doi.org/10.3390/su13041813
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992 : https://doi.org/10.1126/science.aaq0216
