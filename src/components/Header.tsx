import React, { useState } from 'react';
import {
  Sparkles,
  GraduationCap,
  Lightbulb,
  Target,
  BookOpen,
  History,
  ChevronDown,
  Layers,
  Palette,
  Check,
  Zap,
} from 'lucide-react';
import { PersonaId, UserStats, ThemeId } from '../types/study';
import { PERSONAS, THEMES } from '../data/constants';

interface HeaderProps {
  currentPersona: PersonaId;
  onSelectPersona: (persona: PersonaId) => void;
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  stats: UserStats;
  onOpenDeck: () => void;
  onOpenHistory: () => void;
  onNewQuestion: () => void;
  totalFlashcards: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  onSelectPersona,
  currentTheme,
  onSelectTheme,
  stats,
  onOpenDeck,
  onOpenHistory,
  onNewQuestion,
  totalFlashcards,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const persona = PERSONAS[currentPersona] || PERSONAS.jarvis;
  const activeTheme = THEMES[currentTheme] || THEMES.cyber;

  const getPersonaIcon = (id: PersonaId) => {
    switch (id) {
      case 'vision':
        return <GraduationCap className="w-4 h-4" />;
      case 'zyro':
        return <Lightbulb className="w-4 h-4" />;
      case 'thala':
        return <Target className="w-4 h-4" />;
      case 'jarvis':
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Zyro */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onNewQuestion}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/30 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
                Zyro<span className="text-cyan-400">.ai</span>
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 shadow-2xs">
                Two-Stage
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Brief Point Breakdowns &bull; Gemini Solutions &bull; Flashcards
            </p>
          </div>
        </div>

        {/* Center/Right: Theme Switcher, Persona Switcher, Deck, History */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowPersonaMenu(false);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-all text-xs font-medium text-slate-300 shadow-sm"
              title="Change App Theme"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <div
                className="w-2.5 h-2.5 rounded-full shadow-xs"
                style={{ backgroundColor: activeTheme.dotColor }}
              />
              <span className="hidden md:inline">{activeTheme.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showThemeMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowThemeMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Theme
                  </div>
                  {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
                    const themeObj = THEMES[tId];
                    const isSelected = tId === currentTheme;
                    return (
                      <button
                        key={tId}
                        onClick={() => {
                          onSelectTheme(tId);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs mb-1 ${
                          isSelected
                            ? 'bg-slate-800 text-white font-semibold ring-1 ring-cyan-500/50'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3 h-3 rounded-full ring-1 ring-white/30"
                            style={{ backgroundColor: themeObj.dotColor }}
                          />
                          <span>{themeObj.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Persona Switcher Dropdown (Jarvis, Zyro, Thala, Vision) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPersonaMenu(!showPersonaMenu);
                setShowThemeMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-all text-xs font-medium text-slate-200 shadow-sm"
              title="Change your Chatbot persona"
            >
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-r ${persona.avatarColor} text-white flex items-center justify-center text-[10px] shadow-xs`}
              >
                {getPersonaIcon(currentPersona)}
              </div>
              <span className="font-bold text-white">{persona.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPersonaMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowPersonaMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Chatbot
                  </div>
                  {(Object.keys(PERSONAS) as PersonaId[]).map((pId) => {
                    const p = PERSONAS[pId];
                    const isSelected = pId === currentPersona;
                    return (
                      <button
                        key={pId}
                        onClick={() => {
                          onSelectPersona(pId);
                          setShowPersonaMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start space-x-3 mb-1 ${
                          isSelected
                            ? 'bg-slate-800 border border-slate-700 shadow-xs'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl bg-gradient-to-br ${p.avatarColor} text-white flex items-center justify-center text-xs shadow-md shrink-0 mt-0.5`}
                        >
                          {getPersonaIcon(pId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-cyan-400 font-medium">
                              {p.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {p.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Deck Button */}
          <button
            onClick={onOpenDeck}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 shadow-sm transition-all"
            title="Review Flashcard Deck"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Deck</span>
            {totalFlashcards > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 text-[10px] font-bold border border-amber-800/60">
                {totalFlashcards}
              </span>
            )}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 shadow-sm transition-all"
            title="View Past Sessions"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Ask New Button */}
          <button
            onClick={onNewQuestion}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${activeTheme.buttonGradient} text-xs font-bold shadow-md transition-all cursor-pointer`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
