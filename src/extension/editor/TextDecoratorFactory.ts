import { create } from "domain";
import { DefinitionHolder } from "../../definitions/DefinitionHolder";
import { Extension } from "../Extension";
import { TextDecorator } from "./TextDecorator";

export class TextDecoratorFactory {
  private _definitionHolder: DefinitionHolder;
  private _decorator: Map<string, TextDecorator> = new Map();

  public static init(dh: DefinitionHolder): TextDecoratorFactory {
    const td = new TextDecoratorFactory(dh);
    Extension.eventDispatcher.onDidTriggerEvent(
      td.textDecoratorHandler.bind(td),
    );
    return td;
  }

  private constructor(dh: DefinitionHolder) {
    this._definitionHolder = dh;
  }

  private decorate(message: string) {
    console.log(`decorate: ${message}`);
    let decorator: TextDecorator | undefined = this.getDecorator(message);
    if (decorator === undefined) {
      return;
    }
    decorator.decorate();
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

  private textDecoratorHandler(message: string) {
    console.log(`textDecoratorHandler: ${message}`);
    this.decorate(message);
  }
}
