# Limites

Planetshift répond à une question étroite avec des règles simples et explicites. Voici ce qu'il laisse de côté, et quelle est la précision de ses chiffres.

## Ce qui est laissé de côté

**Les poissons et fruits de mer.** Les poissons et fruits de mer sont dans le modèle, mais leurs intensités sont des valeurs mondiales publiées par groupe d'espèces (carburant de la pêche, énergie et N₂O des élevages), mélangées selon la part de pêche et d'aquaculture de chaque pays, et non des inventaires nationaux ; les poissons sauvages n'ont pas d'émissions à la ferme, puisque le carburant ne compte que du berceau à la sortie de ferme. Le méthane des étangs, les navires et les réfrigérants, les plantes aquatiques et les mécanismes du carbone océanique (carcasses de poissons qui coulent, sédiments remués par les chaluts) sont laissés de côté. Voir [Poissons et fruits de mer](#method-seafood).

**L'usage des terres.** Planetshift compte les terres agricoles qu'un changement libère et, si on le choisit dans les Options, le CO₂ qu'elles absorbent quand la végétation naturelle repousse. Le défrichement des forêts pour de nouveaux pâturages et cultures n'est pas compté, ni le carbone que les terres libérées pourraient stocker autrement (forêts plantées, tourbières restaurées). Les deux peuvent dépasser l'ensemble des émissions agricoles : sans la repousse, le bénéfice d'un changement est donc plus petit qu'il pourrait l'être, pas plus grand. Le graphique *Causes du réchauffement* montre tout de même le changement d'usage des terres comme une cause du réchauffement passé, à partir de données publiées. Pour donner un ordre de grandeur : Eisen et Brown (2022) trouvent qu'abandonner l'élevage en 15 ans, avec une végétation qui se reconstitue entièrement sur les terres libérées (environ 790 Gt de CO₂ absorbées en 30 ans), donnerait en 2100 un forçage radiatif de 3,8 au lieu de 4,9 W/m², « le même effet […] qu'une réduction de 68 % des émissions de CO₂ ». Leur repousse absorbe environ 26 Gt de CO₂ par an, contre environ 9 Gt dans le changement complet de Planetshift avec la repousse activée, qui ne compte qu'une jeune forêt naturelle là où elle peut pousser et rien sur les parcours arides ; le changement complet de Planetshift évite 0,27 °C (0,18–0,40) en 2100 sans la repousse et 0,37 °C (0,19–0,76) avec.

**La pollution de l'air et le méthane des combustibles.** Les leviers d'énergie, de chauffage et d'industrie réduisent le méthane qui fuit pendant la production du combustible et la pollution de l'air que sa combustion produisait, avec un seul rapport par secteur et un forçage mondial par kg (voir [Énergie et transport](#method-sectors)). L'endroit où la pollution est émise compte, et il n'est modélisé que pour le méthane des NOx, partagé entre terre et mer d'après une seule étude multimodèle du transport (Hoor et al. 2009) et ramené à la moyenne mondiale de FaIR : une tonne de SO₂ au-dessus de l'air pur de l'océan refroidit davantage qu'une tonne au-dessus d'une région polluée, l'ozone des NOx est le même partout, et les centrales, les bâtiments et l'industrie partagent la place de la route sur terre, faute de chiffres comparables. Le méthane des NOx reste le plus grand et le plus incertain de ces termes, et il croît avec le méthane du scénario : dans SSP3-7.0, voitures et camions électriques finissent encore par ajouter du réchauffement d'ici 2100 (0,018 et 0,025 °C). Les modèles de chimie trouvent que l'ozone du trafic routier l'emporte sur son méthane (+16 ± 13 mW/m² net, contre −18 ± 10 pour le transport maritime ; Myhre et al. 2011), alors que la réponse du méthane aux NOx dans FaIR, qui semble plus forte que dans ces modèles (environ 2 kg de méthane par kg de NO₂, contre quelques dixièmes pour les NOx routiers dans ces modèles), fait réchauffer les baisses de NOx même sur terre : le modèle rend donc peut-être encore trop coûteuses les co-émissions des véhicules électriques. Le monoxyde de carbone, les composés organiques volatils et l'ammoniac des combustibles, la pollution propre des raffineries et la sous-estimation des fuites de méthane par les inventaires (les satellites en trouvent davantage) sont laissés de côté, et aucun levier ne vise la pollution de l'air seule (filtres, foyers de cuisson plus propres). La demande supplémentaire des centres de données dans la référence ne porte que son CO₂. Voir [Causes du réchauffement climatique](#method-link).

**Le transport, la transformation, l'emballage et la distribution des aliments.** Seul ce qui se passe à la ferme est compté par défaut ; dans les Options, on peut ajouter la fabrication des engrais et l'énergie utilisée sur la ferme. Ce qui arrive aux aliments après la sortie de ferme n'est pas compté. Les leviers d'énergie et de transport agissent sur l'ensemble des véhicules, des vols, des navires et des centrales du monde, pas sur la part qui revient à l'alimentation.

**L'énergie au-delà de quelques secteurs.** Les leviers d'énergie couvrent le transport routier, l'aviation, le transport maritime, l'électricité et la demande supplémentaire des centres de données. Les réseaux de chaleur, le rail, les industries autres que l'acier et le ciment, et la fabrication des véhicules, des batteries, des panneaux solaires et des puces ne sont pas des leviers ; les leviers ne changent le méthane et les aérosols du scénario que par le combustible qu'ils retirent. Les véhicules électriques ne deviennent pas plus efficaces avec le temps, le forçage de l'aviation hors CO₂ garde son rapport de 2018 au CO₂, et les leviers sont des parts d'adoption, pas des politiques ni des coûts.

**Les leviers agricoles.** Les pratiques, le gaspillage, la déforestation et le carbone dans les terres agricoles sont des parts adoptées aux effets publiés ; la possibilité d'adopter une pratique dans un pays est un jugement, le carbone du sol peut être reperdu, et moins gaspiller libère de l'argent dépensé pour autre chose, un effet rebond laissé de côté. Voir [Leviers](#method-levers).

**Le pergélisol et les autres rétroactions.** L'option du pergélisol ajoute une rétroaction du système Terre, de façon simple : ce que libère chaque degré est étalé sur 20 ans, en un seul passage, sans le dégel brutal, avec une fourchette large d'un facteur dix. Les autres rétroactions au-delà du cycle du carbone de FaIR (dépérissement des forêts, hydrates de méthane) ne sont pas comprises.

**La réaction du commerce.** Les fermes de chaque pays changent en proportion de leur part de la production mondiale. En réalité, une baisse de la demande de bœuf toucherait certains exportateurs plus que d'autres, et les prix modifieraient qui produit quoi.

**Les prix et les revenus.** Une alimentation moins chère ou plus chère change ce que les gens achètent ; Planetshift ne le modélise pas. Un changement est un choix que l'on règle, pas une prévision de ce que les gens feront.

**La santé.** Planetshift maintient les protéines ou les calories égales, mais ne vérifie pas le régime au regard des recommandations de santé et n'estime pas les effets sur la santé.

**Les cultures non alimentaires.** Le coton, le tabac, le caoutchouc et les cultures pour biocarburants ne sont pas pris en compte.

**L'échelle infranationale.** La production et les émissions sont par pays ; il n'y a pas de carte de l'endroit où, dans un pays, les aliments sont produits.

## Quelle est la précision des chiffres

La fourchette de température vient de la dispersion de la réponse du modèle climatique à chaque gaz (du 5e au 95e centile d'un ensemble calibré de simulations). Elle ne comprend pas l'incertitude sur les émissions par tonne de chaque aliment, qui peut être grande, ni sur les régimes et les parts de l'alimentation animale. La fourchette réelle est plus large que celle affichée.

Les émissions par tonne viennent de la meilleure source disponible pour chaque aliment et chaque pays, des données HESTIA pour ce pays jusqu'à une médiane mondiale du groupe d'aliments. La carte de qualité des données montre laquelle ; là où elle est faible, il faut prendre les chiffres de ce pays comme des approximations.

Le réchauffement évité en 2050 est petit : quelques centièmes de degré pour un changement modeste ; les leviers d'énergie au maximum en évitent plusieurs dixièmes d'ici 2100. Il faut le lire avec sa fourchette et comme un ordre de grandeur, pas au dernier chiffre près. Les variations d'émissions sont plus robustes que les variations de température, et le sens du changement est plus robuste que son ampleur.

## Hypothèses

- Laisser de côté l'usage des terres, comme le fait le réglage par défaut, est prudent : compter la repousse rend le réchauffement évité plus grand.
- La réponse du climat est linéarisée autour du scénario de référence, ce qui tient bien pour les leviers qui changent une petite part des émissions mondiales (la plupart des leviers agricoles et fonciers, un levier d'énergie seul), et moins bien pour les leviers d'énergie au maximum, qui retirent une grande partie du CO₂ du scénario : leur réchauffement évité est une estimation au premier ordre.

## Sources

- Poore, J. and Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992.
- Hayek, M. N. et al. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24.
- Hoor, P. et al. (2009). The impact of traffic emissions on atmospheric ozone and OH: results from QUANTIFY. Atmospheric Chemistry and Physics 9, 3113–3136.
- Myhre, G. et al. (2011). Radiative forcing due to changes in ozone and methane caused by the transport sector. Atmospheric Environment 45, 387–394.
- Eisen, M. B. and Brown, P. O. (2022). Rapid global phaseout of animal agriculture has the potential to stabilize greenhouse gas levels for 30 years and offset 68 percent of CO₂ emissions this century. PLOS Climate 1, e0000010.
