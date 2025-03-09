import * as vscode from "vscode";
import { Row } from "../../definitions/types";
import { Extension } from "../Extension";

export class TextDecorator {
  private _rows: Row[];
  private _mode?: string;

  public constructor(rows: Row[]) {
    this._rows = rows;
  }

  /** Decorate the text editor */
  public decorate() {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      return;
    }

    Extension.clearDecoration(editor);

    const newDecoration = this.createDecorationType();
    const decorationOptions = this.createDecorationOptions(editor.document);
    editor.setDecorations(newDecoration, decorationOptions);
    Extension.setDecoration(editor, newDecoration);
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      after: {
        contentText: "|",
        margin: "0 0.1em 0 0.1em",
      },
    });
  }

  /** Create ranges for each row */
  private createDecorationOptions(
    document: vscode.TextDocument,
  ): vscode.DecorationOptions[] {
    const decorationOptions: vscode.DecorationOptions[] = [];

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      const line = document.lineAt(lineNumber);
      const lineText = line.text;
      const lineIsEmpty = line.isEmptyOrWhitespace;
      if (lineIsEmpty) {
        continue;
      }

      const useRow = this.getUseRowAtThisLine(lineText);
      if (useRow === undefined) {
        continue;
      }

      let startPos = 0;
      for (const column of useRow.columns) {
        const start = new vscode.Position(lineNumber, startPos);
        const endPos = startPos + column;
        const end = new vscode.Position(lineNumber, endPos);
        const range = new vscode.Range(start, end);
        decorationOptions.push({
          range: range,
          hoverMessage: new vscode.MarkdownString(
            `${useRow.name}, ${startPos + 1}-${endPos}(${column})`,
          ),
        });
        startPos += column;
      }
    }

    return decorationOptions;
  }

  private getUseRowAtThisLine(lineText: string): Row | undefined {
    let useRow;
    for (const row of this._rows) {
      if (row.condition.test(lineText)) {
        if (
          row.mode === undefined ||
          (this._mode !== undefined && row.mode.test(this._mode))
        ) {
          useRow = row;
          // Set mode from then next row onward.
          if (
            row.mode_rule !== undefined &&
            row.mode_rule_position !== undefined
          ) {
            const match = row.mode_rule.exec(lineText);
            this._mode =
              match !== null ? match[row.mode_rule_position] : undefined;
          }
          break;
        }
      }
    }
    return useRow;
  }
}
