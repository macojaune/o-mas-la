---
name: "O Mas La — application native"
description: "Système visuel extrait de l’implémentation locale Expo / React Native."
colors:
  background: "#F3F5F8"
  surface: "#ffffff"
  ink: "#172033"
  muted: "#5E697A"
  line: "#E2E6EC"
  primary: "#1765E8"
  primary-soft: "#EAF1FF"
  primary-text: "#ffffff"
  success: "#16734C"
  warning: "#89550B"
  warning-soft: "#FFF3DC"
  danger: "#b33234"
  night-background: "#111820"
  night-surface: "#202935"
  night-ink: "#F3F5F8"
  night-muted: "#AEBACA"
  night-line: "#354354"
  night-primary: "#82B3FF"
  night-primary-soft: "#213855"
  night-primary-text: "#101B2C"
  night-success: "#86d9b2"
  night-warning: "#e8bd76"
  night-warning-soft: "#3e2e17"
  night-danger: "#ff999b"
  night-map-land: "#202d31"
  night-map-sand: "#38433f"
  night-map-green: "#314c43"
  night-map-mangrove: "#264c46"
  night-map-water: "#0b3943"
  night-map-shallows: "#24535a"
  night-map-road: "#546367"
  night-map-road-edge: "#26363a"
  night-map-path: "#879088"
  night-map-ink: "#e4ece7"
  night-map-water-ink: "#b6e1dd"
  night-map-building: "#728185"
  map-land: "#eee9df"
  map-sand: "#e5d9bd"
  map-green: "#c2cdae"
  map-mangrove: "#a6bda4"
  map-water: "#14727b"
  map-shallows: "#74a9a5"
  map-road: "#fffdf7"
  map-road-edge: "#d3cdbf"
  map-path: "#f9f5e9"
  map-ink: "#26494c"
  map-water-ink: "#f2fcf8"
  map-building: "#eee3cb"
typography:
  title:
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.6px"
  headline:
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.5px"
  panel-title:
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.6px"
  panel-detail-title:
    fontSize: "25px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "-0.6px"
  row-title:
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "23px"
  body:
    fontSize: "17px"
    lineHeight: "25px"
  button:
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "22px"
  search:
    fontSize: "16px"
  label:
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontSize: "14px"
    lineHeight: "21px"
  small:
    fontSize: "12px"
    lineHeight: "18px"
  marker-title:
    fontSize: "13px"
    fontWeight: 700
    lineHeight: "17px"
  marker-status:
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "14px"
  map-label:
    fontFamily: "Source Sans Pro Regular"
  map-town-label:
    fontFamily: "Source Sans Pro Bold"
rounded:
  notice: "12px"
  button: "16px"
  map-controls: "18px"
  search: "20px"
  filter: "22px"
  circle-control: "24px"
  panel: "28px"
  handle: "3px"
  banner-plaque: "12px"
spacing:
  "4": "4px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "22": "22px"
  "24": "24px"
  "28": "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "13px 18px"
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "13px 18px"
  button-danger:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "13px 18px"
  search-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.search}"
    rounded: "{rounded.search}"
    padding: "10px 0"
  screen-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.row-title}"
    padding: "8px 16px"
  filter-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.filter}"
    padding: "10px 14px"
  filter-rest:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.filter}"
    padding: "10px 14px"
  notice:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.notice}"
    padding: "16px"
  notice-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.notice}"
    padding: "16px"
  notice-error:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.caption}"
    rounded: "{rounded.notice}"
    padding: "16px"
  group-row:
    textColor: "{colors.ink}"
    typography: "{typography.row-title}"
    padding: "15px 0"
  group-banner:
    height: "96px"
    width: "172px"
  group-banner-compact:
    height: "64px"
    width: "44px"
  group-banner-selected:
    height: "96px"
    width: "190px"
  group-banner-plaque:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.marker-title}"
    rounded: "{rounded.banner-plaque}"
    padding: "6px 9px"
  group-banner-status-recent:
    textColor: "{colors.success}"
    typography: "{typography.marker-status}"
  discovery-handle:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.handle}"
    height: "5px"
    width: "36px"
---

# Design System: O Mas La — application native

## Overview

**Creative North Star: "La carte reste le lieu"**

