# Découverte native — carte et groupes

Mode : Operate. Cible : src/app/index.tsx, components/group-map.tsx, components/group-banner.tsx, components/group-emblem.tsx, lib/group-identity.ts, lib/carnival-map-style.ts, components/group-detail-panel.tsx, theme/ui.tsx. Périmètre local Expo et simulateur iOS.

## Direction contract

**THESIS** — Retrouver un groupe sans perdre sa place sur la carte. Une seule scène spatiale remplace les pages liste/carte/fiche du site historique.

**OWN-WORLD** — Le langage natif des applications de navigation : ville vectorielle IGN bord à bord, palette calcaire le jour et ardoise la nuit, volumes sobres à partir des hauteurs disponibles et bannières de groupes. Texte système pour l’interface, Source Sans Pro pour le fond, symboles SF sur iOS et Material sur Android. Bleu franc pour les actions ; couleur et emblème du groupe pour son identité. Vert/ambre et textes de statut restent indépendants de cette identité.

**STORY** — Chercher un nom, repérer sa disponibilité, toucher le groupe, lire la source et l’âge du point, rejoindre ce point daté. La contribution se présente seulement hors live.

**FIRST VIEWPORT** — Carte plein écran inclinée, avec bâtiments à hauteur disponible et bannières dont le pied reste au point GPS. Le passage à plat conserve le même fond et les mêmes repères. Nom O Mas La discret sous la zone sûre, compte à droite. Un seul panneau inférieur à trois hauteurs contient une recherche persistante puis la liste ou la fiche. Le cran intermédiaire de la fiche occupe environ le tiers inférieur, avec titre, source/âge et action principale visibles. Commandes de cadrage et localisation au-dessus du panneau, commande 2D/3D et attribution IGN accessibles. Sur tablette, panneau latéral compact. Geste signature : sélectionner un repère conserve la carte et transforme le contenu du panneau en fiche ; fermer retrouve la recherche.

**FORM** — Canon natif de navigation explicitement demandé par Marvin, priorité sur le tirage bd3a83aa (index 3). La sobriété de Plans guidait la première composition ; la direction Ville en relief + bannières retenue ensuite remplace son fond générique. Composition A approuvée le 14 octobre 2026 après comparaison de trois maquettes ; construction guidée par `.impeccable/mocks/comparison-20261013/a.png`. Le fond et les repères suivent ensuite la deuxième [exploration cartographique](../explorations/map-personality-20261014/02-bannieres.png), dont le degré de détail reste illustratif. Aucun faux itinéraire interne, ETA ou distance.

**FINISH** — unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Contraintes de validation

Vérifier carte → fiche → retour, recherche/clavier, filtrage, groupes sans position, vieillissement, contribution bloquée en live, compte modal, permission au geste, thème sombre, texte agrandi et iPad. Vérifier aussi le pied des bannières pendant les changements de zoom/pitch, la sélection, le cadrage derrière le panneau et la colonne iPad, la bascule 2D/3D, les sources et le chargement du fond IGN. Les hauteurs inconnues n’autorisent pas un volume de remplacement. Les données fictives restent libellées « démo ». Les fournisseurs auth réels et les performances GPS terrain sont hors preuve de ce prototype.

## Reprise visuelle — choix explicite du 13 octobre 2026

Marvin demande des captures de référence recherchées avec le MCP et choisit **des maquettes en images d’abord**. Le prototype local ci-dessus reste conservé ; son exécution code-first était une hypothèse de la première passe, désormais remplacée pour la suite par une comparaison visuelle avant toute nouvelle implémentation.

Les références officielles Plans, Google Maps et Waze servent à comparer immersion, articulation carte/fiche et lisibilité des statuts. Les trois maquettes exploratoires de `.impeccable/mocks/comparison-20261013/` ne sont pas approuvées. Leur carte et leurs positions sont illustratives ; elles ne prouvent aucun geste ni suivi GPS réel. Le choix de composition et les éventuelles combinaisons restent à Marvin.

## Approbation du 14 octobre 2026

Marvin retient **A — Recherche et fiche dans un seul panneau bas**. Cette décision remplace le statut non approuvé ci-dessus. La recherche reste montée dans le panneau pendant les transitions liste/fiche. La carte est un composant natif interactif, pas le dessin de géographie généré dans la maquette ; les repères et le texte viennent du catalogue. Les commandes gardent leurs fonctions existantes de cadrage et de localisation : le pictogramme de couches de l’image ne crée pas un nouveau mode de carte. Typographie système iOS, zones sûres et Dynamic Type restent natifs. La source, la fraîcheur et la mention de démonstration restent exactes et lisibles.

## Identité à approfondir — retour du 14 octobre 2026

