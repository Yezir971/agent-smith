import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { tools } from '@/lib/llm/tools';
import { callLLM } from '@/lib/llm/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Évite d'avoir plusieurs instances de PrismaClient en mode développement
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { briefId } = body;

    // 1. Validation de l'entrée briefId
    if (!briefId || typeof briefId !== 'string') {
      return NextResponse.json(
        { error: 'briefId est requis et doit être une chaîne de caractères.' },
        { status: 400 }
      );
    }

    // 2. Récupération du brief
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
    });

    if (!brief) {
      return NextResponse.json(
        { error: `Brief avec l'ID ${briefId} non trouvé.` },
        { status: 404 }
      );
    }

    // 3. Vérification du statut du backlog
    const backlogItems = await prisma.backlogItem.findMany({
      where: { briefId },
    });

    if (backlogItems.length === 0) {
      return NextResponse.json(
        { error: "Le backlog est vide. Veuillez d'abord analyser le brief et générer des tâches." },
        { status: 400 }
      );
    }

    const hasProposed = backlogItems.some((item) => item.status === 'proposed');
    const hasValidated = backlogItems.some((item) => item.status === 'validated');

    if (hasProposed || !hasValidated) {
      return NextResponse.json(
        { error: "Le backlog n'est pas entièrement validé. Assurez-vous que toutes les tâches proposées sont validées (ou rejetées) et qu'au moins une tâche est validée." },
        { status: 400 }
      );
    }

    // 4. Récupération des clarifications pour le contexte
    const answeredClarifications = await prisma.clarification.findMany({
      where: {
        briefId,
        answer: { not: null },
      },
      orderBy: { createdAt: 'asc' },
    });

    const clarificationsContext = answeredClarifications
      .map((c) => `Question: ${c.question}\nRéponse: ${c.answer}`)
      .join('\n\n');

    // 5. Construction du prompt système et du message utilisateur demandant la génération de tous les documents
    const systemPrompt = buildSystemPrompt(brief.content, clarificationsContext);

    const userMessage = `Voici le brief original :
${brief.content}

Le backlog a été entièrement validé et le périmètre du projet est clair.
Tu dois générer les quatre documents de référence du projet :
1. AGENT.md (doc_type: 'agent')
2. ARCHITECTURE.md (doc_type: 'architecture')
3. CHANGELOG.md (doc_type: 'changelog')
4. TASK.md (doc_type: 'task')

Veuillez appeler l'outil generate_docs pour CHACUN de ces quatre documents de manière spécifique, complète, sans aucun placeholder ni contenu générique (comme "à compléter").`;

    // 6. Appel au LLM
    let llmResponse;
    try {
      llmResponse = await callLLM(systemPrompt, userMessage, tools);
    } catch (llmError: any) {
      console.error('LLM Call failed during doc generation:', llmError);
      return NextResponse.json(
        { error: `LLM Call failed: ${llmError.message || llmError}` },
        { status: 500 }
      );
    }

    // 7. Persistance des documents générés
    const generatedDocsCreated = [];

    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const tc of llmResponse.toolCalls) {
        if (tc.name === 'generate_docs') {
          const docType = tc.input.doc_type;
          const content = tc.input.content;

          if (!docType || !content) {
            continue;
          }

          // Nettoyage de l'ancienne version s'il y en a une pour ce type et ce brief
          await prisma.generatedDoc.deleteMany({
            where: {
              briefId,
              docType,
            },
          });

          // Création du document généré
          const created = await prisma.generatedDoc.create({
            data: {
              briefId,
              docType,
              content,
            },
          });
          generatedDocsCreated.push(created);
        }
      }
    }

    if (generatedDocsCreated.length === 0) {
      return NextResponse.json(
        { error: "Le LLM n'a retourné aucun appel à l'outil generate_docs pour générer les documents." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${generatedDocsCreated.length} documents ont été générés et enregistrés avec succès.`,
      docs: generatedDocsCreated,
    });
  } catch (error: any) {
    console.error('API Error in doc generation route:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
