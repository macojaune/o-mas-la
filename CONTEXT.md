# O Mas La ?

O Mas La aide le public du carnaval à retrouver les groupes en mouvement. Une position peut provenir du suivi live d'un référent ou d'une observation du public hors live.

## Langage

**Groupe** :
Un groupe de carnaval référencé dans l'annuaire, qu'une position soit disponible ou non. Sa présence dans l'annuaire ne garantit pas un suivi live.

**Spectateur** :
Une personne qui consulte les groupes et leurs positions, sans compte obligatoire. Elle devient contributeur lorsqu'elle publie une observation avec son compte.

**Déclaration** :
Une observation communautaire datée, publiée immédiatement par un contributeur lorsque le groupe n'a pas de session live active. Le point est la position actuelle du téléphone et l’heure est celle de ce relevé ; aucun placement manuel ou horaire saisi. La modération peut la retirer.
_Éviter_ : Contestation du live, correction officielle.

**Référent habilité** :
Une personne autorisée à assurer le suivi live d'un groupe. Plusieurs référents peuvent être habilités pour le même groupe.
_Éviter_ : Toute installation de l'app, premier utilisateur connecté.

**Émetteur actif** :
Le téléphone du référent qui assure actuellement le suivi d'un groupe. Un seul émetteur est autorisé à la fois pour une session live.

**Session live** :
La période pendant laquelle un groupe est suivi par un référent habilité. Elle donne priorité au suivi GPS et bloque les déclarations publiques, indépendamment de l'âge du dernier relevé.
_Éviter_ : Dernier point récent, présence d'un utilisateur connecté.

**Relevé GPS** :
Une mesure datée de la position de l'émetteur pendant une session. Le moment de sa mesure est distinct du moment où elle devient disponible pour les autres utilisateurs.

**Fraîcheur** :
L'âge de la position connue, établi à partir de son observation. Une position peut vieillir ou devenir inutilisable alors que la session live n'est pas terminée.

**Dernière position connue** :
Une position conservée temporairement et présentée avec sa source et son âge. Lorsque sa validité expire, son repère disparaît ; le groupe reste référencé.

**Passation** :
Le transfert explicite du suivi entre deux référents habilités du même groupe. Le référent sortant cesse d'être l'émetteur actif lorsque le suivant prend le relais.
_Éviter_ : File d'attente automatique, deux émetteurs simultanés.

**Fin de live** :
La fermeture de la session par le référent, par la modération ou par une règle d'arrêt automatique. Les déclarations publiques redeviennent possibles et les relevés de l'ancienne session ne font pas reprendre le live.

**Zone autorisée** :
Le rayon de suivi centré sur Pointe-à-Pitre, adaptable aux sorties vers les communes voisines. Sortir de cette zone déclenche la règle d'arrêt géographique.

**Vitesse excessive persistante** :
Un dépassement durable du seuil de vitesse retenu pour détecter un référent reparti en véhicule. Il entraîne un arrêt automatique après avertissement ; seuil, durée et délai restent à calibrer.

**Modération** :
L'équipe habilitée à retirer des déclarations, arrêter un live, habiliter/révoquer les référents et modifier les réglages de suivi depuis la console. Une permanence est prévue pendant les sorties. L’attribution des rôles de l’équipe reste administrateur.

**Consultation hors ligne** :
L'accès aux dernières données déjà chargées, avec leur âge et un état hors ligne visible. Elle ne permet pas de publier ni de mettre en attente une déclaration du spectateur.

**Connexion publique** :
Google, Apple et e-mail. Le parcours e-mail utilise un lien de connexion sans mot de passe. Ces comptes sont reliés à la même identité serveur utilisée par l’app Expo/React Native et les API.
