---
description: Review AI prompts for consistency and best practices
allowed-tools: Read, Glob
---

## Review Checklist for AI Prompts

Read `src/utils/prompts.ts` and verify:

1. **JSON Format**: All prompts that expect structured output include "Return ONLY valid JSON"
2. **Honesty Guidelines**: Prompts include warnings against fabrication where applicable
3. **Placeholder Syntax**: Variables use `{variable}` syntax consistently
4. **Output Structure**: Each prompt documents the exact JSON structure expected
5. **Error Handling**: Prompts handle edge cases (empty input, missing fields)

Report any inconsistencies or potential improvements.