O Mas La conserve le langage des applications natives de navigation et lui donne une identité de ville : fond vectoriel clair calcaire ou nocturne, volumes simples issus des hauteurs disponibles et bannières attachées aux positions des groupes. La composition A maintient la recherche et la fiche dans un seul panneau. Le bleu porte les actions de l’interface ; la bannière et son emblème portent l’identité du groupe, indépendamment de son statut.

La densité reste fonctionnelle. Les intitulés français, la typographie du système et les symboles natifs portent l’interface. Le thème suit celui de l’appareil ; les surfaces iOS translucides deviennent opaques lorsque la réduction de transparence est activée.

**Key Characteristics:**

- Carte vectorielle IGN personnalisée, volumes mesurés et panneaux conservant le contexte.
- Fond jour/nuit et couleurs d’identité séparées des statuts de position.
- Texte système dans l’interface, Source Sans Pro sur le fond cartographique, symboles natifs.
- Bannières ancrées au point GPS, source et fraîcheur lisibles sans dépendre de leur couleur.

**État courant — Ville en relief + bannières.** Direction approuvée par Marvin et intégration locale autorisée. Le code utilise désormais `@maplibre/maplibre-react-native` 11.5.0 pour la scène des groupes, à la place du rendu `react-native-maps` précédent ; la présence résiduelle de cette dépendance dans le manifeste ne décrit pas le moteur actif de cette scène. Le fond IGN, les extrusions à hauteur disponible et les composants `GroupBanner`, `GroupEmblem` et `groupIdentity` sont implémentés. Le build iOS MapLibre a réussi et le client a été installé sur iPhone 17 et iPad Air 11 pouces M4. La revue indépendante rend un verdict `ship` limité aux captures finales de jour iPhone et iPad, sans valider les gestes. Le 14 octobre vers 14 h, après déverrouillage du Mac, la reprise native a révélé puis corrigé une double activation des bannières iOS : la sélection appartient désormais à l’annotation et sa propagation vers la carte est arrêtée. Un appui ouvre la fiche au cran intermédiaire, avec le bouton « Rejoindre ce point » visible ; les passages 3D→2D→3D conservent cette fiche. La recherche « Tambour », l’ouverture de sa fiche, le retour conservant la requête, l’agrandissement accessible du panneau et le dialogue des sources IGN ont aussi été exercés. Les 37 tests Expo et les 39 tests Convex passent ; les contrôles de styles portent sur les quatre variantes jour/nuit × plat/relief. Voir le [rapport d’intégration locale](.impeccable/review/ville-bannieres/implementation.md) pour les vérifications, leurs limites et les captures. La consignation locale sur `develop` est en préparation, sans push ni déploiement.

**Historique de preuve — composition A avant migration.** Système extrait de l’implémentation locale `refonte-2027`, actualisé le 14 octobre 2026 après l’approbation de **A — Recherche et fiche dans un seul panneau bas**. Les sources sont `src/theme/ui.tsx`, la scène `src/app/index.tsx` et les composants natifs de carte, liste, fiche et poignée ; la direction confirmée figure dans `PRODUCT.md` et `.impeccable/surfaces/mobile-map.md`. Les captures historiques de `.impeccable/review/composition-a/`, conservées localement hors du lot versionné, montrent iPhone clair/sombre, texte agrandi et iPad. Les essais natifs ont exercé la recherche, la fiche et le retour conservant la requête, le glissement du panneau, ses actions accessibles, le filtre live sur iPad et l’ouverture de Plans. L’arrivée au groupe n’est pas vérifiée. Le changement de Dynamic Type pendant l’exécution, l’accès au bouton après défilement puis le retour à la taille normale sans relance ont été contrôlés après correction de la mesure des textes. La requête reste conservée. La fiche sans position ne propose aucun itinéraire et l’état sans résultat ramène au catalogue.

Les contrôles TypeScript et ESLint sont passés ; les 37 tests mobiles existants étaient verts avant la dernière correction de mesure Dynamic Type. Le clavier logiciel, la lecture parlée de VoiceOver et Android restent à valider. Les [preuves locales](docs/ux-local.md) distinguent ces contrôles de la passe du 13 octobre et des limites du comparateur visuel. La revue historique `.impeccable/review/composition-a/finish-review.md`, conservée localement hors du lot versionné, ne relève plus de défaut visuel matériel sur les captures examinées ; son verdict reste `fix` pour la preuve clavier et la clôture du comparateur manquantes. Ces éléments décrivent la passe antérieure au nouveau moteur ; ils ne constituent pas une validation de MapLibre.

