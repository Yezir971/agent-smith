'use client';

import React, { useState, useEffect } from 'react';

export interface GeneratedDoc {
  id: string;
  docType: string; // 'agent' | 'architecture' | 'changelog' | 'task'
  content: string;
  createdAt?: string | Date;
}

interface GeneratedDocsViewProps {
  docs: GeneratedDoc[];
}

const DOC_CONFIGS: Record<string, { filename: string; title: string }> = {
  agent: { filename: 'AGENT.md', title: 'Spécification de l\'Agent' },
  architecture: { filename: 'ARCHITECTURE.md', title: 'Documentation Architecture' },
  changelog: { filename: 'CHANGELOG.md', title: 'Journal des Modifications' },
  task: { filename: 'TASK.md', title: 'Backlog & Plan d\'Action' },
};

export default function GeneratedDocsView({ docs }: GeneratedDocsViewProps) {
  const availableTypes = docs.map((d) => d.docType);
  const [activeTab, setActiveTab] = useState<string>('agent');
  const [copied, setCopied] = useState(false);

  // Synchronise l'onglet actif si la liste des documents change
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(activeTab)) {
      setActiveTab(availableTypes[0]);
    }
  }, [docs]);

  if (docs.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun document n'a encore été généré pour ce projet.
        </p>
      </div>
    );
  }

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
              onClick={() => setActiveTab(type)}
              disabled={!exists}
              className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all focus:outline-hidden ${
                isActive
                  ? 'border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-950'
                  : exists
                  ? 'border-transparent text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  : 'border-transparent text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
              }`}
            >
              {cfg.filename}
              {!exists && <span className="ml-1.5 text-[10px] opacity-60">(non généré)</span>}
            </button>
          );
        })}
      </div>

      {/* 2. Contenu du document actif */}
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
              {/* Bouton Copier */}
              <button
                onClick={() => handleCopy(activeDoc.content)}
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-lg text-xs font-medium transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Télécharger
              </button>
            </div>
          </div>

          {/* Prévisualisation */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <pre className="p-4 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap select-text max-h-[500px]">
              {activeDoc.content}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Veuillez sélectionner un document généré.
        </div>
      )}
    </div>
  );
}
