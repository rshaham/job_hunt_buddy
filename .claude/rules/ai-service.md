---
paths: src/services/ai.ts, src/utils/prompts.ts
---

# AI Integration Rules

## Prompt Templates (`src/utils/prompts.ts`)

- All prompts expecting structured output must include "Return ONLY valid JSON"
- Document the exact JSON structure expected with example
- Include honesty guidelines where applicable (no fabrication)
- Use `{variable}` syntax for placeholders consistently
- Keep prompts focused on a single task

## API Calls (`src/services/ai.ts`)

- Use `callAI()` function for all Claude API interactions
- Model selection respects user settings via `getModel()`
- Never expose API keys - they're base64 encoded in storage
- Handle API errors gracefully with user-friendly messages
- Implement retry logic for transient failures

## Prompt Structure Pattern

```typescript
export const EXAMPLE_PROMPT = `[Task description]

[Input context with placeholders]
{inputVariable}

[Output requirements]
Return ONLY valid JSON with this exact structure:
{
  "field1": "description",
  "field2": ["item1", "item2"]
}

[Guidelines/constraints]
IMPORTANT:
- Honesty guidelines (if applicable)
- Edge case handling`;
```

## Testing AI Changes

- Test prompts with various input lengths (short, medium, long)
- Verify JSON output can be parsed without errors
- Check edge cases: empty input, special characters, very long text
- Validate output matches expected structure

## Model Selection

```typescript
// Respect user's model preference
const model = getModel(); // Returns user-selected model alias

// Available aliases
'claude-sonnet-4-5'  // Default, balanced
'claude-opus-4-5'    // Most capable, slower
'claude-haiku-4-5'   // Fastest, simpler tasks
```
