# Feature Tasks: SDD Adoption

## Agent Brief

- Preserve fixed-width display while adopting the SDD workflow and architecture
  in `SPECS.md`. Each layer has independent value and a reviewable PR.
- Active slice: none. Main records exact Human Approval and commits the
  independently reviewed planning package before dispatching slice 1.
- Use the active slice's checks and paths below. Preserve cross-document
  sharing within one format, both host entry points, and the VS Code floor.
- Stop for decisions that change approved scope, design, impact, or validation.
  Correct deterministic failures within the existing boundary and revalidate.

## Current state

- Lifecycle state: PLAN_APPROVED
- Next operation: Main commits the approved planning package.
- Gate evidence: independent `plan-reviewer` verdict `Ready for approval`,
  with both plan findings resolved. The reviewed `TASKS.md` SHA-256 was
  `f7826717a511c38adef8b5e3e5aa528060fb462c468ccd644a2daab46493a62c`.
  Reviewed package identities and planning checks are recorded in
  `/tmp/jfixedviewer-sdd-plan-revision.ahsshs/record.txt`.
- Planning commit content: this file, `SPECS.md`, `TRACEABILITY.md`, and Main's
  approval and review evidence in this file.

## Native Stack References

- Trunk: GitHub `main` at `56b4823cbb04873a7d909b2d4a530e6334efb517`.
- Layer 1: `codex/sdd-adoption-harness` targets `main`.
- Layer 2: `codex/sdd-adoption-tests` targets the approved layer 1 branch/head.
- Layer 3: `codex/sdd-adoption-architecture` targets the approved layer 2
  branch/head. Its head includes all layers and ultimately the closure patch.
- PR URLs, checked head and base SHAs, final closure commit and merge results
  are recorded as observed. None exists yet.

After each slice is independently Ready and receives explicit Completion
Approval, Main commits and publishes or updates its layer PR. Before creating
or starting a dependent layer, Main checks predecessor base/head, successful
Verify and CodeQL results for that current PR head, and applicable repository
and Cloud gates. Verify checks out the PR head SHA. Record the CodeQL analyzed
revision and its association with the same current PR head. Main rechecks
the GitHub rules on publication and at merge. Missing, failed, stale, or
pending checks block dependent work. An expected skip counts only if the
applicable rule accepts it.

Use the [native GitHub stack workflow][github-stack] to group the linked PRs
and confirm their order. After Feature Exit, closure approval and commit, wait
for fresh top-head gates. Obtain separate Human Merge Approval for the exact
three PRs, order, bases, heads, closure commit, and native Rebase merge of the
complete stack into `main`. Rebase merge preserves linear history and focused
commits. Confirm the current UI offers that operation and that repository
rules permit it. Do not merge individual layers early. A changed merge
identity or unavailable native operation returns to Main for a decision.
Record every PR's observed merge result and resulting commit identity. A
partial merge keeps the last substantiated state and identifies what remains.

[github-stack]: https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-stacked-pull-requests

## Human Approval

- Status: Approved
- Approved at: approved in the current conversation after independent review.
- Approved scope: slices 1–3 as reviewed, including their validation and
  implementation boundaries.
- Approved paths: the exact paths in the three slice approval lists below.

The scope under review is the implementation and validation path lists below.
A slice's Ready verdict, its Completion Approval, and its commit are separate
gate facts. Closure and merge each have their own explicit approval. Main
records the actual approval, exact scope, review and commit references before
acting. Unlisted paths and material design or coverage changes require
Replanning and renewed approval.

## Slice 1. SDD harness and initial Verify

- Lifecycle state: PLANNED
- Acceptance: SDD policy, roles, entry points, templates and use-case
  documentation are navigable. Static lifecycle examples distinguish
  correction, replanning, completion, exit and merge. Verify and CodeQL
  run on PRs targeting any branch, including future stack predecessors.
  Remove the CodeQL PR branch filter and retain the existing push and
  schedule behavior and scanning configuration.
- Solution Shape: `AGENTS.md` owns constraints and routing. SDD core policy
  owns lifecycle and approvals, validation owns check selection and
  correction, evidence owns identity and freshness, and each Codex role
  owns its procedure. Copilot and `.agent.md` route to those owners.
  Use cases own durable observable behavior. Architecture documents the
  target layers and identifies the enforcement as pending until slice 3.
  GitHub Actions and the existing npm toolchain own verification.
