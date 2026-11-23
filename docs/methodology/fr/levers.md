# Leviers

Cette page explique ce qu'est un levier, comment les leviers sont regroupés et comment ils s'additionnent quand plusieurs agissent ensemble. Chaque levier est la part adoptée d'un changement, de 0 à 100 %, atteinte en entier l'année choisie en haut du panneau. Les leviers se chevauchent : ensemble, ils évitent un peu moins de réchauffement que la somme de ce que chacun évite seul, et le résumé partage ce chevauchement à parts égales entre eux.

## Ce qu'est un levier

Chaque moyen de limiter le réchauffement que propose Planetshift est un levier, et aucun n'est privilégié. Les leviers couvrent l'énergie et le transport, les bâtiments et l'industrie, ce que mangent les gens, les pratiques agricoles, moins de nourriture gaspillée, la fin du défrichement des forêts et le carbone stocké dans les terres agricoles.

Chaque levier est un curseur de 0 à 100 % : la part de ce levier adoptée. Le curseur principal de l'alimentation est la part des aliments d'origine animale remplacés par des végétaux. Chaque levier se met en place progressivement à partir d'aujourd'hui et l'est entièrement l'année choisie en haut du panneau, *Tous les leviers en place en*.

## Comment le panneau les regroupe

La section **Leviers** d'Explorer range les leviers sous la cause du réchauffement sur laquelle chacun agit surtout (voir [Causes du réchauffement climatique](#method-link)) :

- combustibles fossiles et industrie : énergie et transport, bâtiments et industrie ;
- agriculture : alimentation, pratiques agricoles, gaspillage alimentaire ;
- usage des terres : déforestation, carbone dans les terres agricoles.

Les causes sont classées selon le réchauffement que chacune cause à l'horizon du graphique dans le scénario choisi, si bien que les combustibles fossiles viennent en premier. Au sein d'une cause, les groupes sont classés selon le réchauffement que chacun éviterait seul et en entier : c'est le chiffre affiché à côté. Cet ordre est recalculé quand une option, l'horizon ou les données changent. Il n'est jamais recalculé pendant qu'un curseur bouge, pour qu'un groupe ne saute pas sous le pointeur.

Chaque groupe est un volet, fermé au départ. Il a un bouton qui adopte tous ses leviers en entier et un autre qui les remet à zéro.

### Un groupe peut agir sur plus d'une cause

L'alimentation change les émissions agricoles, qui comptent dans l'agriculture. Elle change aussi le défrichement lié à ce qui est produit et les terres qu'elle libère : elle agit donc sur la déforestation et la repousse, qui comptent dans l'usage des terres. Moins de gaspillage fait de même.

Le réchauffement évité d'un tel groupe est réparti entre les causes selon le gaz et sa source :

- le méthane, le protoxyde d'azote et le CO₂ des fermes comptent dans l'agriculture ;
- le CO₂ du défrichement, la repousse et le carbone stocké dans les terres agricoles comptent dans l'usage des terres ;
- le CO₂ fossile et le forçage de l'aviation hors CO₂ comptent dans les combustibles fossiles et l'industrie. Le forçage est la variation de l'énergie que la Terre retient, qui la réchauffe (voir [Des émissions à la température](#method-climate)).

Le graphique Causes du réchauffement retire la part de chaque cause de sa bande après aujourd'hui. Le résumé liste les parts sous les mêmes causes, avec les mêmes noms et les mêmes couleurs.

## Les groupes de leviers

