# Requirements Traceability: SDD Adoption

| Requirement | Slice | Validation |
| --- | --- | --- |
| SDD-1 | 1 | Policy scenarios, document checks, and current-head CI |
| SDD-2 | 2, 3 | Legacy and migrated regression, three real hosts |
| SDD-3 | 3 | Architecture positive/negative cases and both bundles |

- SDD-1 covers routing, lifecycle, evidence, approval and stack sequencing.
  CodeQL and Verify run for successor PRs targeting predecessor branches.
- SDD-2 covers row selection, mode and same-format sharing, fixed-width
  decorations and hover, selection and cancellation, editor switching,
  teardown, telemetry and host activation.
- SDD-3 covers layer imports and construction, host and SDK boundaries,
  static resources, and browser safety. Manifest and definition equivalence
  protect compatibility.