- Adapt reusable SDD policy from reference commit `80ab0a84`, removing
  AJS-specific duties. Keep the seven role IDs and authority boundaries.
  Keep a single `TASKS.md` lifecycle vocabulary. Independent review is
  separate from mechanical commits executed by Main.
- Verify uses locked dependencies with Node 24 and `npm ci`; checks changed
  Markdown, types and both production bundles at the actual PR head.
  Use Markdownlint CLI2 0.22.0 for changed Markdown, including dot-directory
  files. Use the PR merge base to identify changed Markdown and include
  additions, edits and rename destinations. CodeQL keeps its PR analysis
  semantics. Keep SDD and test tooling out of packaged extension contents.
- Validation: Markdown lint, relative links and anchors, TOML and YAML parse,
  policy scenario review, `git diff --check`,
  `npm exec -- tsc -p . --noEmit`, and
  `npm exec -- webpack --mode production --devtool false`. Check both
  manifest bundle paths and test workflow trigger/head selection statically
  for `main` and a representative future predecessor branch such as
  `codex/fixed-width-example-base`. Apply the Qlty evidence plan below to
  changed analyzed inputs. Verify real PR check results after publication.
  Runtime is unchanged in this slice.

### Slice 1 approval paths

- `AGENTS.md`
- `.agent.md`
- `.codex/agents/approval-committer.toml`
- `.codex/agents/feature-author.toml`
- `.codex/agents/feature-closer.toml`
- `.codex/agents/implementation-reviewer.toml`
- `.codex/agents/implementer.toml`
- `.codex/agents/plan-reviewer.toml`
- `.codex/agents/planner.toml`
- `.github/copilot-instructions.md`
- `.github/pull_request_template.md`
- `.github/workflows/codeql.yml`
- `.github/workflows/verify.yml`
- `.vscodeignore`
- `README.md` (link contributors to SDD policy)
- `docs/requirements/use-cases/README.md`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `docs/requirements/use-cases/uc-switch-editors.md`
- `docs/specs/README.md`
- `docs/specs/architecture.md`
- `docs/specs/evidence.md`
- `docs/specs/validation.md`
- `docs/specs/features/_templates/ADR.template.md`
- `docs/specs/features/_templates/SPECS.template.md`
- `docs/specs/features/_templates/TASKS.template.md`
- `docs/specs/features/_templates/TRACEABILITY.template.md`
- `docs/specs/features/sdd-adoption/TASKS.md` (gate and evidence references)

## Slice 2. Baseline characterization and real hosts

- Lifecycle state: PLANNED
- Acceptance: Desktop stable executes the behavioral suite against the legacy
  implementation. Desktop stable, Desktop 1.75.0, and Web stable run common
  smoke assertions using real VS Code hosts. Each host activates the
  extension and sees `vscode-JFixedViewer.FiletypePicker` registered.
- Solution Shape: a test-only host seam calls actual legacy entry points and
  observes the options and telemetry sent to fake outer dependencies. A
  scoped CJS loader substitution for VS Code and telemetry is allowed only
  during module loading, with restoration in `finally` and test isolation.
  Set deterministic fake values for the compiled legacy connection and
  `DEVELOPMENT` globals in the characterization process and restore them.
  Preserve regression scenarios when the seam is rewired in slice 3.
  Use actual stable and minimum hosts for smoke, with the existing locked
  test CLI and Web runner.
- Test all SDD-2 cases. Use the real bundled Zengin and JPX data. Assert
  first-match precedence, mode updates and reset on an unmatched capture,
  sharing within a format and isolation across formats, ignored whitespace
  and nonmatching records, and Japanese hover content and positions.
  Assert UTF-16 coordinates with an astral character and an untruncated span
  on a short line. Cover selecting with no editor, cancel leaving decoration
  in place with empty `file_type`, and clearing via the empty built-in format.
  Cover switch/reapply, same-format shared disposal behavior, and disposal on
  deactivation. Check telemetry names, exact properties and timing relative
  to selection/activation; editor changes do not emit a decorate event.
- Build smoke copies in ignored `out/smoke-extension`, with the normal
  manifest and `dist` layout, using an explicit webpack smoke flag and an
  empty, non-secret connection string. Stage the manifest using Node.
  Leave ordinary bundles in `dist` and retain their existing env resolution.
  Bundle the shared browser test entry inside the staged extension for the
  Web runner. Disable host telemetry before activation and isolate test
  profiles. Skip dotenv loading for smoke before it can read a real key.
