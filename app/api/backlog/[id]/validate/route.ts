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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Recherche du backlog item
    const backlogItem = await prisma.backlogItem.findUnique({
      where: { id },
    });

    // 2. Validation de l'existence et du statut actuel
    if (!backlogItem) {
      return NextResponse.json(
        { error: `Backlog item avec l'ID ${id} non trouvé.` },
        { status: 400 }
      );
    }

    if (backlogItem.status === 'validated') {
      return NextResponse.json(
        { error: 'Ce backlog item est déjà validé.' },
        { status: 400 }
      );
    }

    // 3. Mise à jour du statut vers "validated"
    const updatedBacklogItem = await prisma.backlogItem.update({
      where: { id },
      data: { status: 'validated' },
    });

    return NextResponse.json(updatedBacklogItem);
  } catch (error: any) {
    console.error('API Error in validate route:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
