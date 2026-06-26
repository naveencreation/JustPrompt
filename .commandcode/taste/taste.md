# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# code-review
- Verify all bug/code quality findings against actual source code before reporting, clearly distinguishing confirmed bugs from false positives and intentional design choices. Confidence: 0.65

# testing
- Keep test runner output pristine — zero warnings, zero errors in logs. Confidence: 0.85
- Properly tear down fake timers (`vi.useFakeTimers()`) in `afterEach`/`afterAll` to prevent the test runner from hanging due to lingering interval loops. Confidence: 0.80
- Export internal classes for direct unit testing when they contain meaningful logic; testability is worth opening the module API. Confidence: 0.70
- When mocking Next.js modules in Vitest, use `importOriginal` to preserve `NextRequest`/`NextResponse` exports while selectively overriding methods like `redirect`/`rewrite`/`next`. Confidence: 0.72
- Use a mutable variable with a getter (not `vi.mock` inside tests) to dynamically toggle configuration values in mocked modules across different test scenarios. Confidence: 0.70

