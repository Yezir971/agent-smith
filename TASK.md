# TASK.md

Suivi des tâches du projet. Chaque tâche correspond à un `backlog_item` généré par l'agent à partir du brief client, une fois validé.

## Convention

- `[ ]` à faire · `[~]` en cours · `[x]` fait · `[!]` bloqué (préciser pourquoi en sous-ligne)
- Chaque tâche référence son `backlog_item.id` pour garder la traçabilité avec la DB et l'issue GitHub associée
- Le prompt prêt-à-taper pour démarrer une tâche est dans `generated_prompts` (visible dans l'UI, section backlog)

## Setup projet

- [x] Squelette Next.js + TypeScript + Tailwind
- [x] Docker Compose (app + postgres)
- [x] Schéma Prisma initial (`briefs`, `clarifications`, `backlog_items`, `generated_docs`, `generated_prompts`, `github_issues`)
- [x] Migration Prisma appliquée en environnement Docker
- [x] `.env.example` documenté et à jour

## Cœur agentique

- [x] Prompt système avec few-shot (`AGENT.md` + `ARCHITECTURE.md` de référence)
- [ ] Tool definitions : `ask_clarification`, `propose_backlog`, `estimate_effort`, `generate_docs`
- [ ] `lib/llm/` : abstraction provider (Claude API / Ollama) via `LLM_PROVIDER`
- [ ] Test manuel : brief flou → questions de clarification cohérentes
- [ ] Test manuel : brief clair → backlog structuré + estimation

## API routes

- [ ] `POST /api/analyze` (analyse initiale + clarifications)
- [ ] `POST /api/analyze` (relance avec réponses aux clarifications)
- [ ] `POST /api/backlog/:id/validate`
- [ ] `POST /api/docs/generate` (génère les 4-5 fichiers markdown)
- [ ] `POST /api/github/issues` (création réelle via Octokit)

## Intégration GitHub

- [ ] Token GitHub configuré (`.env`)
- [ ] Création d'issue avec label + milestone
- [ ] Lien `github_issues` ↔ `backlog_items` (éviter les doublons)
- [ ] (stretch) GitHub Projects v2 via GraphQL

## Frontend

- [ ] Formulaire de soumission de brief
- [ ] Affichage des questions de clarification + formulaire de réponse
- [ ] Vue backlog (liste, statut, bouton "valider")
- [ ] Vue documents générés (preview markdown + téléchargement)
- [ ] Bouton "créer les tickets GitHub" + lien vers les issues créées

## Polish / soutenance

- [ ] README principal (contexte, choix techniques, limites)
- [ ] Vérifier que `docker compose up --build` fonctionne à froid
- [ ] Capture d'écran / gif de démo (repo GitHub avec issues générées)
- [ ] Relecture des docs générées sur un brief de test réaliste

## Notes de session

<!-- Ajoute ici au fil de l'eau ce qui a bloquer, pour reprendre facilement -->