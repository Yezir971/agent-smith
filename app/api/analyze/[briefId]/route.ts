import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { tools } from '@/lib/llm/tools';
import { callLLM } from '@/lib/llm/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/*
  CHOIX ARCHITECTURAL : Création d'une nouvelle route dynamique `app/api/analyze/[briefId]/route.ts`
  
  Pourquoi ce choix plutôt que de tout mettre dans la même route `app/api/analyze/route.ts` ?
  1. Respect des principes REST :
     - La route `POST /api/analyze` gère la création initiale d'un brief à partir d'un contenu brut.
     - La route `POST /api/analyze/[briefId]` gère la relance/mise à jour d'un brief existant identifié par son ID.
  2. Séparation des responsabilités :
     - Évite de surcharger la route de création avec des conditions complexes (ex: vérifier si un briefId est passé dans le corps de la requête).
     - Reste cohérent avec la structure de Next.js App Router qui encourage l'usage de routes dynamiques pour les actions sur des ressources existantes.
*/

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

export async function POST(
  request: Request,
  context: any
) {
  try {
    const params = await context?.params;
    const briefId = params?.briefId || params?.briefid;

    if (!briefId) {
      return NextResponse.json(
        { error: 'briefId est requis et doit être présent dans la route.' },
        { status: 400 }
      );
    }

    // 1. Récupération du brief existant
    const brief = await prisma.brief.findUnique({
      where: { id: briefId },
    });

    if (!brief) {
      return NextResponse.json(
        { error: 'Brief non trouvé' },
        { status: 404 }
      );
    }

    // 2. Parse et validation des réponses aux clarifications
    const body = await request.json();
    let clarificationsInput: { clarificationId: string; answer: string }[] = [];

    if (Array.isArray(body)) {
      clarificationsInput = body;
    } else if (body && Array.isArray(body.clarifications)) {
      clarificationsInput = body.clarifications;
    } else {
      return NextResponse.json(
        { error: 'Format de corps de requête invalide. Attendu : un tableau ou un objet { clarifications: [...] }' },
        { status: 400 }
      );
    }

    // 3. Persistance des réponses aux clarifications
    for (const clar of clarificationsInput) {
      if (!clar.clarificationId || clar.answer === undefined || clar.answer === null) {
        continue;
      }
      await prisma.clarification.updateMany({
        where: {
          id: clar.clarificationId,
          briefId: briefId,
        },
        data: {
          answer: clar.answer,
          answeredAt: new Date(),
        },
      });
    }

    // 4. Construction du contexte des clarifications répondues
    const answeredClarifications = await prisma.clarification.findMany({
      where: {
        briefId: briefId,
        answer: { not: null },
      },
      orderBy: { createdAt: 'asc' },
    });

    const clarificationsContext = answeredClarifications
      .map((c) => `Question: ${c.question}\nRéponse: ${c.answer}`)
      .join('\n\n');

    // 5. Appel au LLM avec le brief et les clarifications réponddues en contexte
    let llmResponse;
    try {
      const systemPrompt = buildSystemPrompt(brief.content, clarificationsContext);
      llmResponse = await callLLM(systemPrompt, brief.content, tools);
    } catch (llmError: any) {
      console.error('LLM Call failed during follow-up:', llmError);
      return NextResponse.json(
        { error: `LLM Call failed: ${llmError.message || llmError}` },
        { status: 500 }
      );
    }

    // 6. Persistance des résultats selon la réponse du LLM
    const backlogItemsMap = new Map<string, any>();

    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const tc of llmResponse.toolCalls) {
        if (tc.name === 'ask_clarification') {
          await prisma.clarification.create({
            data: {
              briefId: brief.id,
              question: tc.input.question,
            },
          });
          // On maintient/remet le statut du brief à "clarifying"
          await prisma.brief.update({
            where: { id: brief.id },
            data: { status: 'clarifying' },
          });
        } else if (tc.name === 'propose_backlog') {
          // Nettoyage des anciens items de backlog "proposés" pour éviter les doublons lors d'une relance
          await prisma.backlogItem.deleteMany({
            where: {
              briefId: brief.id,
              status: 'proposed',
            },
          });

          if (tc.input.items && Array.isArray(tc.input.items)) {
            for (const item of tc.input.items) {
              const created = await prisma.backlogItem.create({
                data: {
                  briefId: brief.id,
                  title: item.title,
                  description: item.description,
                  effortEstimate: item.effort_estimate,
                  status: 'proposed',
                },
              });
              backlogItemsMap.set(item.title, created);
            }
          }
          // Passage du statut du brief à "ready" (puisque le backlog est proposé)
          await prisma.brief.update({
            where: { id: brief.id },
            data: { status: 'ready' },
          });
        }
      }

      // Application des estimations d'efforts
      for (const tc of llmResponse.toolCalls) {
        if (tc.name === 'estimate_effort') {
          const title = tc.input.item_title;
          const estimate = tc.input.estimate;
          const justification = tc.input.justification;

          const existing = backlogItemsMap.get(title);
          if (existing) {
            await prisma.backlogItem.update({
              where: { id: existing.id },
              data: {
                effortEstimate: estimate,
                description: `${existing.description}\n\n**Justification de l'estimation (${estimate}) :** ${justification}`,
              },
            });
          }
        }
      }
    }

    // 7. Récupération du brief à jour avec ses relations et retour à l'utilisateur
    const finalBrief = await prisma.brief.findUnique({
      where: { id: brief.id },
      include: {
        clarifications: true,
        backlogItems: true,
      },
    });

    return NextResponse.json(finalBrief);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
