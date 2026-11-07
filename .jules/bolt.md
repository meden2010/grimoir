# Performance Lessons & Optimizations

## Playwright Parser Optimization
- Replaced multiple array traversals (`.filter` and `.reduce` chained methods) with a single `for` loop to accumulate test statistics (`passed`, `failed`, `skipped`, `duration`).
- **Why**: Chained higher-order array methods (like `.filter()`) create intermediate arrays and incur significant O(N) penalties per call. Consolidating logic into a single pass reduces CPU overhead and avoids unnecessary memory allocations during massive JSON ingestions.

### Template Replacements
When replacing multiple placeholders in a large string template (like an HTML report), avoid using a global `replace()` sequentially for each placeholder. If there are `N` placeholders and the string length is `L`, sequential replacements result in a time complexity of `O(N * L)`. Instead, map the placeholder keys and do a single regex replacement `template.replace(/__[A-Z0-9_]+__/g, (match) => map[match] ?? match)`. This reduces the complexity to `O(L)`.

### Recursive Array Aggregations
When recursively extracting items from deeply nested structures (e.g., test suites), pass an accumulator array as an argument to mutate in-place rather than using `.concat()` or `.push(...recursiveCall())`. This prevents O(N^2) memory allocations and reduces garbage collection overhead by avoiding the creation of numerous intermediate arrays.

- When optimizing Playwright parsing (`src/parsers/playwright.parser.ts`), always look for ways to merge array iteration passes (like `.reduce()`, `.some()`, and `.map()` calls) into a single loop to reduce CPU overhead on massive output files.

### Array Method Optimizations in Parser Loops
When parsing complex, deeply nested JSON representations of test suites (e.g. Playwright output), extracting state or aggregating durations can become a hot path for memory allocations if not implemented carefully.
*   **The Issue:** Higher-order array methods like `.some()`, `.every()`, and especially nested `.reduce()` calls introduce substantial overhead. They allocate a new closure for each callback invocation and require traversing arrays multiple times to derive different logical states. In large reports containing thousands of test items, this creates significant GC (Garbage Collection) pressure and slows down report generation.
*   **The Solution:** Replacing these functional chains with a single standard `for` loop allows computing multiple values (such as test status and total duration) in a single pass. This avoids the overhead of function call allocations and closure creation.
*   **Example:** In `src/report/template.ts`, replacing `.some(t => t.status === 'flaky')` and `.every(t => t.status === 'skipped')` with a single `for` loop that sets boolean flags during iteration resulted in a measurable decrease in both parse time and memory consumption.

- When rendering deeply nested steps and iterating large test arrays on the client side (`src/report/script.js`), prioritize standard `for` loops over higher-order array methods like `.some()` and `.reduce()`. This prevents the allocation of closures within hot paths, saving memory and improving overall CPU execution speed for massive test reports.
