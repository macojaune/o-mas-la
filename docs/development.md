# Développement du socle 2027

Le chantier `refonte-2027` part de `origin/main` (`c0c3249`). La homepage en cours sur `feat/homepage-darse-image` reste dans son checkout. L'application native, le web, Auth.js et les fonctions Convex sont développés ensemble ; aucune donnée ni configuration de production n'est nécessaire pour les essais ci-dessous.

## Installer et démarrer

Node >= 22.13 et pnpm 9.14.2. Le monorepo conserve pnpm. Installer avec `pnpm install --frozen-lockfile`. Expo utilise la version TypeScript requise par son SDK ; les autres packages conservent leur catalogue compatible.

Créer l'environnement une seule fois :

```sh
node scripts/setup-local.mjs
pnpm --filter @oyo/db with-env drizzle-kit migrate
pnpm --filter @oyo/convex exec convex dev
```

Le script crée `.env` et des clés aléatoires de développement ; il refuse d'écraser un environnement existant. SQLite est dans `.cache/omasla-auth.db`. Les migrations sont appliquées à cette base locale. Ne pas remplacer ce chemin par une base réelle pour exécuter les fixtures.

Sans compte ni déploiement déjà configuré, `convex dev` initialise un backend anonyme local sur 3210. Vérifier le bandeau **Local / No Convex account** et `packages/convex/.env.local` avant les commandes suivantes. Si la CLI propose un projet cloud, arrêter et vérifier la configuration ; ne pas lier le chantier au backend existant.

Pendant que le backend local tourne, dans un second terminal :

```sh
pnpm --filter @oyo/convex exec convex env set AUTH_ISSUER_URL http://localhost:3185
pnpm --filter @oyo/convex exec convex env set ALLOW_LOCAL_FIXTURES true
pnpm --filter @oyo/convex exec convex env set BOOTSTRAP_ADMIN_SUBJECT simulation-admin
pnpm --filter @oyo/nextjs dev
```

Dans un troisième terminal :

```sh
pnpm --filter @oyo/nextjs with-env pnpm --filter @oyo/expo dev:web --port 3186
```

- `http://localhost:3185/map` : carte/annuaire web existant, raccordé au contrat public du socle.
- `http://localhost:3185/admin` : console de permanence ; authentification et droits serveur exigés.
- `http://localhost:3186` : aperçu web des écrans de l'app. La carte native et le suivi en arrière-plan se vérifient sur iOS/Android.
- `http://127.0.0.1:3210` : backend Convex local. Le port 3211 sert ses actions HTTP.

Ne pas copier le `.env` d'un autre checkout. Après une installation qui change les dépendances, redémarrer Metro/Next pour éviter un cache de résolution obsolète. Sur un téléphone physique, `localhost` désigne le téléphone : utiliser un environnement de développement joignable avec issuer HTTPS, certificat accepté et URLs identiques entre Auth.js, Convex et l'app.

## Fixtures et preuves

Avec Next et Convex démarrés :

```sh
node packages/auth/scripts/smoke-local.mjs
```

Ce scénario refuse les hôtes distants, toute autre base SQLite et tout déploiement Convex lié à un compte. Il crée uniquement des identités `simulation-*`, des groupes `[SIMULATION LOCALE]` et des paramètres raccourcis de test. Les sessions de test sont enregistrées dans `.cache/local-test-sessions.json` (non versionné, permissions privées). Elles ne constituent pas un fournisseur OAuth ni une porte de connexion dans l'application.

Le scénario traverse les vrais endpoints HTTP, le JWT signé et la vérification JWKS par Convex. Il vérifie lecture publique, refus de rôle, déclaration/retrait, démarrage exclusif, émission, priorité du live, passation, arrêt terminal et révocation à la déconnexion. Le fournisseur OAuth externe et les permissions GPS natives restent hors de cette preuve.

```sh
pnpm check
pnpm lint:ws
pnpm --filter @oyo/nextjs build
pnpm --filter @oyo/nextjs with-env pnpm --filter @oyo/expo export
```

La CI exécute types, lint, tests, build Next et exports iOS/Android/web avec sa configuration locale jetable. L'export Expo produit des bundles JS/Hermes ; il ne remplace pas la compilation native, la signature ou la validation en arrière-plan sur appareil.

## Configuration restant à fournir

- Connexion publique décidée : Google, Apple et e-mail par lien de connexion. Les identifiants fournisseurs et le transport Brevo doivent être configurés côté serveur ; aucun compte fournisseur n’a été créé ou modifié. Sans configuration, la consultation publique reste disponible. Voir la décision d’identité pour le contrat des callbacks et de l’e-mail.
- Cartographie : token public Mapbox pour le web, clé Google Maps restreinte pour Android ; iOS utilise la carte native. Sans token Mapbox, le web conserve un annuaire explicite.
- Comptes Apple/Google/EAS et autorisations de publication. Une session CLI EAS connectée, des identifiants de signature et des appareils sont nécessaires pour les builds terrain.
- Habilitations des référents et de l’équipe : les modérateurs et administrateurs habilitent/révoquent les référents, règlent le suivi, arrêtent les lives et retirent les observations. L’attribution des rôles de l’équipe reste réservée aux administrateurs.
- Seuils de fraîcheur, durée, rayon autour de Pointe-à-Pitre, précision et vitesse à mesurer sur le terrain. La politique de simulation n'est pas une recommandation opérationnelle.
- Politique de conservation/suppression des comptes et positions, textes de confidentialité, inventaire des données réelles et migration de bascule. Les textes historiques du site n'ont pas encore été réécrits pour l'app.

L'arrêt serveur est autoritaire : les points tardifs ne relancent jamais le suivi. L'arrêt physique du capteur dépend du prochain réveil/réseau de l'OS ; les notifications locales exigent le consentement. Il faut tester ces limites sur des téléphones iOS et Android pendant une sortie réelle.

## Bascule et livraison

Le schéma Convex est additif : groupes, positions, utilisateurs historiques et identifiants sont conservés. `native_auth_grant` est ajouté par la migration SQLite `0001`. Le parcours e-mail ajoute ses tables de vérification/limitation dans une migration dédiée ; auditer les doublons d’adresses avant d’appliquer son index unique aux données réelles. Aucune migration de données réelles n'a été exécutée.

Les anciennes écritures anonymes et les diffusions de notification arbitraires sont désactivées. Une bascule exige donc une stratégie de mise à jour coordonnée des anciens clients ; ne pas déployer isolément ce backend sur la production actuelle. Répéter la migration et définir un retour arrière avant la bascule, à partir d'une sauvegarde des données de l'environnement concerné.

Les branches ne définissent pas à elles seules les environnements. Ce chantier ne modifie aucun service Coolify, projet Convex cloud, store ou configuration de production.

## Décisions confirmées pendant le développement

La cible produit est l’app **Expo + React Native iOS/Android existante** dans `apps/expo`, modernisée et étendue. Le web est une interface complémentaire et une console de modération ; son aperçu ne remplace pas la validation native.

La déclaration hors live prend un GPS neuf sur action explicite, puis publie sa position et son heure d’acquisition. Permission refusée ou absence de mesure récente bloquent la contribution ; ni saisie de coordonnées/heure ni report d’un ancien relevé après reconnexion. Une réponse perdue peut être confirmée par identifiant de requête propre au compte, sans créer une deuxième observation.
