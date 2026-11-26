# Vue d'ensemble

Planetshift montre ce qui a réchauffé la planète depuis 1850, et de combien elle se réchaufferait moins d'ici 2050 ou 2100 si l'on actionnait les leviers qui agissent sur ces causes. Cette page décrit ce que l'on voit, comment fonctionnent les leviers et comment lire les chiffres. Les pages suivantes détaillent chaque étape.

Les leviers sont traités à égalité. Aucun n'est présenté comme la façon de limiter le réchauffement. Ce sont :

- l'énergie et le transport qui abandonnent les combustibles fossiles ;
- des bâtiments et une industrie plus propres ;
- moins de fuites de méthane du pétrole, du gaz et du charbon ;
- la réduction des HFC ;
- ce que mangent les gens ;
- les pratiques agricoles ;
- moins de nourriture gaspillée ;
- la fin du défrichement des forêts ;
- le carbone stocké dans les terres agricoles.

Ce qui a réchauffé la planète jusqu'ici la réchauffe encore, c'est pourquoi chaque levier est présenté sous la cause qu'il réduit.

## Ce que l'on voit

**Explorer** a trois parties.

À gauche se trouve le panneau. En haut figure l'année à laquelle tous les leviers sont en place. Viennent ensuite les groupes de leviers, sous la cause du réchauffement sur laquelle chacun agit, la plus grande cause d'abord :

- combustibles fossiles et industrie : énergie et transport, bâtiments et industrie, fuites de méthane ;
- agriculture : alimentation, pratiques agricoles, gaspillage alimentaire ;
- usage des terres : déforestation, carbone dans les terres agricoles.

Chaque groupe s'ouvre sur une série de curseurs, et montre le réchauffement qu'il éviterait à lui seul, tous ses curseurs à 100 %. Les autres options viennent en dernier.

Au milieu se trouvent les graphiques :

- la température mondiale depuis 1850, avec et sans les leviers ;
- le réchauffement que les leviers évitent chaque année jusqu'en 2050 ou 2100, sur sa propre échelle ;
- les causes du réchauffement, où la bande de chaque cause se réduit après aujourd'hui de la part que les leviers lui retirent.

À côté des graphiques, une bande de chiffres résume ce que les leviers changent. Elle répartit le réchauffement évité, sous chaque cause, entre les groupes de leviers.

En dessous se trouve la carte de l'alimentation et de l'agriculture. Pour chaque pays, elle montre comment les émissions ou la production des fermes changeraient avec les leviers choisis. Elle montre aussi la quantité d'aliments produite, les gaz à effet de serre émis par les fermes, les terres agricoles qu'elles occupent et la qualité des données d'émission. L'alimentation et l'agriculture sont la seule partie du modèle qui a des données par pays.

**Méthodologie**, c'est cette page : ce que sont les chiffres, d'où ils viennent et ce qu'ils laissent de côté.

## Comment fonctionnent les leviers

Chaque levier est une part d'adoption, de 0 à 100 %. Il monte progressivement de cette année jusqu'à l'année que l'on choisit en haut du panneau (2035 par défaut), puis reste à ce niveau jusqu'en 2100.

