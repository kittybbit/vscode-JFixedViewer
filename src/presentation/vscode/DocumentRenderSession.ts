import * as vscode from "vscode";
import type {
  FixedWidthAnalysis,
  FixedWidthDecorationPort,
  FixedWidthLine,
} from "../../application/fixedWidth/FixedWidthDecoration";
import {
  createFieldDecorations,
  groupFieldsByLine,
  readBoundarySettings,
} from "./decorationStyle";
import {
  EditorDecorations,
  type EditorDecorationUpdate,
} from "./EditorDecorations";
import { DocumentDiagnostics, readValidationEnabled } from "./diagnostics";

const renderDelay = 100;

export type RenderRequest = {
  readonly document: vscode.TextDocument;
  readonly uri: string;
  readonly fileType: string;
  readonly generation: number;
  readonly version: number;
  readonly encoding: string;
};

type CreateRenderRequest = Pick<
  RenderRequest,
  "document" | "uri" | "fileType" | "generation"
>;

type ApplyAnalysis = {
  request: RenderRequest;
  analysis: FixedWidthAnalysis;
  lines: readonly FixedWidthLine[];
  settings: ReturnType<typeof readBoundarySettings>;
};

type PendingRender = {
  request: RenderRequest;
  timeout: ReturnType<typeof setTimeout>;
};

type ConfiguredDocument = {
  uri: string;
  fileType: string;
  document: vscode.TextDocument;
};

type RenderedDocument = {
  request: RenderRequest;
  update: EditorDecorationUpdate;
};

type InFlightRender = {
  generation: number;
  promise: Promise<boolean | undefined>;
};

export class DocumentRenderSession implements vscode.Disposable {
  private readonly fileTypeByDocument = new Map<string, string>();
  private readonly currentDocumentByUri = new Map<
    string,
    vscode.TextDocument
  >();
  private readonly lastEncodingByUri = new Map<string, string>();
  private readonly renderGenerationByUri = new Map<string, number>();
  private readonly renderedByUri = new Map<string, RenderedDocument>();
  private readonly inFlightByUri = new Map<string, InFlightRender>();
  private readonly pendingRenderByDocument = new Map<string, PendingRender>();
  private readonly diagnostics = new DocumentDiagnostics();
  private disposed = false;

  public constructor(
    private readonly decoration: FixedWidthDecorationPort,
    private readonly editorDecorations: EditorDecorations,
  ) {}

  public beginSelection(
    document: vscode.TextDocument,
    fileType: string,
  ): RenderRequest {
    const uri = document.uri.toString();
    this.cancelPendingRender(document);
    const preserveTypes =
      fileType !== "clear@clear" &&
      this.fileTypeByDocument.get(uri) === fileType;
    const generation = this.invalidateRendering(uri);
    this.clearSelection(uri, preserveTypes);
    return this.createRequest({ document, uri, fileType, generation });
  }

  public requestForDocument(
    request: RenderRequest,
    document: vscode.TextDocument,
  ): RenderRequest {
    return this.createRequest({
      document,
      uri: request.uri,
      fileType: request.fileType,
      generation: request.generation,
    });
  }

  public isCurrentRequest(request: RenderRequest): boolean {
    return (
      this.isGenerationCurrent(request.uri, request.generation) &&
      this.isOpenDocument(request.document)
    );
  }

  public isGenerationCurrent(uri: string, generation: number): boolean {
    return !this.disposed && this.renderGenerationByUri.get(uri) === generation;
  }

  public activateSelection(request: RenderRequest): boolean {
    if (
      !this.isCurrentRequest(request) ||
      request.document.version !== request.version ||
      request.document.encoding !== request.encoding
    ) {
      return false;
    }
    this.fileTypeByDocument.set(request.uri, request.fileType);
    this.currentDocumentByUri.set(request.uri, request.document);
    this.lastEncodingByUri.set(request.uri, request.encoding);
    return true;
  }

  public getSelectedFileType(uri: string): string | undefined {
    return this.fileTypeByDocument.get(uri);
  }

