# Leviers

Chaque levier est la part adoptée d'un changement, de 0 à 100 %, atteinte en entier l'année choisie en haut du panneau. Les leviers se chevauchent : ensemble, ils évitent un peu moins de réchauffement que la somme de ce que chacun évite seul. Le résumé partage ce chevauchement à parts égales entre eux.

## Ce qu'est un levier

Chaque moyen de limiter le réchauffement que propose Planetshift est un levier, et aucun n'est privilégié. Les leviers couvrent l'énergie et le transport, les bâtiments et l'industrie, ce que mangent les gens, les pratiques agricoles, moins de nourriture gaspillée, la fin du défrichement des forêts, le remouillage de la tourbe drainée, le carbone stocké dans les terres agricoles et le captage direct dans l'air.

Chaque levier est un curseur de 0 à 100 %, qui fixe la part adoptée. Le curseur principal de l'alimentation est la part des aliments d'origine animale remplacés par des végétaux. Chaque levier se met en place progressivement à partir d'aujourd'hui et est entièrement en place l'année choisie en haut du panneau, *Tous les leviers en place en*. Le captage direct dans l'air fait exception : il suit un calendrier propre, car ses usines mettent des décennies à se construire (voir [Captage direct dans l'air](#method-dac)).

## Comment le panneau les regroupe

La section **Leviers** d'Explorer range les leviers sous la cause du réchauffement sur laquelle chacun agit surtout (voir [Causes du réchauffement climatique](#method-link)) :

- combustibles fossiles et industrie : énergie et transport, bâtiments et industrie, fuites de méthane, captage direct dans l'air ;
- agriculture : alimentation, pratiques agricoles, gaspillage alimentaire ;
- usage des terres : déforestation, carbone dans les terres agricoles ;
- déchets : décharges et eaux usées ;
- autres émissions humaines : la réduction des HFC.

Les causes sont classées selon le réchauffement que chacune cause à l'horizon du graphique dans le scénario choisi, si bien que les combustibles fossiles viennent en premier. Au sein d'une cause, les groupes sont classés selon le réchauffement que chacun éviterait seul et en entier : c'est le chiffre affiché à côté. Cet ordre est recalculé quand on change une option ou l'horizon, ou quand les données changent. Il n'est jamais recalculé pendant qu'on déplace un curseur, pour que les groupes restent en place pendant le glissement.

Chaque groupe est un volet, fermé à l'ouverture de la page. Il a un bouton qui met tous ses leviers à 100 % et un autre qui les remet à zéro.

### Un groupe peut agir sur plus d'une cause

L'alimentation change les émissions agricoles, qui comptent dans l'agriculture. Elle change aussi le défrichement lié à ce qui est produit et les terres qu'elle libère : elle agit donc sur la déforestation et la repousse, qui comptent dans l'usage des terres. Moins de gaspillage fait de même.

Le réchauffement évité d'un tel groupe est réparti entre les causes selon le gaz et sa source :

- le méthane, le protoxyde d'azote et le CO₂ des fermes comptent dans l'agriculture ;
- le CO₂ du défrichement, le CO₂ et le N₂O de la tourbe drainée, le méthane de la tourbe remouillée, la repousse et le carbone stocké dans les terres agricoles comptent dans l'usage des terres ;
- le CO₂ fossile et le forçage de l'aviation hors CO₂ comptent dans les combustibles fossiles et l'industrie. Le forçage est la variation de l'énergie que la Terre retient, qui la réchauffe (voir [Des émissions à la température](#method-climate)).

Après aujourd'hui, le graphique Causes du réchauffement retire la part de chaque cause de la bande de cette cause. Le résumé liste les parts sous les mêmes causes, avec les mêmes noms et les mêmes couleurs.

## Les groupes de leviers

**Pratiques agricoles** (voir [Pratiques agricoles](#method-practices)). Six pratiques réduisent chacune une partie d'une ou plusieurs sources des émissions d'un produit :

- les additifs alimentaires et la sélection agissent sur le méthane entérique des bovins, le méthane que les bovins rejettent en digérant ;
- la gestion des effluents agit sur le méthane et le protoxyde d'azote du fumier stocké ;
- les rizières drainées agissent sur le méthane du riz ;
- « moins d'azote, mieux employé », inhibiteurs compris, agit sur le protoxyde d'azote des engrais ;
- l'énergie propre agit sur le CO₂ des carburants.

Pour un pays, un produit et un gaz, la part des émissions supprimée est une somme sur les sources : la part de la source dans ce gaz (`breakdown.json`) multipliée par la part supprimée de cette source. Une pratique supprime adoption × la part applicable dans le pays × la réduction. Une pratique limitée à certains groupes d'aliments n'agit que sur ces groupes. Les additifs, par exemple, n'agissent que sur les bovins. Les pratiques réduisent les émissions de la production après le changement de régime. Leur effet est donc leur réduction sur la production actuelle, plus leur réduction sur la production que le changement de régime modifie.

**Gaspillage alimentaire** (voir [Pertes et gaspillage](#method-waste)). Il y a deux leviers :

- le gaspillage après les magasins réduit l'offre alimentaire dont un pays a besoin du levier × sa part de gaspillage, après le changement de régime ;
- les pertes avant les magasins réduisent la part de pertes de chaque produit.

Moins d'offre demande moins de production, qui occupe moins de terres et émet moins. La variation passe par la même chaîne d'approvisionnement que le changement de régime, alimentation animale comprise. Ce que les gens mangent ne change pas : les protéines et les calories affichées sont celles du régime.

**Déforestation** (voir [Déforestation](#method-deforestation)). Défricher la forêt pour l'agriculture libère environ 2 Gt de CO₂ par an (`deforestation.json`, par pays et par produit). Le modèle garde ce montant annuel constant et n'en compte que la variation. Le défrichement lié à un produit varie avec la production de ce produit dans le pays où la forêt est défrichée. Se détourner du bœuf réduit donc, par le commerce, le défrichement pour les pâturages au Brésil, même avec le levier à 0. Cette variation est bornée entre zéro et le double du défrichement actuel. Le levier empêche ensuite sa part du défrichement qui reste. Ces deux effets sont des variations de CO₂, et ils entrent dans la réponse du climat comme les autres. Le CO₂ des sols organiques drainés, environ 0,8 Gt par an, et leur N₂O, environ 0,34 Mt, varient eux aussi avec la production. Les terres que la production libère sont supposées remises en eau, et une terre remise en eau émet du méthane. Le levier de remouillage des tourbières remet en eau sa part des terres drainées qui restent : leur CO₂ et leur N₂O s'arrêtent et leur méthane commence.

**Carbone dans les terres agricoles** (voir [Carbone stocké dans les terres agricoles](#method-removals)). Les couverts végétaux, les arbres dans les fermes, le biochar et la poudre de roche, qui est expérimentale, stockent du CO₂. La quantité stockée est adoption × la plus grande part des terres que la pratique peut atteindre (`maxShare`) × les hectares de cultures, de prairies ou des deux une fois le changement complet × le taux du pays. Chaque hectare stocke du carbone pendant `years` ans à partir de l'année où la pratique y commence. Les couverts et les arbres saturent après 20 ans. Le biochar et la poudre de roche continuent de stocker du carbone jusqu'en 2100.

**Captage direct dans l'air** (voir [Captage direct dans l'air](#method-dac)). Des usines captent le CO₂ de l'air et le stockent sous terre, selon le calendrier de l'AIE, jusqu'à environ 0,65 Gt par an en 2050 et 3,3 Gt en 2100, à l'échelle du curseur. Le CO₂ de leur électricité, sur le réseau que laisse l'électricité renouvelable, et celui de leur construction sont retranchés de ce qu'elles stockent.

**Énergie et transport** (voir [Énergie et transport](#method-sectors)). Six leviers agissent sur le CO₂ fossile du scénario choisi dans *Autres options* :

- voitures électriques et camions électriques : leur CO₂ d'échappement, moins l'électricité qu'ils tirent du réseau ;
- moins d'avion : le CO₂ de l'aviation et son forçage hors CO₂ ;
- carburant d'aviation propre : le CO₂ de l'aviation seulement ;
- transport maritime propre ;
- électricité renouvelable : le CO₂ du secteur électrique, et avec lui l'intensité du réseau dont dépendent les véhicules électriques et les centres de données, y compris la demande supplémentaire des centres de données de l'IA quand on la compte dans *Autres options*.

Leur variation de CO₂ est traduite en température avec la courbe du CO₂. La variation du forçage de l'aviation hors CO₂ est traduite avec la réponse de la température au forçage. Réduire le combustible réduit aussi le méthane qui fuit pendant sa production et la pollution de l'air que produit sa combustion. Ces leviers agissent donc aussi sur la pollution de l'air. Celle-ci refroidit la planète et masque une partie du réchauffement : moins de pollution masque moins de réchauffement. Cela ajoute du réchauffement les premières décennies, et le méthane économisé le compense à peu près.

**La repousse est une option, pas un groupe de leviers.** La repousse naturelle sur les terres libérées capte aussi du carbone, en plus des quatre pratiques du carbone dans les terres agricoles. Elle se règle dans *Autres options* (*Terres libérées*), pas comme un groupe de leviers (voir [Terres](#method-land)). Elle agit sur les terres que libèrent le changement de régime et la baisse du gaspillage. Le défrichement évité est du CO₂ non émis par une forêt qui reste debout. Il ne libère aucune terre. Les deux ne comptent donc jamais le même hectare.

## Comment les leviers se combinent

- **Les pratiques sur une même source se multiplient au lieu de s'additionner.** Deux pratiques qui suppriment 30 % et 20 % du méthane entérique en suppriment ensemble 1 − 0,7 × 0,8 = 44 %, pas 50 %.
- **Les leviers agissent l'un après l'autre.** La baisse du gaspillage agit sur le régime après le changement. Les pratiques agissent sur la production qui reste après les deux. Le levier de déforestation agit sur le défrichement qui reste après le changement et la baisse du gaspillage. Chaque levier fait donc un peu moins combiné que seul. La répartition ci-dessous partage ce chevauchement à parts égales.
- **Les effets sur une production qui change croissent plus vite que la montée en charge.** L'effet complet des leviers monte linéairement avec le changement de régime. Certains leviers agissent sur la variation de production : les pratiques sur le cheptel et les cultures que le changement et la baisse du gaspillage ont modifiés, le levier de déforestation sur le défrichement qu'ils ont modifié. Cette part monte comme les deux. Avec une part r du chemin parcourue, le r × réduction du levier agit sur r × la variation, si bien qu'elle croît comme r².
- **Le stockage agit sur les terres qui restent une fois le changement complet.** Un changement qui libère des cultures en laisse moins pour les couverts végétaux. Le stockage monte linéairement : à mi-chemin, il compte des terres que le changement n'a pas encore libérées ou occupées.
- **Les leviers d'énergie se combinent entre eux, pas avec les leviers agricoles.** L'électricité renouvelable fait économiser davantage aux véhicules électriques et aux centres de données. Moins d'avion et le carburant propre agissent chacun sur le CO₂ de l'aviation que l'autre laisse, si bien que les deux à 50 % en suppriment 75 %.

## Lire la répartition

Le résumé donne le réchauffement évité à l'année choisie sous chaque cause sur laquelle agissent les leviers, la plus grande d'abord. Pour chaque cause, il donne ce que les leviers en évitent, puis la part de chaque groupe de leviers. Un groupe qui agit sur deux causes apparaît sous les deux, avec sa part de chacune. Les parts s'additionnent exactement au total. Les causes s'additionnent aux réductions que montre le graphique Causes du réchauffement.

### Pourquoi les parts sont des valeurs de Shapley

Les leviers se chevauchent. Moins de gaspillage sur un régime déjà changé économise moins que sur le régime actuel. Les pratiques réduisent moins sur un troupeau plus petit. La repousse a besoin des terres que libèrent un changement de régime ou moins de gaspillage.

Une façon de partager le total serait de compter les groupes tour à tour : l'un d'abord, puis le suivant sur ce qui reste. Le chevauchement irait alors à celui qui vient après. L'ordre déciderait donc du levier qui paraît le plus grand.

Planetshift utilise plutôt la **valeur de Shapley**, une règle de la théorie des jeux pour partager équitablement un résultat commun. La part d'un groupe est la moyenne de ce qu'il ajoute aux groupes comptés avant lui, sur tous les ordres dans lesquels les groupes actifs pourraient être comptés. Cette règle a quatre propriétés :

- les parts s'additionnent au total ;
- un groupe qui n'ajoute rien n'obtient rien ;
- deux groupes qui agissent de la même façon obtiennent la même part ;
- lister les groupes dans un autre ordre ne change rien.

Un levier qui n'agit qu'avec un autre partage cet effet commun à moitié avec lui. La repousse sur les terres libérées est un tel levier.

**Exemple.** Avec la moitié des aliments d'origine animale remplacés par des végétaux (alimentation à 50 %), la repousse naturelle activée et le pergélisol désactivé, la somme des réponses de chaque gaz (voir [Climat](#method-climate)) donne ces médianes du réchauffement évité en 2100 :

| Groupes actifs | Réchauffement évité en 2100 |
| --- | --- |
| Alimentation seule | 0,1685 °C |
| Repousse seule | 0 (elle ne libère aucune terre) |
| Alimentation et repousse | 0,1827 °C |

L'effet commun de la repousse est de 0,1827 − 0,1685 = 0,0142 °C. La valeur de Shapley le partage à parts égales entre les deux. La repousse obtient 0,0071 °C et l'alimentation 0,1685 + 0,0071 = 0,1756 °C. Avec le pergélisol activé, la variation de son rejet est répartie en plus de ces parts (voir plus bas). Le résumé met ensuite les parts à l'échelle pour qu'elles s'additionnent au réchauffement évité que donne FaIR (voir *Répartir le total de FaIR* plus bas).

### Comment Planetshift les calcule vite

Calculée directement, la valeur de Shapley demande une exécution du modèle pour chaque ensemble de groupes actifs. Cela fait 2ⁿ exécutions pour n groupes : 256 avec les huit groupes actifs. Sur les données réelles, cela prend des secondes, alors qu'un mouvement de curseur ne dispose que de quelques centièmes de seconde.

Planetshift s'appuie plutôt sur la façon dont les groupes interagissent. Les groupes agricoles n'interagissent que par la production qu'ils changent. L'alimentation et la baisse du gaspillage changent ce qui est produit. Les pratiques, la déforestation, la repousse, le carbone dans les terres agricoles, les décharges et eaux usées, et la réduction des HFC agissent sur la production que ces deux-là laissent, mais pas les uns sur les autres. La valeur de n'importe quel ensemble de groupes agricoles se lit donc à partir d'un passage des émissions agricoles pour les groupes de production de cet ensemble : aucun, l'alimentation, le gaspillage, ou les deux. Cela fait au plus quatre passages, trois de plus que l'exécution elle-même. Chaque passage est conservé et réutilisé tant qu'on déplace des curseurs qui ne le changent pas.

Les groupes hors de l'agriculture (énergie et transport, bâtiments et industrie, fuites de méthane, captage direct dans l'air) interagissent entre eux par le réseau que laisse l'électricité renouvelable, et par le méthane par kg de combustible que laissent les leviers sur les fuites. Ils n'interagissent pas avec l'agriculture. Leur valeur est leurs propres émissions, recalculées avec les leviers de l'autre groupe à zéro.

Un test vérifie, sur les données de test et sur les données réelles, que cela donne les valeurs de Shapley des exécutions complètes à neuf chiffres près, sur la somme des réponses de chaque gaz.

### Répartir le total de FaIR

Le réchauffement évité vient de FaIR lancé dans l'application, dont la réponse n'est pas proportionnelle aux émissions (voir [Climat](#method-climate)). Ses valeurs de Shapley demanderaient de lancer FaIR sur chaque ensemble de groupes actifs, jusqu'à 256 simulations. Cela prend environ une seconde à chaque mouvement de curseur. Les parts sont donc les valeurs de Shapley sur la somme des réponses, toutes multipliées par le même facteur pour s'additionner au total de FaIR. Les causes et les gaz sont répartis de la même façon, année par année.

Sur les données réelles, cela reste à 0,017 °C des valeurs de Shapley de FaIR lancé sur chaque ensemble de groupes, 1,2 % du total, avec tous les leviers au maximum sur SSP2-4.5 en 2100. Le plus grand écart est celui de l'énergie et du transport : 0,570 °C contre 0,553 °C. Avec un seul groupe actif, les deux sont identiques.

### Une méthode envisagée et écartée

Une seconde méthode a été envisagée : l'effet de chaque groupe seul, mis à l'échelle pour que les parts s'additionnent au total. Elle demande les mêmes passages, donc n'est pas plus rapide. Elle est aussi moins équitable. Un groupe dont l'effet dépend d'un autre n'obtiendrait rien : la repousse seule ne libère aucune terre, elle disparaîtrait donc de la répartition, et son captage serait donné à l'alimentation et au gaspillage. Le chevauchement est aussi partagé en proportion de la taille plutôt qu'à parts égales. Sur les données réelles avec tous les groupes actifs, les deux méthodes diffèrent jusqu'à un quart de la part d'un groupe.

### Le pergélisol et le CO₂e dans la répartition

Avec le pergélisol activé, la variation de ce qu'il libère est répartie entre les groupes, et entre les causes, en proportion de la taille du réchauffement évité par chacun, quel qu'en soit le signe. Les parts s'additionnent donc toujours.

Une répartition selon les valeurs signées ne fonctionnerait pas. Une part qui ajoute du réchauffement prendrait une part négative. Les leviers de l'énergie évitent du réchauffement sous les combustibles fossiles et en ajoutent sous la pollution de l'air. Là où les deux se compensent presque (jusque vers 2040), chaque part prendrait plusieurs fois la variation entière. Répartie selon la taille, aucune part ne bouge de plus que la variation elle-même.

Les émissions évitées en CO₂e l'année où les leviers sont en place sont réparties de la même façon. Le CO₂e, ou équivalent CO₂, additionne les gaz avec des poids sur 100 ans (voir [Des émissions à la température](#method-climate)). Ces émissions laissent de côté le forçage de l'aviation hors CO₂ et le pergélisol, qui ne sont pas des émissions d'un levier.

## Pourquoi certains leviers sont incertains

Les fourchettes des pratiques (une réduction basse et haute) et du stockage (un taux bas et haut) alimentent la fourchette probable du réchauffement évité, avec la réponse du climat. Le bas de la fourchette prend la plus petite réduction et le captage le plus lent. Pour les leviers d'énergie, le bas de la fourchette prend le plus d'électricité par kilogramme de CO₂ d'échappement évité, le moins de forçage hors CO₂ par kilogramme de CO₂ de l'aviation et la plus faible demande des centres de données.

Une partie de l'incertitude n'est pas dans la fourchette :

- La possibilité d'adopter une pratique dans un pays (`applicable`) est un jugement.
- Le carbone du sol est difficile à mesurer et peut être reperdu.
- Le lien entre déforestation et production est une lecture des empreintes de consommation, pas une loi. Le défrichement suit les routes, les prix et l'application du droit autant que la demande.
- Moins gaspiller libère de l'argent dépensé pour autre chose. Le modèle ne compte pas cet effet rebond.
- Les leviers sont des parts d'adoption, pas des politiques. Le modèle dit ce qu'ils éviteraient, pas ce qu'il faudrait pour y arriver.

## Hypothèses

- Chaque levier, l'alimentation comprise, monte linéairement de l'année en cours à l'année *Tous les leviers en place en*, puis reste constant.
- Les réductions des pratiques s'appliquent aux émissions de la production avec le changement de régime et les autres leviers. Le scénario de référence garde les pratiques actuelles.
- La réduction d'une pratique sur une source se combine de façon multiplicative avec celles des autres. Le bas du réchauffement évité prend le bas de sa fourchette.
- Un produit sans répartition par source prend celle du monde, sinon celle de l'autre périmètre. Sans l'une ni l'autre, les pratiques n'agissent pas sur lui.
- Le CO₂ de la déforestation est un flux constant, non multiplié par la population. Il varie avec la variation relative de la production de chaque produit dans le pays (entre −100 % et +100 %), et le levier empêche sa part de ce qui reste.
- Le stockage agit sur les terres une fois le changement complet et dure `years` ans à partir de l'adoption de chaque hectare. Le taux est celui du pays, sinon celui du monde.
- La répartition est la valeur de Shapley de chaque groupe sur les groupes actifs, répartie par cause. La variation du pergélisol est répartie en proportion de la taille de chaque part.
- Les leviers d'énergie retirent une part du CO₂ de chaque secteur dans le scénario choisi dans *Autres options*, en montant comme le changement de régime. Ils ne changent pas les émissions agricoles. L'électricité utilisée dans les fermes suit le réseau du SSP choisi, pas Électricité renouvelable.
- Un fichier de levier manquant laisse ses leviers sans effet, affichés comme indisponibles.
