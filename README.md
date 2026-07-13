# Agent Smith 🕶️ — Assistant d'Analyse de Briefs & Décomposition Technique

Agent Smith est une application intelligente construite avec Next.js 16 et Prisma 7. Elle permet d'analyser des briefs de projets (vagues ou précis) envoyés par e-mail ou d'autres sources, de générer des questions de clarification, de décomposer les besoins en tickets techniques (backlog) avec des estimations d'effort, de générer des documents de spécification technique, et de créer des issues directement sur GitHub.

---

## Aperçu du Projet

Voici quelques captures d'écran illustrant le fonctionnement de l'application :

![Capture d'écran du tableau de bord principal montrant la liste des briefs importés et leur statut (Brouillon, Clarification, Prêt)](docs/images/dashboard_overview.png)
*Figure 1 : Tableau de bord de gestion des briefs et suivi de leur statut.*

![Interface d'analyse d'un brief montrant les questions de clarification générées par l'IA et le formulaire de réponse](docs/images/clarification_interface.png)
*Figure 2 : Interface interactive de réponses aux clarifications IA.*

![Vue détaillée du backlog généré avec les estimations d'effort (S, M, L) et le bouton de validation de ticket](docs/images/backlog_decomposition.png)
*Figure 3 : Backlog technique décomposé, estimé et prêt pour validation.*

![Capture d'écran montrant l'export réussi d'un ticket validé sous forme d'issue sur GitHub avec les labels appropriés](docs/images/github_issue_creation.png)
![Capture d'écran montrant l'export réussi d'un ticket validé sous forme d'issue sur GitHub avec les labels appropriés](docs/images/github_issue_creation_1.png)
*Figure 4 : Intégration GitHub et synchronisation des tickets.*

---

## 🏗️ Architecture Technique

Le système est entièrement conteneurisé à l'aide de Docker. Il sépare l'application Next.js, la base de données PostgreSQL, et communique avec les API LLM (locales ou cloud).

```mermaid
graph TD
    User(["Développeur / Client"]) -->|Requêtes HTTP| NextApp["Application Next.js (Port 3000)"]
    
    subgraph "Docker Network (Bridge)"
        NextApp -->|Connexion Interne DB Port 5432| DB[("PostgreSQL 16")]
    end

    NextApp -->|Prisma Client| DB
    NextApp -->|Génération de tickets| GitHubAPI["GitHub API"]
    
    subgraph "Services LLM (Selon configuration)"
        NextApp -->|API HTTPS - Port 443| Anthropic["Anthropic Claude API"]
        NextApp -->|HTTP Port 11434 - Hôte| Ollama["Ollama Local Engine"]
    end
    
    DB -.->|Exposé sur Port 51214| HostO["Machine Hôte (Migrations Prisma / Studio)"]
```

---

## 🛠️ Prérequis

Avant de lancer le projet, assurez-vous d'avoir installé sur votre machine :
*   **Docker Desktop** (avec intégration WSL2 si vous êtes sur Windows)
*   **Node.js (v20+)** (requis uniquement pour exécuter les commandes Prisma en local sur l'hôte)

---

## ⚙️ Configuration de l'environnement (`.env`)

Créez un fichier `.env` dans le dossier `agent-smith/` (le sous-dossier de l'application) en copiant le fichier `.env.example`.

```env
# URL de connexion à la base de données PostgreSQL dans Docker (pour les commandes lancées depuis l'hôte)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/briefmaster?schema=public"

# Variables pour l'intégration IA (Sélectionnez 'anthropic' ou 'ollama')
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=votre-cle-api-anthropic

# Configuration GitHub pour l'export des tickets
GITHUB_TOKEN=votre-token-d-acces-personnel-github
GITHUB_OWNER=proprietaire-du-depot
GITHUB_REPO=nom-du-depot
```

---

## 🚀 Lancement de l'application via Docker

Pour simplifier la gestion, des raccourcis de scripts `npm` sont disponibles dans le fichier `package.json` à la racine du projet.

### 1. Construire et démarrer les conteneurs
Cette commande construit l'image Docker de l'application Next.js (optimisée en mode standalone) et démarre le conteneur de l'application ainsi que la base de données PostgreSQL en arrière-plan.

```bash
npm run docker:build
```

### 2. Arrêter les conteneurs
Pour éteindre et supprimer les conteneurs Docker sans perdre les données de la base de données (les données sont persistées dans un volume Docker nommé `db_data`) :

```bash
npm run docker:down:run
```

---

## 🗄️ Gestion de la Base de Données (Prisma 7)

Prisma 7 n'inclut plus de moteurs binaires Rust par défaut et fonctionne via le compilateur WebAssembly avec un adaptateur de pilote (`@prisma/adapter-pg`). Le port PostgreSQL interne `5432` du conteneur est mappé sur le port **`51214`** de votre machine locale.

### Lancer les migrations
Les migrations de base de données doivent être exécutées depuis votre machine hôte vers la base PostgreSQL du conteneur Docker. 
Placez-vous dans le dossier de l'application `agent-smith/` et exécutez :

```bash
# Sur Windows (PowerShell)
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/briefmaster?schema=public"; npx prisma migrate dev

# Sur macOS / Linux / Git Bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/briefmaster?schema=public" npx prisma migrate dev
```

### Ouvrir Prisma Studio
Prisma Studio vous permet d'inspecter et de modifier directement les données de la base via une interface graphique.
Placez-vous dans le dossier de l'application `agent-smith/` et exécutez :

```bash
# Sur Windows (PowerShell)
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/briefmaster?schema=public"; npx prisma studio

# Sur macOS / Linux / Git Bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:51214/briefmaster?schema=public" npx prisma studio
```
Ouvrez ensuite [http://localhost:5555](http://localhost:5555) dans votre navigateur.

---

## 🤖 Configuration des Fournisseurs d'IA

L'application supporte deux modes d'exécution pour le LLM.

### Option A : Anthropic Claude (Recommandé)
Configurez `LLM_PROVIDER=anthropic` dans votre `.env`. L'application enverra les requêtes directement vers l'API Cloud d'Anthropic. Assurez-vous d'avoir des crédits actifs sur votre compte de console Anthropic.

### Option B : Ollama (Local encore expérimental)
Pour faire tourner un modèle localement sans frais :
1.  Configurez `LLM_PROVIDER=ollama` dans votre `.env`.
2.  Assurez-vous qu'Ollama est installé et qu'un modèle compatible est disponible (ex: `qwen2.5` ou `llama3`).
3.  **Important (Sécurité Windows/Docker) :** Par défaut, Ollama refuse les connexions provenant de Docker. Pour l'autoriser à écouter les requêtes du conteneur :
    *   Quittez Ollama depuis la barre des tâches (clic droit -> Quit).
    *   Ajoutez la variable d'environnement Windows : `OLLAMA_HOST` avec la valeur `0.0.0.0`.
    *   Relancez Ollama.

---

## 🧪 Tests des routes API

Un fichier [request.http](docs/request/request.http) est fourni à la racine du projet. 
Vous pouvez l'utiliser avec l'extension **REST Client** pour VS Code ou l'outil HTTP Client d'IntelliJ pour tester manuellement chaque étape du flux de travail :
1.  Envoi d'un brief pour obtenir des clarifications.
2.  Relance avec les réponses aux clarifications pour générer le backlog.
3.  Validation d'un ticket du backlog.
4.  Génération des documents du projet.
5.  Création automatique de l'issue GitHub correspondante.
