import { Telemetry } from "../Constants";
import { TextDecoratorFactory } from "../editor/TextDecoratorFactory";
import { Extension } from "../Extension";

export const textDecoratorHandler = (tdf: TextDecoratorFactory) => {
  return (message: string) => {
    console.log(`invoke textDecoratorHandler: ${message}`);
    tdf.decorate(message);
    Extension.reporter.sendTelemetryEvent(Telemetry.Decorate, {
      file_type: message,
      development: String(DEVELOPMENT),
    });
  };
};
