import { NextResponse } from 'next/server';
import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Octokit } from 'octokit';

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
    const { backlogItemId } = body;

    // 1. Validation de l'entrée backlogItemId
    if (!backlogItemId || typeof backlogItemId !== 'string') {
      return NextResponse.json(
        { error: 'backlogItemId est requis et doit être une chaîne de caractères.' },
        { status: 400 }
      );
    }

    // 2. Recherche de l'item de backlog et de sa potentielle issue liée
    const backlogItem = await prisma.backlogItem.findUnique({
      where: { id: backlogItemId },
      include: { githubIssue: true },
    });

    if (!backlogItem) {
      return NextResponse.json(
        { error: `Tâche du backlog avec l'ID ${backlogItemId} non trouvée.` },
        { status: 404 }
      );
    }

    // 3. Vérifications de validité
    if (backlogItem.status !== 'validated') {
      return NextResponse.json(
        { error: "La tâche du backlog doit être validée ('validated') pour pouvoir créer une issue GitHub." },
        { status: 400 }
      );
    }

    if (backlogItem.githubIssue) {
      return NextResponse.json(
        { error: "Cette tâche du backlog est déjà associée à une issue GitHub existante." },
        { status: 400 }
      );
    }

    // 4. Validation des variables d'environnement GitHub
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || token === 'ghp_ton-token' || token.trim() === '') {
      return NextResponse.json(
        { error: "Le token GitHub (GITHUB_TOKEN) est manquant ou configuré avec une valeur d'exemple dans le fichier .env." },
        { status: 400 }
      );
    }

    if (!owner || owner === 'ton-username-github' || owner.trim() === '') {
      return NextResponse.json(
        { error: "Le propriétaire du dépôt (GITHUB_OWNER) est manquant ou configuré avec une valeur d'exemple dans le fichier .env." },
        { status: 400 }
      );
    }

    if (!repo || repo === 'nom-du-repo-cible' || repo.trim() === '') {
      return NextResponse.json(
        { error: "Le nom du dépôt (GITHUB_REPO) est manquant ou configuré avec une valeur d'exemple dans le fichier .env." },
        { status: 400 }
      );
    }

    // 5. Initialisation d'Octokit et appel API GitHub
    const octokit = new Octokit({ auth: token });
    let githubResponse;

    try {
      githubResponse = await octokit.rest.issues.create({
        owner,
        repo,
        title: backlogItem.title,
        body: backlogItem.description,
      });
    } catch (gitHubError: any) {
      console.error("Erreur de communication avec GitHub API :", gitHubError);
      if (gitHubError.status === 401) {
        return NextResponse.json(
          { error: "Authentification échouée auprès de GitHub. Le token GITHUB_TOKEN fourni est probablement invalide ou a expiré." },
          { status: 401 }
        );
      }
      if (gitHubError.status === 404) {
        return NextResponse.json(
          { error: `Le dépôt ${owner}/${repo} n'a pas pu être trouvé ou le token n'a pas les droits requis pour y accéder.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Erreur lors de la création de l'issue GitHub : ${gitHubError.message || gitHubError}` },
        { status: 500 }
      );
    }

    // 6. Persistance dans la table github_issues
    const createdGithubIssue = await prisma.githubIssue.create({
      data: {
        backlogItemId: backlogItem.id,
        githubIssueNumber: githubResponse.data.number,
        githubUrl: githubResponse.data.html_url,
      },
    });

    return NextResponse.json({
      success: true,
      githubIssue: createdGithubIssue,
    });
  } catch (error: any) {
    console.error('API Error in GitHub Issues route:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || error}` },
      { status: 500 }
    );
  }
}
