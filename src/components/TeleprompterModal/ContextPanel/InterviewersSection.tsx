import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import type { Contact } from '../../../types';
import { ContextSection } from './ContextSection';
import { parseInterviewerIntel, hasIntelContent, type ParsedIntel } from './intelParser';

interface InterviewersSectionProps {
  contacts: Contact[];
  addedKeywords: Set<string>;
  onAddKeyword: (text: string) => void;
}

/**
 * Shows contacts with interviewer intel.
 * Parses the markdown intel to show values, talking points, and questions.
 */
export function InterviewersSection({
  contacts,
  addedKeywords,
  onAddKeyword,
}: InterviewersSectionProps) {
  // Filter to only contacts with intel
  const contactsWithIntel = contacts.filter(c => c.interviewerIntel);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Initialize to first contact or reset if selected contact no longer exists
  useEffect(() => {
    if (contactsWithIntel.length === 0) {
      setSelectedContactId(null);
      return;
    }

    const selectedStillExists = contactsWithIntel.some(c => c.id === selectedContactId);
    if (!selectedContactId || !selectedStillExists) {
      setSelectedContactId(contactsWithIntel[0].id);
    }
  }, [contactsWithIntel, selectedContactId]);

  if (contactsWithIntel.length === 0) {
    return null;
  }

  const selectedContact = contactsWithIntel.find(c => c.id === selectedContactId);
  const intel = selectedContact ? parseInterviewerIntel(selectedContact.interviewerIntel) : null;

  return (
    <ContextSection
      title="Interviewers"
      icon={<Users className="w-4 h-4" />}
      defaultExpanded={true}
    >
      <div className="space-y-3">
        {/* Contact selector - full width select for multiple, simple text for single */}
        {contactsWithIntel.length > 1 ? (
          <select
            value={selectedContactId || ''}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full text-xs bg-surface-raised border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {contactsWithIntel.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.name}{contact.role ? ` — ${contact.role}` : ''}
              </option>
            ))}
          </select>
        ) : selectedContact && (
          <div className="text-xs">
            <span className="font-medium text-foreground">{selectedContact.name}</span>
            {selectedContact.role && (
              <span className="text-foreground-muted ml-1.5">— {selectedContact.role}</span>
            )}
          </div>
        )}

        {/* Intel content - shown directly */}
        {intel && hasIntelContent(intel) && (
          <InterviewerIntelContent
            intel={intel}
            addedKeywords={addedKeywords}
            onAddKeyword={onAddKeyword}
          />
        )}
      </div>
    </ContextSection>
  );
}

interface InterviewerIntelContentProps {
  intel: ParsedIntel;
  addedKeywords: Set<string>;
  onAddKeyword: (text: string) => void;
}

/**
 * Displays the parsed interviewer intel content directly.
 * Shows communication style as text, values as chips, talking points as buttons,
 * questions as a list, and common ground as chips.
 */
function InterviewerIntelContent({
  intel,
  addedKeywords,
  onAddKeyword,
}: InterviewerIntelContentProps) {
  return (
    <div className="space-y-3 pt-2">
      {/* Communication Style */}
      {intel.communicationStyle && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Communication Style</p>
          <p className="text-xs text-foreground leading-relaxed">
            {intel.communicationStyle.length > 150
              ? intel.communicationStyle.slice(0, 150) + '...'
              : intel.communicationStyle}
          </p>
        </div>
      )}

      {/* What They Value */}
      {intel.whatTheyValue.length > 0 && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Values</p>
          <div className="flex flex-wrap gap-1">
            {intel.whatTheyValue.slice(0, 4).map((item, idx) => {
              const isAdded = addedKeywords.has(item.toLowerCase());
              return (
                <button
                  key={`value-${idx}`}
                  onClick={() => !isAdded && onAddKeyword(item)}
                  disabled={isAdded}
                  title={item}
                  className={cn(
                    'px-1.5 py-0.5 text-xs rounded transition-colors',
                    isAdded
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-600 cursor-default'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  )}
                >
                  {item.length > 25 ? item.slice(0, 25) + '...' : item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Talking Points */}
      {intel.talkingPoints.length > 0 && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Talking Points</p>
          <div className="space-y-1">
            {intel.talkingPoints.slice(0, 3).map((item, idx) => {
              const isAdded = addedKeywords.has(item.toLowerCase());
              return (
                <button
                  key={`talking-${idx}`}
                  onClick={() => !isAdded && onAddKeyword(item)}
                  disabled={isAdded}
                  className={cn(
                    'w-full text-left px-2 py-1 text-xs rounded transition-colors',
                    isAdded
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-600 cursor-default'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  )}
                >
                  {item.length > 60 ? item.slice(0, 60) + '...' : item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions to Ask */}
      {intel.questionsToAsk.length > 0 && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Questions to Ask</p>
          <ul className="text-xs text-foreground-muted space-y-0.5 pl-2">
            {intel.questionsToAsk.slice(0, 3).map((q, idx) => (
              <li key={`q-${idx}`} className="truncate" title={q}>
                • {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Ground */}
      {intel.commonGround.length > 0 && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Common Ground</p>
          <div className="flex flex-wrap gap-1">
            {intel.commonGround.slice(0, 3).map((item, idx) => {
              const isAdded = addedKeywords.has(item.toLowerCase());
              return (
                <button
                  key={`ground-${idx}`}
                  onClick={() => !isAdded && onAddKeyword(item)}
                  disabled={isAdded}
                  title={item}
                  className={cn(
                    'px-1.5 py-0.5 text-xs rounded transition-colors',
                    isAdded
                      ? 'bg-green-100/50 dark:bg-green-900/20 text-green-400 dark:text-green-600 cursor-default'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                  )}
                >
                  {item.length > 30 ? item.slice(0, 30) + '...' : item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Red Flags to Avoid */}
      {intel.redFlags.length > 0 && (
        <div>
          <p className="text-xs text-foreground-muted mb-1">Avoid</p>
          <div className="flex flex-wrap gap-1">
            {intel.redFlags.slice(0, 3).map((item, idx) => (
              <span
                key={`redflag-${idx}`}
                title={item}
                className="px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              >
                {item.length > 30 ? item.slice(0, 30) + '...' : item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
