import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MDEditor from '@uiw/react-md-editor';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  FileText,
} from 'lucide-react';
import { Button, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateId } from '../../utils/helpers';
import { format } from 'date-fns';
import type { Job, Note } from '../../types';

interface NotesTabProps {
  job: Job;
}

// Markdown renderer for notes
function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-3 mb-1.5 text-slate-800 dark:text-slate-200 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold mt-3 mb-1 text-slate-800 dark:text-slate-200 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium mt-2 mb-1 text-slate-700 dark:text-slate-300">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800 dark:text-slate-200">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
          hr: () => <hr className="my-2 border-slate-200 dark:border-slate-700" />,
          table: ({ children }) => (
            <table className="min-w-full border-collapse my-2">{children}</table>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-700">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-slate-200 dark:border-slate-600">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Note templates for quick entry
const noteTemplates = [
  { label: 'Call Notes', icon: '📞', template: '## Call Notes\n\nDate: \nWith: \n\n### Key Points\n- \n\n### Action Items\n- ' },
  { label: 'Research', icon: '🔍', template: '## Research Notes\n\n### Company Info\n- \n\n### Team/Culture\n- ' },
  { label: 'Follow-up', icon: '✅', template: '## Follow-up\n\nAction: \nDeadline: \n\nDetails:\n' },
];

export function NotesTab({ job }: NotesTabProps) {
  const { updateJob, settings } = useAppStore();

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Delete confirmation state
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Notes handlers
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: generateId(),
      content: newNote.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await updateJob(job.id, { notes: [...job.notes, note] });
    setNewNote('');
  };

  const handleUpdateNote = async (noteId: string) => {
    const updatedNotes = job.notes.map((note) =>
      note.id === noteId
        ? { ...note, content: editingNoteContent, updatedAt: new Date() }
        : note
    );
    await updateJob(job.id, { notes: updatedNotes });
    setEditingNoteId(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    await updateJob(job.id, { notes: job.notes.filter((n) => n.id !== noteId) });
  };

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Notes</h3>
      </div>

      {/* Unified Notes Input Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800/30 overflow-hidden mb-4 shadow-sm">
        {/* Template buttons inside the card */}
        <div className="flex gap-2 px-3 pt-3 flex-wrap">
          {noteTemplates.map((t) => (
            <button
              type="button"
              key={t.label}
              onClick={() => setNewNote(t.template)}
              className="text-xs px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full transition-colors flex items-center gap-1"
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Markdown Editor */}
        <div className="p-3" data-color-mode={settings.theme}>
          <MDEditor
            value={newNote}
            onChange={(val) => setNewNote(val || '')}
            preview="live"
            height={150}
            visibleDragbar={true}
            hideToolbar={false}
          />
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {job.notes.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Your notes will appear here</p>
          </div>
        ) : (
          [...job.notes]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((note) => (
              <div
                key={note.id}
                className="p-4 bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-900/10 dark:to-slate-800/50 rounded-xl border border-amber-100 dark:border-amber-800/20 group"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-3" data-color-mode={settings.theme}>
                    <MDEditor
                      value={editingNoteContent}
                      onChange={(val) => setEditingNoteContent(val || '')}
                      preview="live"
                      height={200}
                      visibleDragbar={true}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNoteId(null)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <NoteMarkdown content={note.content} />
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-100 dark:border-amber-800/20">
                      <span className="text-xs text-slate-400">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                        {note.updatedAt > note.createdAt && ' (edited)'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteContent(note.content);
                          }}
                          className="p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded-lg transition-colors"
                          title="Edit note"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteNoteId(note.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        onConfirm={() => {
          if (deleteNoteId) {
            handleDeleteNote(deleteNoteId);
            setDeleteNoteId(null);
          }
        }}
        title="Delete Note"
        message="Delete this note? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