- Les leviers d'énergie et de transport réduisent des parties du CO₂ fossile du scénario : voitures et camions électriques, moins d'avion, carburant d'aviation propre, transport maritime propre et électricité renouvelable, qui décarbone aussi la demande supplémentaire des centres de données de l'IA (voir [Énergie et transport](#method-sectors)).
- Les leviers des bâtiments et de l'industrie réduisent le CO₂ fossile direct du chauffage, de l'acier, du ciment et de la chimie (voir [Bâtiments et industrie](#method-industry)).
- Les pratiques agricoles, la baisse du gaspillage alimentaire, la fin de la déforestation, le remouillage de la tourbe drainée et le carbone stocké dans les terres agricoles agissent sur l'agriculture et les terres (voir [Leviers](#method-levers)).

L'alimentation a sa propre section ci-dessous parce qu'elle compte le plus d'étapes, pas parce que c'est le plus grand levier.

### L'alimentation

Le changement de régime fait passer une partie de ce que l'on mange des aliments d'origine animale aux aliments végétaux. La quantité de protéines de chaque personne reste la même (ou les calories, si on le choisit) : personne ne mange moins. Par défaut, les aliments végétaux qui remplacent les produits animaux sont le mélange de végétaux que le pays mange déjà. On peut choisir à la place surtout des légumineuses, ou des boissons au soja et à l'avoine pour les produits laitiers.

Moins d'animaux demandent moins d'aliments, si bien que les cultures qui servent à les nourrir diminuent aussi. Cette baisse compense souvent largement les végétaux ajoutés pour les humains. C'est pourquoi les surfaces cultivées peuvent reculer alors même qu'on mange plus de végétaux.

La demande mondiale de chaque aliment change alors. Les fermes de chaque pays en produisent plus ou moins, en proportion de leur part actuelle de la production mondiale. Les émissions de chaque produit agricole (méthane, protoxyde d'azote et dioxyde de carbone, par tonne) traduisent ce changement de production en changement d'émissions.

Moins d'élevage demande aussi moins de terres. Les cultures suivent les productions végétales. Les prairies suivent le bœuf, l'agneau et le lait produits dans chaque pays : un changement libère donc surtout des prairies. Dans *Autres options*, on peut laisser les terres libérées se couvrir de végétation naturelle. Cette végétation absorbe du CO₂ pendant quelques décennies et ajoute au réchauffement évité. Par défaut, les terres libérées sont laissées en l'état et ne changent pas la température.

Les poissons et fruits de mer sont un aliment animal comme les autres (voir [Poissons et fruits de mer](#method-seafood)). Pour les poissons sauvages, les seules émissions sont celles du carburant que brûlent leurs bateaux. Elles ne comptent que quand *Autres options* comprend les émissions des intrants. Les poissons d'élevage mangent des cultures fourragères et de la farine de poisson : moins de poisson d'élevage veut donc dire moins des deux.

Comme tous les leviers, le changement de régime croît en ligne droite de l'année en cours jusqu'à l'année choisie, puis reste stable jusqu'en 2100.

## La répartition

Le résumé répartit le réchauffement évité entre les groupes de leviers, sous les causes sur lesquelles ils agissent.

Les leviers se chevauchent : réduire le gaspillage alimentaire économise moins une fois le régime déjà changé. La part de chaque groupe est donc sa valeur de Shapley. C'est la moyenne de ce que le groupe ajoute sur tous les ordres dans lesquels les groupes pourraient être comptés, pour qu'aucun groupe ne soit compté en premier (voir [Leviers](#method-levers)).

Deux options changent l'avenir sans aucun levier (voir [Options](#method-options)) :

- la croissance de l'électricité des centres de données de l'IA, ajoutée par défaut ;
- le dégel du pergélisol, désactivé par défaut.

## Comment lire les chiffres

**Le chiffre principal** est le réchauffement évité en 2050, ou en 2100 quand les graphiques vont jusqu'en 2100. Il est en degrés Celsius, avec une fourchette probable.

Le réchauffement évité continue de croître après 2050. Le méthane qui n'est plus émis cesse de réchauffer. Le protoxyde d'azote évité continue de s'accumuler.

Chaque levier agit sur une cause ou quelques-unes. Ce qu'il évite est petit à côté du réchauffement total, mais peut être grand à côté de la part de sa propre cause. Le graphique Causes du réchauffement montre les deux.

**Méthane, protoxyde d'azote et CO₂.** Pour les leviers agricoles, c'est le méthane évité qui compte le plus pour la température d'ici 2050. Le méthane a une courte durée de vie : en émettre moins commence à refroidir la planète en quelques décennies. Le protoxyde d'azote et le dioxyde de carbone durent bien plus longtemps. Planetshift calcule la température gaz par gaz. Le chiffre en équivalent CO₂ (CO₂e) additionne les gaz avec les pondérations habituelles sur 100 ans, seulement pour donner un nombre unique à comparer. Il ne sert jamais à calculer la température.

**Terres agricoles.** La ligne des terres agricoles montre les terres que le changement libère une fois complet. Elle est en millions d'hectares (Mha), répartie entre cultures et prairies, et donnée aussi en part des terres agricoles du monde aujourd'hui. Avec la repousse, une autre ligne montre le CO₂ que ces terres absorbent l'année où le changement est complet.

**Protéines et calories.** Ces lignes donnent l'apport moyen mondial par personne, avant et après. Celle que l'on maintient égale ne bouge pas. L'autre peut varier un peu.

**La carte.** La couche des variations montre le changement une fois le changement de régime atteint, par paliers fixes (±2 %, ±15 %, ±40 %), pour qu'un changement plus grand se voie à des couleurs plus fortes. La couche de qualité des données montre, pour chaque pays, la source de données d'émission la moins précise parmi ses aliments. Les sources vont des données HESTIA propres à ce pays (la meilleure ; voir [Intensités d'émission de HESTIA](#method-hestia)) à une médiane mondiale du groupe d'aliments (la moins précise). Deux pays voisins peuvent sembler différents pour cette seule raison.

## Hypothèses

- L'alimentation change et la production suit. Planetshift ne modélise ni les prix, ni les négociations commerciales, ni les choix des agriculteurs.
- Les protéines (ou les calories) par personne restent égales dans chaque pays.
- La part de chaque pays dans la production mondiale de chaque aliment reste celle d'aujourd'hui, sauf si l'on choisit dans *Autres options* que chaque pays produise lui-même son propre changement.
- Chaque levier, l'alimentation comprise, progresse linéairement de l'année en cours jusqu'à l'année choisie, puis se maintient.
- Les terres agricoles libérées sont laissées en l'état, sauf si l'on choisit la repousse dans *Autres options*. Les terres nouvellement utilisées sont alors chargées de l'absorption de CO₂ à laquelle elles renoncent, mais pas du CO₂ du défrichement d'une forêt sur pied au-delà de ce que les données de déforestation lient à la production.
- Les émissions du reste du monde suivent un scénario publié : SSP2-4.5 par défaut, l'une des trajectoires socio-économiques partagées (SSP) qu'utilise le GIEC (voir [Des émissions à la température](#method-climate)). La croissance de l'électricité des centres de données depuis 2024 est ajoutée, sauf si on le change dans *Autres options*. Les leviers d'énergie réduisent des parties du CO₂ fossile de ce scénario.
- Le pergélisol est laissé de côté sauf s'il est activé, comme dans les scénarios publiés.

## Sources

- FAOSTAT : bilans alimentaires, cultures et produits de l'élevage, utilisation des terres, émissions de l'agriculture.
- Évaluations d'impact agrégées de HESTIA, pour les émissions par tonne de produit ; FishStat de la FAO et des études publiées pour le poisson.
- Les scénarios SSP (RCMIP, base de scénarios de l'AR6), Ember et l'AIE, pour le transport, l'électricité et les centres de données.
- FaIR v2, un modèle de climat simple, avec sa calibration sur le sixième rapport du GIEC (AR6), pour la réponse du climat ; PRIMAP-hist pour les émissions historiques ; HadCRUT5 et Berkeley Earth pour la température observée.
- Natural Earth, pour la carte.
