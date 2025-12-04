import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { listUpcomingEventsSchema, type ListUpcomingEventsInput } from './schemas';
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns';

interface UpcomingEvent {
  jobId: string;
  company: string;
  jobTitle: string;
  event: {
    type: string;
    description: string;
    date: string;
  };
  daysUntil: number;
  isToday: boolean;
}

interface ListUpcomingEventsResult {
  events: UpcomingEvent[];
  totalUpcoming: number;
  todayCount: number;
  thisWeekCount: number;
}

export const listUpcomingEventsTool: ToolDefinition<ListUpcomingEventsInput, ListUpcomingEventsResult> = {
  name: 'list_upcoming_events',
  description: 'List upcoming timeline events across all jobs (interviews, deadlines, scheduled calls). Shows events in the next X days sorted by date.',
  category: 'read',
  inputSchema: listUpcomingEventsSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListUpcomingEventsResult>> {
    const { jobs } = useAppStore.getState();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = addDays(todayStart, 1);
    const cutoffDate = addDays(now, input.daysAhead || 14);
    const oneWeekAhead = addDays(now, 7);

    const upcomingEvents: UpcomingEvent[] = [];

    for (const job of jobs) {
      const timeline = job.timeline || [];

      for (const event of timeline) {
        const eventDate = new Date(event.date);

        // Only include future events (or today) within the window
        if (isAfter(eventDate, todayStart) && isBefore(eventDate, cutoffDate)) {
          const daysUntil = differenceInDays(eventDate, todayStart);
          const isToday = isAfter(eventDate, todayStart) && isBefore(eventDate, todayEnd);

          upcomingEvents.push({
            jobId: job.id,
            company: job.company,
            jobTitle: job.title,
            event: {
              type: event.type,
              description: event.description,
              date: eventDate.toISOString(),
            },
            daysUntil,
            isToday,
          });
        }
      }
    }

    // Sort by date (soonest first)
    upcomingEvents.sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());

    // Calculate stats
    const todayCount = upcomingEvents.filter((e) => e.isToday).length;
    const thisWeekCount = upcomingEvents.filter((e) => {
      const eventDate = new Date(e.event.date);
      return isBefore(eventDate, oneWeekAhead);
    }).length;

    // Apply limit
    const limitedEvents = upcomingEvents.slice(0, input.limit || 10);

    return {
      success: true,
      data: {
        events: limitedEvents,
        totalUpcoming: upcomingEvents.length,
        todayCount,
        thisWeekCount,
      },
    };
  },
};
