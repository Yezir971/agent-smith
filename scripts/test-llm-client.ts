// scripts/test-llm-client.ts
// Test manuel de l'abstraction provider, avant intégration dans les routes API.
// Usage :
//   LLM_PROVIDER=anthropic npx tsx scripts/test-llm-client.ts
//   LLM_PROVIDER=ollama npx tsx scripts/test-llm-client.ts

import { callLLM } from '../lib/llm/client';
import { tools } from '../lib/llm/tools';

async function main() {
  console.log(`\n--- Test avec LLM_PROVIDER=${process.env.LLM_PROVIDER} ---\n`);

  const systemPrompt = `Tu es un assistant de test. Si on te demande une info
manquante, utilise l'outil ask_clarification. Sinon réponds normalement.`;

  const userMessage = `Brief : "On veut une app pour gérer nos stocks."`;

  try {
    const response = await callLLM(systemPrompt, userMessage, tools);

    console.log('Réponse brute :', JSON.stringify(response, null, 2));

  } catch (err) {
    console.error('Erreur pendant l\'appel LLM :', err);
    process.exit(1);
  }
}

main();