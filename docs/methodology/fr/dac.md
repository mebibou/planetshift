# Captage direct dans l'air

Les usines de captage direct dans l'air retirent du CO₂ de l'air avec des filtres ou des produits chimiques. Quand ce CO₂ est ensuite stocké en profondeur sous terre, on parle de captage direct dans l'air avec stockage (DACCS en anglais). Planetshift propose un levier pour cela. À 100 %, les usines stockent environ 0,65 milliard de tonnes de CO₂ par an en 2050 et 3,3 milliards en 2100. Produire leur électricité émet aussi du CO₂. Sur SSP2-4.5, elles retirent 0,44 milliard de tonnes en 2050, une fois ce CO₂ déduit. Elles évitent 0,0015 °C de réchauffement en 2050 et 0,030 °C en 2100 (médiane, SSP2-4.5).

Les usines actuelles captent environ 0,01 million de tonnes par an (AIE, *Direct Air Capture 2022*). À 100 %, le levier dépasse de loin ce qu'utilisent la plupart des trajectoires d'atténuation : le GIEC donne une médiane de 0,02 milliard de tonnes de DACCS par an en 2050, dans une fourchette de 0 à 1,74 (AR6 GTIII, chapitre 12).

## Seulement le CO₂ stocké

Une partie du CO₂ capté sert à fabriquer du carburant de synthèse, surtout pour l'aviation. Brûler ce carburant relâche le CO₂, qui n'est donc pas retiré. Ce carburant remplace en revanche du carburant fossile. Le levier *Carburant d'aviation propre* le compte déjà (voir [Énergie et transport](#method-sectors)). Le levier ne compte donc que le CO₂ stocké.

## Le calendrier à 100 %

Tous les autres leviers se mettent en place jusqu'à l'année fixée par *Tous les leviers en place en*. Ce levier suit plutôt son propre calendrier, car les usines mettent des décennies à se construire. Le curseur s'applique à tout le calendrier : à 50 %, la moitié du CO₂ est stockée chaque année.

Le calendrier suit la Net Zero Roadmap de l'AIE (mise à jour de 2023) jusqu'en 2050. Son scénario Net Zero capte dans l'air 80 millions de tonnes de CO₂ en 2030, 203 millions en 2035 et 1 041 millions en 2050. Une partie sert à fabriquer du carburant. Dans le rapport *Direct Air Capture 2022* de l'AIE, la version précédente du même scénario capte 980 millions de tonnes en 2050. Sur ces 980 millions, 630 millions sont stockées et 350 millions sont utilisées, surtout pour du carburant d'aviation. Planetshift applique cette part stockée, 64,3 %, à chaque année du calendrier de 2023.

Après 2050, le calendrier monte en ligne droite jusqu'à 3,3 milliards de tonnes en 2100. C'est le cas d'action retardée (Delayed Action Case) de l'AIE. Dans ce cas, la neutralité carbone arrive tard. Retirer plus de 5 milliards de tonnes de CO₂ par an pendant la seconde moitié du siècle ramène le réchauffement sous 1,5 °C. Ce retrait se répartit entre 2 milliards de tonnes par la bioénergie avec captage du carbone et 3,3 milliards par le DACCS. L'AIE note que le DACCS consommerait à cette échelle environ 30 EJ d'énergie par an.

En milliards de tonnes de CO₂ stockées par an :

| 2030 | 2035 | 2040 | 2050 | 2060 | 2075 | 2100 |
| --- | --- | --- | --- | --- | --- | --- |
| 0,051 | 0,131 | 0,310 | 0,669 | 1,195 | 1,985 | 3,300 |

Les valeurs sont linéaires entre ces jalons. De 2026 à 2100, cela fait 107 milliards de tonnes stockées. C'est proche de la médiane des trajectoires de l'AR6 qui ramènent le réchauffement à 1,5 °C après un fort dépassement (catégorie C2) : 109 milliards de tonnes de DACCS de 2020 à 2100, parmi les 24 qui en utilisent (AR6 GTIII, tableau 3.5). À 100 %, le levier décrit donc un monde qui a agi tard et compte ensuite sur le retrait de CO₂ à grande échelle.

## L'énergie consommée

Les usines du levier utilisent des sorbants solides, comme celles de Climeworks. Elles ont besoin d'électricité pour les ventilateurs et les pompes à vide, et de chaleur à environ 100 °C pour libérer le CO₂ du filtre. Deutz et Bardow (2021) donnent 500 kWh d'électricité et 1 500 kWh de chaleur par tonne captée. Une pompe à chaleur haute température produit la chaleur, avec un coefficient de performance (COP) de 2,9, comme chez Terlouw et al. (2021). Capter une tonne demande donc 500 + 1 500 / 2,9 = 1 017 kWh d'électricité.

