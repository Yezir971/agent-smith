import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { tools } from '@/lib/llm/tools';
import { callLLM } from '@/lib/llm/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prevent multiple PrismaClient instances in development
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
    const body = await request.json();
    const { briefContent, source } = body;

    // 1. Validation
    if (!briefContent || typeof briefContent !== 'string') {
      return NextResponse.json(
        { error: 'briefContent is required and must be a string' },
        { status: 400 }
      );
    }

    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { error: 'source is required and must be a string' },
        { status: 400 }
      );
    }

    // 2. Create Brief in DB with status "draft"
    const brief = await prisma.brief.create({
      data: {
        content: briefContent,
        source: source,
        status: 'draft',
      },
    });

    // 3. Build System Prompt and Call LLM
    let llmResponse;
    try {
      const systemPrompt = buildSystemPrompt(briefContent);
      llmResponse = await callLLM(systemPrompt, briefContent, tools);
    } catch (llmError: any) {
      console.error('LLM Call failed:', llmError);
      return NextResponse.json(
        { error: `LLM Call failed: ${llmError.message || llmError}` },
        { status: 500 }
      );
    }

    // 4. Persist based on LLM Response
    const backlogItemsMap = new Map<string, any>();

    // Process tool calls
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      for (const tc of llmResponse.toolCalls) {
        if (tc.name === 'ask_clarification') {
          await prisma.clarification.create({
            data: {
              briefId: brief.id,
              question: tc.input.question,
            },
          });
          // Update brief status to clarifying
          await prisma.brief.update({
            where: { id: brief.id },
            data: { status: 'clarifying' },
          });
        } else if (tc.name === 'propose_backlog') {
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
          // Update brief status to ready (since backlog is proposed)
          await prisma.brief.update({
            where: { id: brief.id },
            data: { status: 'ready' },
          });
        }
      }

      // Apply estimate_effort tool calls if present to enrich descriptions/estimates
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

    // 5. Retrieve Brief with its relations and return
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
