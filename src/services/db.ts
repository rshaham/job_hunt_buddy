import Dexie, { type Table } from 'dexie';
import { z } from 'zod';
import type { Job, AppSettings, EmbeddingRecord, EmbeddableEntityType, ProviderType, ProviderSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Minimal import validation schema
// We only validate the basic structure - all data passes through as-is
// This ensures new fields are never lost during import/export
const ImportDataSchema = z.object({
  jobs: z.array(z.object({
    id: z.string(),
    company: z.string(),
    title: z.string(),
  }).passthrough()), // Allow all other job fields
  settings: z.object({
    defaultResumeText: z.string(),
    defaultResumeName: z.string(),
    statuses: z.array(z.object({}).passthrough()),
    theme: z.enum(['light', 'dark']),
  }).passthrough(), // Allow all other settings fields
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
// Type for exported settings with API keys stripped from all providers
type ExportedSettings = Omit<AppSettings, 'apiKey' | 'providers'> & {
  providers: Record<ProviderType, Omit<ProviderSettings, 'apiKey'>>;
};

export async function exportData(): Promise<{ jobs: Job[]; settings: ExportedSettings }> {
  const jobs = await getAllJobs();
  const settings = await getSettings();

  // Strip API keys from all providers for security
  const sanitizedProviders = Object.fromEntries(
    Object.entries(settings.providers).map(([key, value]) => [
      key,
      { ...value, apiKey: '' }, // Remove API key
    ])
  ) as unknown as Record<ProviderType, Omit<ProviderSettings, 'apiKey'>>;

  // Remove legacy apiKey field and replace providers with sanitized version
  const { apiKey: _apiKey, providers: _providers, ...rest } = settings;

  return {
    jobs,
    settings: { ...rest, providers: sanitizedProviders },
  };
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
  // Validate imported data against schema (passthrough allows unknown fields)
  const parseResult = ImportDataSchema.safeParse(data);
  if (!parseResult.success) {
    throw new Error(`Invalid import data: ${parseResult.error.message}`);
  }

  const validatedData = parseResult.data;

  // Preserve existing API keys - don't overwrite from import
  const currentSettings = await getSettings();
  const importedSettings = {
    ...validatedData.settings,
    apiKey: currentSettings.apiKey, // Keep legacy API key
    providers: currentSettings.providers, // Keep all provider API keys
  };

  await db.transaction('rw', db.jobs, db.settings, async () => {
    await db.jobs.clear();
    await db.jobs.bulkAdd(validatedData.jobs as unknown as Job[]);
    await saveSettings(importedSettings as unknown as AppSettings);
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
