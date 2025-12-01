import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import type { Job, AppSettings, EmbeddingRecord, EmbeddableEntityType } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Zod schemas for import validation
const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  email: z.string().optional(),
  linkedin: z.string().optional(),
  notes: z.string().optional(),
});

const NoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const TimelineEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  date: z.coerce.date(),
});

const QAEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  timestamp: z.coerce.date(),
});

const JobSummarySchema = z.object({
  shortDescription: z.string(),
  requirements: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  salary: z.string().optional(),
  jobType: z.enum(['remote', 'hybrid', 'onsite', 'unknown']),
  level: z.string(),
  keySkills: z.array(z.string()),
}).nullable();

const ResumeAnalysisSchema = z.object({
  grade: z.string(),
  matchPercentage: z.number(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  suggestions: z.array(z.string()),
}).nullable();

const JobSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  jdLink: z.string(),
  jdText: z.string(),
  status: z.string(),
  dateAdded: z.coerce.date(),
  lastUpdated: z.coerce.date(),
  resumeText: z.string().optional(),
  summary: JobSummarySchema.optional().nullable(),
  resumeAnalysis: ResumeAnalysisSchema.optional().nullable(),
  coverLetter: z.string().optional().nullable(),
  contacts: z.array(ContactSchema),
  notes: z.array(NoteSchema),
  timeline: z.array(TimelineEventSchema),
  prepMaterials: z.array(z.any()).optional(),
  qaHistory: z.array(QAEntrySchema),
  // Optional fields for tailoring feature
  tailoredResume: z.string().optional(),
  tailoredResumeAnalysis: ResumeAnalysisSchema.optional().nullable(),
  tailoringHistory: z.array(z.any()).optional(),
  tailoringSuggestions: z.array(z.string()).optional(),
  coverLetterHistory: z.array(z.any()).optional(),
});

const StatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
});

const SavedStorySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  createdAt: z.coerce.date(),
});

const SettingsSchema = z.object({
  apiKey: z.string().optional(),
  defaultResumeText: z.string(),
  defaultResumeName: z.string(),
  statuses: z.array(StatusSchema),
  theme: z.enum(['light', 'dark']),
  model: z.string().optional(),
  additionalContext: z.string().optional(),
  savedStories: z.array(SavedStorySchema).optional(),
});

const ImportDataSchema = z.object({
  jobs: z.array(JobSchema),
  settings: SettingsSchema,
});

export class JobHuntDB extends Dexie {
  jobs!: Table<Job, string>;
  settings!: Table<AppSettings, string>;
  embeddings!: Table<EmbeddingRecord, string>;

