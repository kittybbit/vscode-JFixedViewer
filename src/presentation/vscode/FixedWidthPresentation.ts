import * as vscode from "vscode";
import type {
  FixedWidthDecorationPort,
  FixedWidthLine,
} from "../../application/fixedWidth/FixedWidthDecoration";
import type { TelemetryPort } from "../../application/telemetry/TelemetryPort";

const commandId = "vscode-JFixedViewer.FiletypePicker";

export class FixedWidthPresentation implements vscode.Disposable {
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly fileTypeByFileName = new Map<string, string>();
  private readonly decorationTypeByFileType = new Map<
    string,
    vscode.TextEditorDecorationType
  >();
  private disposed = false;

  public constructor(
    private readonly decoration: FixedWidthDecorationPort,
    private readonly telemetry: TelemetryPort,
  ) {}

  public start(): void {
    try {
      this.registerCommand();
      this.listenToActiveEditor();
    } catch (error) {
      this.rethrowStartupFailure(error);
    }
  }

  private registerCommand(): void {
    const command = vscode.commands.registerCommand(commandId, () => {
      void this.selectFileType();
    });
    this.subscriptions.push(command);
  }

  private async selectFileType(): Promise<void> {
    const selectedName = await vscode.window.showQuickPick(
      this.decoration.choices.map((choice) => choice.name),
    );
    const fileType = this.decoration.fileTypeForName(selectedName);
    if (fileType !== undefined) {
      this.decorate(fileType);
    }
    this.telemetry.decorationSelected(fileType ?? "");
  }

  private listenToActiveEditor(): void {
    this.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) =>
        this.applyToActiveEditor(editor),
      ),
    );
  }

  private applyToActiveEditor(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    const fileType = this.fileTypeByFileName.get(editor.document.fileName);
    if (fileType !== undefined) {
      this.decorate(fileType, editor);
    }
  }

  private rethrowStartupFailure(error: unknown): never {
    try {
      this.dispose();
    } catch (disposeError) {
      throw new AggregateError(
        [error, disposeError],
        "プレゼンテーションの起動と破棄に失敗しました。",
      );
    }
    throw error;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const subscription of this.subscriptions.reverse()) {
      subscription.dispose();
    }
    this.subscriptions.length = 0;
    for (const fileType of this.fileTypeByFileName.values()) {
      this.decorationTypeByFileType.get(fileType)?.dispose();
    }
    this.fileTypeByFileName.clear();
  }

  private decorate(
    fileType: string,
    editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor,
  ): void {
    if (!editor) {
      return;
    }

    const fileName = editor.document.fileName;
    this.clearEditor(fileName);
    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: "",
        borderColor: new vscode.ThemeColor("editor.selectionBackground"),
        border: "0.1em solid",
      },
      isWholeLine: false,
    });
    const fields = this.decoration.decorate(
      fileType,
      this.documentLines(editor),
    );
    const options = fields.map((field) => {
      const hover = new vscode.MarkdownString(
        `**${field.name}**  \n位置: ${field.start + 1} - ${field.end} (${field.width}桁)`,
      );
      hover.isTrusted = true;
      return {
        range: new vscode.Range(
          new vscode.Position(field.line, field.start),
          new vscode.Position(field.line, field.end),
        ),
        hoverMessage: hover,
      };
    });

    editor.setDecorations(decorationType, options);
    this.decorationTypeByFileType.set(fileType, decorationType);
    this.fileTypeByFileName.set(fileName, fileType);
  }

  private *documentLines(editor: vscode.TextEditor): Generator<FixedWidthLine> {
    for (let index = 0; index < editor.document.lineCount; index += 1) {
      const line = editor.document.lineAt(index);
      yield {
        line: index,
        text: line.text,
        isEmptyOrWhitespace: line.isEmptyOrWhitespace,
      };
    }
  }

  private clearEditor(fileName: string): void {
    const fileType = this.fileTypeByFileName.get(fileName);
    if (fileType === undefined) {
      return;
    }
    this.decorationTypeByFileType.get(fileType)?.dispose();
    this.fileTypeByFileName.delete(fileName);
  }
}
