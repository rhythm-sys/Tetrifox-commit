# AI Usage Documentation

This document describes how AI tools were used during the development of the Parcel Routing System.

## Tools Used

- **Claude Code (Claude Opus 4.6)** — AI pair programming assistant used throughout the project

## How AI Was Used

### 1. Architecture Design

**Prompt summary:** "Design a full production-ready implementation plan for a Parcel Routing System using TypeScript + React."

**What was generated:** A comprehensive architecture plan including project structure, rule engine design, API endpoints, database schema, frontend components, security measures, and testing strategy.

**What I modified and why:**
- Adjusted the rule engine to use `all-matches` as the default evaluation mode instead of `first-match`, so that insurance approval rules and routing rules can both fire for the same parcel
- Changed the rule action schema to use `department` instead of `route` for clearer semantics
- Simplified the batch processing to not use streaming JSON parser (jsonstream2) since in-memory parsing with size limits is sufficient and simpler

### 2. Rule Engine Implementation

**Prompt summary:** "Implement the rule engine with operators registry, condition evaluator, and comprehensive tests."

**What was generated:** The core engine files — operators.ts, condition-evaluator.ts, rule-engine.ts, rule-loader.ts, and test suites.

**What I modified and why:**
- Reviewed and validated the operator implementations, especially edge cases for `between`, `regex`, and `in` operators
- Ensured the condition evaluator handles missing fields gracefully (returns undefined instead of throwing)
- Added the regression protection test to demonstrate that adding new rules doesn't break existing routing

### 3. React Frontend

**Prompt summary:** "Build React pages for routing parcels, batch upload, history, and dashboard."

**What was generated:** Layout component, ParcelForm, ParcelResult, BatchUpload, BatchResults, and all four pages.

**What I modified and why:**
- Reviewed all form validation logic for correctness
- Ensured the batch upload polls for status correctly
- Verified the dashboard metrics display and formatting

## Reflections on AI Limitations

1. **Configuration safety:** AI generated good validation for the rule config format, but I needed to think through the business implications — what happens if someone accidentally disables all routing rules? The Zod schema enforces at least one rule exists, and the hot-reload mechanism keeps the previous config on validation failure.

2. **Edge cases in operators:** The AI initially didn't handle all edge cases (e.g., non-array input to `in` operator, invalid regex patterns). I added defensive checks and tests for these.

3. **Security considerations:** While AI suggested standard security measures (helmet, CORS, rate limiting), I needed to verify the CSP headers wouldn't break the React frontend and that the rate limit values were appropriate for the use case.

4. **Testing strategy:** The AI generated comprehensive tests but I verified each assertion makes semantic sense — tests should verify business requirements, not just code coverage.

## Key Takeaway

AI is an excellent accelerator for boilerplate, standard patterns, and generating comprehensive test cases. But engineering judgment — choosing the right architecture, handling edge cases, understanding business implications, and making security trade-offs — remains a human responsibility. The generated code was always reviewed, tested, and adjusted before being committed.
