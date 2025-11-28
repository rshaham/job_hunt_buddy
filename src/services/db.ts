import Dexie, { type Table } from 'dexie';
import type { Job, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export class JobHuntDB extends Dexie {
  jobs!: Table<Job, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('JobHuntBuddy');

    this.version(1).stores({
      jobs: 'id, company, title, status, dateAdded, lastUpdated',
      settings: 'id',
    });
  }
}

export const db = new JobHuntDB();

// Jobs CRUD operations
export async function getAllJobs(): Promise<Job[]> {
  return await db.jobs.toArray();
}

export async function getJob(id: string): Promise<Job | undefined> {
  return await db.jobs.get(id);
}

export async function createJob(job: Job): Promise<string> {
  return await db.jobs.add(job);
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<void> {
  await db.jobs.update(id, { ...updates, lastUpdated: new Date() });
}

export async function deleteJob(id: string): Promise<void> {
  await db.jobs.delete(id);
}

// Settings operations
const SETTINGS_ID = 'app-settings';

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.get(SETTINGS_ID);
  return settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: SETTINGS_ID } as AppSettings & { id: string });
}

// Export/Import
export async function exportData(): Promise<{ jobs: Job[]; settings: AppSettings }> {
  const jobs = await getAllJobs();
  const settings = await getSettings();
  return { jobs, settings };
}

export async function importData(data: { jobs: Job[]; settings: AppSettings }): Promise<void> {
  await db.transaction('rw', db.jobs, db.settings, async () => {
    await db.jobs.clear();
    await db.jobs.bulkAdd(data.jobs);
    await saveSettings(data.settings);
  });
}
