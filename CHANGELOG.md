# CHANGELOG

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [Non publié]

### 2026-07-08 14:32
#### Ajouté
- Squelette Next.js (App Router, TypeScript, Tailwind)
- Docker Compose : services `app` + `db` (PostgreSQL)
- Schéma Prisma initial : `briefs`, `clarifications`, `backlog_items`, `generated_docs`, `generated_prompts`, `github_issues`
- Documents de référence projet : `AGENT.md`, `ARCHITECTURE.md`, `TASK.md`, `CHANGELOG.md`

### En cours (non horodaté tant que non livré)
- Prompt système avec tool use (Claude API) pour l'analyse de brief
- Abstraction du provider LLM (Claude / Ollama)

### À venir
- Génération des documents projet à partir d'un brief validé
- Création réelle d'issues GitHub via Octokit
- Interface de soumission et de suivi de brief

---

## Comment utiliser ce fichier

- Une entrée par changement significatif, pas par commit — regrouper les petits commits liés en une seule ligne claire
- **Chaque bloc de changement est horodaté** avec la date et l'heure au format `AAAA-MM-JJ HH:MM` (heure locale, 24h), ajouté en sous-titre juste avant les catégories concernées — utile en session de 4h pour prouver un rythme d'avancement réel, pas juste un commit final
- Pour horodater rapidement en ligne de commande :
  ```bash
  date "+%Y-%m-%d %H:%M"
  ```
- Catégories à l'intérieur d'un horodatage : `Ajouté`, `Modifié`, `Corrigé`, `Supprimé`
- Quand une version est taguée (ex. démo finale), renommer `[Non publié]` en `[1.0.0] - AAAA-MM-JJ HH:MM` et ouvrir une nouvelle section `[Non publié]` au-dessus
- Ne pas horodater une section "En cours" ou "À venir" tant que le travail n'est pas réellement livré — l'horodatage marque un fait accompli, pas une intention