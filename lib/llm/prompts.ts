import fs from 'fs';
import path from 'path';

/**
 * Builds the system prompt for the senior software engineer agent by loading the contents
 * of AGENT.md (or AGENTS.md) and ARCHITECTURE.md and injecting them into the prompt template.
 *
 * @param briefContent The raw brief from the client.
 * @param clarificationsContext Clarifications already answered (optional).
 * @returns The fully constructed system prompt.
 */
export function buildSystemPrompt(briefContent: string, clarificationsContext: string = ''): string {
  const rootDir = process.cwd();

  // Load AGENT.md or AGENTS.md content
  let agentMdContent = '';
  const agentMdPath = path.join(rootDir, 'AGENT.md');
  const agentsMdPath = path.join(rootDir, 'AGENTS.md');

  if (fs.existsSync(agentMdPath)) {
    agentMdContent = fs.readFileSync(agentMdPath, 'utf8');
  } else if (fs.existsSync(agentsMdPath)) {
    agentMdContent = fs.readFileSync(agentsMdPath, 'utf8');
  } else {
    throw new Error('AGENT.md nor AGENTS.md was found in the workspace root.');
  }

  // Load ARCHITECTURE.md content
  let architectureMdContent = '';
  const architectureMdPath = path.join(rootDir, 'ARCHITECTURE.md');

  if (fs.existsSync(architectureMdPath)) {
    architectureMdContent = fs.readFileSync(architectureMdPath, 'utf8');
  } else {
    throw new Error('ARCHITECTURE.md was not found in the workspace root.');
  }

  const systemPromptTemplate = `Tu es un ingénieur logiciel senior chargé de cadrer un projet client à partir d'un brief brut.

RÈGLE ABSOLUE : si un point est ambigu ou bloquant pour estimer ou découper le projet, utilise ask_clarification. Ne devine jamais un scope, une contrainte technique ou une priorité non mentionnée. Un backlog basé sur une supposition non vérifiée est pire qu'une question posée.

Processus :
1. Lis le brief. S'il manque une information bloquante (stack imposée, volumétrie, deadline, budget, intégrations existantes), appelle ask_clarification pour chaque point flou, un appel par question.
2. Si le brief est suffisamment clair (ou une fois les clarifications répondues), appelle propose_backlog avec un découpage en tâches concrètes, puis estimate_effort pour chacune (S/M/L uniquement, jamais de jours précis non justifiables).
3. Si demandé, appelle generate_docs pour produire AGENT.md, ARCHITECTURE.md, CHANGELOG.md et TASK.md adaptés à ce projet précis — pas de contenu générique ni de placeholder "à compléter".

Style attendu pour les documents générés (imite structure et niveau de précision, pas le contenu) :

--- EXEMPLE AGENT.md ---
{FEWSHOT_AGENT_MD}
--- FIN EXEMPLE ---

--- EXEMPLE ARCHITECTURE.md ---
{FEWSHOT_ARCHITECTURE_MD}
--- FIN EXEMPLE ---

Chaque décision d'architecture proposée doit être justifiée en une phrase (pattern "choix → pourquoi"), comme dans l'exemple.

Brief à traiter :
{BRIEF_CONTENT}

Clarifications déjà répondues (si applicable) :
{CLARIFICATIONS_CONTEXT}`;

  // Using functions as replacement arguments to safely handle any special characters (like '$') in content
  return systemPromptTemplate
    .replace('{FEWSHOT_AGENT_MD}', () => agentMdContent)
    .replace('{FEWSHOT_ARCHITECTURE_MD}', () => architectureMdContent)
    .replace('{BRIEF_CONTENT}', () => briefContent)
    .replace('{CLARIFICATIONS_CONTEXT}', () => clarificationsContext);
}
