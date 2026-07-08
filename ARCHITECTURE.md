# ARCHITECTURE.md
 
## Vue d'ensemble
 
```
┌────────────────────────────────────────────────────────────┐
│                     Next.js (App Router)                   │
│                                                            │
│  UI (formulaire brief, résultats, backlog, docs)           │
│         │                                                  │
│         ▼                                                  │
│  /api/analyze ─────► lib/llm/ ─────► Claude API (tool use) │
│         │                     └────► Ollama (dev local)    │
│         ▼                                                  │
│  /api/github/issues ─────► Octokit ─────► GitHub API       │
│         │                                                  │
│         ▼                                                  │
│  Prisma Client                                             │
└────────────────────────────┬───────────────────────────────┘
                             ▼
                     PostgreSQL (Docker)
```
 
## Décisions techniques et justifications
 
### Pourquoi Next.js (App Router) plutôt qu'un back séparé
Un seul déploiement, API routes + UI dans le même projet. Pour un outil interne à ce stade (pas de besoin de scaler le front et le back indépendamment), séparer aurait ajouté de la complexité sans bénéfice.
 
### Pourquoi PostgreSQL + Prisma plutôt que Supabase
Supabase local ajoute une stack multi-conteneurs (Auth, Realtime, Studio...) dont on n'utilise qu'une fraction. Un Postgres simple en Docker + Prisma suffit largement au besoin actuel et réduit la surface de debug. Réévaluable si le projet évolue vers du multi-utilisateur avec auth intégrée.
 
### Pourquoi le tool use de Claude plutôt qu'un parsing de texte libre
La sortie de l'agent (questions, backlog, estimation) doit être structurée et fiable pour être persistée en DB et affichée dans l'UI. Le tool use de l'API Anthropic garantit un schéma de sortie validé, contrairement à un parsing regex sur du texte libre qui casserait au moindre changement de formulation du modèle.
 
### Pourquoi Ollama en développement et Claude en production
Ollama permet d'itérer sur les prompts sans consommer de tokens API pendant la phase de développement. Claude est utilisé pour la génération finale car son support du tool use est plus robuste — critique ici puisque la fiabilité du JSON structuré conditionne tout le pipeline (DB, UI, création d'issues). Le provider est abstrait derrière `lib/llm/` pour permettre ce switch via une seule variable d'env (`LLM_PROVIDER`).
 
### Pourquoi pas de table `skills` en base
La pertinence des documents générés (`AGENT.md`, `ARCHITECTURE.md`...) repose sur du few-shot prompting : deux exemples de référence rédigés à la main sont injectés dans le prompt système. Une table `skills` avec retrieval dynamique aurait ajouté la complexité d'un système RAG pour un seul type de sortie — complexité non justifiée ici.
 
### Pourquoi les Issues GitHub REST plutôt que GitHub Projects v2
L'API Projects v2 utilise GraphQL et un modèle de données plus lourd (items, champs custom, vues). Les Issues REST (via Octokit) couvrent le besoin principal — tickets labellisés et rattachés à un milestone — avec une implémentation nettement plus rapide. Documenté comme piste d'évolution plutôt qu'implémenté dans le scope actuel.
 
## Schéma de données
 
Voir `prisma/schema.prisma`. Résumé des entités :
 
| Table | Rôle |
|---|---|
| `briefs` | Le besoin brut du client, point d'entrée du process |
| `clarifications` | Questions posées par l'agent + réponses du client |
| `backlog_items` | Découpage technique + estimation, avec validation humaine avant action |
| `generated_docs` | Fichiers markdown générés, stockés pour consultation |
| `generated_prompts` | Prompts prêts-à-taper liés à une tâche du backlog |
| `github_issues` | Lien entre un backlog item et le ticket GitHub réel créé |
 
## Flux principal
 
1. L'utilisateur soumet un brief brut → `POST /api/analyze`
2. L'agent (Claude, tool use) analyse le brief et retourne : questions de clarification et/ou backlog structuré
3. Si des questions sont posées, l'utilisateur y répond → nouvel appel `/api/analyze` avec le contexte enrichi
4. Une fois le backlog jugé complet, l'utilisateur valide les items (`status: validated`)
5. Génération des documents projet (`AGENT.md`, `ARCHITECTURE.md`, etc.) à partir du brief validé
6. Création des issues GitHub correspondantes via `/api/github/issues`
## Limites connues et pistes d'évolution
 
- Mono-utilisateur, pas d'authentification
- Pas de gestion des Projects v2 (GraphQL)
- Pas de reprise automatique si l'appel LLM échoue en cours de génération (à ajouter : retry + état intermédiaire)
 
## Bonnes pratiques
Pendant le développement, on s'efforce de respecter les 5 principes suivants :
- KISS 
- DRY
- SOLID 
- Fail fast : si le brief est ambigu, poser une question plutôt que de deviner
- Self healthy : l'agent ne doit jamais halluciner un scope, ni générer des documents génériques "à compléter" 

