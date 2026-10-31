# Performance Lessons & Optimizations

## Playwright Parser Optimization
- Replaced multiple array traversals (`.filter` and `.reduce` chained methods) with a single `for` loop to accumulate test statistics (`passed`, `failed`, `skipped`, `duration`).
- **Why**: Chained higher-order array methods (like `.filter()`) create intermediate arrays and incur significant O(N) penalties per call. Consolidating logic into a single pass reduces CPU overhead and avoids unnecessary memory allocations during massive JSON ingestions.

### Template Replacements
When replacing multiple placeholders in a large string template (like an HTML report), avoid using a global `replace()` sequentially for each placeholder. If there are `N` placeholders and the string length is `L`, sequential replacements result in a time complexity of `O(N * L)`. Instead, map the placeholder keys and do a single regex replacement `template.replace(/__[A-Z0-9_]+__/g, (match) => map[match] ?? match)`. This reduces the complexity to `O(L)`.

- When recursively traversing a tree structure (like Playwright test suites) to collect rows or nodes, pass an accumulator array by reference instead of allocating and returning new arrays combined with `Array.prototype.concat()`. This prevents O(N^2) array copying overhead and reduces GC pressure significantly for deep/wide trees.
- In hot parsing loops, prefer standard `for...of` loops over functional array methods like `.reduce()`, `.some()`, or `.every()` to avoid callback invocation and closure allocation overhead.