Les valeurs en `px` du frontmatter représentent les unités logiques numériques utilisées par React Native, et non des pixels physiques. Les clés sans préfixe sont celles du thème jour ; `night-` désigne leur contrepartie nocturne. Le sidecar est une extension documentaire ; ses extraits HTML/CSS illustrent les primitives et ne reproduisent pas un runtime Expo. Ses rampes OKLCH sont des bandes synthétiques de consultation, sans rôle normatif dans la palette de l’application. Les interactions de survol et de focus HTML appartiennent uniquement aux aperçus.

## Colors

Le fond est neutre, l’encre est contrastée et les accents portent une action ou un statut. Les valeurs exactes du frontmatter viennent des objets `day` et `night` de `src/theme/ui.tsx` et des palettes de `src/lib/carnival-map-style.ts`, sans conversion de leur notation hexadécimale. Les valeurs `map-` concernent le fond cartographique, sans modifier les surfaces de l’interface ; `night-map-` en est la variante nocturne.

### Primary

- **Bleu d’action — `primary` / `night-primary` :** bouton principal, filtre choisi et position personnelle. La sélection d’une bannière utilise la couleur de son groupe, sans lui attribuer un statut live.
- **Bleu de surface — `primary-soft` / `night-primary-soft` :** boutons secondaires et de retrait, filtre choisi, notices normales, appui sur une ligne.
- **Texte d’action — `primary-text` / `night-primary-text` :** texte et symboles sur fond primaire ; clair le jour, encre sombre la nuit.

### Secondary

- **Vert de position — `success` / `night-success` :** live et observation récents dans les bannières, lignes et fiches. Dans la plaque non sélectionnée, le texte et la pastille de statut utilisent cette couleur. Dans la plaque sélectionnée, le texte devient blanc et la pastille conserve sa couleur sémantique, entourée d’un filet blanc.
- **Ambre d’ancienneté — `warning` / `night-warning` :** position vieillissante et avertissement ; `warning-soft` fournit le fond des notices correspondantes.
- **Rouge de retrait — `danger` / `night-danger` :** action de retrait, de déconnexion ou message d’erreur. Le bouton `danger` utilise le fond `primary-soft`, tel que codé.

### Neutral

- **Fond — `background` :** arrière-plan, contrôles secondaires, recherche, éléments de chargement et statut sans fraîcheur récente.
- **Surface — `surface` :** panneaux, écrans modaux, plaques des bannières non sélectionnées et solution opaque au flou.
- **Encre — `ink` :** titres et texte principal. **Texte secondaire — `muted` :** informations complémentaires et icônes secondaires.
- **Séparation — `line` :** traits fins, poignée et état pressé de fermeture. Chaque rôle a son équivalent `night-`.

### Cartographie et identités

Le fond jour distingue terre calcaire, végétation douce, routes claires et eau bleu-vert ; le fond nuit conserve ces rôles avec une terre ardoise, une eau plus sombre et des libellés clairs. Les volumes utilisent `map-building` / `night-map-building`. La palette change ; la géométrie IGN reste la source des rues, côtes, eaux et bâtiments.

Les couleurs de `groupIdentity` sont des données d’identité, pas une échelle de statuts. Les cinq fixtures reconnues par leur nom et le suffixe `· démo` possèdent un dessin SVG et une couleur dédiés. Les autres groupes reçoivent un monogramme et une couleur stable calculée à partir de leur identifiant, en attendant leur propre identité ; aucun logo officiel n’est inventé.

**The Action and State Rule.** Les couleurs du groupe identifient sa bannière et son emblème ; elles ne prouvent ni le live ni la fraîcheur. Le vert porte le statut récent, l’ambre l’ancienneté et le texte distingue live, observation et dernier point. Le bleu d’interface conserve son rôle d’action.

## Typography

**Police de texte et de titres :** police native par défaut. Aucun `fontFamily` personnalisé n’est imposé aux composants React Native de l’interface. Les libellés du fond vectoriel sont une couche distincte : Source Sans Pro Regular pour les rues et eaux, Bold pour les communes, via les glyphes IGN. L’usage de la police système est un choix explicite du canon natif confirmé, y compris pour les grands titres.

