import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, X } from 'lucide-react';
import { NotebookNote, PlayerRole } from '../types/game';

interface NotebookModalProps {
  notes: NotebookNote[];
  role: PlayerRole;
  playerName: string;
  onAddNote: (text: string) => void;
  onDeleteNote: (noteId: string) => void;
  onClose: () => void;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  notes,
  role,
  playerName,
  onAddNote,
  onDeleteNote,
  onClose,
}) => {
  const [draft, setDraft] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (!cleaned) return;
    onAddNote(cleaned);
    setDraft('');
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Особистий блокнот"
    >
      <div
        className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-2xl bg-[#121620] border border-zinc-700/80 shadow-[0_24px_60px_rgba(0,0,0,0.88)] text-zinc-100 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-zinc-800/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg tracking-wide text-zinc-50 uppercase truncate">
                Особистий блокнот
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Ваші приватні нотатки (не видимі партнеру)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            aria-label="Закрити блокнот"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 min-h-[120px]">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 px-4 space-y-1.5">
              <p className="text-sm font-semibold text-zinc-300">Поки що записів немає</p>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Записуйте сюди важливі підказки, цифри або порядок дій.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group flex items-start justify-between gap-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 px-3.5 py-2.5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`font-bold ${
                        note.authorRole === 'p1' ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      {note.authorName}
                    </span>
                    <span className="text-zinc-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono-tech text-zinc-500">
                      {formatTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-100 leading-snug break-words whitespace-pre-wrap">
                    {note.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0"
                  title="Видалити запис"
                  aria-label="Видалити запис"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 border-t border-zinc-800/90 bg-[#0d111a] shrink-0 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Нова нотатка від ${playerName}...`}
              maxLength={140}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:outline-none text-sm text-white placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shrink-0 transition-colors ${
                draft.trim()
                  ? role === 'p1'
                    ? 'bg-rose-500 hover:bg-rose-400 text-zinc-950'
                    : 'bg-sky-500 hover:bg-sky-400 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Додати</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