  public findOpenDocument(uri: string): vscode.TextDocument | undefined {
    return vscode.workspace.textDocuments.find(
      (document) => document.uri.toString() === uri,
    );
  }

  public async render(request: RenderRequest): Promise<boolean | undefined> {
    if (!this.isCurrentRender(request)) {
      return undefined;
    }
    const existing = this.inFlightByUri.get(request.uri);
    if (existing?.generation === request.generation) {
      return existing.promise;
    }
    return this.trackRender(request);
  }

  public handleTextDocumentChange(
    document: vscode.TextDocument,
    hasContentChanges: boolean,
  ): void {
    if (this.handleEncodingMismatch(document)) {
      return;
    }
    if (this.hasEncodingChanged(document) || hasContentChanges) {
      this.scheduleRender(document);
    }
  }

  private handleEncodingMismatch(document: vscode.TextDocument): boolean {
    const uri = document.uri.toString();
    const selectedType = this.fileTypeByDocument.get(uri);
    const requiredEncoding = selectedType
      ? this.decoration.encodingForFileType(selectedType)
      : undefined;
    if (!requiredEncoding || document.encoding === requiredEncoding) {
      return false;
    }
    this.invalidateRendering(uri);
    this.cancelPendingRender(document);
    this.clearSelection(uri);
    void vscode.window.showInformationMessage(
      "文書の文字コードが選択形式と異なります。形式を再選択してください。",
    );
    return true;
  }

  public closeDocument(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    this.invalidateRendering(uri);
    this.cancelPendingRender(document);
    this.currentDocumentByUri.delete(uri);
    this.lastEncodingByUri.delete(uri);
    this.diagnostics.deleteUri(uri);
    this.editorDecorations.clearDocument(uri);
  }

  public updateConfiguredDocuments(
    event: vscode.ConfigurationChangeEvent,
  ): void {
    for (const selected of this.configuredDocuments(event)) {
      this.updateConfiguredDocument(selected);
    }
  }

  private configuredDocuments(
    event: vscode.ConfigurationChangeEvent,
  ): ConfiguredDocument[] {
    return [...this.fileTypeByDocument].flatMap(([uri, fileType]) => {
      const document = this.findOpenDocument(uri);
      return document &&
        event.affectsConfiguration("jfixedviewer", document.uri)
        ? [{ uri, fileType, document }]
        : [];
    });
  }

  private updateConfiguredDocument({
    uri,
    fileType,
    document,
  }: ConfiguredDocument): void {
    this.cancelPendingRender(document);
    const generation = this.invalidateRendering(uri);
    if (!this.hasVisibleSelection(uri)) {
      return;
    }
    void this.render(
      this.createRequest({
        document,
        uri,
        fileType,
        generation,
      }),
    );
  }

  public updateVisibleEditors(editors: readonly vscode.TextEditor[]): void {
    if (this.disposed) {
      return;
    }
    this.editorDecorations.clearHidden(editors);
    this.cancelRendersForHiddenDocuments(editors);
    this.diagnostics.clearHidden(this.fileTypeByDocument.keys(), editors);
    this.editorDecorations.reconcileVisibleEditors(
      editors,
      (editor, renderAlreadyStarted) =>
        this.planVisibleEditor(editor, renderAlreadyStarted),
    );
  }

  private async trackRender(
    request: RenderRequest,
  ): Promise<boolean | undefined> {
    const promise = this.analyzeAndApply(request);
    this.inFlightByUri.set(request.uri, {
      generation: request.generation,
      promise,
    });
    try {
      return await promise;
    } finally {
      if (this.inFlightByUri.get(request.uri)?.promise === promise) {
        this.inFlightByUri.delete(request.uri);
      }
    }
  }

  private async analyzeAndApply(
    request: RenderRequest,
  ): Promise<boolean | undefined> {
    const lines = [...this.documentLines(request.document)];
    const settings = readBoundarySettings(request.document.uri);
    const analysis = await this.analyze(request, lines);
    if (!this.isCurrentSnapshot(request)) {
      return undefined;
    }
    return this.finishAnalysis({ request, analysis, lines, settings });
  }

