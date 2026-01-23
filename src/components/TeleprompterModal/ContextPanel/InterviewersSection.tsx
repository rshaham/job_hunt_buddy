import { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import type { Contact } from '../../../types';
import { ContextSection } from './ContextSection';
import { parseInterviewerIntel, hasIntelContent } from './intelParser';

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

  if (contactsWithIntel.length === 0) {
    return null;
  }

  return (
    <ContextSection
      title="Interviewers"
      icon={<Users className="w-4 h-4" />}
      defaultExpanded={true}
    >
      <div className="space-y-2">
        {contactsWithIntel.map((contact) => (
          <InterviewerCard
            key={contact.id}
            contact={contact}
            addedKeywords={addedKeywords}
            onAddKeyword={onAddKeyword}
          />
        ))}
      </div>
    </ContextSection>
  );
}

interface InterviewerCardProps {
  contact: Contact;
  addedKeywords: Set<string>;
  onAddKeyword: (text: string) => void;
}

function InterviewerCard({
  contact,
  addedKeywords,
  onAddKeyword,
}: InterviewerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const intel = parseInterviewerIntel(contact.interviewerIntel);
  const hasContent = hasIntelContent(intel);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="bg-surface-raised rounded border border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-surface transition-colors"
      >
        <div className="flex-1 text-left">
          <p className="text-xs font-medium text-foreground">{contact.name}</p>
          {contact.role && (
            <p className="text-xs text-foreground-muted truncate">{contact.role}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-foreground-muted transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-border pt-2">
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
        </div>
      )}
    </div>
  );
}
