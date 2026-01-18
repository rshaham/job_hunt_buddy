import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus,
  Trash2,
  Users,
  Mail,
  Linkedin,
  Save,
  Clock,
  Copy,
  Phone,
  Video,
  Send,
  Gift,
  RefreshCw,
  ExternalLink,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Globe,
} from 'lucide-react';
import { Button, Input, ConfirmModal } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { generateId, formatDateOnly } from '../../utils/helpers';
import { analyzeInterviewer, analyzeInterviewerWithWebSearch } from '../../services/ai';
import { isFeatureAvailable } from '../../utils/featureFlags';
import { format } from 'date-fns';
import type { Job, Contact, TimelineEvent } from '../../types';
import type { LucideIcon } from 'lucide-react';

interface ContactsEventsTabProps {
  job: Job;
}

// Markdown renderer for intel content
function IntelMarkdown({ content }: { content: string }) {
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

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

export function ContactsEventsTab({ job }: ContactsEventsTabProps) {
  const { updateJob, settings } = useAppStore();

  // Contact state
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLinkedIn, setContactLinkedIn] = useState('');
  const [contactLinkedInBio, setContactLinkedInBio] = useState('');

  // Edit contact state (separate from add form)
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactRole, setEditContactRole] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactLinkedIn, setEditContactLinkedIn] = useState('');

  // Interviewer intel state
  const [editingBioContactId, setEditingBioContactId] = useState<string | null>(null);
  const [editingBioText, setEditingBioText] = useState('');
  const [analyzingContactId, setAnalyzingContactId] = useState<string | null>(null);
  const [webSearchingContactId, setWebSearchingContactId] = useState<string | null>(null);
  const [expandedIntelContactId, setExpandedIntelContactId] = useState<string | null>(null);

  // Check if web search feature is available
  const webSearchAvailable = isFeatureAvailable('webResearch', settings).available;

  // Events state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventType, setEventType] = useState('Update');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Copy state for feedback
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // Helper function to copy to clipboard
  const copyToClipboard = async (text: string, email: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Contact handlers
  const handleAddContact = async () => {
    if (!contactName.trim()) return;

    const contact: Contact = {
      id: generateId(),
      name: contactName.trim(),
      role: contactRole.trim(),
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      linkedin: contactLinkedIn.trim() || undefined,
      linkedInBio: contactLinkedInBio.trim() || undefined,
    };

    await updateJob(job.id, { contacts: [...job.contacts, contact] });
    setShowContactForm(false);
    setContactName('');
    setContactRole('');
    setContactEmail('');
    setContactPhone('');
    setContactLinkedIn('');
    setContactLinkedInBio('');
  };

  // Start editing a contact
  const handleStartEditContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditContactName(contact.name);
    setEditContactRole(contact.role);
    setEditContactEmail(contact.email || '');
    setEditContactPhone(contact.phone || '');
    setEditContactLinkedIn(contact.linkedin || '');
  };

  // Save edited contact (preserves linkedInBio and interviewerIntel)
  const handleSaveEditContact = async () => {
    if (!editingContactId || !editContactName.trim()) return;

    const updatedContacts = job.contacts.map((c) =>
      c.id === editingContactId
        ? {
            ...c,
            name: editContactName.trim(),
            role: editContactRole.trim(),
            email: editContactEmail.trim() || undefined,
            phone: editContactPhone.trim() || undefined,
            linkedin: editContactLinkedIn.trim() || undefined,
            // Preserve linkedInBio and interviewerIntel
          }
        : c
    );
    await updateJob(job.id, { contacts: updatedContacts });
    setEditingContactId(null);
  };

  const handleCancelEditContact = () => {
    setEditingContactId(null);
    setEditContactName('');
    setEditContactRole('');
    setEditContactEmail('');
    setEditContactPhone('');
    setEditContactLinkedIn('');
  };

  // Update contact's LinkedIn bio
  const handleSaveContactBio = async (contactId: string) => {
    const updatedContacts = job.contacts.map((c) =>
      c.id === contactId
        ? { ...c, linkedInBio: editingBioText.trim() || undefined, interviewerIntel: undefined }
        : c
    );
    await updateJob(job.id, { contacts: updatedContacts });
    setEditingBioContactId(null);
    setEditingBioText('');
  };

  // Analyze interviewer (bio only)
  const handleAnalyzeInterviewer = async (contact: Contact) => {
    if (!contact.linkedInBio) return;

    setAnalyzingContactId(contact.id);
    try {
      const resumeText = job.resumeText || settings.defaultResumeText;
      const intel = await analyzeInterviewer(contact.linkedInBio, job.jdText, resumeText);

      const updatedContacts = job.contacts.map((c) =>
        c.id === contact.id ? { ...c, interviewerIntel: intel } : c
      );
      await updateJob(job.id, { contacts: updatedContacts });
      setExpandedIntelContactId(contact.id);
    } catch (error) {
      console.error('Failed to analyze interviewer:', error);
    } finally {
      setAnalyzingContactId(null);
    }
  };

  // Analyze interviewer with web search for enhanced intel
  const handleAnalyzeWithWebSearch = async (contact: Contact) => {
    setWebSearchingContactId(contact.id);
    try {
      const resumeText = job.resumeText || settings.defaultResumeText;
      const intel = await analyzeInterviewerWithWebSearch(
        {
          name: contact.name,
          role: contact.role,
          linkedin: contact.linkedin,
          linkedInBio: contact.linkedInBio,
        },
        job.company,
        job.jdText,
        resumeText
      );

      const updatedContacts = job.contacts.map((c) =>
        c.id === contact.id ? { ...c, interviewerIntel: intel } : c
      );
      await updateJob(job.id, { contacts: updatedContacts });
      setExpandedIntelContactId(contact.id);
    } catch (error) {
      console.error('Failed to analyze interviewer with web search:', error);
    } finally {
      setWebSearchingContactId(null);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    await updateJob(job.id, { contacts: job.contacts.filter((c) => c.id !== contactId) });
  };

  // Event handlers
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <Input
                placeholder="Phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <Input
              placeholder="LinkedIn URL"
              value={contactLinkedIn}
              onChange={(e) => setContactLinkedIn(e.target.value)}
            />
            <div>
              <label className="text-xs text-muted mb-1 block">LinkedIn Bio (for AI analysis)</label>
              <textarea
                placeholder="Paste their LinkedIn About section or bio here..."
                value={contactLinkedInBio}
                onChange={(e) => setContactLinkedInBio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
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
        <div className="space-y-4">
          {job.contacts.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm text-muted">No contacts yet</p>
              <p className="text-xs text-tertiary mt-1">Track recruiters and hiring managers</p>
            </div>
          ) : (
            job.contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-800/30 group"
              >
                {/* Edit Contact Form */}
                {editingContactId === contact.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Edit Contact</span>
                      <button
                        type="button"
                        onClick={handleCancelEditContact}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                        title="Cancel editing"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name"
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                      />
                      <Input
                        placeholder="Role"
                        value={editContactRole}
                        onChange={(e) => setEditContactRole(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Email"
                        type="email"
                        value={editContactEmail}
                        onChange={(e) => setEditContactEmail(e.target.value)}
                      />
                      <Input
                        placeholder="Phone"
                        type="tel"
                        value={editContactPhone}
                        onChange={(e) => setEditContactPhone(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="LinkedIn URL"
                      value={editContactLinkedIn}
                      onChange={(e) => setEditContactLinkedIn(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEditContact} disabled={!editContactName.trim()}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditContact}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
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
                          <p className="text-sm text-muted">{contact.role}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditContact(contact)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit contact"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteContactId(contact.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">
                          <Mail className="w-3 h-3 text-tertiary" />
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
                              <Copy className="w-3 h-3 text-tertiary" />
                            )}
                          </button>
                        </div>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">{contact.phone}</span>
                        </a>
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

                    {/* LinkedIn Bio Section */}
                    <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/30">
                      {editingBioContactId === contact.id ? (
                        <div className="space-y-2">
                          <label className="text-xs text-muted block">LinkedIn Bio</label>
                          <textarea
                            value={editingBioText}
                            onChange={(e) => setEditingBioText(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={4}
                            placeholder="Paste their LinkedIn About section..."
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveContactBio(contact.id)}>
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingBioContactId(null);
                                setEditingBioText('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : contact.linkedInBio ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted">LinkedIn Bio</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBioContactId(contact.id);
                                setEditingBioText(contact.linkedInBio || '');
                              }}
                              className="text-xs text-blue-500 hover:text-blue-600"
                            >
                              Edit
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {contact.linkedInBio}
                          </p>

                          {/* Analyze Button or Intel Display */}
                          {!contact.interviewerIntel ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleAnalyzeInterviewer(contact)}
                                disabled={analyzingContactId === contact.id || webSearchingContactId === contact.id}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                              >
                                {analyzingContactId === contact.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3" />
                                    Generate Intel
                                  </>
                                )}
                              </button>
                              {webSearchAvailable && (
                                <button
                                  type="button"
                                  onClick={() => handleAnalyzeWithWebSearch(contact)}
                                  disabled={analyzingContactId === contact.id || webSearchingContactId === contact.id}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white rounded-lg transition-colors"
                                  title="Search the web for more information about this person"
                                >
                                  {webSearchingContactId === contact.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Searching...
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="w-3 h-3" />
                                      + Web Search
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIntelContactId(
                                    expandedIntelContactId === contact.id ? null : contact.id
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
                              >
                                <Sparkles className="w-3 h-3" />
                                Interviewer Intel
                                {expandedIntelContactId === contact.id ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>

                              {expandedIntelContactId === contact.id && (
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                  <IntelMarkdown content={contact.interviewerIntel} />
                                  <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => handleAnalyzeInterviewer(contact)}
                                      disabled={analyzingContactId === contact.id || webSearchingContactId === contact.id}
                                      className="flex items-center gap-1 text-xs text-muted hover:text-blue-500"
                                    >
                                      {analyzingContactId === contact.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-3 h-3" />
                                      )}
                                      Re-analyze
                                    </button>
                                    {webSearchAvailable && (
                                      <button
                                        type="button"
                                        onClick={() => handleAnalyzeWithWebSearch(contact)}
                                        disabled={analyzingContactId === contact.id || webSearchingContactId === contact.id}
                                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                                      >
                                        {webSearchingContactId === contact.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Globe className="w-3 h-3" />
                                        )}
                                        + Web Search
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBioContactId(contact.id);
                              setEditingBioText('');
                            }}
                            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add LinkedIn Bio
                          </button>
                          {webSearchAvailable && (
                            <>
                              <span className="text-xs text-tertiary">or</span>
                              <button
                                type="button"
                                onClick={() => handleAnalyzeWithWebSearch(contact)}
                                disabled={webSearchingContactId === contact.id}
                                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                title="Generate intel using web search"
                              >
                                {webSearchingContactId === contact.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Searching...
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-3 h-3" />
                                    Web Search Intel
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Events Section */}
      <section>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Events</h3>
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
              <label className="text-xs text-muted mb-1.5 block">Event Type</label>
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

        {/* Events List */}
        <div>
          {job.timeline.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm text-muted">No events yet</p>
              <p className="text-xs text-tertiary mt-1">Track calls, interviews, and milestones</p>
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
                            <span className="text-xs text-tertiary">
                              {formatDateOnly(event.date)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeleteEventId(event.id)}
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

      {/* Delete Confirmation Modals */}
      <ConfirmModal
        isOpen={deleteContactId !== null}
        onClose={() => setDeleteContactId(null)}
        onConfirm={() => {
          if (deleteContactId) {
            handleDeleteContact(deleteContactId);
            setDeleteContactId(null);
          }
        }}
        title="Delete Contact"
        message={`Delete ${job.contacts.find(c => c.id === deleteContactId)?.name || 'this contact'}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmModal
        isOpen={deleteEventId !== null}
        onClose={() => setDeleteEventId(null)}
        onConfirm={() => {
          if (deleteEventId) {
            handleDeleteEvent(deleteEventId);
            setDeleteEventId(null);
          }
        }}
        title="Delete Event"
        message="Delete this event? This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
