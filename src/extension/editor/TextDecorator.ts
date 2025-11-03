import * as vscode from "vscode";
import { RowDefinition } from "../../definitions/types";
import { Extension } from "../Extension";

export class TextDecorator implements vscode.Disposable {
  private _extension: Extension;
  private _rowDefinitions: RowDefinition[];
  private _mode?: string;
  private _decorationType?: vscode.TextEditorDecorationType;

  public constructor(extension: Extension, rows: RowDefinition[]) {
    this._extension = extension;
    this._rowDefinitions = rows;
  }

  dispose() {
    this._decorationType?.dispose();
  }

  /** Decorate the active editor */
  public decorate() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    this._extension.clearEditor(editor);

    this._decorationType = this.createDecorationType();
    const decorationOption = this.createDecorationOption(editor.document);

    // Apply all at once for performance
    editor.setDecorations(this._decorationType, decorationOption);

    this._extension.storeTextDecorator(editor, this);
  }

  /** visually lighter decorations */
  private createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      after: {
        contentText: "",
        borderColor: new vscode.ThemeColor("editor.selectionBackground"),
        border: "0.1em solid",
      },
      isWholeLine: false,
    });
  }

  /** Create decorations for each field (column) */
  private createDecorationOption(
    document: vscode.TextDocument,
  ): vscode.DecorationOptions[] {
    const options: vscode.DecorationOptions[] = [];
    const lineCount = document.lineCount;

    for (let i = 0; i < lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text;
      if (line.isEmptyOrWhitespace) {
        continue;
      }

      const row = this.getApplicableRow(text);
      if (!row) {
        continue;
      }

      let start = 0;
      for (const [colIndex, colWidth] of row.columns.entries()) {
        const end = start + colWidth;
        const range = new vscode.Range(
          new vscode.Position(i, start),
          new vscode.Position(i, end),
        );
        const hover = new vscode.MarkdownString(
          `**${row.name}**  \n位置: ${start + 1} - ${end} (${colWidth}桁)`,
        );
        hover.isTrusted = true; // allows link expansion later

        options.push({ range: range, hoverMessage: hover });
        start = end;
      }
    }
    return options;
  }

  /** Find applicable Row by regex condition & mode */
  private getApplicableRow(lineText: string): RowDefinition | undefined {
    for (const row of this._rowDefinitions) {
      if (!row.condition.test(lineText)) {
        continue;
      }

      if (!row.mode || (this._mode && row.mode.test(this._mode))) {
        // Update mode if mode_rule applies
        if (row.mode_rule && row.mode_rule_position !== undefined) {
          const match = row.mode_rule.exec(lineText);
          this._mode = match ? match[row.mode_rule_position] : undefined;
        }
        return row;
      }
    }
    return undefined;
  }
}