Marvin trouve le rendu trop proche d’une application Maps classique et demande une exploration plus personnelle du fond et des groupes. L’approbation de la composition A demeure ; elle ne vaut pas approbation finale du langage Apple standard décrit plus haut. Trois maquettes et leur faisabilité sont conservées dans l’archive locale `explorations/map-personality-20261014/`, hors du lot versionné à l’exception de la direction retenue et de la preuve des données. Aucune nouvelle direction ni migration de moteur n’est approuvée à ce stade historique. Cette exploration n’a pas modifié le runtime.


## Direction retenue — Ville et bannières

Marvin préfère la deuxième exploration, **Ville en relief + bannières**, avec une réserve explicite sur les données 3D disponibles en Guadeloupe. Les bannières sont retenues pour les repères. La composition A reste validée. La proposition intermédiaire d’associer le fond Atlas et les bannières ne constitue pas son choix. La ville détaillée de l’image reste illustrative ; son degré de relief doit être fondé sur les données et le rendu réellement disponibles. Les bannières doivent fonctionner également sur un fond plat. Le statut live reste indépendant des couleurs d’identité du groupe.


## Intégration locale autorisée — Ville en relief + bannières

Marvin demande l’intégration locale de cette direction. Ce choix remplace les mentions antérieures « aucune migration approuvée » : la scène des groupes est désormais implémentée avec MapLibre React Native 11.5.0, un style vectoriel Plan IGN jour/nuit et la composition A conservée. Le build iOS a réussi et le client est installé sur iPhone 17 et iPad Air 11 pouces M4. La revue visuelle indépendante rend un verdict `ship` limité aux captures finales de jour iPhone et iPad. Les essais natifs ont repris le 14 octobre vers 14 h après déverrouillage : l’activation d’une bannière ouvre la fiche au cran intermédiaire et le passage à plat conserve cette fiche. Les captures antérieures de composition A restent historiques et ne valident pas ce moteur.

- Les bâtiments `bati_surf` sont extrudés à partir de leur `hauteur` IGN strictement positive, dès le zoom 14. Une hauteur manquante ou nulle n’est pas inventée ; aucune couverture complète de la ville ou de la Guadeloupe n’est promise.
- La commande 2D/3D règle le pitch et les volumes : hauteur nulle et pitch 0° à plat ; hauteur IGN disponible et pitch 42° en relief. Le filtre `hauteur > 0` reste actif dans les deux modes. Les sources restent attribuées à IGN ; le détail d’attribution est accessible depuis la carte.
- Les bannières complètes ont un cadre stable de 172 × 96, porté à 190 × 96 pour la sélection, et une plaque sur deux lignes : nom, puis statut et âge. Sous le zoom 16, les groupes non sélectionnés utilisent un drapeau de 44 × 64 sans plaque. Le décalage commun `[-10, 6]` ancre le pied au GPS dans les deux variantes. La sélection reprend la couleur du groupe ; la pastille de statut conserve son sens. Les libellés accessibles restent complets, y compris le titre natif `ViewAnnotation` sur iOS.
- Les cinq identités dessinées en SVG sont réservées aux fixtures explicitement marquées `· démo`. Les autres groupes reçoivent un monogramme et une couleur stables issus de leur identifiant, en attendant leur identité réelle. L’emblème est partagé entre bannière, ligne et fiche.
- Aucun raster de la maquette ne remplace la géographie. Les volumes représentent des hauteurs disponibles et non les détails architecturaux, matières, foule ou déplacements suggérés dans une image générée.


## État de l’intégration et de la preuve

Le style comporte 18 couches ; les libellés de quartiers ont été retirés pour réduire la densité. Les quatre variantes jour/nuit × plat/relief passent le validateur MapLibre. Les contrôles TypeScript et ESLint ont passé ; la reprise confirme 37 tests Expo et 39 tests Convex réussis, avec deux avertissements de lint dans le code Convex `_generated`. Le journal Xcode contient `BUILD SUCCEEDED` ; les détails de build, les simulateurs et les limites sont conservés dans le [rapport local](../review/ville-bannieres/implementation.md).

La reprise après le verrouillage de 04 h 07 a révélé puis corrigé une double activation iOS : l’annotation gère seule le geste et arrête sa propagation vers la carte. Un seul événement de sélection est reçu ; la fiche et son action restent visibles après stabilisation. Les passages 3D→2D→3D, la recherche « Tambour » vers un résultat, l’ouverture de la fiche puis le retour conservant la requête, l’action accessible d’agrandissement et l’ouverture/fermeture du dialogue des sources IGN ont été exercés. Les captures de reprise sont natives et sans retouche, dans `review/ville-bannieres/qa-20261014/`. Le glissement physique et le clavier logiciel n’ont pas été reconfirmés dans cette reprise ; la lecture parlée VoiceOver, Android, les performances sur téléphone physique et le GPS terrain restent hors preuve. Les maquettes non retenues et les diagnostics historiques restent locaux ; seules les références approuvées et les preuves sélectionnées font partie du lot consigné localement sur `develop`. Aucun push ni déploiement n’est associé à cette intégration.
