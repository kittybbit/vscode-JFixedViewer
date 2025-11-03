import { DefinitionHolder } from "../../definitions/DefinitionHolder";
import { textDecoratorHandler } from "../events/TextDecoratorHandler";
import { Extension } from "../Extension";
import { TextDecorator } from "./TextDecorator";

export class TextDecoratorFactory {
  private _extension: Extension;
  private _definitionHolder: DefinitionHolder;
  private _decorator: Map<string, TextDecorator> = new Map();
  private _handler: (message: string) => void = () => {};

  public static init(
    extension: Extension,
    dh: DefinitionHolder,
  ): TextDecoratorFactory {
    const tdf = new TextDecoratorFactory(extension, dh);
    return tdf;
  }

  private constructor(extension: Extension, dh: DefinitionHolder) {
    this._extension = extension;
    this._definitionHolder = dh;
    this._handler = textDecoratorHandler(extension, this);
    extension.eventDispatcher.onDidTriggerEvent(this._handler);
  }

  public decorate(message: string) {
    let decorator: TextDecorator | undefined = this.getDecorator(message);
    if (decorator === undefined) {
      return;
    }
    decorator.decorate();
    console.log(`decorated: ${message}`);
  }

  private getDecorator(message: string): TextDecorator | undefined {
    let decorator: TextDecorator | undefined = this._decorator.get(message);
    if (decorator === undefined) {
      decorator = this.createDecorator(message);
    }
    return this._decorator.get(message);
  }

  private createDecorator(message: string): TextDecorator | undefined {
    const rowDefinitions =
      this._definitionHolder.rowDefinitionsByFile.get(message);
    if (rowDefinitions === undefined) {
      return undefined;
    }
    const decorator = new TextDecorator(this._extension, rowDefinitions);
    this._decorator.set(message, decorator);
    return decorator;
  }
}
