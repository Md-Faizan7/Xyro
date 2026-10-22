import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  BrainCircuit,
  Zap,
} from 'lucide-react';
import { Header } from './components/Header';
import { QuestionInput } from './components/QuestionInput';
import { StudySessionView } from './components/StudySessionView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { FlashcardsDeckModal } from './components/FlashcardsDeckModal';
import {
  PersonaId,
  SubjectId,
  AcademicLevel,
  StudyMode,
  SavedSession,
  Flashcard,
  UserStats,
  ThemeId,
} from './types/study';
import { SAMPLE_INITIAL_SESSION, PERSONAS, THEMES } from './data/constants';

const SESSIONS_STORAGE_KEY = 'zyro_study_sessions_v2';
const DECK_STORAGE_KEY = 'zyro_global_deck_v2';
const THEME_STORAGE_KEY = 'zyro_app_theme_v2';

export default function App() {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (storedTheme && THEMES[storedTheme]) return storedTheme;
    } catch (e) {}
    return 'cyber';
  });

  // Load saved sessions from localStorage or default to initial sample
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse stored sessions', e);
    }
    return [SAMPLE_INITIAL_SESSION];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || SAMPLE_INITIAL_SESSION.id;
  });

  const [currentPersona, setCurrentPersona] = useState<PersonaId>('zyro');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals / Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);

  // Global deck of flashcards
  const [globalDeck, setGlobalDeck] = useState<Flashcard[]>(() => {
    try {
      const stored = localStorage.getItem(DECK_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return SAMPLE_INITIAL_SESSION.response.interactiveElements.flashcards.map((f, i) => ({
      id: `sample-card-${i}`,
      front: f.front,
      back: f.back,
      hint: f.hint,
      topic: 'Physics',
      mastered: false,
    }));
  });

  // Sync theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch (e) {}
  }, [currentTheme]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  // Sync deck to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(globalDeck));
    } catch (e) {}
  }, [globalDeck]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];
  const themeObj = THEMES[currentTheme] || THEMES.cyber;

  // Compute live user stats
  const stats: UserStats = {
    questionsAsked: sessions.length,
    quizzesTaken: sessions.filter((s) => s.quizResult).length,
    quizzesCorrect: sessions.filter((s) => s.quizResult?.isCorrect).length,
    flashcardsMastered: globalDeck.filter((c) => c.mastered).length,
    streakDays: 1,
  };

  // Handle asking a new question
  const handleSolveQuestion = async (params: {
    question: string;
    subject: SubjectId;
    level: AcademicLevel;
    persona: PersonaId;
    mode: StudyMode;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(1);

    const timer1 = setTimeout(() => setLoadingStep(2), 1400);
    const timer2 = setTimeout(() => setLoadingStep(3), 2800);

    try {
      const response = await fetch('/api/study/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();

      const newSession: SavedSession = {
        id: `study-${Date.now()}`,
        timestamp: Date.now(),
        question: params.question,
        subject: params.subject,
        level: params.level,
        persona: params.persona,
        mode: params.mode,
        response: data,
        bookmarked: false,
      };

      if (data.interactiveElements?.flashcards) {
        const newCards: Flashcard[] = data.interactiveElements.flashcards.map(
          (fc: any, idx: number) => ({
            id: `card-${Date.now()}-${idx}`,
            front: fc.front,
            back: fc.back,
            hint: fc.hint,
            topic: params.subject,
            mastered: false,
          })
        );
        setGlobalDeck((prev) => [...newCards, ...prev]);
      }

      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setCurrentPersona(params.persona);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to solve question:', err);
      setErrorMessage(
        err.message || 'Something went wrong while communicating with Zyro and Gemini. Please try again.'
      );
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleUpdateSession = (updated: SavedSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSession = (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    setSessions(nextSessions);
    if (currentSessionId === id && nextSessions.length > 0) {
      setCurrentSessionId(nextSessions[0].id);
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your Zyro history?')) {
      setSessions([SAMPLE_INITIAL_SESSION]);
      setCurrentSessionId(SAMPLE_INITIAL_SESSION.id);
    }
  };

  const handleToggleDeckCardMastered = (cardId: string) => {
    setGlobalDeck((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, mastered: !c.mastered } : c))
    );
  };

  // Helper background styling based on theme
  const getThemeBackground = () => {
    switch (currentTheme) {
      case 'midnight':
        return 'bg-zinc-950 text-zinc-100';
      case 'emerald':
        return 'bg-stone-950 text-stone-100';
      case 'sunset':
        return 'bg-neutral-950 text-neutral-100';
      case 'slate':
        return 'bg-slate-900 text-slate-100';
      case 'cyber':
      default:
        return 'bg-slate-950 text-slate-100';
    }
  };

  return (
    <div
      className={`min-h-screen ${getThemeBackground()} flex flex-col font-sans transition-colors selection:bg-cyan-500 selection:text-black`}
    >
      {/* Top Navbar */}
      <Header
        currentPersona={currentPersona}
        onSelectPersona={setCurrentPersona}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        stats={stats}
        onOpenDeck={() => setIsDeckOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewQuestion={() => {
          const el = document.getElementById('question-input-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        totalFlashcards={globalDeck.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start space-x-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Could not complete breakdown:</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING STATE ANIMATION: 2-Stage Point Engine Visualizer */}
        {isLoading && (
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl max-w-2xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center animate-pulse">
              <Zap className="w-8 h-8 fill-current" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">
                Zyro Point Breakdown Engine
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Deconstructing your question into clean, bite-sized bullet points
              </p>
            </div>

            {/* Stepper */}
            <div className="space-y-3 max-w-md mx-auto text-left text-xs">
              <div
                className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                  loadingStep >= 1
                    ? 'border-cyan-500 bg-cyan-950/70 text-cyan-200 font-bold'
                    : 'border-slate-800 opacity-40 text-slate-500'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px] flex items-center justify-center">
                  1
                </div>
                <span>Stage 1: {PERSONAS[currentPersona]?.name || 'Zyro'} distilling key points & mental picture...</span>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                  loadingStep >= 2
                    ? 'border-indigo-500 bg-indigo-950/70 text-indigo-200 font-bold'
                    : 'border-slate-800 opacity-40 text-slate-500'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white font-extrabold text-[10px] flex items-center justify-center">
                  2
                </div>
                <span>Stage 2: Gemini generating concise step-by-step master solution...</span>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                  loadingStep >= 3
                    ? 'border-emerald-500 bg-emerald-950/70 text-emerald-200 font-bold'
                    : 'border-slate-800 opacity-40 text-slate-500'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black font-extrabold text-[10px] flex items-center justify-center">
                  3
                </div>
                <span>Crafting interactive quiz, flashcards & follow-up prompts...</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Study Session */}
        {!isLoading && currentSession && (
          <StudySessionView
            session={currentSession}
            onUpdateSession={handleUpdateSession}
            onSelectPersona={setCurrentPersona}
            currentTheme={currentTheme}
          />
        )}

        {/* Question Input Section */}
        <section id="question-input-section" className="pt-4 max-w-5xl mx-auto">
          <QuestionInput
            onSubmit={handleSolveQuestion}
            isLoading={isLoading}
            selectedPersona={currentPersona}
            onSelectPersona={setCurrentPersona}
            currentTheme={currentTheme}
            isCompact={!!currentSession && !isLoading}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold text-slate-400">
            Zyro &bull; Brief & Informative Point Learning
          </span>
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini 3.8 Flash &bull; Theme: {themeObj.name}
          </span>
        </div>
      </footer>

      {/* Slide-over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
      />

      {/* Global Flashcards Deck Modal */}
      <FlashcardsDeckModal
        isOpen={isDeckOpen}
        onClose={() => setIsDeckOpen(false)}
        cards={globalDeck}
        onToggleMastered={handleToggleDeckCardMastered}
      />
    </div>
  );
}
