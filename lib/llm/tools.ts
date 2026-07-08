import Anthropic from '@anthropic-ai/sdk';

/**
 * Tool: ask_clarification
 * Called when the client's brief is ambiguous, incomplete, or lacks critical details
 * (such as target stack, volume, regulatory constraints, existing integrations, budget, or deadline).
 * Prevents the agent from guessing or hallucinating scope.
 */
export const askClarificationTool: Anthropic.Tool = {
  name: 'ask_clarification',
  description: 'Pose une question de clarification au client lorsque son brief brut est ambigu, incomplet, ou contient des zones d\'ombre sur des points bloquants (stack technique, volumétrie, contraintes réglementaires, intégrations tierces, budget, deadline). Ne devine jamais un scope, une contrainte technique ou une priorité non mentionnée. Un backlog basé sur une supposition non vérifiée est pire qu\'une question posée.',
  input_schema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'La question de clarification posée de manière ciblée, claire et professionnelle.'
      },
      reason: {
        type: 'string',
        description: 'La raison précise pour laquelle cette information est manquante et bloquante pour pouvoir estimer ou découper le projet.'
      }
    },
    required: ['question', 'reason']
  }
};

/**
 * Tool: propose_backlog
 * Proposes a structured, initial list of concrete development tasks.
 * Called only when the brief has no blockages/ambiguities (or once they have been answered).
 */
export const proposeBacklogTool: Anthropic.Tool = {
  name: 'propose_backlog',
  description: 'Propose un backlog initial découpé en tâches de développement concrètes. Ce tool ne doit être appelé que si le brief est suffisamment clair et complet (ou après avoir obtenu les réponses aux clarifications nécessaires) pour éviter toute supposition non vérifiée sur le périmètre.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'La liste des tâches concrètes qui composeront le backlog du projet.',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Titre clair, court et précis de la tâche (ex: "Configuration de la base de données PostgreSQL").'
            },
            description: {
              type: 'string',
              description: 'Description détaillée du travail à effectuer, des livrables attendus et des critères d\'acceptation.'
            },
            effort_estimate: {
              type: 'string',
              enum: ['S', 'M', 'L'],
              description: 'Estimation globale et comparative de l\'effort requis pour cette tâche (S, M ou L).'
            }
          },
          required: ['title', 'description', 'effort_estimate']
        }
      }
    },
    required: ['items']
  }
};

/**
 * Tool: estimate_effort
 * Provides a detailed comparative estimate (S/M/L) and justification for a single backlog item.
 * Never provides exact numbers of days or hours that cannot be justified.
 */
export const estimateEffortTool: Anthropic.Tool = {
  name: 'estimate_effort',
  description: 'Détaille et justifie l\'estimation d\'effort pour une tâche spécifique du backlog. L\'estimation doit obligatoirement être comparative (S, M ou L) et ne doit jamais suggérer de durée chiffrée précise non justifiable en jours ou en heures.',
  input_schema: {
    type: 'object',
    properties: {
      item_title: {
        type: 'string',
        description: 'Le titre exact de la tâche du backlog concernée.'
      },
      estimate: {
        type: 'string',
        enum: ['S', 'M', 'L'],
        description: 'L\'estimation d\'effort retenue pour la tâche (S: Small, M: Medium, L: Large).'
      },
      justification: {
        type: 'string',
        description: 'La justification technique détaillée et objective de cette estimation (explications basées sur la complexité, la quantité de travail ou les risques techniques).'
      }
    },
    required: ['item_title', 'estimate', 'justification']
  }
};

/**
 * Tool: generate_docs
 * Generates the reference project files (AGENT.md, ARCHITECTURE.md, CHANGELOG.md, TASK.md).
 * Should only be called once the backlog has been validated and the scope is perfectly clear.
 * Must not write generic content or placeholder texts (such as "to be completed").
 */
export const generateDocsTool: Anthropic.Tool = {
  name: 'generate_docs',
  description: 'Génère les documents de référence du projet (AGENT.md, ARCHITECTURE.md, CHANGELOG.md, TASK.md) adaptés de manière précise au brief et aux choix techniques validés. Ne doit être appelé que lorsque le backlog a été validé et qu\'aucune ambiguïté ne subsiste. Le contenu généré doit être complet, spécifique et ne comporter aucun placeholder ou texte générique (comme "à compléter").',
  input_schema: {
    type: 'object',
    properties: {
      doc_type: {
        type: 'string',
        enum: ['agent', 'architecture', 'changelog', 'task'],
        description: 'Le type de document à générer.'
      },
      content: {
        type: 'string',
        description: 'Le contenu complet du document rédigé au format Markdown, structuré de façon professionnelle.'
      }
    },
    required: ['doc_type', 'content']
  }
};

/**
 * List of all tools available to the Claude API.
 */
export const tools: Anthropic.Tool[] = [
  askClarificationTool,
  proposeBacklogTool,
  estimateEffortTool,
  generateDocsTool
];
