import * as vscode from "vscode";
import { createFixedWidthDecoration } from "../application/fixedWidth/FixedWidthDecoration";
import { loadBuiltInDefinitions } from "../infrastructure/definitions/loadBuiltInDefinitions";
import { VscodeTelemetryAdapter } from "../infrastructure/telemetry/VscodeTelemetryAdapter";
import { FixedWidthPresentation } from "../presentation/vscode/FixedWidthPresentation";

type ExtensionRuntime = {
  presentation?: FixedWidthPresentation;
};

function createLifetime(
  runtime: ExtensionRuntime,
  telemetry: VscodeTelemetryAdapter,
): vscode.Disposable {
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        runtime.presentation?.dispose();
      } finally {
        telemetry.dispose();
      }
    },
  };
}

function initializeExtension(
  runtime: ExtensionRuntime,
  telemetry: VscodeTelemetryAdapter,
): void {
  telemetry.extensionActivated();
  const decoration = createFixedWidthDecoration(loadBuiltInDefinitions());
  runtime.presentation = new FixedWidthPresentation(decoration, telemetry);
  runtime.presentation.start();
}

function disposeAfterStartupFailure(
  context: vscode.ExtensionContext,
  lifetime: vscode.Disposable,
  error: unknown,
): never {
  const subscriptionIndex = context.subscriptions.indexOf(lifetime);
  if (subscriptionIndex !== -1) {
    context.subscriptions.splice(subscriptionIndex, 1);
  }
  try {
    lifetime.dispose();
  } catch (disposeError) {
    throw new AggregateError(
      [error, disposeError],
      "拡張の起動と破棄に失敗しました。",
    );
  }
  throw error;
}

export function activateExtension(context: vscode.ExtensionContext): void {
  const telemetry = new VscodeTelemetryAdapter();
  const runtime: ExtensionRuntime = {};
  const lifetime = createLifetime(runtime, telemetry);
  context.subscriptions.push(lifetime);
  try {
    initializeExtension(runtime, telemetry);
  } catch (error) {
    disposeAfterStartupFailure(context, lifetime, error);
  }
}