**Caractère :** titres compacts et fermes, texte courant confortable et métadonnées rapprochées de leur objet. Les capitales décoratives ne constituent pas un niveau de titre ; les initiales des groupes restent des monogrammes.

### Hierarchy

- **Title :** grand titre partagé de récupération, défini par `styles.title`.
- **Headline :** titre des écrans compte, déclaration et connexion.
- **Panel title / panel detail title :** titres de découverte et de groupe sélectionné ; le second est légèrement plus petit.
- **Row title :** nom de groupe et titre d’en-tête modal.
- **Body :** base de `Label` ; les composants réduisent localement taille et interligne selon leur contenu.
- **Button / label / caption / small :** actions, filtres, notices et compléments. Le champ de recherche n’impose pas d’interligne.
- **Marker title / marker status :** nom sur une première ligne, statut et âge sur une seconde ligne dans les bannières complètes ; l’agrandissement y est limité par `maxFontSizeMultiplier={1.5}`. Le badge de zone ou de démonstration reprend ce plafond avec deux lignes au maximum. Repères et badge sont remontés lorsque `fontScale` change pour renouveler leur mesure. La fiche et la liste restent les surfaces de lecture détaillée, sans ce plafond. Les primitives `Label` et le texte de `Button` renouvellent aussi leur mesure native avec une clé liée à `fontScale` ; un changement de taille pendant l’exécution ne doit pas conserver des hauteurs calculées pour la taille précédente.

**The Native Text Rule.** Conserver la police du système et l’agrandissement des textes de lecture ; limiter à 1.5 les repères et le badge cartographique pour préserver leur empreinte, sans étendre ce plafond à la liste ni à la fiche.

## Layout

Le modèle natif conserve une scène cartographique et superpose les commandes dans les zones sûres. Les détails de cette première surface appartiennent à son brief ; ils ne prescrivent pas la composition de tous les écrans futurs.

- Le nom discret O Mas La et le compte occupent le haut de la carte, avec une marge horizontale de 16 à `safeArea.top + 10`. Le compte occupe 56 × 56 et les commandes de carte 52 × 52. La recherche appartient au panneau ; elle garde une hauteur minimale de 56.
- Sous une largeur logique de 700, le panneau possède trois arrêts. L’arrêt intermédiaire utilise `min(availableHeight × 0.6, panelHeight)`, avec `panelHeight` de 386 pour la liste et 350 pour la fiche ; sa hauteur ne croît pas avec `fontScale`, afin de réserver un espace réel à la carte. L’arrêt réduit est `min(112 + safeArea.bottom, availableHeight × 0.3)` ; seule la recherche reste accessible à ce cran, la liste ou la fiche étant masquée visuellement et pour les technologies d’assistance. L’arrêt haut vaut 100 % et permet la lecture étendue, y compris en texte agrandi. `availableHeight = max(120, height − (safeArea.top + 82) − keyboardInset)`.
- À partir de 700, le panneau contenant la recherche occupe une colonne de 392, à 16 du bord gauche. Le panneau conserve un arrêt de 100 % dans son conteneur. La commande Agrandir/Réduire est absente de la liste dans ce mode ; la fermeture d’une fiche sélectionnée reste disponible. Le cadrage cartographique tient compte de cette colonne.
- La recherche persistante précède la liste ou la fiche dans le même panneau, avec une marge horizontale de 20 et un espacement inférieur de 14. Le contenu défilant possède une marge horizontale de 24. Son bas ajoute la zone sûre à 24 pour la liste et à 30 pour la fiche.
- Les écrans de formulaire et de compte utilisent le conteneur partagé : largeur 100 %, maximum 720, marge interne horizontale 22. Compte, déclaration et connexion réduisent le maximum à 600. Les séparations verticales sont adaptées au contenu, sans grille universelle inventée.
- Les textes et boutons utilisent des hauteurs minimales ; les lignes de groupe font au moins 84. Les boutons principaux font au moins 52. Les petits symboles conservent des zones tactiles plus larges que leur dessin.

Lorsque `fontScale > 1.3`, l’en-tête de l’annuaire affiche « Groupes » et retire le sous-titre décoratif pour préserver l’espace de lecture. Une recherche conserve « Résultats » et le nombre de groupes trouvés ; une fiche conserve le nom du groupe sélectionné. Cette adaptation de contenu ne modifie pas les tokens typographiques.

