import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import {
  Plus,
  Trash2,
  Users,
  Mail,
  Linkedin,
  Edit2,
  Save,
  X,
  FileText,
  Clock,
  Copy,
  Phone,
  Video,
  Send,
  Gift,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button, Input } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateId } from '../../utils/helpers';
import { format } from 'date-fns';
import type { Job, Contact, Note, TimelineEvent } from '../../types';
import type { LucideIcon } from 'lucide-react';

interface NotesTabProps {
  job: Job;
}

// Markdown renderer for notes
function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-slate-700 dark:text-slate-300">
      <ReactMarkdown
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

// Event types with icons and colors
const eventTypeConfig: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  'Applied': { icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  'Interview': { icon: Video, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  'Call': { icon: Phone, color: 'text-green-500', bgColor: 'bg-green-500' },
  'Email': { icon: Mail, color: 'text-amber-500', bgColor: 'bg-amber-500' },
  'Offer': { icon: Gift, color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
  'Update': { icon: RefreshCw, color: 'text-slate-500', bgColor: 'bg-slate-500' },
};

const eventTypes = [
  { label: 'Call', icon: '📞' },
  { label: 'Email', icon: '📧' },
  { label: 'Interview', icon: '🎥' },
  { label: 'Applied', icon: '📤' },
  { label: 'Offer', icon: '🎁' },
  { label: 'Update', icon: '📝' },
];

export function NotesTab({ job }: NotesTabProps) {
  const { updateJob, settings } = useAppStore();

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Contact state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactLinkedIn, setContactLinkedIn] = useState('');

  // Timeline state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventType, setEventType] = useState('Update');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Copy state for feedback
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Helper function to copy to clipboard
  const copyToClipboard = async (text: string, email: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

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

  // Contact handlers
  const handleAddContact = async () => {
    if (!contactName.trim()) return;

    const contact: Contact = {
      id: generateId(),
      name: contactName.trim(),
      role: contactRole.trim(),
      email: contactEmail.trim() || undefined,
      linkedin: contactLinkedIn.trim() || undefined,
    };

    await updateJob(job.id, { contacts: [...job.contacts, contact] });
    setShowContactForm(false);
    setContactName('');
    setContactRole('');
    setContactEmail('');
    setContactLinkedIn('');
  };

  const handleDeleteContact = async (contactId: string) => {
    await updateJob(job.id, { contacts: job.contacts.filter((c) => c.id !== contactId) });
  };

  // Timeline handlers
  const handleAddEvent = async () => {
    if (!eventDescription.trim()) return;

    const event: TimelineEvent = {
      id: generateId(),
      type: eventType || 'Update',
      description: eventDescription.trim(),
      date: new Date(eventDate),
    };

    await updateJob(job.id, { timeline: [...job.timeline, event] });
    setShowEventForm(false);
    setEventType('Update');
    setEventDescription('');
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDeleteEvent = async (eventId: string) => {
    await updateJob(job.id, { timeline: job.timeline.filter((e) => e.id !== eventId) });
  };

  // Get event config with fallback
  const getEventConfig = (type: string) => {
    return eventTypeConfig[type] || eventTypeConfig['Update'];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Notes Section - Takes 3 columns on large screens */}
      <section className="lg:col-span-3">
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
                            onClick={() => handleDeleteNote(note.id)}
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
      </section>

      {/* Right Column - Contacts and Timeline */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contacts Section */}
        <section>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Contacts</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowContactForm(!showContactForm)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Add Contact Form */}
          {showContactForm && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-4 space-y-3 border border-blue-100 dark:border-blue-800/30">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <Input
                  placeholder="Role"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                />
              </div>
              <Input
                placeholder="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                placeholder="LinkedIn URL"
                value={contactLinkedIn}
                onChange={(e) => setContactLinkedIn(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddContact} disabled={!contactName.trim()}>
                  Add Contact
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowContactForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="space-y-3">
            {job.contacts.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm text-slate-500">No contacts yet</p>
                <p className="text-xs text-slate-400 mt-1">Track recruiters and hiring managers</p>
              </div>
            ) : (
              job.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-3 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-800/30 group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{contact.name}</p>
                          {contact.role && (
                            <p className="text-sm text-slate-500">{contact.role}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>

                      {/* Contact Actions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                              {contact.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.email!, contact.id)}
                              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                              title="Copy email"
                            >
                              {copiedEmail === contact.id ? (
                                <span className="text-green-500 text-xs">✓</span>
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </div>
                        )}
                        {contact.linkedin && (
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <Linkedin className="w-3 h-3 text-blue-500" />
                            <span className="text-blue-600 dark:text-blue-400">LinkedIn</span>
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Timeline Section */}
        <section>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">Timeline</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowEventForm(!showEventForm)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Add Event Form */}
          {showEventForm && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4 space-y-3 border border-purple-100 dark:border-purple-800/30">
              {/* Event Type Quick Select */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Event Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {eventTypes.map((type) => (
                    <button
                      type="button"
                      key={type.label}
                      onClick={() => setEventType(type.label)}
                      className={`text-xs px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                        eventType === type.label
                          ? 'bg-purple-500 text-white'
                          : 'bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <Input
                placeholder="Description (e.g., Phone screen with recruiter)"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddEvent} disabled={!eventDescription.trim()}>
                  Add Event
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEventForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Timeline List */}
          <div>
            {job.timeline.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                <div className="w-10 h-10 mx-auto mb-2 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-sm text-slate-500">No events yet</p>
                <p className="text-xs text-slate-400 mt-1">Track calls, interviews, and milestones</p>
              </div>
            ) : (
              <div className="space-y-0">
                {[...job.timeline]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((event, index, arr) => {
                    const config = getEventConfig(event.type);
                    const Icon = config.icon;
                    const isLast = index === arr.length - 1;

                    return (
                      <div key={event.id} className="flex items-start gap-3 group">
                        {/* Timeline dot and line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          {!isLast && (
                            <div className="w-0.5 flex-1 min-h-[24px] bg-slate-200 dark:bg-slate-700 my-1" />
                          )}
                        </div>

                        {/* Event content */}
                        <div className={`flex-1 ${!isLast ? 'pb-4' : 'pb-0'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                              {event.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {format(new Date(event.date), 'MMM d, yyyy')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete event"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
