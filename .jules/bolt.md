# Bolt's Journal

Critical learnings from Bolt's work on this repository.

## 2026-05-18 - Single-Pass Loop Optimization in Report Template

### Learning
Using higher-order array methods (like `.map()`, `.filter()`, `.reduce()`) over large collections in hot paths causes unnecessary overhead due to:
1. Multiple iterations over the same dataset.
2. Creation of intermediate arrays and closure allocations.

In performance-critical rendering code like `buildFailures` or aggregating status/duration in `template.ts`, consolidating logic into a single `for` loop reduces memory footprint and improves execution time significantly.

---

### Array Method Optimizations in Parser Loops
When parsing complex, deeply nested JSON representations of test suites (e.g. Playwright output), extracting state or aggregating durations can become a hot path for memory allocations if not implemented carefully.
*   **The Issue:** Higher-order array methods like `.some()`, `.every()`, and especially nested `.reduce()` calls introduce substantial overhead. They allocate a new closure for each callback invocation and require traversing arrays multiple times to derive different logical states. In large reports containing thousands of test items, this creates significant GC (Garbage Collection) pressure and slows down report generation.
*   **The Solution:** Replacing these functional chains with a single standard `for` loop allows computing multiple values (such as test status and total duration) in a single pass. This avoids the overhead of function call allocations and closure creation.
*   **Example:** In `src/report/template.ts`, replacing `.some(t => t.status === 'flaky')` and `.every(t => t.status === 'skipped')` with a single `for` loop that sets boolean flags during iteration resulted in a measurable decrease in both parse time and memory consumption.

- When rendering deeply nested steps and iterating large test arrays on the client side (`src/report/script.js`), prioritize standard `for` loops over higher-order array methods like `.some()` and `.reduce()`. This prevents the allocation of closures within hot paths, saving memory and improving overall CPU execution speed for massive test reports.

### Array Method Optimizations in Filter/Map Chains
When processing and transforming arrays (e.g., filtering failures and mapping them to a new format), chained higher-order methods like `.filter(...).map(...)` require multiple passes over the array and create intermediate array allocations.
*   **The Issue:** Chaining `.filter()` and `.map()` results in a time complexity of `O(2N)` and allocates an intermediate array for the filtered results before mapping them. This introduces unnecessary CPU overhead and Garbage Collection pressure, particularly when processing thousands of test execution rows.
*   **The Solution:** Replace the `.filter().map()` chain with a single standard `for` loop that iterates over the original array once, conditionally pushing the transformed objects into a new accumulator array.
*   **Example:** In `src/report/template.ts`'s `buildFailures` function, replacing the chain with a `for` loop eliminated an intermediate array allocation and reduced CPU overhead from `O(2N)` to `O(N)` when parsing large JSON datasets.
