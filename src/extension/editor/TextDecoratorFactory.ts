import { DefinitionHolder } from "../../definitions/DefinitionHolder";
import { textDecoratorHandler } from "../events/TextDecoratorHandler";
import { Extension } from "../Extension";
import { TextDecorator } from "./TextDecorator";

export class TextDecoratorFactory {
  private _definitionHolder: DefinitionHolder;
  private _decorator: Map<string, TextDecorator> = new Map();
  private _handler: (message: string) => void = () => {};

  public static init(dh: DefinitionHolder): TextDecoratorFactory {
    const td = new TextDecoratorFactory(dh);
    td._handler = textDecoratorHandler(td);
    Extension.eventDispatcher.onDidTriggerEvent(td._handler);
    return td;
  }

  private constructor(dh: DefinitionHolder) {
    this._definitionHolder = dh;
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
    const rows = this._definitionHolder.rowsByFile.get(message);
    if (rows === undefined) {
      return undefined;
    }
    const decorator = new TextDecorator(rows);
    this._decorator.set(message, decorator);
    return decorator;
  }
}