L’espace inférieur occupé par le panneau est calculé à partir de l’arrêt actif et du clavier. Après stabilisation, le callback `onChange` fournit sa position : `settledPanel.top = position + topInset` sur téléphone et `position` en mode large, puis `occupiedMapBottom = height − settledPanel.top` sur téléphone tant que l’arrêt et la disposition correspondent. Un changement de `fontScale` invalide cette mesure de disposition, sans augmenter la hauteur de l’arrêt intermédiaire. Avant la mesure, le repli additionne la hauteur du clavier et celle de l’arrêt actif ; l’arrêt haut utilise la hauteur disponible. En mode large, la réserve inférieure vaut `safeArea.bottom + 20`.

Le style cartographique contient 18 couches. Les noms de quartiers ont été retirés pour réduire la densité ; les rues, eaux et communes gardent leurs libellés.

Le cadrage MapLibre utilise une réserve commune aux plateformes, tenant compte du panneau, de la colonne iPad, des bannières et des zones sûres : `safeArea.top + 118` en haut et `safeArea.right + 104` à droite ; les marges inférieure et gauche sont bornées par les dimensions disponibles pour éviter une caméra sans espace visible. La sélection utilise `easeTo` au zoom 17.2 ; la vue d’ensemble utilise `fitBounds` pour plusieurs groupes ou le zoom 16.4 pour un point. La clé de commande inclut largeur, hauteur et `fontScale` ; les nouveaux points GPS déplacent les bannières sans reprendre la caméra après un geste. La vue d’ensemble conserve la réserve droite de `safeArea.right + 104`, sans ajouter la largeur d’une plaque complète : les groupes éloignés utilisent la variante compacte.

Le cadrage d’une sélection attend que le panneau soit revenu au cran intermédiaire sur téléphone ; le mode large peut cadrer directement. La recherche reste montée lorsqu’une fiche remplace la liste et sa valeur est conservée au retour. Dans le code, le cadre observé du clavier iOS ajuste le panneau, la mise au point agrandit celui-ci et la sélection ou une réduction du panneau ferme le clavier. La recherche vers une fiche a été exercée sur la première passe du nouveau build ; les gestes et le retour doivent encore être reconfirmés après les derniers ajustements. Le comportement du clavier logiciel reste à vérifier, l’outil n’ayant pas réussi à le faire apparaître lors de la passe précédente.

## Elevation & Depth

Les surfaces superposées utilisent des ombres diffuses. Le compte et les commandes emploient `BlurView` sur iOS, avec une intensité de 70 et une teinte `systemMaterialLight` ou `systemMaterialDark`. La réduction de transparence et les autres plateformes utilisent la couleur `surface` opaque. La recherche est désormais une surface `background` opaque à l’intérieur du panneau, sans ombre propre ni flou.

### Shadow Vocabulary

Les valeurs suivantes sont les propriétés React Native exactes, également conservées dans le sidecar. Leurs traductions CSS ne sont pas une équivalence de rendu entre plateformes.

- **Matériau flottant :** `shadowColor: "#172B46"`, décalage `{width: 0, height: 4}`, opacité `0.12`, rayon `14`, élévation Android `5`.
- **Panneau :** `shadowColor: "#14253D"`, décalage `{width: 0, height: -3}`, opacité `0.13` le jour et `0.3` la nuit, rayon `22`, élévation `12`.
- **Plaque de bannière :** `shadowColor: "#152B2A"`, décalage `{width: 0, height: 2}`, opacité `0.14` le jour et `0.3` la nuit, rayon `5`, élévation `3`.
- **Commande 2D/3D :** `shadowColor: "#142e32"`, décalage `{width: 0, height: 3}`, opacité `0.12`, rayon `8`, élévation `3`.

Les bâtiments sont des extrusions de `bati_surf` à partir du zoom 14, insérées avant les libellés. Leur hauteur est la valeur IGN `hauteur` en mètres, uniquement si elle est strictement positive ; aucune hauteur de remplacement n’est attribuée. Les géométries sans hauteur positive sont exclues de la couche de volumes. En mode 2D, la hauteur d’extrusion est mise à 0 et le pitch à 0° ; en mode 3D, les hauteurs IGN éligibles sont restituées et le pitch vaut 42°. Le filtre de hauteur disponible reste actif dans les deux modes. La base vaut 0 et le dégradé vertical est actif ; l’éclairage est une mise en forme graphique, pas une simulation de soleil ou une reconstruction photoréaliste.

