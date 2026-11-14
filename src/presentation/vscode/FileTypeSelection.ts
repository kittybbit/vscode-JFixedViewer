import * as vscode from "vscode";
import type { FixedWidthDecorationPort } from "../../application/fixedWidth/FixedWidthDecoration";
import type { TelemetryPort } from "../../application/telemetry/TelemetryPort";
import type {
  DocumentRenderSession,
  RenderRequest,
} from "./DocumentRenderSession";
import {
  ensureDocumentEncoding,
  type DocumentEncodingFailureCode,
  type DocumentEncodingResult,
} from "./documentEncoding";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const clearFileType = "clear@clear";

type SelectionCompletion = {
  sourceDocument: vscode.TextDocument | undefined;
  sourceUri: string | undefined;
  selectedName: string | undefined;
  requestId: number;
};

type ActiveSelection = {
  sourceDocument: vscode.TextDocument;
  sourceUri: string;
  fileType: string;
  requestId: number;
};

export class FileTypeSelection implements vscode.Disposable {
  private readonly requestByUri = new Map<string, number>();
  private readonly reloadTailByUri = new Map<string, Promise<void>>();
  private disposed = false;

  public constructor(
    private readonly decoration: FixedWidthDecorationPort,
    private readonly telemetry: TelemetryPort,
    private readonly renderSession: DocumentRenderSession,
  ) {}

