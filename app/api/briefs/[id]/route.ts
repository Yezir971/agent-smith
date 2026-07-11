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

export async function GET(
  request: Request,
  context: any
) {
  try {
    const params = await context?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'id est requis et doit être présent dans la route.' },
        { status: 400 }
      );
    }
    const brief = await prisma.brief.findUnique({
      where: { id },
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

    if (!brief) {
      return NextResponse.json(
        { error: `Brief avec l'ID ${id} non trouvé.` },
        { status: 404 }
      );
    }

    return NextResponse.json(brief);
  } catch (error: any) {
    console.error('API Error in GET brief by ID:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
