export interface TelemetryPort {
  extensionActivated(): void;
  decorationSelected(fileType: string): void;
  dispose(): void;
}
