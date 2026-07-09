'use client';

import React, { useState } from 'react';

interface BriefFormProps {
  onSuccess?: (brief: any) => void;
}

export default function BriefForm({ onSuccess }: BriefFormProps) {
  const [briefContent, setBriefContent] = useState('');
  const [source, setSource] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation simple côté client
    if (!briefContent.trim()) {
      setError('Veuillez saisir le contenu du brief.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          briefContent,
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'analyse.");
      }

      // Vider le formulaire après succès
      setBriefContent('');
      
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur de connexion avec le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label 
            htmlFor="briefContent" 
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Contenu du brief brut
          </label>
          <textarea
            id="briefContent"
            rows={8}
            className="w-full px-3.5 py-2.5 text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 focus:border-transparent text-sm transition-all resize-y"
            placeholder="Collez ici le brief client (email, note de réunion, message Slack, etc.)..."
            value={briefContent}
            onChange={(e) => setBriefContent(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label 
              htmlFor="source" 
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Source du brief
            </label>
            <select
              id="source"
              className="w-full px-3.5 py-2.5 text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 focus:border-transparent text-sm transition-all cursor-pointer"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={loading}
            >
              <option value="manual">Saisie manuelle</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="note">Note de réunion</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-sm rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyse en cours...
                </>
              ) : (
                'Lancer l\'analyse'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
