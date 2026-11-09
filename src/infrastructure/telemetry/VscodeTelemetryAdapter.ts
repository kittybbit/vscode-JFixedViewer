import TelemetryReporter from "@vscode/extension-telemetry";
import type { TelemetryPort } from "../../application/telemetry/TelemetryPort";

declare const CONNECTION_STRING: string;
declare const DEVELOPMENT: boolean;

export class VscodeTelemetryAdapter implements TelemetryPort {
  private readonly reporter = new TelemetryReporter(CONNECTION_STRING);

  public extensionActivated(): void {
    this.reporter.sendTelemetryEvent("ext.activate", {
      development: String(DEVELOPMENT),
    });
  }

  public decorationSelected(fileType: string): void {
    this.reporter.sendTelemetryEvent("ext.decorate", {
      file_type: fileType,
      development: String(DEVELOPMENT),
    });
  }

  public dispose(): void {
    this.reporter.sendTelemetryEvent("ext.deactivate", {
      development: String(DEVELOPMENT),
    });
    this.reporter.dispose();
  }
}
