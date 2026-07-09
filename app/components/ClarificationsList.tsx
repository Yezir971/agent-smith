'use client';

import React, { useState } from 'react';

export interface Clarification {
  id: string;
  question: string;
  answer?: string | null;
  answeredAt?: string | Date | null;
}

interface ClarificationsListProps {
  briefId: string;
  clarifications: Clarification[];
  onSuccess?: (updatedBrief: any) => void;
}

export default function ClarificationsList({
  briefId,
  clarifications,
  onSuccess,
}: ClarificationsListProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Séparer les clarifications répondues des non-répondues
  const unanswered = clarifications.filter((c) => !c.answer);
  const answered = clarifications.filter((c) => !!c.answer);

  const handleAnswerChange = (id: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Préparation des réponses non vides
    const answersToSubmit = Object.entries(answers)
      .filter(([_, text]) => text.trim() !== '')
      .map(([clarificationId, answer]) => ({
        clarificationId,
        answer: answer.trim(),
      }));

    if (answersToSubmit.length === 0) {
      setError('Veuillez répondre à au moins une question de clarification.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/analyze/${briefId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answersToSubmit),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la soumission des réponses.');
      }

      // Réinitialiser les champs locaux
      setAnswers({});
      
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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. Questions non répondues (Formulaire) */}
      {unanswered.length > 0 ? (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Questions de clarification requises
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
            L'agent a identifié des points ambigus ou manquants dans le brief. Veuillez y répondre pour continuer.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {unanswered.map((c, idx) => (
              <div key={c.id} className="space-y-2 border-b border-zinc-100 dark:border-zinc-900 pb-4 last:border-0 last:pb-0">
                <label 
                  htmlFor={`answer-${c.id}`}
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-700 rounded-full">
                    {idx + 1}
                  </span>
                  {c.question}
                </label>
                <textarea
                  id={`answer-${c.id}`}
                  rows={3}
                  className="w-full px-3.5 py-2 text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-hidden focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-300 focus:border-transparent text-sm transition-all resize-y"
                  placeholder="Saisissez votre réponse..."
                  value={answers[c.id] || ''}
                  onChange={(e) => handleAnswerChange(c.id, e.target.value)}
                  disabled={loading}
                />
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              {error ? (
                <p className="text-xs text-red-600 dark:text-red-400 max-w-xs">{error}</p>
              ) : (
                <div />
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-medium text-sm rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:focus:ring-zinc-400 dark:focus:ring-offset-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Soumission...
                  </>
                ) : (
                  'Envoyer les réponses'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* 2. Questions déjà répondues (Historique en lecture seule) */}
      {answered.length > 0 ? (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Historique des clarifications apportées
          </h4>
          <div className="space-y-4">
            {answered.map((c) => (
              <div key={c.id} className="text-sm space-y-1.5 border-l-2 border-zinc-300 dark:border-zinc-700 pl-4">
                <p className="font-medium text-zinc-900 dark:text-zinc-200">
                  Q : {c.question}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-800">
                  R : {c.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
