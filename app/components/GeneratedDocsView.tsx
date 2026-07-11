'use client';

import React, { useState, useEffect } from 'react';

export interface GeneratedDoc {
  id: string;
  docType: string; // 'agent' | 'architecture' | 'changelog' | 'task'
  content: string;
  createdAt?: string | Date;
}

interface GeneratedDocsViewProps {
  briefId: string;
  docs: GeneratedDoc[];
  onDocGenerated?: () => void;
}

const DOC_CONFIGS: Record<string, { filename: string; title: string }> = {
  agent: { filename: 'AGENT.md', title: 'Spécification de l\'Agent' },
  architecture: { filename: 'ARCHITECTURE.md', title: 'Documentation Architecture' },
  changelog: { filename: 'CHANGELOG.md', title: 'Journal des Modifications' },
  task: { filename: 'TASK.md', title: 'Backlog & Plan d\'Action' },
};

export default function GeneratedDocsView({
  briefId,
  docs,
  onDocGenerated,
}: GeneratedDocsViewProps) {
  const availableTypes = docs.map((d) => d.docType);
  const [activeTab, setActiveTab] = useState<string>('agent');
  const [copied, setCopied] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = docs.find((d) => d.docType === activeTab);
  const config = DOC_CONFIGS[activeTab] || { filename: `${activeTab}.md`, title: activeTab };

  const handleDownload = (doc: GeneratedDoc) => {
    const filename = DOC_CONFIGS[doc.docType]?.filename || `${doc.docType}.md`;
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie :', err);
    }
  };

  const handleGenerate = async (type: string) => {
    setError(null);
    setGeneratingType(type);

    try {
      const res = await fetch('/api/docs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefId,
          docType: type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du document.');
      }

      if (onDocGenerated) {
        onDocGenerated();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la communication avec le serveur.');
    } finally {
      setGeneratingType(null);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      {/* 1. Barre d'onglets */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto bg-zinc-50/50 dark:bg-zinc-900/20">
        {Object.entries(DOC_CONFIGS).map(([type, cfg]) => {
          const exists = availableTypes.includes(type);
          const isActive = activeTab === type;
          
          return (
            <button
              key={type}
              onClick={() => {
                setActiveTab(type);
                setError(null);
              }}
              className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all focus:outline-hidden ${
                isActive
                  ? 'border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
              }`}
            >
              {cfg.filename}
              {!exists && (
                <span className="ml-1.5 px-1 py-0.5 text-[9px] font-normal bg-zinc-100 dark:bg-zinc-900 text-zinc-450 dark:text-zinc-650 rounded-sm">
                  vide
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Contenu de l'onglet actif */}
      {activeDoc ? (
        <div className="p-5 space-y-4">
          {/* Actions header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-100 dark:border-zinc-900 pb-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {config.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Aperçu et téléchargement de la spécification au format Markdown.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Bouton Regénérer */}
              <button
                onClick={() => handleGenerate(activeTab)}
                disabled={generatingType !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              >
                {generatingType === activeTab ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Regénération...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Regénérer
                  </>
                )}
              </button>

              {/* Bouton Copier */}
              <button
                onClick={() => handleCopy(activeDoc.content)}
                disabled={generatingType !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Copié
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
                    </svg>
                    Copier
                  </>
                )}
              </button>

              {/* Bouton Télécharger */}
              <button
                onClick={() => handleDownload(activeDoc)}
                disabled={generatingType !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg text-xs font-medium transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Télécharger
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Prévisualisation */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap select-text max-h-[500px]">
              {activeDoc.content}
            </pre>
          </div>
        </div>
      ) : (
        /* Document non encore généré (Affichage vide avec bouton de génération) */
        <div className="p-10 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 dark:text-zinc-650 border border-zinc-200 dark:border-zinc-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Document non encore rédigé
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Le fichier <strong>{config.filename}</strong> n'a pas encore été généré par l'agent.
            </p>
          </div>
          
          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={generatingType !== null}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 mx-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingType === activeTab ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Rédaction en cours...
              </>
            ) : (
              `Rédiger ${config.filename}`
            )}
          </button>

          {error && (
            <p className="text-xs text-red-650 dark:text-red-400 mt-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
