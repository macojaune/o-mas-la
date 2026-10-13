# Socle de suivi 2027

`catalog.list` expose tous les groupes sans compte. L'identité Auth.js signée est requise pour contribuer ; les habilitations sont décidées par Convex, jamais par un identifiant `owner` envoyé par le client. Les anciennes tables `users`, `groups` et `positions` conservent leurs identifiants et leurs lignes.

## Contrat des clients

| API                                                                                                                  | Accès et résultat                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog.list({})`                                                                                                   | Public : `serverNow`, politique de fraîcheur ou `null`, groupes avec `live`, `canObserve`, position datée et source. Aucun compte ou jeton public.                   |
| `accounts.ensure({})`, `accounts.me({})`                                                                             | Compte lié au sujet Auth.js ; création spectator uniquement, nom issu du claim vérifié. `me` renvoie `null` sans connexion.                                          |
| `sessions.mine({})`, `sessions.referents({groupId})`                                                                 | Habilitations, sessions et destinataires d'une passation.                                                                                                            |
| `sessions.start({groupId,deviceId,requestId})`                                                                       | Référent du groupe : ouverture atomique, un seul live par groupe ; nouvelle session avec politique et échéance figées.                                               |
| `telemetry.ingest({sessionId,deviceId,generation,sampleId,latitude,longitude,observedAt,accuracyMeters?,speedMps?})` | Émetteur habilité, appareil, génération et session Auth.js concordants. Retour `accepted`, `duplicate`, `sessionEnded`, éventuellement `reason` et `speedWarningAt`. |
| `sessions.stop({sessionId,deviceId,generation,reason})`                                                              | Émetteur courant ; raison `manual`, `gps_failed` ou `logout`. Arrêt terminal et idempotent.                                                                          |
| `sessions.offerHandoff({sessionId,deviceId,generation,targetAccountId})`                                             | Proposition explicite à un référent habilité du groupe.                                                                                                              |
| `sessions.acceptHandoff({sessionId,deviceId,generation})`                                                            | Destinataire : bascule atomique sur son appareil et sa session Auth.js ; génération incrémentée, ancien émetteur refusé.                                             |
| `sessions.cancelHandoff({sessionId,deviceId,generation})`                                                            | Émetteur courant : annulation de la proposition.                                                                                                                     |
| `observations.create({groupId,requestId,latitude,longitude,observedAt})`                                             | Spectateur connecté : relevé GPS actuel du téléphone et son heure, publication immédiate hors live, refus pendant le live même si sa position est périmée.           |
| `observations.byRequest({requestId})`                                                                                | Spectateur connecté : reçu `{positionId,groupId,observedAt}` de sa propre déclaration ou `null`, sans mutation ni accès aux déclarations d’un autre compte.          |
| `observations.retract({positionId})`                                                                                 | Modérateur ou administrateur : retrait conservant la donnée et son auteur/date.                                                                                      |
| `sessions.stopAsModerator({sessionId})`, `administration.overview({})`                                               | Permanence : lecture et arrêt manuel, avec cause/auteur/date.                                                                                                        |
| `administration.moderationQueue({limit?})`, `sessions.events({sessionId})`                                           | Observations et événements opérationnels ; limite de file 1–100, valeur de présentation 50. Aucun envoi de notification distant.                                     |
| `administration.readAdminDirectory({})`                                                                              | Modérateur ou administrateur : comptes nommés/rôles, groupes et habilitations actives, sans identifiants Auth.js ou secrets.                                         |
| `administration.grantReferent({accountId,groupId})`, `revokeReferent(...)`                                           | Modérateur ou administrateur : changements journalisés ; retrait d'habilitation termine immédiatement le live de cet émetteur.                                       |
| `administration.getPolicy({})`, `setPolicy({policy})`                                                                | Modérateur ou administrateur : politique complète validée et versionnée ; changements appliqués aux nouvelles sessions.                                              |
| `administration.setRole({accountId,role})`                                                                           | Administrateur uniquement : promotion ou retrait des rôles de plateforme journalisés ; auto-rétrogradation interdite.                                                |
| `authSessions.revokeCurrentSession({})`                                                                              | Invalide le `sid` et termine ses lives, y compris avant la création d'un compte Convex. Une tombstone de révocation ne peut pas être réactivée.                      |

Les dates sont en millisecondes Unix. Les vitesses sont en mètres/seconde, les distances en mètres. `requestId` et `sampleId` doivent rester identiques pendant la répétition d'une même requête ; une nouvelle mesure utilise un nouvel identifiant. Une répétition ne rafraîchit jamais la date d'observation.

Les déclarations publiques utilisent un nouveau relevé de géolocalisation obtenu lors de l’envoi, sans saisie de point ou d’heure et sans mise en attente hors ligne. `observedAt` conserve l’heure de mesure fournie par le téléphone ; `receivedAt` est l’heure serveur. Le serveur refuse les heures hors de la fenêtre configurée (`maxSampleAgeMs`, `maxFutureSkewMs`), les coordonnées invalides et les groupes en live. Il ne peut pas prouver qu’un client a réellement acquis ces coordonnées avec son GPS. La fenêtre tolère le délai d’acquisition/transmission ; elle n’autorise pas l’interface à proposer une déclaration historique. Après une réponse perdue, `byRequest` permet de confirmer l’enregistrement avant de reprendre une acquisition GPS. Une course entre cette lecture et la requête précédente reste protégée par la clé d’idempotence : le client relit le reçu en cas de conflit et vérifie le groupe, sans renvoyer l’ancien relevé.

## Session et fraîcheur

Une session a un état `active` ou `ended`. Le vieillissement d'une position ne termine pas la session : il retire seulement le repère après le seuil configuré. Les déclarations sont alors toujours bloquées tant que le live existe. Après l'arrêt, le dernier point daté reste consultable selon sa fraîcheur et le public peut déclarer une observation.

Les clients appellent `positionFreshness` avec une horloge qui avance, y compris hors ligne. Un snapshot mis en cache conserve `observedAt` et `receivedAt`. Le serveur fournit `serverNow` pour corriger un décalage d'horloge. Une ancienne ligne sans heure d'observation reste identifiée `legacy` avec `observedAt: null` et une date de réception ; aucune précision n'est inventée.

Les points antérieurs au démarrage de la génération, trop anciens, futurs au-delà de la tolérance, mal formés ou non autorisés sont refusés. Les points désordonnés ne remplacent pas une position plus récente. La passation, l'arrêt, la déclaration et le retrait sont des transactions Convex : les requêtes concurrentes ne réactivent pas une session terminée et ne remplacent pas la priorité du live.

## Politique à configurer

Aucun rayon, durée maximale, vitesse, précision ni seuil de fraîcheur de production n'est fourni par défaut. Sans politique complète, démarrage et déclaration refusent `CONFIGURATION_REQUIRED`. La politique exigée est décrite par `TrackingPolicy` dans `src/contracts.ts`.

- Durée maximale : arrêt planifié côté serveur même sans prochain point GPS ; contrôle supplémentaire lors des écritures.
- Zone : cercle dont le centre et le rayon sont configurés dans l'admin. Le dépassement doit persister sur des relevés suffisamment précis ; la marge d'incertitude GPS est prise en compte.
- Vitesse : dépassement persistant, événement d'avertissement, puis arrêt si de nouvelles mesures confirment le dépassement après le délai d'avertissement.
- Une interruption de relevés supérieure à `speed.maxGapMs` réinitialise les preuves de persistance de vitesse **et de sortie de zone**. Une précision absente ou insuffisante ne prouve aucun de ces dépassements.
- Une session conserve sa version de politique. La politique de fraîcheur du catalogue est celle configurée actuellement ; elle peut changer la présentation des anciennes positions.

Les événements persistés servent à afficher l'avertissement dans l'application et la console. `speedWarningAt` permet au mobile de dédupliquer une notification locale. Le transport de notifications push distantes n'est pas implémenté ici. Un arrêt serveur ne promet pas l'extinction instantanée d'un capteur hors réseau ; tout paquet tardif reste refusé.

Toute l’équipe de modération peut gérer les habilitations de référents et les paramètres de suivi. Cette capacité ne donne pas le droit de promouvoir un compte modérateur ou administrateur : `setRole` reste réservé aux administrateurs. La projection d’annuaire contient seulement les données utiles à ces habilitations.

## Identité et initialisation

`AUTH_ISSUER_URL` désigne explicitement le service Auth.js, sans slash final. Convex vérifie les JWT RS256, audience `omasla-convex`, via `${AUTH_ISSUER_URL}/api/auth/jwks`. Les claims exigés sont `sub`, `sid` (SHA-256 hexadécimal de la session), `sessionExpiresAt` en millisecondes ; `name` est facultatif. Les droits proviennent exclusivement des tables Convex.

`administration.bootstrapAdministrator` est interne. Il ne provisionne que le compte préalablement authentifié correspondant exactement à `BOOTSTRAP_ADMIN_SUBJECT` et à l'issuer configuré, et refuse si un autre administrateur existe. Aucun ancien utilisateur anonyme n'est promu.

`localFixtures.seedScenario` est interne et exige `ALLOW_LOCAL_FIXTURES=true`, un issuer `localhost`/`127.0.0.1`/`[::1]` exactement égal à l'issuer configuré, et quatre sujets distincts, plus un `moderatorSubject` facultatif distinct des autres. Ses groupes, comptes et paramètres sont des **simulations locales**. Il conserve les rôles des comptes déjà présents et ne constitue pas une migration ni un provisionnement de production.

Les anciennes écritures `users.create/startTracking/stopTracking`, `positions.sendPosition`, `groups.update` et la diffusion globale historique sont désactivées. Les clients doivent être mis à niveau avec le backend ; les anciennes lectures publiques restent limitées aux projections sans propriétaire ni jeton push.

## Vérification

Depuis la racine :

```sh
pnpm --filter @oyo/convex test
pnpm --filter @oyo/convex typecheck
pnpm --filter @oyo/convex lint
```

Les tests utilisent les fonctions publiques avec `convex-test`, des identités synthétiques et une horloge contrôlée. Ils couvrent les refus de rôle et de révocation, les conflits d'appareil/génération, les transactions concurrentes, la fraîcheur, l'historique ancien, les arrêts automatiques et l'administration. `withIdentity` ne constitue pas une preuve cryptographique du JWT : celle-ci relève des tests du service d'identité et du runtime local.

Le smoke HTTP local `node packages/auth/scripts/smoke-local.mjs` exerce aussi les droits opérationnels avec un JWT de modérateur issu du vrai service Auth.js, les refus du spectateur et l’isolation des reçus de déclaration. Il exige le runtime local configuré ; une validation de syntaxe ne remplace pas son exécution.

Références : [tests Convex](https://docs.convex.dev/testing/convex-test), [fonctions planifiées](https://docs.convex.dev/scheduling/scheduled-functions).
