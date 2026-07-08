<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Contexte du projet
 
**Agent-smith** est un outil qui transforme un brief client brut (email, note, message Slack) en :
- une reformulation structurée du besoin
- des questions de clarification si le brief est ambigu (l'agent ne devine jamais un scope flou)
- un backlog technique estimé
- Si tout est sufisament claire, agent smith fourni des documents projet prêts à l'emploi pour le développement (`AGENT.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `TASK.md`)
- de vraies issues GitHub créées via l'API
## Stack
 
- **Frontend / API** : Next.js 14 (App Router), TypeScript
- **DB** : PostgreSQL + Prisma ORM
- **LLM** : Claude API (Anthropic SDK, tool use) — Ollama en local pour l'itération de dev
- **Intégration externe** : GitHub API via Octokit
- **Infra** : Docker Compose (app + db)
## Commandes utiles
 
```bash
docker compose up --build -d      # lance l'app + la DB
npx prisma migrate dev            # applique une migration
npx prisma studio                 # explore la DB visuellement
npm run dev                       # dev local hors Docker (nécessite .env avec DATABASE_URL en localhost)
npm run build                     # build de prod (mode standalone)
```
 
## Conventions de code
 
- Toute logique d'appel LLM passe par `lib/llm/` — jamais d'appel direct à l'API Anthropic ou Ollama depuis une route. Le provider est choisi via la variable d'env `LLM_PROVIDER`.
- Les routes API (`app/api/**`) restent fines : elles valident l'input, appellent un service dans `lib/`, persistent en DB, retournent une réponse. Pas de logique métier dans les routes.
- Toute écriture en DB passe par Prisma Client, jamais de SQL brut sauf cas justifié (à commenter).
- Les tool definitions Claude (`ask_clarification`, `propose_backlog`, `estimate_effort`, `generate_docs`) sont centralisées dans `lib/llm/tools.ts` — ne pas dupliquer leur schéma ailleurs.
## Règles pour l'agent qui génère les livrables (le cœur du produit)
 
- Ne jamais halluciner un scope : si le brief est ambigu sur un point bloquant, poser une question via `ask_clarification` plutôt que de proposer un backlog qui devine.
- Les estimations d'effort restent volontairement grossières (S/M/L), jamais un chiffre de jours précis non justifiable.
- Les documents générés (`AGENT.md`, `ARCHITECTURE.md`, etc.) doivent rester spécifiques au projet du client — pas de placeholder générique du type "à compléter".
## Ce qu'un agent ne doit PAS faire seul
 
- Créer des issues GitHub sans validation humaine préalable du backlog (`status: validated`)
- Modifier le schéma Prisma sans passer par une migration explicite
- Committer un `.env` ou une clé API
## État actuel / limites connues
 
- Mono-utilisateur, pas d'authentification (choix assumé pour rester focus sur le cœur agentique)
- Intégration GitHub Projects v2 (GraphQL) non implémentée, seules les Issues REST le sont
- Voir `TASK.md` pour le détail des tâches en cours