**Pratiques agricoles** (voir [Pratiques agricoles](#method-practices)). Sept pratiques réduisent chacune une partie d'une ou plusieurs sources des émissions d'un produit :

- les additifs alimentaires et la sélection agissent sur le méthane entérique des bovins, le méthane que les bovins rejettent en digérant ;
- la gestion des effluents agit sur le méthane et le protoxyde d'azote du fumier stocké ;
- les rizières drainées agissent sur le méthane du riz ;
- « moins d'azote, mieux employé » et les inhibiteurs agissent sur le protoxyde d'azote des engrais ;
- l'énergie propre agit sur le CO₂ des carburants.

Pour un pays, un produit et un gaz, la part des émissions supprimée est une somme sur les sources : la part de la source dans ce gaz (`breakdown.json`) multipliée par la part supprimée de cette source. Une pratique supprime adoption × part applicable dans le pays × réduction. Une pratique limitée à certains groupes d'aliments n'agit que sur eux : les additifs n'atteignent que les bovins. Les pratiques réduisent les émissions de la production avec le changement de régime. Leur effet est donc celui de la pratique sur la production actuelle, plus son effet sur ce que le changement de régime modifie.

**Gaspillage alimentaire** (voir [Pertes et gaspillage](#method-waste)). Il y a deux leviers :

- le gaspillage après les magasins réduit l'offre alimentaire dont un pays a besoin du levier × sa part de gaspillage, après le changement de régime ;
- les pertes avant les magasins réduisent la part de pertes de chaque produit.

Moins d'offre demande moins de production, donc moins de terres et moins d'émissions. La variation passe par la même chaîne d'approvisionnement que le changement de régime, alimentation animale comprise. Ce que les gens mangent ne change pas : les protéines et les calories affichées sont celles du régime.

**Déforestation** (voir [Déforestation](#method-deforestation)). Défricher la forêt pour l'agriculture libère environ 2 Gt de CO₂ par an (`deforestation.json`, par pays et par produit). Le modèle en fait un flux annuel constant et n'en compte que la variation. Le défrichement lié à un produit varie avec la production de ce produit dans le pays où la forêt est défrichée. Se détourner du bœuf réduit donc, par le commerce, le défrichement pour les pâturages au Brésil, même avec le levier à 0. Cette variation est bornée entre zéro et le double du défrichement actuel. Le levier arrête ensuite sa part de ce qui reste. Ces deux effets sont des variations de CO₂, entrées dans la réponse du climat comme les autres.

**Carbone dans les terres agricoles** (voir [Carbone stocké dans les terres agricoles](#method-removals)). Les couverts végétaux, les arbres dans les fermes, le biochar et la poudre de roche stockent du CO₂. La quantité stockée est adoption × la plus grande part des terres que la pratique peut atteindre (`maxShare`) × les hectares de cultures, de prairies ou des deux une fois le changement complet × le taux du pays. Elle court pendant `years` ans à partir de l'adoption de chaque hectare. Couverts et arbres saturent après 20 ans ; biochar et poudre de roche continuent de stocker jusqu'en 2100.

**Énergie et transport** (voir [Énergie et transport](#method-sectors)). Sept leviers agissent sur le CO₂ fossile du scénario choisi dans les Options :

- voitures électriques et camions électriques : leur CO₂ d'échappement, moins l'électricité qu'ils tirent du réseau ;
- moins d'avion : le CO₂ de l'aviation et son forçage hors CO₂ ;
- carburant d'aviation propre : le CO₂ de l'aviation seulement ;
- transport maritime propre ;
- électricité renouvelable : le CO₂ du secteur électrique, et avec lui l'intensité du réseau dont dépendent les véhicules électriques et les centres de données ;
- centres de données à l'énergie propre : la demande supplémentaire des centres de données de l'IA, quand les Options la comptent.

Leur variation de CO₂ est traduite en température avec la courbe du CO₂. La variation du forçage de l'aviation hors CO₂ est traduite avec la réponse de la température au forçage. Le combustible qu'ils retirent emporte avec lui le méthane qui fuit pendant sa production et la pollution de l'air que sa combustion produisait. Ils agissent donc aussi sur la pollution de l'air. Celle-ci refroidit la planète et masque une partie du réchauffement : moins de pollution, c'est moins de refroidissement masqué. C'est un coût des premières décennies, que le méthane économisé compense à peu près.

**La repousse est une option, pas un groupe de leviers.** La repousse naturelle sur les terres libérées capte aussi du carbone, à côté des quatre pratiques du carbone dans les terres agricoles. Elle se règle dans les Options (*Terres libérées*), pas comme un groupe de leviers (voir [Terres](#method-land)). Elle agit sur les terres que libèrent le changement de régime et la baisse du gaspillage. Le défrichement évité est du CO₂ non émis par une forêt qui reste debout ; ce n'est pas une terre. Les deux ne comptent donc jamais le même hectare.

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

**Exemple.** Avec la moitié des aliments d'origine animale remplacés par des végétaux (alimentation à 50 %) et la repousse naturelle activée, l'exécution de test enregistrée (`app/test/golden/real.json`) donne ces médianes du réchauffement évité en 2100 :

| Groupes actifs | Réchauffement évité en 2100 |
| --- | --- |
| Alimentation seule | 0,140 °C |
| Repousse seule | 0 (elle ne libère aucune terre) |
| Alimentation et repousse | 0,187 °C |

L'effet commun de la repousse est de 0,187 − 0,140 = 0,047 °C. La valeur de Shapley le partage à moitié. La repousse obtient 0,024 °C et l'alimentation 0,140 + 0,024 = 0,164 °C, ce que montre le résumé.

### Comment Planetshift les calcule vite

Calculée directement, la valeur de Shapley demande une exécution du modèle pour chaque ensemble de groupes actifs. Cela fait 2ⁿ exécutions pour n groupes : 256 avec les huit groupes actifs, environ 2,8 s sur les données réelles. C'est bien au-delà du budget de temps d'un mouvement de curseur.

Planetshift s'appuie plutôt sur la façon dont les groupes interagissent. Les groupes agricoles n'interagissent que par la production qu'ils changent. L'alimentation et la baisse du gaspillage changent ce qui est produit. Les pratiques, la déforestation, la repousse et le carbone dans les terres agricoles agissent sur la production que ces deux-là laissent, mais pas les uns sur les autres. La valeur de n'importe quel ensemble de groupes agricoles se lit donc à partir d'un passage des émissions agricoles par ensemble de groupes de production qu'il contient : aucun, l'alimentation, le gaspillage, ou les deux. Cela fait au plus quatre passages, trois en plus de l'exécution elle-même. Chaque passage est conservé tant que bougent les curseurs qui ne le changent pas.

Les groupes hors de l'agriculture (énergie et transport, bâtiments et industrie) interagissent entre eux par le réseau que laisse l'électricité renouvelable. Ils n'interagissent pas avec l'agriculture. Leur valeur est leurs propres émissions, recalculées avec les leviers de l'autre groupe à zéro.

Un test vérifie, sur les données de test et sur les données réelles, que cela donne les valeurs de Shapley des exécutions complètes à neuf chiffres près.

### Une méthode envisagée et écartée

Une seconde méthode a été envisagée : l'effet de chaque groupe seul, mis à l'échelle pour que les parts s'additionnent au total. Elle demande les mêmes passages, donc n'est pas plus rapide. Elle est aussi moins équitable. Un groupe dont l'effet dépend d'un autre n'obtient rien : la repousse seule ne libère aucune terre, elle disparaîtrait donc de la répartition, et son captage serait donné à l'alimentation et au gaspillage. Le chevauchement est aussi partagé en proportion de la taille plutôt qu'à parts égales. Sur les données réelles avec tous les groupes actifs, les deux méthodes diffèrent jusqu'à un quart de la part d'un groupe.

### Temps de calcul

Mesurée sur les données réelles, une exécution prend en médiane 5 ms sur les échantillons de test (4,5 ms auparavant). Elle prend 17 ms avec tous les leviers et toutes les options activés pendant que bouge le curseur du gaspillage alimentaire (10 ms auparavant). Les deux sont dans les budgets de 20 et 30 ms.

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
- Les réductions des pratiques s'appliquent aux émissions de la production avec le changement de régime et les autres leviers ; le scénario de référence garde les pratiques actuelles.
- La réduction d'une pratique sur une source se combine de façon multiplicative avec celles des autres ; sa fourchette est lue basse pour le bas du réchauffement évité.
- Un produit sans répartition par source prend celle du monde, puis celle de l'autre périmètre ; sans aucune, les pratiques n'agissent pas sur lui.
- Le CO₂ de la déforestation est un flux constant, non multiplié par la population ; il varie avec la variation relative de la production de chaque produit dans le pays (entre −100 % et +100 %), et le levier arrête sa part du reste.
- Le stockage agit sur les terres une fois le changement complet et dure `years` ans à partir de l'adoption de chaque hectare ; le taux est celui du pays, sinon celui du monde.
- La répartition est la valeur de Shapley de chaque groupe sur les groupes actifs, répartie par cause ; la variation du pergélisol est répartie en proportion de la taille de chaque part.
- Les leviers d'énergie retirent une part du CO₂ de chaque secteur dans le scénario choisi dans les Options, en montant comme le changement de régime ; ils ne changent pas les émissions agricoles, et l'électricité utilisée dans les fermes garde sa propre intensité.
- Un fichier de levier manquant laisse ses leviers sans effet, affichés comme indisponibles.
