import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';
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

export async function GET() {
  try {
    const briefs = await prisma.brief.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        clarifications: true,
        backlogItems: {
          include: {
            githubIssue: true,
          },
        },
        generatedDocs: true,
      },
    });
    return NextResponse.json(briefs);
  } catch (error: any) {
    console.error('API Error in GET briefs:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
