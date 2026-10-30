# Performance Lessons & Optimizations

## Playwright Parser Optimization
- Replaced multiple array traversals (`.filter` and `.reduce` chained methods) with a single `for` loop to accumulate test statistics (`passed`, `failed`, `skipped`, `duration`).
- **Why**: Chained higher-order array methods (like `.filter()`) create intermediate arrays and incur significant O(N) penalties per call. Consolidating logic into a single pass reduces CPU overhead and avoids unnecessary memory allocations during massive JSON ingestions.
\n- Optimizing string replacement with multiple placeholders over a large string should be done in a single pass instead of multiple passes (e.g., replace (N \cdot M)$ string interpolation logic with (N + M)$ map lookup within a single `String.prototype.replace` invocation).
