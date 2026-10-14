# O Mas La — application mobile

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Le spectateur du carnaval en Guadeloupe cherche un groupe en mouvement. La consultation est libre. Un spectateur connecté peut déclarer un groupe hors live. Les référents habilités assurent le suivi ; l’équipe de modération gère les droits et les réglages.

## Product Purpose

Retrouver un groupe à partir d’une position dont la source et la fraîcheur sont compréhensibles, puis ouvrir un itinéraire piéton vers ce dernier point connu.

## Operating Context

Usage mobile sur le terrain, dehors, pendant des sorties de durée variable et avec un réseau parfois faible. Première version publique iOS et Android attendue au plus tard le 1er janvier 2027. La refonte du 13 octobre se travaille uniquement en local, dans Expo et le simulateur iOS.

## Capabilities and Constraints

- Réutiliser l’application Expo / React Native existante ; remplacer complètement son expérience visuelle.
- Tous les groupes restent consultables, sans promettre leur participation au suivi.
- Un live actif bloque les déclarations ; le référent reste prioritaire. Une position ancienne est datée puis retirée de la carte selon la politique de fraîcheur.
- Hors live, une déclaration utilise la position actuelle du téléphone et l’heure du relevé, sans saisie manuelle. Publication immédiate ; retrait possible par la modération.
- Dernières données chargées consultables hors ligne ; contributions bloquées, aucune publication différée.
- Plusieurs référents habilités, un seul émetteur actif, passation explicite.
- Arrêt manuel ou automatique par durée, zone adaptable autour de Pointe-à-Pitre, et vitesse persistante après avertissement. Les seuils nécessitent une calibration terrain.
- Connexion Google, Apple et e-mail. Les fournisseurs réels restent à configurer ; les tests locaux ne prouvent pas leur activation.
- L’itinéraire externe mène à une position datée ; ni arrivée garantie au groupe ni estimation inventée.

## Brand Commitments

Nom O Mas La. Interface française. Demande explicite : une expérience immersive et fluide au niveau des grandes applications de navigation, sans reprendre la page carte du site historique.

## Evidence on Hand

Les décisions métier confirmées dans la conversation sont reprises dans ../../CONTEXT.md et docs/refonte-2027.md. Le dépôt possède des logos et icônes existants sous assets/. Les données de démonstration locales sont fictives et doivent rester identifiables comme telles.

## Product Principles

- La carte et le groupe sélectionné gardent le même contexte spatial.
- Une position s’accompagne de sa source et de son âge.
- Consulter ne nécessite ni compte ni permission de géolocalisation.
- La permission se demande au moment de l’action qui l’utilise.
- Préserver les comportements natifs, la lisibilité et l’accessibilité.
