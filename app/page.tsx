'use client';

import React, { useState, useEffect } from 'react';
import BriefForm from '@/app/components/BriefForm';
import ClarificationsList from '@/app/components/ClarificationsList';
import BacklogView from '@/app/components/BacklogView';
import GeneratedDocsView from '@/app/components/GeneratedDocsView';
import CreateIssuesButton from '@/app/components/CreateIssuesButton';

interface Brief {
  id: string;
  content: string;
  source: string;
  status: string;
  createdAt: string;
  clarifications: any[];
  backlogItems: any[];
  generatedDocs: any[];
}

export default function Home() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activeBrief, setActiveBrief] = useState<Brief | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [isCreating, setIsCreating] = useState(true);
  
  // États pour la génération de documents
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  // Charger la liste des briefs
  const fetchBriefs = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/briefs');
      if (res.ok) {
        const data = await res.json();
        setBriefs(data);
      }
    } catch (err) {
      console.error('Erreur de chargement des briefs:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, []);

  // Rafraîchir un brief spécifique
  const refreshActiveBrief = async (id: string) => {
    try {
      const res = await fetch(`/api/briefs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveBrief(data);
        setIsCreating(false);
        // Mettre à jour aussi dans la liste latérale
        setBriefs((prev) => prev.map((b) => (b.id === id ? data : b)));
      }
    } catch (err) {
      console.error('Erreur lors du rafraîchissement du brief:', err);
    }
  };

  const handleBriefCreated = (newBrief: Brief) => {
    setActiveBrief(newBrief);
    setIsCreating(false);
    fetchBriefs();
  };

  const handleGenerateDocs = async () => {
    if (!activeBrief) return;
    setGenLoading(true);
    setGenError(null);

    const docTypes = ['agent', 'architecture', 'changelog', 'task'];
    const docLabels: Record<string, string> = {
      agent: 'AGENT.md',
      architecture: 'ARCHITECTURE.md',
      changelog: 'CHANGELOG.md',
      task: 'TASK.md',
    };

    try {
      for (const docType of docTypes) {
        setGenStatus(`Rédaction de ${docLabels[docType]}...`);
        const res = await fetch('/api/docs/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ briefId: activeBrief.id, docType }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Erreur lors de la génération de ${docLabels[docType]}`);
        }
      }

      await refreshActiveBrief(activeBrief.id);
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'Erreur lors de la génération.');
    } finally {
      setGenLoading(false);
      setGenStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-0.5 text-[10px] font-semibold rounded-full border ';
    switch (status) {
      case 'draft':
        return base + 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800';
      case 'clarifying':
        return base + 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
      case 'ready':
        return base + 'bg-emerald-50 text-emerald-750 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'tickets_created':
        return base + 'bg-blue-50 text-blue-750 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      default:
        return base + 'bg-zinc-150 text-zinc-700 border-zinc-250';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'clarifying':
        return 'Clarification';
      case 'ready':
        return 'Prêt';
      case 'tickets_created':
        return 'Issues exportées';
      default:
        return status;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'email': return '✉️ Email';
      case 'slack': return '💬 Slack';
      case 'note': return '📝 Note';
      case 'manual':
      default: return '👤 Manuel';
    }
  };

  // Déterminer si le backlog est entièrement validé (pour afficher le bouton de génération)
  const isBacklogFullyValidated = activeBrief 
    ? activeBrief.backlogItems.length > 0 && activeBrief.backlogItems.every(i => i.status === 'validated')
    : false;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* 1. Sidebar latérale */}
      <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Agent Smith
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Cadrage automatique de briefs
            </p>
          </div>
          <button
            onClick={() => {
              setActiveBrief(null);
              setIsCreating(true);
            }}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg text-xs font-semibold shadow-xs"
            title="Nouveau brief"
          >
            ＋
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 mb-3 px-1">
            Briefs récents
          </h2>

          {loadingList ? (
            <div className="text-center py-6 text-xs text-zinc-455">Chargement...</div>
          ) : briefs.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-650 text-center py-6">
              Aucun brief enregistré.
            </p>
          ) : (
            <div className="space-y-1.5">
              {briefs.map((b) => {
                const isSelected = activeBrief?.id === b.id && !isCreating;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBrief(b);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-950 text-white dark:bg-zinc-900 dark:border-zinc-800'
                        : 'bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full gap-2">
                      <span className="font-semibold truncate flex-1">
                        {b.content.substring(0, 35)}...
                      </span>
                      <span className={getStatusBadge(b.status)}>
                        {getStatusLabel(b.status)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center w-full text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span>{getSourceLabel(b.source)}</span>
                      <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* 2. Zone principale */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-8">
          {isCreating ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Analyser un nouveau brief brut
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Collez un message Slack, un e-mail ou une note. Agent Smith posera des questions si le brief manque de clarté ou proposera directement un découpage technique estimé.
                </p>
              </div>
              <BriefForm onSuccess={handleBriefCreated} />
            </div>
          ) : activeBrief ? (
            <div className="space-y-8 pb-12">
              {/* En-tête du Brief Actif */}
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-850 px-2 py-1 rounded-md font-semibold text-zinc-700 dark:text-zinc-300">
                      ID : {activeBrief.id}
                    </span>
                    <span className={getStatusBadge(activeBrief.status)}>
                      {getStatusLabel(activeBrief.status)}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {getSourceLabel(activeBrief.source)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-mono bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-150 dark:border-zinc-800/80 max-h-32 overflow-y-auto whitespace-pre-wrap select-text">
                    {activeBrief.content}
                  </div>
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg text-xs font-semibold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Fermer
                </button>
              </div>

              {/* SECTION 1 : CLARIFICATIONS (si applicable) */}
              {activeBrief.clarifications.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Clarifications
                  </h3>
                  <ClarificationsList
                    briefId={activeBrief.id}
                    clarifications={activeBrief.clarifications}
                    onSuccess={() => refreshActiveBrief(activeBrief.id)}
                  />
                </div>
              )}

              {/* SECTION 2 : BACKLOG TECHNIQUE (si applicable) */}
              {activeBrief.backlogItems.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Découpage & Estimation
                  </h3>
                  <BacklogView
                    briefId={activeBrief.id}
                    items={activeBrief.backlogItems}
                    onItemValidated={() => refreshActiveBrief(activeBrief.id)}
                  />
                </div>
              )}

              {/* SECTION 3 : ACTIONS SPÉCIFIQUES BACKLOG VALIDÉ */}
              {activeBrief.backlogItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Bouton Export GitHub */}
                  <CreateIssuesButton
                    briefId={activeBrief.id}
                    items={activeBrief.backlogItems}
                    onIssuesCreated={() => refreshActiveBrief(activeBrief.id)}
                  />

                  {/* Section Génération des documents */}
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[160px] space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        Documentation de Référence
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Générez ou mettez à jour les documents projet (AGENT.md, ARCHITECTURE.md, etc.) une fois le backlog entièrement validé.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={handleGenerateDocs}
                        disabled={genLoading || !isBacklogFullyValidated}
                        className="w-full px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-sm rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-zinc-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {genLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {genStatus || 'Génération...'}
                          </>
                        ) : !isBacklogFullyValidated ? (
                          'Validez tout le backlog pour générer'
                        ) : (
                          'Générer les Documents Projet'
                        )}
                      </button>
                      
                      {genError && (
                        <p className="text-xs text-red-650 dark:text-red-400">{genError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4 : VISUALISATION DES DOCUMENTS PROJET GÉNÉRÉS */}
              {activeBrief.backlogItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Documents Projet
                  </h3>
                  <GeneratedDocsView
                    briefId={activeBrief.id}
                    docs={activeBrief.generatedDocs}
                    onDocGenerated={() => refreshActiveBrief(activeBrief.id)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Sélectionnez un brief dans la barre latérale ou créez-en un nouveau.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