La fourchette vient des 7,2 à 9,5 GJ par tonne que donne l'AIE pour les sorbants solides, dont 20 à 25 % d'électricité :

- **Basse** (800 kWh) : 7,2 GJ, dont 20 % d'électricité, soit 400 kWh d'électricité et 1 600 kWh de chaleur. La pompe à chaleur a un COP de 4. Elle peut atteindre ce COP en chauffant à partir d'une source tiède, comme de la chaleur fatale.
- **Haute** (1 452 kWh) : 9,5 GJ, dont 25 % d'électricité, soit 660 kWh d'électricité et 1 980 kWh de chaleur. La pompe à chaleur a un COP de 2,5, en chauffant de l'air extérieur jusqu'à 100 °C.

La fourchette probable utilise la valeur basse d'énergie pour la borne qui évite le plus de réchauffement, et la valeur haute pour celle qui en évite le moins.

L'électricité vient du réseau du scénario, avec son CO₂ par kWh en moyenne mondiale chaque année, tiré de `sectors.json` (voir [Énergie et transport](#method-sectors)). Le levier *Électricité renouvelable* rend ce réseau plus propre, et réduit donc aussi le CO₂ des usines, comme pour les voitures électriques et les pompes à chaleur. L'électricité apporte aussi le méthane et la pollution de l'air du réseau (voir *Le méthane et la pollution de l'air qui accompagnent le combustible* sur la même page).

Construire les usines et fabriquer leur sorbant émet aussi du CO₂. Deutz et Bardow trouvent jusqu'à 45 g de CO₂e par kg capté pour le sorbant et 15 g pour la construction de l'usine, avec une énergie bas carbone. Le levier compte 5 % de ce qui est capté, dans une fourchette de 2,5 à 6 %.

## Retrait net

Chaque année, le CO₂ du levier est

$$\Delta\text{CO}_2 = -S + S\,k\,g\,(1 - r) + S\,e$$

avec $S$ le CO₂ stocké, $k$ les kWh par tonne, $g$ le CO₂ du réseau par kWh, $r$ la part du réseau que l'électricité renouvelable a rendue propre cette année-là, et $e$ la part due à la construction. Il entre dans FaIR comme du CO₂ négatif, comme le CO₂ que capte le carbone dans les terres agricoles.

La part du CO₂ capté qui est retirée, net de l'énergie des usines (médiane, sans électricité renouvelable) :

| Scénario | 2030 | 2035 | 2040 | 2050 | 2060 | 2075 | 2100 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SSP2-4.5 | 52 % | 58 % | 63 % | 68 % | 72 % | 83 % | 95 % |
| SSP1-2.6 | 55 % | 64 % | 72 % | 85 % | 95 % | 95 % | 95 % |
| SSP3-7.0 | 45 % | 44 % | 44 % | 43 % | 42 % | 41 % | 39 % |

Sur le réseau de SSP3-7.0, qui brûle encore du charbon en 2100, leur électricité rejette plus de la moitié de ce que les usines retirent. Avec le chiffre d'énergie haut et le méthane du charbon et du gaz, le levier peut même y causer du réchauffement, dans la borne qui en évite le moins. Terlouw et al. trouvent qu'une usine branchée sur le réseau cesse de retirer du CO₂ lorsque le réseau dépasse environ 0,86 kg de CO₂e par kWh. Avec l'électricité renouvelable à 100 %, les usines retirent 95 % de ce qu'elles captent à partir de l'année où elle est entièrement en place, 2035 par défaut.

## Dans l'application

Dans la section Leviers, le volet **Captage direct dans l'air** contient le curseur. Il se trouve sous *Autres émissions humaines*, à côté de la réduction des HFC. Il retire du CO₂ de l'air plutôt que de réduire les émissions d'un secteur. Les émissions des usines viennent de l'électricité du réseau. Dans la répartition par levier, son effet compte comme *Captage direct dans l'air*. Quand le levier agit, le résumé montre le CO₂ retiré en 2050, net de l'énergie des usines. Le levier agit sur le monde dans son ensemble, pas par pays : il n'a donc pas de couche sur la carte.

Le levier interagit avec l'électricité renouvelable par le réseau. Dans la répartition, ce recouvrement est partagé entre les deux groupes selon leur valeur de Shapley (voir [Leviers](#method-levers)), comme pour les autres groupes hors de l'agriculture.

Le calendrier et les chiffres d'énergie sont dans `app/src/levers/dac/dac.json`, et le module du levier est `app/src/levers/dac/`.