  private finishAnalysis(input: ApplyAnalysis): boolean {
    if (input.analysis.failure) {
      this.clearSelection(input.request.uri);
      void vscode.window.showWarningMessage(
        "文字コードを安全に確認できません。形式を再選択してください。",
      );
      return false;
    }
    return this.hasVisibleSelection(input.request.uri)
      ? this.applyAnalysis(input)
      : true;
  }

  private async analyze(
    request: RenderRequest,
    lines: readonly FixedWidthLine[],
  ): Promise<FixedWidthAnalysis> {
    try {
      return await this.decoration.analyze({
        fileType: request.fileType,
        lines,
        validationEnabled: readValidationEnabled(request.document.uri),
        currentEncoding: request.encoding,
      });
    } catch {
      return { fields: [], issues: [], failure: "ENCODING_FAILED" };
    }
  }

  private applyAnalysis({
    request,
    analysis,
    lines,
    settings,
  }: ApplyAnalysis): true {
    const update: EditorDecorationUpdate = {
      fileType: request.fileType,
      decorations: createFieldDecorations(analysis.fields, lines, settings),
      fieldsByLine: groupFieldsByLine(analysis.fields),
      hasFieldMetadata: analysis.fields.some(
        (field) => field.fieldName !== undefined,
      ),
    };
    this.diagnostics.set(request.document, analysis.issues);
    this.renderedByUri.set(request.uri, { request, update });
    this.lastEncodingByUri.set(request.uri, request.encoding);
    for (const editor of vscode.window.visibleTextEditors) {
      if (this.editorMatchesRequest(editor, request)) {
        this.editorDecorations.apply(editor, update);
      }
    }
    return true;
  }

  private editorMatchesRequest(
    editor: vscode.TextEditor,
    request: RenderRequest,
  ): boolean {
    return (
      editor.document.uri.toString() === request.uri &&
      editor.document.version === request.version &&
      editor.document.encoding === request.encoding
    );
  }

  private hasEncodingChanged(document: vscode.TextDocument): boolean {
    const uri = document.uri.toString();
    const previous = this.lastEncodingByUri.get(uri);
    if (previous === undefined || previous === document.encoding) {
      return false;
    }
    this.lastEncodingByUri.set(uri, document.encoding);
    return true;
  }

  private createRequest({
    document,
    uri,
    fileType,
    generation,
  }: CreateRenderRequest): RenderRequest {
    return {
      document,
      uri,
      fileType,
      generation,
      version: document.version,
      encoding: document.encoding,
    };
  }

  private isCurrentRender(request: RenderRequest): boolean {
    return (
      this.isCurrentRequest(request) &&
      this.fileTypeByDocument.get(request.uri) === request.fileType &&
      this.currentDocumentByUri.get(request.uri) === request.document
    );
  }

  private isCurrentSnapshot(request: RenderRequest): boolean {
    return (
      this.isCurrentRender(request) &&
      request.document.version === request.version &&
      request.document.encoding === request.encoding
    );
  }

  private renderedRequestMatches(
    rendered: RenderedDocument,
    request: RenderRequest,
  ): boolean {
    const cached = rendered.request;
    return (
      cached.document === request.document &&
      cached.fileType === request.fileType &&
      cached.version === request.version &&
      cached.encoding === request.encoding
    );
  }

  public scheduleRender(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    this.cancelPendingRender(document);
    const generation = this.invalidateRendering(uri);
    if (!this.hasVisibleSelection(uri)) {
      return;
    }
    const fileType = this.fileTypeByDocument.get(uri);
    if (fileType === undefined) {
      return;
    }
    const request = this.createRequest({ document, uri, fileType, generation });
    const timeout = setTimeout(
      () => this.renderPendingDocument(request),
      renderDelay,
    );
    this.pendingRenderByDocument.set(uri, { request, timeout });
  }