- Add `npm run test:prepare`, `npm run test:desktop`,
  `npm run test:desktop:min` and `npm run test:web`. Keep `npm test`
  as the desktop entry with preparation in its prehook. Keep CI's existing
  production checks and add preparation plus all host commands. On Linux,
  use Xvfb for Electron and install the locked Playwright Chromium for Web.
- Validation: predecessor PR gates; production and smoke build outputs,
  secret-free smoke build and actual activation on all three hosts, baseline
  characterization, Qlty evidence and `git diff --check`. Verify uses the
  same commands. An unavailable host remains Missing and blocks readiness.

### Slice 2 approval paths

- `.github/workflows/verify.yml`
- `.vscode-test.mjs`
- `package.json` (scripts only)
- `webpack.config.js`
- `scripts/prepare-smoke.mjs`
- `src/test/extension.test.ts` (replace sample)
- `src/test/smoke.test.ts`
- `src/test/smoke.ts`
- `src/test/support/characterizationHost.ts`
- `docs/specs/features/sdd-adoption/TASKS.md` (gate and evidence references)

## Slice 3. Clean Architecture migration and enforcement

- Lifecycle state: PLANNED
- Acceptance: existing builds, smoke and characterization pass against
  migrated code. JSON is byte-identical across moves, command and manifest
  compatibility are unchanged, and the architecture suite reports zero
  production violations while rejecting deliberate negative cases.
- Solution Shape: domain computes row choice, transitions and spans from
  compiled rules and an initial mode. It returns fields and next mode with
  no host dependency. The application owns the ordered format catalog,
  per-format mode and decoration DTO, and typed telemetry port. The JSON
  loader preserves ordering, IDs and regular expressions, and infrastructure
  alone reads bundled JSON and constructs the telemetry SDK. Presentation
  owns picker/events, host conversions and one decoration handle per format
  alongside the document file-name association. Bootstrap instantiates and
  disposes the adapters/use case and registers the subscriptions. Entry
  exports only the existing activation and deactivation functions.
- Preserve legacy mode reuse between same-format files and the shared handle
  per format. Clear the previous handle associated with a file name before
  painting a replacement. Keep the empty format in the catalog, use it to
  clear, and reapply the last selected format on active-editor change.
  Use the same VS Code range, style, trusted hover, and grouped application.
  Do not add an edit subscription, auto-detection, clamping, state reset, or
  document isolation. Remove logging of the telemetry connection string.
  Keep telemetry event order, name and payload. Never send content or paths.
- Enforce the dependency catalog with the installed TypeScript compiler AST
  and a Node test. Exclude only test files, catalog all production source
  roots, and reject uncataloged production files. Relative dependency
  direction is domain to domain; application to domain/application;
  infrastructure to domain/application/infrastructure/resource; presentation
  to application/presentation; bootstrap to application/infrastructure/
  presentation/bootstrap; entry to bootstrap. VS Code imports are allowed
  in entry, bootstrap, infrastructure and VS Code presentation. Only
  infrastructure/telemetry may import the SDK. Reject Node built-ins across
  production and limit bundled JSON to infrastructure. Require application
  factory use in application/bootstrap and concrete infrastructure usage and
  construction in infrastructure/bootstrap.
- Scan import/type imports, exports from, import type queries, literal
  dynamic imports, `require`, and import-equals; fail on unanalyzable
  computed loader references. Resolve relative references with TypeScript
  resolution. Test forbidden direction, VS Code, SDK, JSON, Node built-ins
  with and without the `node:` prefix, and composition misuse, with
  corresponding allowed examples. Static results demonstrate the rule
  catalog; independent review judges the semantic owners and abstraction
  boundaries. Add `npm run test:architecture` to Verify.
- Validation: predecessor PR gates; the full slice 2 checks; architecture
  positives and negatives; engine/manifest and JSON equivalence,
  `git diff --check`, and Qlty evidence. Assess browser safety, test wiring
  only changes to regression tests, and actual old-host activation.

### Slice 3 approval paths