**The Readable Material Rule.** Sur iOS, remplacer le flou par la surface opaque quand la réduction de transparence est demandée.

## Shapes

Les formes appartiennent à leur fonction : boutons arrondis, filtres en capsules, commandes circulaires et panneaux souples. Les rayons réutilisés sont dans `rounded`. La bannière remplace la capsule : mât, drapeau SVG, plaque de nom/statut/âge et pied GPS. Le cadre complet mesure 172 × 96, ou 190 × 96 lorsqu’elle est sélectionnée, avec le pied centré à (10, 90). Sous le zoom 16, une bannière non sélectionnée devient un drapeau sans plaque de 44 × 64, avec le pied centré à (10, 58). L’annotation `bottom-left` et le décalage commun `[-10, 6]` ancrent le pied à la coordonnée dans les deux variantes. La sélection garde toujours la plaque complète. L’emblème est repris à 48 × 48 dans les lignes et à côté du titre de la fiche, avec un rayon proportionnel de 0.28 × taille ; il est présenté sans fond propre dans le drapeau. La position personnelle mesure 18 × 18 avec un bord de 3.

Les lignes et sections sont séparées par `StyleSheet.hairlineWidth`. La séparation interne de la fiche est explicitement de 0.5. Les boutons partagés ont un bord de largeur 0 ; leur `borderColor` ne crée donc pas de contour visible.

Le masque de flou reprend le rayon de son enveloppe via `style?.borderRadius ?? 20` : compte à 28 et commandes à 18. La recherche conserve son rayon propre de 20 sans masque de flou. Le rayon de repli vaut 20 lorsque le composant ne fournit pas de rayon.

## Components

### Buttons

Actions lisibles, avec une forme stable entre les trois variantes. Le bouton primaire utilise `primary` et `primary-text` ; le secondaire utilise `primary-soft` et `ink` ; le bouton `danger` conserve ce fond secondaire avec le texte `danger`. Le padding est défini dans le frontmatter ; la hauteur minimale est 52 et l’écart icône–texte vaut 10. Une icône de bouton mesure 20.

L’appui réduit l’opacité à 0.72. Désactivation et chargement la réduisent à 0.5 et bloquent l’action. Le chargement remplace l’icône par l’indicateur natif. Aucun hover ni anneau de focus personnalisé n’est défini dans le code natif ; ceux du sidecar sont des affordances de consultation HTML, distinctes du contrat natif.

### Chips

Les filtres `Tous les groupes` et `En direct` reprennent `filter-rest` et `filter-selected`. Leur rangée autorise le retour à la ligne avec `flexWrap: "wrap"` et un écart de 8. Chaque filtre est limité à `maxWidth: "100%"` ; son texte utilise `flexShrink: 1` pour rester dans la largeur disponible. Hauteur minimale de 44, écart de 7 entre symbole et texte. L’appui réduit l’opacité à 0.65. Le statut sélectionné est aussi exposé aux technologies d’assistance.

### Cards / Containers

Le panneau et les notices sont les conteneurs caractéristiques. Une notice normale utilise `primary-soft` et `ink`, une alerte `warning-soft` et `warning`, une erreur `primary-soft` et `danger`. La notice garde le même rayon et le même padding ; ses informations sont annoncées avec une région accessible polie. Les listes et sections des modales emploient des séparateurs, sans empilement systématique de cartes.

### Inputs / Fields

Le champ visible dans la découverte est la recherche native : texte de 16, hauteur minimale de 54, padding vertical de 10, aucun contour explicite ; il est placé dans une surface de hauteur minimale 56, avec marges gauche 17 et droite 8. Le placeholder utilise `muted`. L’icône de recherche mesure 21 et le bouton d’effacement dispose de 44 × 48. Le placeholder est « Chercher un groupe ». Le champ reste au même endroit pendant les transitions entre résultats et fiche. La mise au point ouvre le panneau haut et rétablit la recherche ; la fermeture de fiche conserve la requête et la position de la liste. Le style générique `styles.input`, défini mais sans usage trouvé, n’est pas promu en composant canonique.

### Navigation

Le titre modal est centré avec un espace d’équilibrage à gauche et une commande Fermer de 48 × 48 à droite. Le bandeau mesure au moins 64. Les modales compte et déclaration sont présentées par la navigation native avec `slide_from_bottom` ; les autres routes héritent de `slide_from_right`. Aucune durée ni courbe personnalisée n’est déclarée.

