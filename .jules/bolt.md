# Performance Lessons & Optimizations

## Playwright Parser Optimization
- Replaced multiple array traversals (`.filter` and `.reduce` chained methods) with a single `for` loop to accumulate test statistics (`passed`, `failed`, `skipped`, `duration`).
- **Why**: Chained higher-order array methods (like `.filter()`) create intermediate arrays and incur significant O(N) penalties per call. Consolidating logic into a single pass reduces CPU overhead and avoids unnecessary memory allocations during massive JSON ingestions.

### Template Replacements
When replacing multiple placeholders in a large string template (like an HTML report), avoid using a global `replace()` sequentially for each placeholder. If there are `N` placeholders and the string length is `L`, sequential replacements result in a time complexity of `O(N * L)`. Instead, map the placeholder keys and do a single regex replacement `template.replace(/__[A-Z0-9_]+__/g, (match) => map[match] ?? match)`. This reduces the complexity to `O(L)`.

### Recursive Array Aggregations
When recursively extracting items from deeply nested structures (e.g., test suites), pass an accumulator array as an argument to mutate in-place rather than using `.concat()` or `.push(...recursiveCall())`. This prevents O(N^2) memory allocations and reduces garbage collection overhead by avoiding the creation of numerous intermediate arrays.

- When optimizing Playwright parsing (`src/parsers/playwright.parser.ts`), always look for ways to merge array iteration passes (like `.reduce()`, `.some()`, and `.map()` calls) into a single loop to reduce CPU overhead on massive output files.

## Combining Higher-Order Iterations

When processing large JSON payloads (such as deeply nested Playwright test results), avoid chaining multiple array iterations (like `.some()`, `.every()`, or nested `.reduce()`) over the same elements. Instead, write a single O(N) standard `for` loop that computes all required metrics simultaneously. This prevents unnecessary memory allocations from closures and reduces garbage collection pressure during large report generation.