## Résultats

Le réchauffement évité en °C, en médiane avec la fourchette probable entre parenthèses. Le levier est à 100 %, sur les données réelles avec les options par défaut.

| Scénario | 2050 | 2100 |
| --- | --- | --- |
| SSP2-4.5 | 0,0015 (0,0005–0,0030) | 0,030 (0,018–0,046) |
| SSP1-2.6 | 0,0017 (0,0010–0,0029) | 0,036 (0,027–0,056) |
| SSP3-7.0 | 0,0015 (−0,0001–0,0038) | 0,011 (−0,004–0,031) |

Le CO₂ retiré en 2050, net de l'énergie des usines, est de 0,44 milliard de tonnes sur SSP2-4.5 (0,35–0,50), 0,56 sur SSP1-2.6 et 0,26 sur SSP3-7.0. Avec aussi l'électricité renouvelable à 100 %, il est de 0,64 pour les trois scénarios.

Peu de CO₂ est stocké avant 2050 : peu de réchauffement est donc évité d'ici là. En 2100, environ 107 milliards de tonnes ont été stockées. Pour vérifier, la réponse transitoire du climat aux émissions cumulées (TCRE) est de 0,45 °C par 1 000 milliards de tonnes de CO₂. Sur SSP2-4.5, les usines retirent 4,5 milliards de tonnes d'ici 2050 et 91,5 milliards d'ici 2100, net de leur énergie. La TCRE en fait 0,0020 °C en 2050 et 0,041 °C en 2100. FaIR donne moins, car l'océan et les terres renvoient vers l'air une partie du CO₂ retiré.

## Hypothèses et limites

- À 100 %, le levier suit le scénario Net Zero de l'AIE jusqu'en 2050, puis son cas d'action retardée. Il dépasse de loin la médiane des trajectoires du GIEC en 2050 (0,02 milliard de tonnes par an). Il est aussi des dizaines de milliers de fois supérieur au captage actuel (environ 0,01 million de tonnes par an).
- Les usines tournent sur le réseau du scénario, en moyenne mondiale. Les usines réelles se construisent là où l'électricité est propre, comme en Islande, et retireraient une plus grande part de ce qu'elles captent.
- Seules les usines à sorbants solides avec pompe à chaleur sont modélisées. Les usines à solvants liquides ont besoin de chaleur à environ 900 °C, souvent tirée de gaz naturel. Le gaz brûlé pour cette chaleur, et le méthane qui fuit pour le produire, ne sont pas comptés.
- Le CO₂ stocké est supposé rester sous terre de façon permanente. Les fuites des sites de stockage, et des canalisations et navires qui transportent le CO₂, ne sont pas comptées.
- La capacité de stockage et le rythme de construction des usines sont supposés sans limite.
- L'électricité supplémentaire, environ 3 400 TWh par an en 2100 à 100 %, vient du réseau du scénario à son CO₂ moyen par kWh. Son effet sur la construction des centrales n'est pas modélisé.
- Le coût n'est pas modélisé. Le GIEC donne 100 à 300 USD la tonne une fois les usines construites à grande échelle, et 600 à 1 000 pour les premières usines (AR6 GTIII, chapitre 12).

## Sources

- AIE (2023). *Net Zero Roadmap: A Global Pathway to Keep the 1.5 °C Goal in Reach, 2023 Update*. Tableau des jalons du CCUS (captage direct dans l'air) et section 3.3.3, *What would it take to bring temperatures back below 1.5 °C?*. Licence : CC BY 4.0 (le corps du rapport ; son annexe A est sous CC BY-NC-SA 4.0 et n'est pas utilisée).
- AIE (2022). *Direct Air Capture 2022: A key technology for net zero*. Licence : CC BY 4.0.
- Deutz, S., Bardow, A. (2021). Life-cycle assessment of an industrial direct air capture process based on temperature–vacuum swing adsorption. Nature Energy 6, 203–213, [doi:10.1038/s41560-020-00771-9](https://doi.org/10.1038/s41560-020-00771-9).
- Terlouw, T., Treyer, K., Bauer, C., Mazzotti, M. (2021). Life Cycle Assessment of Direct Air Carbon Capture and Storage with Low-Carbon Energy Sources. Environmental Science & Technology 55, 11397–11411, [doi:10.1021/acs.est.1c03263](https://doi.org/10.1021/acs.est.1c03263).
- GIEC (2022). Climate Change 2022: Mitigation of Climate Change, Groupe de travail III, chapitre 3 (tableau 3.5) et chapitre 12 (section 12.3).
