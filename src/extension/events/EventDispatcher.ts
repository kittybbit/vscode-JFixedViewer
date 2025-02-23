import * as vscode from "vscode";

export class EventDispatcher {
  private emitter = new vscode.EventEmitter<string>();

  // subscribe
  public onDidTriggerEvent = this.emitter.event;

  // fire
  public fire(message: string) {
    console.log(`on fire: ${message}`);
    this.emitter.fire(message);
  }
}