- `.github/workflows/verify.yml`
- `package.json` (architecture test script only)
- `src/extension.ts`
- `src/domain/fixedWidth/projectFields.ts`
- `src/application/fixedWidth/FixedWidthDecoration.ts`
- `src/application/telemetry/TelemetryPort.ts`
- `src/infrastructure/definitions/loadBuiltInDefinitions.ts`
- `src/infrastructure/telemetry/VscodeTelemetryAdapter.ts`
- `src/presentation/vscode/FixedWidthPresentation.ts`
- `src/bootstrap/activateExtension.ts`
- `src/resource/definitions/clear.json`
- `src/resource/definitions/jpx.json`
- `src/resource/definitions/zengin.json`
- `src/definitions/DefinitionHolder.ts` (remove)
- `src/definitions/types.d.ts` (remove)
- `src/definitions/clear.json` (move)
- `src/definitions/jpx.json` (move)
- `src/definitions/zengin.json` (move)
- `src/extension/Constants.ts` (remove)
- `src/extension/Extension.ts` (remove)
- `src/extension/command/FiletypePicker.ts` (remove)
- `src/extension/editor/TextDecorator.ts` (remove)
- `src/extension/editor/TextDecoratorFactory.ts` (remove)
- `src/extension/events/ChangeActiveTextEditorHandler.ts` (remove)
- `src/extension/events/EventDispatcher.ts` (remove)
- `src/extension/events/TextDecoratorHandler.ts` (remove)
- `src/test/architecture.test.ts`
- `src/test/support/architectureRules.ts`
- `src/test/extension.test.ts` (rewire only as needed, retain assertions)
- `src/test/support/characterizationHost.ts` (rewire only)
- `docs/specs/architecture.md` (record the enforced boundaries)
- `docs/specs/features/sdd-adoption/TASKS.md` (gate and evidence references)

## Validation and evidence index

- Baseline identity: exact disposable snapshot of
  `56b4823cbb04873a7d909b2d4a530e6334efb517`. Main reports passing
  `tsc --noEmit` and both production webpack builds. No host or architecture
  gate exists at baseline. The existing sample does not characterize behavior.
- Initial Qlty evidence: `/private/tmp/jfixed-sdd-evidence.drmE5r`, version
  0.645.0. Raw `check` exit 1 with 27 findings, with the analyzed-file
  inventory and count still to capture. Raw `smells` exit 0 with four
  findings and 14 analyzed files. Findings include unchanged lockfile
  advisory CVE-2026-46681, README line lengths and existing CodeQL YAML
  findings. Capture and record nonzero inventories and counts for each
  baseline and final command before the implementation evidence can pass.
- For each affected slice, use matched isolated exact baseline and final
  inputs, tool version, config, selection, inventories and SARIF. Run
  `qlty check --all --sarif --no-fix` and
  `qlty smells --all --sarif --no-snippets` and retain raw statuses. Require
  no new or adversely moved findings. Run `npm run qlty` on the disposable
  final snapshot and require it to pass by default. Sync only approved
  formatting changes and rerun final evidence against the new patch.
  If unchanged baseline findings block the aggregate, record the failure and
  ask Main for a separate, scoped human disposition identifying the exact
  findings and affected gates before proceeding. No scanner suppression,
  dependency change, or reporting a failed check as Pass. Do not make an
  exception for new findings or failing required GitHub/Cloud checks.
- Keep scope, exact base/patch identity, approved and inspected paths, tool
  versions, command/exit, configuration/dependency identities, raw outputs
  and coverage in accessible evidence sidecars. Add compact references here
  as checks, reviews and commits occur. Pending, missing or failed required
  evidence blocks readiness unless the corresponding gate has an explicitly
  approved disposition under the policy.
- Current validation: planning-document validation only. Product slice
  checks are pending. `.serena/` is pre-existing and outside every scope.

## Feature Exit

Once all slices are independently Ready, approved, committed and published,
the closer verifies SDD-1 through SDD-3, final integrated product and Qlty
evidence, and current PR gates. Architecture and use cases already own the
reusable results; review them for consistency and propagate any needed
correction only to these planned paths:

- `docs/specs/architecture.md`
- `docs/requirements/use-cases/uc-display-fixed-width.md`
- `docs/requirements/use-cases/uc-clear-decorations.md`
- `docs/requirements/use-cases/uc-switch-editors.md`

No release or changelog update is planned because supported behavior remains
the same. Keep any uncovered issue in the external closure evidence with an
explicit owner or disposition. Review and validate the exact projected
closure diff on the top layer, obtain separate Closure Approval, and remove
only these selected-feature files in the closure commit:

- `docs/specs/features/sdd-adoption/SPECS.md`
- `docs/specs/features/sdd-adoption/TASKS.md`
- `docs/specs/features/sdd-adoption/TRACEABILITY.md`

Retain a closure evidence sidecar with gate decisions, validation and actual
merge results, accessible to Main and the user. Main records `CLOSED` there
only after GitHub confirms all PRs merged. No integration-only branch or PR.
