# Feature Specification: SDD Adoption

## Purpose

Establish an approval-gated development workflow for JFixedViewer and use it
to move the fixed-width viewer into enforceable architecture boundaries.
Users can continue selecting built-in formats and viewing field boundaries
and positions in VS Code on desktop and web.

## Source

- User-approved direction for this feature and the SDD and architecture
  policies of `vscode-ajsbutler` at `80ab0a84f81cd594ebde45e141b8fb81e92eb1ca`.
- JFixedViewer 1.3.1 behavior at base
  `56b4823cbb04873a7d909b2d4a530e6334efb517`, described in `README.md` and
  implemented by the format picker, definition holder, and text decorator.

## Requirements and acceptance

- **SDD-1**. Main, independent lifecycle roles, and feature templates support
  exact-scope approval, correction, replanning, evidence, and closure. The
  selected feature records its only lifecycle state in `TASKS.md`. Each layer
  has its own GitHub PR, and successor work requires verified predecessor
  checks on the current head.
- **SDD-2**. Regression tests capture the baseline behavior of built-in Zengin
  and JPX formats, unmatched and blank lines, mode transitions, short lines,
  UTF-16 positions, cancellation, clearing, editor switches, disposal, and
  telemetry. Real desktop stable, desktop 1.75.0, and web stable hosts activate
  the extension and expose its existing command without real telemetry secrets.
- **SDD-3**. Layer rules and composition are verified by executable checks,
  including forbidden-dependency cases. A production build yields desktop and
  web bundles. The same behavioral regression checks pass after migration.

## Decisions and impact

- Domain owns row matching, mode transitions, and field spans. Application
  owns format selection, host-neutral decoration data, and the typed telemetry
  port. Infrastructure loads bundled definitions and adapts the telemetry SDK.
  Resources own the definition JSON. VS Code presentation owns the picker,
  editor events, and decoration handles. Bootstrap wires and disposes runtime
  dependencies.
- Preserve the existing format-based sharing of row mode and decoration state
  across documents. Preserve document-name associations for editor reapply,
  first matching row precedence, fixed-width span calculations, Japanese
  hover text, cancellation, and the built-in empty format used to clear.
- Preserve `ext.activate`, `ext.decorate`, and `ext.deactivate`, including
  the `development` value and `file_type` on `ext.decorate`. Keep data and
  paths out of telemetry event properties.
- Add durable use cases for fixed-width display, clearing, and switching
  editors. The baseline contains no active feature, requirements catalog, or
  roadmap that needs reconciliation.

## Compatibility

Preserve `vscode-JFixedViewer.FiletypePicker`, `engines.vscode` at `^1.75.0`,
both existing bundle entry paths, and the contents of the built-in definition
JSON. There is no new public extension API.

## Non-goals

- Definition fixes, changes to row interpretation, and per-document isolation
  of a format's state.
- Dependency upgrades, VS Code minimum-version changes, and release work.
