import { useState } from 'react';
import {
  Plus,
  Trash2,
  User,
  Mail,
  Linkedin,
  Calendar,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Button, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateId } from '../../utils/helpers';
import { format } from 'date-fns';
import type { Job, Contact, Note, TimelineEvent } from '../../types';

interface NotesTabProps {
  job: Job;
}

export function NotesTab({ job }: NotesTabProps) {
  const { updateJob } = useAppStore();

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
  const [eventType, setEventType] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
      type: eventType.trim() || 'Update',
      description: eventDescription.trim(),
      date: new Date(eventDate),
    };

    await updateJob(job.id, { timeline: [...job.timeline, event] });
    setShowEventForm(false);
    setEventType('');
    setEventDescription('');
    setEventDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDeleteEvent = async (eventId: string) => {
    await updateJob(job.id, { timeline: job.timeline.filter((e) => e.id !== eventId) });
  };

  return (
    <div className="space-y-6">
      {/* Notes Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</h3>
        </div>

        <div className="space-y-2 mb-3">
          {job.notes.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No notes yet</p>
          ) : (
            job.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg group"
              >
                {editingNoteId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      rows={3}
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
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteContent(note.content);
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-danger"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="flex-1"
          />
          <Button onClick={handleAddNote} disabled={!newNote.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Contacts Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Contacts</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowContactForm(!showContactForm)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showContactForm && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <Input
                placeholder="Role (e.g., Recruiter)"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddContact}>
                Add Contact
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowContactForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {job.contacts.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No contacts yet</p>
          ) : (
            job.contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg group"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <Mail className="w-4 h-4 text-slate-400" />
                    </a>
                  )}
                  {contact.linkedin && (
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <Linkedin className="w-4 h-4 text-slate-400" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Timeline Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Timeline</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowEventForm(!showEventForm)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showEventForm && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Event type (e.g., Interview)"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <Input
              placeholder="Description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddEvent}>
                Add Event
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowEventForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {job.timeline.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No events yet</p>
          ) : (
            [...job.timeline]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 group"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{event.type}</span>
                      <span className="text-xs text-slate-400">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </span>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-danger opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  );
}