Les symboles sont rendus par `expo-symbols`, poids `medium`, taille par défaut 22, avec noms SF sur iOS et Material sur Android. Les SVG du sidecar sont des pictogrammes documentaires ; ils ne remplacent pas ces symboles dans l’application.

### Liste, repères et poignée

Une ligne présente emblème ou monogramme stable, nom, statut, âge disponible et chevron. Son état pressé utilise `primary-soft`. Le live récent ajoute une pastille verte sur l’emblème ; le statut reste formulé en texte. Le même emblème accompagne le titre de la fiche.

Le drapeau porte la couleur d’identité et l’emblème. La plaque complète comporte deux lignes : le nom, puis une pastille et « Live », « Observé », « Ancienne » ou « Dernier point », suivis de l’âge abrégé. Son fond passe de `surface` à la couleur du groupe lorsqu’il est sélectionné ; le texte devient blanc et la pastille conserve sa couleur de statut. En vue compacte, la plaque est retirée, sans supprimer le nom, le statut ni l’âge du libellé accessible. Sur iOS, le titre de `ViewAnnotation` porte ce libellé complet. La démonstration reste identifiée par le bandeau global, les titres du catalogue et les libellés accessibles ; le nom compact du drapeau omet le suffixe. La fiche reste la lecture détaillée. La carte masque les positions que la politique de fraîcheur rend invisibles ; la liste garde les groupes consultables.

La poignée visible mesure 36 × 5 dans une cible haute de 28, complétée par 8 de `hitSlop` en haut et en bas. Elle propose les actions accessibles Agrandir et Réduire et expose son cran courant — Réduit, Intermédiaire ou Agrandi — avec une valeur de 0 à 2. À partir de 700 elle est remplacée par un espace de 20.

La fiche regroupe statut, source et âge dans une même ligne pouvant revenir à la ligne. Le live récent est vert, sa source est nommée « Référent GPS ». Le bouton principal « Rejoindre ce point » est suivi d’une note centrée précisant qu’il s’agit de la dernière position connue et que le groupe peut continuer à avancer. Le suivi live actif masque toujours la contribution ; les autres règles métier ne découlent pas de la composition visuelle.

La commande 2D/3D règle ensemble le pitch et l’extrusion : 0° et hauteur nulle à plat ; 42° et hauteurs IGN disponibles en relief. Elle conserve la source et n’ajoute pas de hauteur inconnue. Son libellé indique l’action disponible. Une commande © IGN ouvre les sources et l’attribution, avec un lien vers IGN. Le nom du moteur n’est pas une information du parcours principal.

La sélection appelle le retour haptique natif. Le cadrage dure 600 ms et le changement de pitch 450 ms ; ces durées deviennent nulles avec la réduction de mouvement. Le panneau n’anime pas son montage ; ses transitions reposent sur la bibliothèque native sans durée personnalisée. Aucun test de fluidité ou de performance terrain n’est déduit de ces réglages.

## Do's and Don'ts

### Do:

- **Do** utiliser les rôles de palette du thème actif, y compris la couleur de texte dédiée aux actions primaires.
- **Do** conserver la source et l’âge à côté de la position et nommer explicitement les données de démonstration.
- **Do** ancrer le pied de la bannière au point GPS et conserver des statuts indépendants de l’identité du groupe.
- **Do** garder l’attribution IGN accessible et représenter uniquement les hauteurs de bâtiments disponibles.
- **Do** respecter les zones sûres, le clavier et l’agrandissement du texte lors du placement des surfaces.
- **Do** employer les symboles natifs et fournir un libellé accessible aux commandes sans texte.
- **Do** proposer le réglage du panneau par action accessible en complément du glissement.

### Don't:

- **Don’t** réintroduire la composition de la page carte historique dans cette refonte native.
- **Don’t** déduire le live ou l’ancienneté d’une couleur d’identité du groupe.
- **Don’t** inventer un itinéraire interne, une distance ou une heure d’arrivée.
- **Don’t** compléter les hauteurs inconnues par des volumes décoratifs ou généraliser les emblèmes de démonstration aux groupes réels.
- **Don’t** présenter un aperçu HTML, une compilation ou une lecture du code comme preuve du rendu et du parcours natifs.
