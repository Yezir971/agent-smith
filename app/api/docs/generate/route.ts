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
    const { briefId, docType } = body;

    // 1. Validation de l'entrée briefId et docType
    if (!briefId || typeof briefId !== 'string') {
      return NextResponse.json(
        { error: 'briefId est requis et doit être une chaîne de caractères.' },
        { status: 400 }
      );
    }

    const validDocTypes = ['agent', 'architecture', 'changelog', 'task'];
    if (!docType || typeof docType !== 'string' || !validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `docType est requis et doit être l'un des suivants : ${validDocTypes.join(', ')}.` },
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

    // 5. Construction du prompt système et du message utilisateur demandant UNIQUEMENT le document sélectionné
    const systemPrompt = buildSystemPrompt(brief.content, clarificationsContext);

    const docTypeLabels: Record<string, string> = {
      agent: 'AGENT.md (doc_type: "agent") - Le fichier décrivant la personnalité, les compétences et les instructions de l\'agent.',
      architecture: 'ARCHITECTURE.md (doc_type: "architecture") - Le fichier décrivant les choix techniques et l\'architecture globale du projet.',
      changelog: 'CHANGELOG.md (doc_type: "changelog") - Le fichier de journalisation des modifications.',
      task: 'TASK.md (doc_type: "task") - Le fichier contenant le backlog et le plan d\'action technique.',
    };

    const userMessage = `Voici le brief original :
${brief.content}

Le backlog a été entièrement validé et le périmètre du projet est clair.
Tu dois générer UNIQUEMENT le document suivant pour ce projet :
${docTypeLabels[docType]}

Veuillez appeler l'outil generate_docs pour produire le contenu de ce document de manière spécifique, complète, sans aucun placeholder ni contenu générique (comme "à compléter").`;

    // 6. Appel au LLM en forçant l'outil generate_docs
    let llmResponse;
    try {
      llmResponse = await callLLM(systemPrompt, userMessage, tools, {
        type: 'tool',
        name: 'generate_docs',
      });
    } catch (llmError: any) {
      console.error(`LLM Call failed during generation of ${docType}:`, llmError);
      return NextResponse.json(
        { error: `LLM Call failed: ${llmError.message || llmError}` },
        { status: 550 }
      );
    }

    // 7. Persistance du document généré
    let createdDoc = null;

    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const tc of llmResponse.toolCalls) {
        if (tc.name === 'generate_docs') {
          const returnedDocType = tc.input.doc_type;
          const content = tc.input.content;

          // On s'assure qu'on persiste le type demandé
          if (!returnedDocType || !content || returnedDocType !== docType) {
            continue;
          }

          // Nettoyage de l'ancienne version s'il y en a une pour ce type et ce brief
          await prisma.generatedDoc.deleteMany({
            where: {
              briefId,
              docType: returnedDocType,
            },
          });

          // Création du document généré
          createdDoc = await prisma.generatedDoc.create({
            data: {
              briefId,
              docType: returnedDocType,
              content,
            },
          });
          break; // On a trouvé notre document, on s'arrête
        }
      }
    }

    if (!createdDoc) {
      return NextResponse.json(
        { error: `Le LLM n'a pas retourné l'appel à l'outil generate_docs pour générer le document ${docType}.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Le document ${docType.toUpperCase()}.md a été généré et enregistré avec succès.`,
      doc: createdDoc,
    });
  } catch (error: any) {
    console.error('API Error in doc generation route:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
