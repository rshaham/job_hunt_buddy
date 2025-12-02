# Embedding System Documentation

This document describes the client-side embedding system used for semantic search in Job Hunt Buddy.

## Overview

The embedding system generates vector representations of text content locally in the browser using [transformers.js](https://huggingface.co/docs/transformers.js). This enables semantic search - finding relevant content based on meaning rather than keyword matching.

### Key Features

- **100% Local**: All embedding generation happens in your browser. No data is sent to external servers.
- **Privacy-Preserving**: Your job data never leaves your machine for embedding purposes.
- **Semantic Search**: Find content by meaning, not just keywords.
- **Background Processing**: Embeddings are generated in a Web Worker to avoid blocking the UI.
- **Lazy Loading**: The model (~40MB) is only downloaded when first needed.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Embeddings Module                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ embeddingStore  │    │embeddingService │    │  vectorStore   │  │
│  │   (Zustand)     │───▶│   (Worker API)  │───▶│  (In-Memory)   │  │
│  │                 │    │                 │    │                │  │
│  │ • UI state      │    │ • Text extract  │    │ • Similarity   │  │
│  │ • Progress      │    │ • Worker comm   │    │ • Cache sync   │  │
│  │ • Actions       │    │ • Batch ops     │    │ • Persistence  │  │
│  └─────────────────┘    └────────┬────────┘    └────────┬───────┘  │
│                                  │                      │          │
│                         ┌────────▼────────┐    ┌────────▼───────┐  │
│                         │embedding.worker │    │    IndexedDB   │  │
│                         │ (Web Worker)    │    │   (Dexie v2)   │  │
│                         │                 │    │                │  │
│                         │ • transformers  │    │ • embeddings   │  │
│                         │ • Model cache   │    │   table        │  │
│                         └─────────────────┘    └────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── workers/
│   ├── workerTypes.ts      # Message protocol types
│   └── embedding.worker.ts # Web Worker for embedding generation
├── services/
│   ├── embeddings/
│   │   ├── index.ts          # Public API exports
│   │   ├── embeddingService.ts # Worker communication & text extraction
│   │   ├── embeddingStore.ts   # Zustand store for UI state
│   │   └── vectorStore.ts      # In-memory cache & similarity search
│   ├── contextRetrieval.ts      # Basic semantic context retrieval
│   ├── smartContextRetrieval.ts # Multi-query context for AI features
│   └── db.ts                 # IndexedDB schema (v2 with embeddings table)
├── components/
│   └── EmbeddingStatus.tsx   # UI component for status display
└── types/
    └── index.ts              # EmbeddingRecord, SimilarityResult types
```

## Entity Types

The following content types are embedded:

| Type | Source | Description |
|------|--------|-------------|
| `job` | `job.jdText` | Job descriptions |
| `story` | `settings.savedStories` | Saved experiences/stories |
| `qa` | `job.qaHistory` | Q&A chat history |
| `note` | `job.notes` | Job notes |
| `doc` | `settings.contextDocuments` | Uploaded context documents |
| `coverLetter` | `job.coverLetter` | Generated cover letters |

## Usage

### Basic Semantic Search

```typescript
import { semanticSearch } from './services/embeddings';

// Search across all indexed content
const results = await semanticSearch('project management experience');

for (const { record, score } of results) {
  console.log(`${record.entityType}:${record.entityId} - ${score.toFixed(3)}`);
}
```

### Find Similar Jobs

```typescript
import { findSimilarJobs } from './services/embeddings';

// Find jobs similar to a given job
const similar = await findSimilarJobs('job-123', 5);

for (const { record, score } of similar) {
  console.log(`Job ${record.entityId} - ${(score * 100).toFixed(1)}% similar`);
}
```

### Search Stories

```typescript
import { searchStories } from './services/embeddings';

// Find relevant stories for a topic
const stories = await searchStories('leadership experience', 3);
```

### Context Retrieval for AI

```typescript
import { buildRelevantContext } from './services/contextRetrieval';

// Get relevant context for an AI prompt
const context = await buildRelevantContext('Tell me about your AWS experience');
// Returns formatted markdown with relevant stories, Q&A, and documents
```

### Smart Context Retrieval (Multi-Query)

For AI features that need more targeted context, use the smart context retrieval system:

```typescript
import { getSmartContext, buildSmartContext } from './services/smartContextRetrieval';

// Simple usage - just get the formatted context string
const context = await getSmartContext({
  job: currentJob,
  feature: 'coverLetter',
  maxStories: 5,
  maxDocuments: 3,
});

// Full usage - get context with metadata
const result = await buildSmartContext({
  job: currentJob,
  feature: 'resumeTailoring',
  resumeAnalysis: analysis, // For tailoring - extracts queries from gaps
  maxStories: 8,
  threshold: 0.35,
});

// result includes:
// - context: formatted string for AI prompt
// - stories: retrieved SavedStory[]
// - documents: retrieved ContextDocument[]
// - usedSemanticSearch: boolean
// - queriesUsed: debug info about queries executed
```

#### Feature Types

The smart retrieval extracts different queries based on feature type:

| Feature | Query Sources | Focus |
|---------|--------------|-------|
| `coverLetter` | Requirements, skills, role | Find experiences to highlight |
| `resumeGrading` | Requirements, skills | Find context for accurate grading |
| `resumeTailoring` | Gaps, missing keywords, suggestions | Find experiences to address weaknesses |
| `interviewPrep` | Role, requirements, skills | Find relevant interview examples |
| `refinement` | User message, requirements | Find context for follow-up requests |

### Agent Tool: Semantic Job Search

The agent can use semantic search to find jobs by meaning:

```typescript
// Agent tool usage (via search_jobs tool)
{
  tool: 'search_jobs',
  input: {
    query: 'remote engineering roles with leadership opportunities',
    useSemanticSearch: true,
    limit: 10
  }
}
// Returns jobs ranked by semantic similarity with scores
```

### React UI State

```typescript
import { useEmbeddingStore } from './services/embeddings';

function MyComponent() {
  const { isReady, isLoading, progress, indexedCount } = useEmbeddingStore();

  return (
    <div>
      {isLoading && <p>Loading model: {progress}%</p>}
      {isReady && <p>{indexedCount} items indexed</p>}
    </div>
  );
}
```

## How It Works

### Initialization Flow

1. App loads data from IndexedDB
2. Embedding system auto-initializes in the background
3. Web Worker is created and loads transformers.js
4. Model is loaded from local `public/models/` directory (~23MB, no network required)
5. Existing embeddings are loaded from IndexedDB into memory
6. Any unindexed content is automatically embedded
7. System is ready for semantic search

### Embedding Flow

1. Content is created/updated (job, story, note, etc.)
2. `appStore` triggers background embedding via `triggerJobEmbedding()`
3. Text is extracted and sent to Web Worker
4. Worker generates 384-dimensional embedding vector
5. Embedding is stored in IndexedDB and in-memory cache
6. Ready for similarity search

### Search Flow

1. Query text is embedded using the worker
2. Cosine similarity is computed against all cached embeddings
3. Results are filtered by threshold and entity type
4. Top K results are returned sorted by similarity

## Model Details

- **Model**: `Xenova/all-MiniLM-L6-v2`
- **Size**: ~23MB (quantized ONNX)
- **Dimensions**: 384
- **Max Input Length**: 512 tokens (~300 words per chunk)
- **Location**: Bundled locally in `public/models/` (no CDN download required)
- **Auto-initialization**: Model loads automatically when app starts

## Adding New Embeddable Types

To add a new type of content for embedding:

1. **Add type to `EmbeddableEntityType`** in `types/index.ts`:
   ```typescript
   export type EmbeddableEntityType =
     | 'job'
     | 'story'
     | 'yourNewType';  // Add here
   ```

2. **Add text extraction** in `embeddingService.ts`:
   ```typescript
   export function extractYourNewTypeText(item: YourType): string {
     return `${item.title}\n\n${item.content}`;
   }
   ```

3. **Add indexing trigger** in `appStore.ts`:
   ```typescript
   addYourNewType: async (data) => {
     // ... save to DB
     triggerYourNewTypeEmbedding(item);
   }
   ```

4. **Update `indexAll()`** in `embeddingService.ts` to include the new type.

## Performance Considerations

- **Memory**: ~100KB per 100 embeddings (384 floats each)
- **Indexing Speed**: ~50-100 items/minute on average hardware
- **Search Speed**: <10ms for 1000 embeddings (in-memory cosine similarity)
- **Model Load**: ~5-10 seconds on first load (after cached: <1 second)

## Fallback Behavior

When embeddings are not available (model not loaded, error state), the system falls back to:

- Returning most recent items instead of semantically relevant ones
- Using all context instead of filtered context
- Graceful degradation without user-visible errors

## Troubleshooting

### Model Download Fails
- Check network connection
- Try refreshing the page
- Model is cached, so subsequent loads should work offline

### Embeddings Not Generating
- Check browser console for errors
- Verify Web Worker is running (check Network tab)
- Try "Reindex All" from the status dropdown

### Search Returns No Results
- Ensure embeddings exist (check indexed count)
- Lower the similarity threshold
- Try more specific queries
