'use client';

import React, { useState, useEffect } from 'react';

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  effortEstimate: string;
  status: string; // 'proposed' | 'validated' | 'rejected'
}

interface BacklogViewProps {
  briefId: string;
  items: BacklogItem[];
  onItemValidated?: (updatedItem: BacklogItem) => void;
}

export default function BacklogView({
  briefId,
  items,
  onItemValidated,
}: BacklogViewProps) {
  const [localItems, setLocalItems] = useState<BacklogItem[]>(items);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Synchroniser l'état local si les items du parent changent
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleValidate = async (itemId: string) => {
    setError(null);
    setLoadingItemId(itemId);

    try {
      const res = await fetch(`/api/backlog/${itemId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la validation.');
      }

      // Mise à jour de l'affichage local du statut
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: 'validated' } : item
        )
      );

      if (onItemValidated) {
        onItemValidated(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la communication avec le serveur.');
    } finally {
      setLoadingItemId(null);
    }
  };

  // Helper pour obtenir les styles CSS de l'estimation d'effort (S / M / L)
  const getEffortBadgeClass = (estimate: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ';
    switch (estimate.toUpperCase()) {
      case 'S':
        return base + 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'M':
        return base + 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
      case 'L':
        return base + 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50';
      default:
        return base + 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
    }
  };

  // Helper pour obtenir les styles CSS du statut
  const getStatusBadgeClass = (status: string) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ';
    switch (status) {
      case 'validated':
        return base + 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'rejected':
        return base + 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
      case 'proposed':
      default:
        return base + 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Validé';
      case 'rejected':
        return 'Rejeté';
      case 'proposed':
      default:
        return 'Proposé';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Backlog Technique Estimé
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Validez chaque tâche individuellement pour préparer la création des issues GitHub.
          </p>
        </div>
        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-md font-medium">
          {localItems.filter((i) => i.status === 'validated').length} / {localItems.length} Validé(s)
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {localItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune tâche proposée pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {localItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col md:flex-row justify-between gap-4 items-start"
            >
              <div className="space-y-3 flex-1">
                {/* En-tête de tâche */}
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className={getEffortBadgeClass(item.effortEstimate)}>
                      Effort : {item.effortEstimate}
                    </span>
                    <span className={getStatusBadgeClass(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </div>

                {/* Description de tâche */}
                <p className="text-sm text-zinc-650 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </div>

              {/* Action (Bouton Valider) */}
              <div className="w-full md:w-auto flex md:justify-end shrink-0 pt-2 md:pt-0">
                {item.status === 'proposed' ? (
                  <button
                    onClick={() => handleValidate(item.id)}
                    disabled={loadingItemId !== null}
                    className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-xs rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-zinc-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {loadingItemId === item.id ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3 text-current"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Validation...
                      </>
                    ) : (
                      'Valider'
                    )}
                  </button>
                ) : item.status === 'validated' ? (
                  <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs py-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Validée
                  </div>
                ) : (
                  <div className="w-full md:w-auto text-center md:text-right text-xs text-zinc-400 dark:text-zinc-650 py-2">
                    Indisponible
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