  public registerCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(commandId, () =>
      this.selectFileType(),
    );
  }

  public invalidateUri(uri: string): void {
    this.requestByUri.set(uri, (this.requestByUri.get(uri) ?? 0) + 1);
  }

  private async selectFileType(): Promise<void> {
    const sourceDocument = vscode.window.activeTextEditor?.document;
    const sourceUri = sourceDocument?.uri.toString();
    const requestId = sourceUri ? this.beginRequest(sourceUri) : 0;
    const selectedName = await vscode.window.showQuickPick(
      this.decoration.choices.map((choice) => choice.name),
    );
    if (this.disposed) {
      return;
    }
    await this.finishSelection({
      sourceDocument,
      sourceUri,
      selectedName,
      requestId,
    });
  }

  private async finishSelection(
    completion: SelectionCompletion,
  ): Promise<void> {
    const outcome = await this.selectionOutcome(completion);
    if (outcome !== undefined) {
      this.telemetry.decorationSelected(outcome);
    }
  }

  private async selectionOutcome({
    sourceDocument,
    sourceUri,
    selectedName,
    requestId,
  }: SelectionCompletion): Promise<string | undefined> {
    const fileType = this.decoration.fileTypeForName(selectedName);
    if (!selectedName || fileType === undefined) {
      return "";
    }
    if (!sourceDocument || !sourceUri) {
      return fileType;
    }
    return this.applySelectionOutcome({
      sourceDocument,
      sourceUri,
      fileType,
      requestId,
    });
  }

  private async applySelectionOutcome({
    sourceDocument,
    sourceUri,
    fileType,
    requestId,
  }: ActiveSelection): Promise<string | undefined> {
    if (!this.isLatestRequest(sourceUri, requestId)) {
      return undefined;
    }
    const result = await this.applySelection(
      sourceDocument,
      fileType,
      requestId,
    );
    if (result === undefined || !this.isLatestRequest(sourceUri, requestId)) {
      return undefined;
    }
    return result ? fileType : "";
  }

  private async applySelection(
    sourceDocument: vscode.TextDocument,
    fileType: string,
    requestId: number,
  ): Promise<boolean | undefined> {
    let request = this.renderSession.beginSelection(sourceDocument, fileType);
    if (fileType === clearFileType) {
      return true;
    }
    if (!this.renderSession.isCurrentRequest(request)) {
      return false;
    }
    return this.applyCurrentSelection(request, requestId);
  }

  private async applyCurrentSelection(
    request: RenderRequest,
    requestId: number,
  ): Promise<boolean | undefined> {
    const reload = await this.reloadIfNeeded(request, requestId);
    if (reload === undefined || reload === false) {
      return reload;
    }
    if (!this.renderSession.activateSelection(reload)) {
      return undefined;
    }
    return this.renderSession.render(reload);
  }

  private async reloadIfNeeded(
    request: RenderRequest,
    requestId: number,
  ): Promise<RenderRequest | false | undefined> {
    const previous = this.reloadTailByUri.get(request.uri);
    if (previous) {
      await previous;
    }
    if (!this.isCurrentSelection(request, requestId)) {
      return undefined;
    }
    return this.reloadCurrentDocument(request, requestId);
  }

  private async reloadCurrentDocument(
    request: RenderRequest,
    requestId: number,
  ): Promise<RenderRequest | false | undefined> {
    const document = this.renderSession.findOpenDocument(request.uri);
    if (!document) {
      return this.resolveReloadResult(request, requestId, {
        ok: false,
        code: "CLOSED_DOCUMENT",
      });
    }
    const currentRequest = this.renderSession.requestForDocument(
      request,
      document,
    );
    return this.reloadForRequiredEncoding(currentRequest, requestId);
  }

  private async reloadForRequiredEncoding(
    request: RenderRequest,
    requestId: number,
  ): Promise<RenderRequest | false | undefined> {
    const requiredEncoding = this.decoration.encodingForFileType(
      request.fileType,
    );
    if (!requiredEncoding || request.encoding === requiredEncoding) {
      return request;
    }
    return this.reloadForSelectionEncoding(
      request,
      requestId,
      requiredEncoding,
    );
  }

  private async reloadForSelectionEncoding(
    request: RenderRequest,
    requestId: number,
    encoding: string,
  ): Promise<RenderRequest | false | undefined> {
    const result = await this.reloadForSelection(request, requestId, encoding);
    return this.resolveReloadResult(request, requestId, result);
  }

  private resolveReloadResult(
    request: RenderRequest,
    requestId: number,
    result: DocumentEncodingResult | undefined,
  ): RenderRequest | false | undefined {
    if (result?.ok) {
      return this.renderSession.requestForDocument(request, result.document);
    }
    if (result && this.isCurrentSelection(request, requestId)) {
      this.notifyReloadFailure(result);
    }
    return result === undefined ? undefined : false;
  }

  private isCurrentSelection(
    request: RenderRequest,
    requestId: number,
  ): boolean {
    return (
      this.isLatestRequest(request.uri, requestId) &&
      this.renderSession.isGenerationCurrent(request.uri, request.generation)
    );
  }

  private async reloadForSelection(
    request: RenderRequest,
    requestId: number,
    encoding: string,
  ): Promise<DocumentEncodingResult | undefined> {
    const previous = this.reloadTailByUri.get(request.uri) ?? Promise.resolve();
    const operation = previous.then(() =>
      this.performReload(request, requestId, encoding),
    );
    const tail = operation.then(
      () => undefined,
      () => undefined,
    );
    this.reloadTailByUri.set(request.uri, tail);
    try {
      return await operation;
    } catch {
      return { ok: false, code: "RELOAD_FAILED" };
    } finally {
      if (this.reloadTailByUri.get(request.uri) === tail) {
        this.reloadTailByUri.delete(request.uri);
      }
    }
  }

  private async performReload(
    request: RenderRequest,
    requestId: number,
    encoding: string,
  ): Promise<DocumentEncodingResult | undefined> {
    if (
      !this.isLatestRequest(request.uri, requestId) ||
      !this.renderSession.isGenerationCurrent(request.uri, request.generation)
    ) {
      return undefined;
    }
    const currentDocument = this.renderSession.findOpenDocument(request.uri);
    return currentDocument
      ? ensureDocumentEncoding(currentDocument, encoding)
      : { ok: false, code: "CLOSED_DOCUMENT" };
  }

  private notifyReloadFailure(
    result: Extract<DocumentEncodingResult, { ok: false }>,
  ): void {
    const messages: Record<DocumentEncodingFailureCode, string> = {
      DIRTY_DOCUMENT:
        "未保存の変更があるため、指定文字コードで再読込できません。保存してから形式を再選択してください。",
      UNTITLED_DOCUMENT:
        "名前のない文書は指定文字コードで再読込できません。保存してから形式を再選択してください。",
      CLOSED_DOCUMENT:
        "文書が閉じられたため、形式を適用できません。再度選択してください。",
      ENCODING_MISMATCH:
        "指定文字コードで文書を読み込めませんでした。形式を再選択してください。",
      RELOAD_FAILED:
        "指定文字コードで文書を読み込めませんでした。形式を再選択してください。",
    };
    void vscode.window.showWarningMessage(messages[result.code]);
  }

  private beginRequest(uri: string): number {
    const requestId = (this.requestByUri.get(uri) ?? 0) + 1;
    this.requestByUri.set(uri, requestId);
    return requestId;
  }

  private isLatestRequest(uri: string, requestId: number): boolean {
    return !this.disposed && this.requestByUri.get(uri) === requestId;
  }

  public dispose(): void {
    this.disposed = true;
    this.requestByUri.clear();
    this.reloadTailByUri.clear();
  }
}