  private renderPendingDocument(request: RenderRequest): void {
    const pending = this.pendingRenderByDocument.get(request.uri);
    if (pending?.request !== request) {
      return;
    }
    this.pendingRenderByDocument.delete(request.uri);
    if (this.hasVisibleSelection(request.uri)) {
      this.currentDocumentByUri.set(request.uri, request.document);
      void this.render(request);
    }
  }

  private cancelPendingRender(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    const pending = this.pendingRenderByDocument.get(uri);
    if (pending?.request.document !== document) {
      return;
    }
    clearTimeout(pending.timeout);
    this.pendingRenderByDocument.delete(uri);
  }

  private invalidateRendering(uri: string): number {
    const generation = (this.renderGenerationByUri.get(uri) ?? 0) + 1;
    this.renderGenerationByUri.set(uri, generation);
    this.renderedByUri.delete(uri);
    return generation;
  }

  private clearSelection(uri: string, preserveTypes = false): void {
    this.fileTypeByDocument.delete(uri);
    this.currentDocumentByUri.delete(uri);
    this.lastEncodingByUri.delete(uri);
    this.renderedByUri.delete(uri);
    this.diagnostics.deleteUri(uri);
    this.editorDecorations.clearSelection(uri, preserveTypes);
  }

  private hasVisibleSelection(uri: string): boolean {
    return (
      !this.disposed &&
      this.fileTypeByDocument.has(uri) &&
      vscode.window.visibleTextEditors.some(
        (editor) => editor.document.uri.toString() === uri,
      )
    );
  }

  private cancelRendersForHiddenDocuments(
    editors: readonly vscode.TextEditor[],
  ): void {
    const visibleUris = new Set(
      editors.map((editor) => editor.document.uri.toString()),
    );
    for (const uri of this.fileTypeByDocument.keys()) {
      this.invalidateIfHidden(uri, visibleUris);
    }
  }

  private invalidateIfHidden(
    uri: string,
    visibleUris: ReadonlySet<string>,
  ): void {
    if (visibleUris.has(uri)) {
      return;
    }
    const pending = this.pendingRenderByDocument.get(uri);
    if (pending) {
      this.cancelPendingRender(pending.request.document);
    }
    this.invalidateRendering(uri);
  }

  private planVisibleEditor(
    editor: vscode.TextEditor,
    renderAlreadyStarted: boolean,
  ) {
    const uri = editor.document.uri.toString();
    const fileType = this.fileTypeByDocument.get(uri);
    if (
      fileType === undefined ||
      renderAlreadyStarted ||
      this.handleEncodingMismatch(editor.document)
    ) {
      return { kind: "skip" } as const;
    }
    this.currentDocumentByUri.set(uri, editor.document);
    const request = this.createRequest({
      document: editor.document,
      uri,
      fileType,
      generation: this.renderGenerationByUri.get(uri) ?? 0,
    });
    const cached = this.renderedByUri.get(uri);
    if (cached && this.renderedRequestMatches(cached, request)) {
      return { kind: "cached", update: cached.update } as const;
    }
    const generation = this.invalidateRendering(uri);
    const renderRequest = this.createRequest({
      document: editor.document,
      uri,
      fileType,
      generation,
    });
    return {
      kind: "render",
      start: () => void this.render(renderRequest),
    } as const;
  }

  private isOpenDocument(document: vscode.TextDocument): boolean {
    return vscode.workspace.textDocuments.some((open) => open === document);
  }

  private *documentLines(
    document: vscode.TextDocument,
  ): Generator<FixedWidthLine> {
    for (let index = 0; index < document.lineCount; index += 1) {
      const line = document.lineAt(index);
      yield {
        line: index,
        text: line.text,
        isEmptyOrWhitespace: line.isEmptyOrWhitespace,
      };
    }
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const pending of this.pendingRenderByDocument.values()) {
      clearTimeout(pending.timeout);
    }
    this.pendingRenderByDocument.clear();
    this.diagnostics.dispose();
    this.fileTypeByDocument.clear();
    this.currentDocumentByUri.clear();
    this.lastEncodingByUri.clear();
    this.renderedByUri.clear();
    this.inFlightByUri.clear();
    this.renderGenerationByUri.clear();
  }
}
