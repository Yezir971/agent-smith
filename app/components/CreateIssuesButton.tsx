'use client';

import React, { useState } from 'react';

export interface BacklogItemWithIssue {
  id: string;
  title: string;
  status: string; // 'proposed' | 'validated' | 'rejected'
  githubIssue?: {
    id: string;
    githubIssueNumber: number;
    githubUrl: string;
  } | null;
}

interface CreateIssuesButtonProps {
  briefId: string;
  items: BacklogItemWithIssue[];
  onIssuesCreated?: () => void; // Callback pour recharger les données du parent
}

export default function CreateIssuesButton({
  briefId,
  items,
  onIssuesCreated,
}: CreateIssuesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Filtrer les tâches validées n'ayant pas encore d'issue GitHub liée
  const validatedItems = items.filter((item) => item.status === 'validated');
  const itemsToCreate = validatedItems.filter((item) => !item.githubIssue);
  
  // Tâches ayant déjà une issue GitHub liée
  const itemsWithIssues = items.filter((item) => !!item.githubIssue);

  const handleCreateIssues = async () => {
    setError(null);
    setLoading(true);
    setProgress({ current: 0, total: itemsToCreate.length });

    let count = 0;
    let hasError = false;

    for (const item of itemsToCreate) {
      try {
        const res = await fetch('/api/github/issues', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ backlogItemId: item.id }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Échec de création pour "${item.title}"`);
        }

        count++;
        setProgress({ current: count, total: itemsToCreate.length });
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Une erreur est survenue lors de la création des issues.');
        hasError = true;
        break; // Arrêter la boucle au premier échec pour éviter le spam ou des appels en boucle erronés
      }
    }

    setLoading(false);

    // Déclencher le rechargement si des issues ont été créées
    if (onIssuesCreated && count > 0) {
      onIssuesCreated();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Export GitHub Issues
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Créez des tickets réels sur votre dépôt GitHub configuré à partir des tâches validées.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-900">
        {/* Résumé des statuts */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
          <p>Tâches validées : <span className="font-semibold text-zinc-700 dark:text-zinc-300">{validatedItems.length}</span></p>
          <p>Tickets à créer : <span className="font-semibold text-zinc-700 dark:text-zinc-300">{itemsToCreate.length}</span></p>
        </div>

        {/* Bouton d'action */}
        <button
          onClick={handleCreateIssues}
          disabled={loading || itemsToCreate.length === 0}
          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-sm rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-zinc-400 transition-all disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Export en cours ({progress.current}/{progress.total})...
            </>
          ) : itemsToCreate.length === 0 ? (
            'Tous les tickets ont été exportés'
          ) : (
            `Exporter ${itemsToCreate.length} ticket(s) vers GitHub`
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-650 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Liste des issues déjà créées */}
      {itemsWithIssues.length > 0 && (
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Issues GitHub créées ({itemsWithIssues.length}) :
          </h4>
          <ul className="space-y-2">
            {itemsWithIssues.map((item) => {
              const issue = item.githubIssue!;
              return (
                <li key={item.id} className="flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-900/50 px-3.5 py-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
                  <span className="font-medium text-zinc-800 dark:text-zinc-300 truncate max-w-md">
                    {item.title}
                  </span>
                  <a
                    href={issue.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-950 dark:text-zinc-50 font-medium hover:underline shrink-0"
                  >
                    #{issue.githubIssueNumber} sur GitHub
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