  constructor() {
    super('JobHuntBuddy');

    // Version 1: Original schema
    this.version(1).stores({
      jobs: 'id, company, title, status, dateAdded, lastUpdated',
      settings: 'id',
    });

    // Version 2: Add embeddings table for semantic search
    // Indexes: id (primary), entityType+entityId (compound for lookups),
    // entityType (for filtering), parentJobId (for job-scoped queries)
    this.version(2).stores({
      jobs: 'id, company, title, status, dateAdded, lastUpdated',
      settings: 'id',
      embeddings: 'id, [entityType+entityId], entityType, parentJobId, createdAt',
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
export async function exportData(): Promise<{ jobs: Job[]; settings: Omit<AppSettings, 'apiKey'> }> {
  const jobs = await getAllJobs();
  const settings = await getSettings();
  // Exclude API key from export for security - users should re-enter their key after import
  const { apiKey: _apiKey, ...settingsWithoutApiKey } = settings;
  return { jobs, settings: settingsWithoutApiKey as Omit<AppSettings, 'apiKey'> };
}

export async function exportJobsAsCSV(): Promise<string> {
  const jobs = await getAllJobs();
  const headers = ['Company', 'Title', 'Status', 'Date Added', 'Match %', 'Grade', 'JD Link'];
  const rows = jobs.map(job => [
    job.company,
    job.title,
    job.status,
    job.dateAdded instanceof Date ? job.dateAdded.toISOString().split('T')[0] : String(job.dateAdded).split('T')[0],
    job.resumeAnalysis?.matchPercentage ?? '',
    job.resumeAnalysis?.grade ?? '',
    job.jdLink,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export async function importData(data: unknown): Promise<void> {
  // Validate imported data against schema
  const parseResult = ImportDataSchema.safeParse(data);
  if (!parseResult.success) {
    throw new Error(`Invalid import data: ${parseResult.error.message}`);
  }

  const validatedData = parseResult.data;

  // Preserve existing API key - don't overwrite from import
  const currentSettings = await getSettings();
  const importedSettings = {
    ...validatedData.settings,
    apiKey: currentSettings.apiKey, // Keep existing API key
  };

  await db.transaction('rw', db.jobs, db.settings, async () => {
    await db.jobs.clear();
    await db.jobs.bulkAdd(validatedData.jobs as Job[]);
    await saveSettings(importedSettings as AppSettings);
  });
}

// Delete all data (for reset/testing)
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.jobs, db.settings, db.embeddings, async () => {
    await db.jobs.clear();
    await db.settings.clear();
    await db.embeddings.clear();
  });
}

// ============================================================================
// Embeddings CRUD Operations
// ============================================================================

/**
 * Generate a composite ID for an embedding record.
 * Format: entityType:entityId[:chunkIndex]
 */
export function generateEmbeddingId(
  entityType: EmbeddableEntityType,
  entityId: string,
  chunkIndex?: number
): string {
  const base = `${entityType}:${entityId}`;
  return chunkIndex !== undefined ? `${base}:${chunkIndex}` : base;
}

/**
 * Get an embedding by its composite ID.
 */
export async function getEmbedding(id: string): Promise<EmbeddingRecord | undefined> {
  return await db.embeddings.get(id);
}

/**
 * Get embedding for a specific entity.
 */
export async function getEmbeddingByEntity(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<EmbeddingRecord | undefined> {
  return await db.embeddings
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .first();
}

/**
 * Get all embeddings for an entity type.
 */
export async function getEmbeddingsByType(
  entityType: EmbeddableEntityType
): Promise<EmbeddingRecord[]> {
  return await db.embeddings.where('entityType').equals(entityType).toArray();
}

/**
 * Get all embeddings for a specific job (including job-scoped content like notes, Q&A).
 */
export async function getEmbeddingsByJob(jobId: string): Promise<EmbeddingRecord[]> {
  // Get both the job embedding itself and related content
  const [jobEmbedding, relatedEmbeddings] = await Promise.all([
    db.embeddings.get(generateEmbeddingId('job', jobId)),
    db.embeddings.where('parentJobId').equals(jobId).toArray(),
  ]);

  const results: EmbeddingRecord[] = [];
  if (jobEmbedding) results.push(jobEmbedding);
  results.push(...relatedEmbeddings);
  return results;
}

/**
 * Get all embeddings from the database.
 */
export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  return await db.embeddings.toArray();
}

/**
 * Save or update an embedding record.
 */
export async function saveEmbedding(record: EmbeddingRecord): Promise<void> {
  await db.embeddings.put(record);
}

/**
 * Save multiple embedding records in a batch.
 */
export async function saveEmbeddings(records: EmbeddingRecord[]): Promise<void> {
  await db.embeddings.bulkPut(records);
}

/**
 * Delete an embedding by ID.
 */
export async function deleteEmbedding(id: string): Promise<void> {
  await db.embeddings.delete(id);
}

/**
 * Delete all embeddings for a specific entity.
 */
export async function deleteEmbeddingsByEntity(
  entityType: EmbeddableEntityType,
  entityId: string
): Promise<void> {
  await db.embeddings
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .delete();
}

/**
 * Delete all embeddings for a job and its related content.
 */
export async function deleteEmbeddingsByJob(jobId: string): Promise<void> {
  await db.transaction('rw', db.embeddings, async () => {
    // Delete job embedding
    await db.embeddings.delete(generateEmbeddingId('job', jobId));
    // Delete all related embeddings (notes, Q&A, cover letter)
    await db.embeddings.where('parentJobId').equals(jobId).delete();
  });
}

/**
 * Clear all embeddings (useful for re-indexing).
 */
export async function clearAllEmbeddings(): Promise<void> {
  await db.embeddings.clear();
}

/**
 * Get count of embeddings.
 */
export async function getEmbeddingsCount(): Promise<number> {
  return await db.embeddings.count();
}
