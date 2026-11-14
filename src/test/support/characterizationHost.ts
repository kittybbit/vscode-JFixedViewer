import path = require("node:path");
import {
  CharacterizedDocument,
  FakeDecorationType,
  FakeDiagnostic,
  FakeDiagnosticCollection,
  FakeEventEmitter,
  FakeMarkdownString,
  FakePosition,
  FakeRange,
  FakeThemeColor,
  FakeUri,
  type Configuration,
  type DecorationOption,
  type Disposable,
  type EditorEvents,
  type FakeDocument,
} from "./fakeVscodeTypes";
import { decodeFakeText, encodeFakeText } from "./fakeTextEncoding";
import type { FakeEditor } from "./fakeVscodeTypes";

type LoadedExtension = {
  activate(context: { subscriptions: Disposable[] }): unknown;
  deactivate(): void;
};

class FakeReporter {
  public readonly events: Array<{
    name: string;
    properties?: Record<string, string>;
  }> = [];
  public disposeCount = 0;

  public constructor(
    public readonly connectionString: string,
    reporters: FakeReporter[],
  ) {
    reporters.push(this);
  }

  public sendTelemetryEvent(
    name: string,
    properties?: Record<string, string>,
  ): void {
    this.events.push({ name, properties });
  }

  public dispose(): void {
    this.disposeCount += 1;
  }
}

type BuiltInDefinitionOverrides = Partial<
  Record<"clear" | "jpx" | "zengin", unknown>
>;

function addDefinitionOverrides(
  mockedModules: Map<string, unknown>,
  definitionOverrides: BuiltInDefinitionOverrides,
): void {
  for (const [name, definition] of Object.entries(definitionOverrides)) {
    if (definition !== undefined) {
      mockedModules.set(`../../resource/definitions/${name}.json`, definition);
    }
  }
}

function createFakeWindow(
  host: CharacterizationHost,
  editorEvents: EditorEvents,
) {
  return {
    get activeTextEditor() {
      return host.activeTextEditor;
    },
    get visibleTextEditors() {
      return host.visibleTextEditors;
    },
    showQuickPick: async () => {
      return host.quickPickHandler
        ? host.quickPickHandler()
        : host.nextQuickPick;
    },
    showWarningMessage: async (message: string) => {
      host.windowMessages.push(message);
    },
    showInformationMessage: async (message: string) => {
      host.windowMessages.push(message);
    },
    createTextEditorDecorationType: (options: unknown) => {
      const decoration = new FakeDecorationType(options);
      host.decorationTypes.push(decoration);
      return decoration;
    },
    onDidChangeActiveTextEditor: editorEvents.active.event,
    onDidChangeVisibleTextEditors: editorEvents.visible.event,
    onDidChangeTextEditorSelection: editorEvents.selection.event,
  };
}

function createFakeWorkspace(host: CharacterizationHost) {
  return {
    get textDocuments() {
      return host.textDocuments;
    },
    openTextDocument: (uri: FakeUri, options: { encoding: string }) =>
      host.openTextDocument(uri, options.encoding),
    encode: (text: string, options: { encoding: string }) =>
      host.encodeText(text, options.encoding),
    decode: (bytes: Uint8Array, options: { encoding: string }) =>
      host.decodeText(bytes, options.encoding),
    onDidChangeTextDocument: host.documentChangeEmitter.event,
    onDidSaveTextDocument: host.documentSaveEmitter.event,
    onDidCloseTextDocument: host.documentCloseEmitter.event,
    onDidChangeConfiguration: host.configurationChangeEmitter.event,
    getConfiguration: (_section: string, resource: FakeDocument["uri"]) => ({
      get: <T>(name: keyof Configuration): T | undefined =>
        host.configurationFor(resource.toString())[name] as T | undefined,
    }),
  };
}

function createFakeCommands(host: CharacterizationHost) {
  return {
    registerCommand: (
      name: string,
      callback: (...args: unknown[]) => unknown,
    ) => {
      host.registeredCommands.set(name, callback);
      return {
        dispose: () => {
          host.commandDisposalCount += 1;
          host.registeredCommands.delete(name);
        },
      };
    },
  };
}

function createFakeVscode(
  host: CharacterizationHost,
  editorEvents: EditorEvents,
): Record<string, unknown> {
  return {
    EventEmitter: FakeEventEmitter,
    Uri: FakeUri,
    Position: FakePosition,
    Range: FakeRange,
    MarkdownString: FakeMarkdownString,
    Diagnostic: FakeDiagnostic,
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    ThemeColor: FakeThemeColor,
    window: createFakeWindow(host, editorEvents),
    workspace: createFakeWorkspace(host),
    commands: createFakeCommands(host),
    languages: {
      createDiagnosticCollection: (name: string) => {
        const collection = new FakeDiagnosticCollection(name);
        host.diagnosticCollections.push(collection);
        return collection;
      },
    },
  };
}

type TimerCallback = () => void;
type ScheduledTimer = { callback: TimerCallback; dueAt: number };

class FakeTimerClock {
  private readonly timers = new Map<number, ScheduledTimer>();
  private readonly previousSetTimeout = Object.getOwnPropertyDescriptor(
    globalThis,
    "setTimeout",
  );
  private readonly previousClearTimeout = Object.getOwnPropertyDescriptor(
    globalThis,
    "clearTimeout",
  );
  private nextTimerId = 0;
  private now = 0;

  public get pendingCount(): number {
    return this.timers.size;
  }

  public install(): void {
    const runtimeGlobal = globalThis as unknown as Record<string, unknown>;
    runtimeGlobal.setTimeout = (callback: TimerCallback, milliseconds = 0) =>
      this.schedule(callback, milliseconds);
    runtimeGlobal.clearTimeout = (timerId: number) => {
      this.timers.delete(timerId);
    };
  }

  public advanceBy(milliseconds: number): void {
    const target = this.now + milliseconds;
    let timer = this.nextDueTimer(target);
    while (timer) {
      this.timers.delete(timer.id);
      this.now = timer.scheduled.dueAt;
      timer.scheduled.callback();
      timer = this.nextDueTimer(target);
    }
    this.now = target;
  }

  public restore(): void {
    this.timers.clear();
    this.restoreGlobal("setTimeout", this.previousSetTimeout);
    this.restoreGlobal("clearTimeout", this.previousClearTimeout);
  }

  private schedule(callback: TimerCallback, milliseconds: number): number {
    const timerId = ++this.nextTimerId;
    this.timers.set(timerId, {
      callback,
      dueAt: this.now + Math.max(milliseconds, 0),
    });
    return timerId;
  }

  private nextDueTimer(
    target: number,
  ): { id: number; scheduled: ScheduledTimer } | undefined {
    return [...this.timers.entries()]
      .map(([id, scheduled]) => ({ id, scheduled }))
      .filter(({ scheduled }) => scheduled.dueAt <= target)
      .sort((left, right) => left.scheduled.dueAt - right.scheduled.dueAt)[0];
  }

  private restoreGlobal(
    name: string,
    descriptor: PropertyDescriptor | undefined,
  ): void {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete (globalThis as unknown as Record<string, unknown>)[name];
    }
  }
}

export class CharacterizationHost {
  public readonly subscriptions: Disposable[] = [];
  public readonly registeredCommands = new Map<
    string,
    (...args: unknown[]) => unknown
  >();
  public readonly decorationTypes: FakeDecorationType[] = [];
  public readonly diagnosticCollections: FakeDiagnosticCollection[] = [];
  public readonly reporters: FakeReporter[] = [];
  public readonly windowMessages: string[] = [];
  public readonly openTextDocumentRequests: Array<{
    uri: string;
    encoding: string;
  }> = [];
  public encodeCallCount = 0;
  public decodeCallCount = 0;
  public replaceUnsupportedShiftJis = false;
  public encodeTextFailure = false;
  public decodeTextFailure = false;
  public encodeTextHook?: (
    text: string,
    encoding: string,
  ) => Promise<Uint8Array | undefined>;
  public decodeTextHook?: (
    bytes: Uint8Array,
    encoding: string,
  ) => Promise<string | undefined>;
  public readonly documentChangeEmitter = new FakeEventEmitter<{
    document: FakeDocument;
    contentChanges: unknown[];
  }>();
  public readonly documentCloseEmitter = new FakeEventEmitter<FakeDocument>();
  public readonly documentSaveEmitter = new FakeEventEmitter<FakeDocument>();
  public readonly configurationChangeEmitter = new FakeEventEmitter<{
    affectsConfiguration: (
      section: string,
      resource?: FakeDocument["uri"],
    ) => boolean;
  }>();
  public commandDisposalCount = 0;
  public nextQuickPick: string | undefined;
  public quickPickHandler: (() => Promise<string | undefined>) | undefined;
  public openTextDocumentFailure = false;
  public openTextDocumentHook:
    | ((
        uri: string,
        encoding: string,
        previous: FakeDocument,
      ) => Promise<FakeDocument>)
    | undefined;
  public activeTextEditor: FakeEditor | undefined;
  public visibleTextEditors: readonly FakeEditor[] = [];

  private readonly activeEditorEmitter = new FakeEventEmitter<
    FakeEditor | undefined
  >();
  private readonly visibleEditorEmitter = new FakeEventEmitter<
    readonly FakeEditor[]
  >();
  private readonly selectionEmitter = new FakeEventEmitter<{
    textEditor: FakeEditor;
  }>();
  private readonly documentsByUri = new Map<string, FakeDocument>();
  private readonly editors = new Set<FakeEditor>();
  private readonly configurationByUri = new Map<string, Configuration>();
  private readonly vscode: Record<string, unknown>;
  private loadedExtension: LoadedExtension | undefined;
  private globalDescriptors = new Map<string, PropertyDescriptor | undefined>();
  private disposed = false;

  public constructor(
    private readonly definitionOverrides: BuiltInDefinitionOverrides = {},
  ) {
    this.vscode = createFakeVscode(this, {
      active: this.activeEditorEmitter,
      visible: this.visibleEditorEmitter,
      selection: this.selectionEmitter,
    });
  }

  public get textDocuments(): FakeDocument[] {
    return [...this.documentsByUri.values()];
  }

  public get eventSubscriptionStats() {
    return {
      activeEditor: this.activeEditorEmitter.subscriptionStats,
      visibleEditors: this.visibleEditorEmitter.subscriptionStats,
      editorSelections: this.selectionEmitter.subscriptionStats,
      documentChanges: this.documentChangeEmitter.subscriptionStats,
      documentClose: this.documentCloseEmitter.subscriptionStats,
    };
  }

  public diagnosticsFor(
    editor: FakeEditor,
  ): readonly FakeDiagnostic[] | undefined {
    return this.diagnosticCollections[0]?.get(editor.document.uri as FakeUri);
  }

  public start(): void {
    this.installTestGlobals();
    let extension: LoadedExtension;
    try {
      extension = this.loadExtension();
    } catch (error) {
      this.restoreGlobals();
      throw error;
    }
    this.loadedExtension = extension;
    this.activateExtension(extension);
  }

  public createEditor(
    fileName: string,
    lines: string[],
    uri = fileName,
  ): FakeEditor {
    const document = this.getOrCreateDocument(fileName, lines, uri);
    const editor: FakeEditor = {
      document,
      selection: { active: { line: 0, character: 0 } },
      decorationCalls: [],
      setDecorations(type, options) {
        this.decorationCalls.push({ type, options });
      },
    };
    this.editors.add(editor);
    return editor;
  }

  public setActiveEditor(editor: FakeEditor | undefined): void {
    this.activeTextEditor = editor;
    this.setVisibleEditors(editor ? [editor] : []);
    this.activeEditorEmitter.fire(editor);
  }

  public setVisibleEditors(editors: readonly FakeEditor[]): void {
    this.visibleTextEditors = editors;
    this.visibleEditorEmitter.fire(editors);
  }

  public setSelection(
    editor: FakeEditor,
    line: number,
    character: number,
  ): void {
    editor.selection.active = { line, character };
    this.selectionEmitter.fire({ textEditor: editor });
  }

  public changeDocument(
    editor: FakeEditor,
    lines: string[],
    contentChangeCount = 1,
  ): void {
    editor.document.lines = [...lines];
    editor.document.version += 1;
    editor.document.isDirty = true;
    this.documentChangeEmitter.fire({
      document: editor.document,
      contentChanges: Array.from({ length: contentChangeCount }, () => ({})),
    });
  }

  public sendEmptyDocumentChange(editor: FakeEditor): void {
    this.documentChangeEmitter.fire({
      document: editor.document,
      contentChanges: [],
    });
  }

  public setDocumentEncoding(editor: FakeEditor, encoding: string): void {
    editor.document.encoding = encoding;
    this.documentChangeEmitter.fire({
      document: editor.document,
      contentChanges: [],
    });
  }

  public saveDocument(editor: FakeEditor): void {
    editor.document.isDirty = false;
    this.documentSaveEmitter.fire(editor.document);
  }

  public async openTextDocument(
    uri: FakeUri,
    encoding: string,
  ): Promise<FakeDocument> {
    const uriString = uri.toString();
    this.openTextDocumentRequests.push({ uri: uriString, encoding });
    if (this.openTextDocumentFailure) {
      throw new Error("simulated read failure");
    }
    return this.reloadDocument(uriString, encoding);
  }

  private async reloadDocument(
    uri: string,
    encoding: string,
  ): Promise<FakeDocument> {
    const previous = this.openDocumentForReload(uri);
    const reloaded = await this.createReloadedDocument(uri, encoding, previous);
    this.documentsByUri.set(uri, reloaded);
    this.updateEditorDocuments(previous, reloaded);
    return reloaded;
  }

  private openDocumentForReload(uri: string): FakeDocument {
    const previous = this.documentsByUri.get(uri);
    if (!previous) {
      throw new Error("document is closed");
    }
    return previous;
  }

  private async createReloadedDocument(
    uri: string,
    encoding: string,
    previous: FakeDocument,
  ): Promise<FakeDocument> {
    return this.openTextDocumentHook
      ? this.openTextDocumentHook(uri, encoding, previous)
      : new CharacterizedDocument({
          fileName: previous.fileName,
          lines: previous.lines,
          uri,
          encoding,
        });
  }

  private updateEditorDocuments(
    previous: FakeDocument,
    reloaded: FakeDocument,
  ): void {
    for (const editor of this.editors) {
      if (editor.document === previous) {
        editor.document = reloaded;
      }
    }
  }

  public async encodeText(text: string, encoding: string): Promise<Uint8Array> {
    this.encodeCallCount += 1;
    if (this.encodeTextFailure) {
      throw new Error("simulated encode failure");
    }
    const hookedBytes = await this.encodeTextHook?.(text, encoding);
    if (hookedBytes) {
      return hookedBytes;
    }
    return encodeFakeText(text, encoding, this.replaceUnsupportedShiftJis);
  }

  public async decodeText(
    bytes: Uint8Array,
    encoding: string,
  ): Promise<string> {
    this.decodeCallCount += 1;
    if (this.decodeTextFailure) {
      throw new Error("simulated decode failure");
    }
    const hookedText = await this.decodeTextHook?.(bytes, encoding);
    if (hookedText !== undefined) {
      return hookedText;
    }
    return decodeFakeText(bytes, encoding);
  }

  public setConfiguration(uri: string, configuration: Configuration): void {
    this.configurationByUri.set(uri, configuration);
    this.configurationChangeEmitter.fire({
      affectsConfiguration: (section, resource) =>
        section === "jfixedviewer" && resource?.toString() === uri,
    });
  }

  public configurationFor(uri: string): Configuration {
    return this.configurationByUri.get(uri) ?? {};
  }

  public closeDocument(editor: FakeEditor): void {
    const uri = editor.document.uri.toString();
    this.setVisibleEditors(
      this.visibleTextEditors.filter(
        (visible) => visible.document.uri.toString() !== uri,
      ),
    );
    this.documentCloseEmitter.fire(editor.document);
    this.documentsByUri.delete(uri);
    this.editors.delete(editor);
  }

  public useFakeTimers(): FakeTimerClock {
    const clock = new FakeTimerClock();
    clock.install();
    return clock;
  }

  private getOrCreateDocument(
    fileName: string,
    lines: string[],
    uri: string,
  ): FakeDocument {
    const existingDocument = this.documentsByUri.get(uri);
    if (existingDocument) {
      return existingDocument;
    }

    const document = new CharacterizedDocument({ fileName, lines, uri });
    this.documentsByUri.set(uri, document);
    return document;
  }

  public async waitForPendingRender(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 125));
    await this.waitForAnalysis();
  }

  public async waitForAnalysis(): Promise<void> {
    for (let turn = 0; turn < 10; turn += 1) {
      await Promise.resolve();
    }
  }

  public async chooseFileType(label: string | undefined): Promise<void> {
    this.nextQuickPick = label;
    const command = this.registeredCommands.get(
      "vscode-JFixedViewer.FiletypePicker",
    );
    if (!command) {
      throw new Error("FiletypePicker コマンドが登録されていません。");
    }
    await command();
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    try {
      for (const subscription of [...this.subscriptions].reverse()) {
        subscription.dispose();
      }
      this.loadedExtension?.deactivate();
    } finally {
      this.restoreGlobals();
    }
  }

  private installTestGlobals(): void {
    const runtimeGlobal = globalThis as unknown as Record<string, unknown>;
    for (const name of ["CONNECTION_STRING", "DEVELOPMENT"]) {
      this.globalDescriptors.set(
        name,
        Object.getOwnPropertyDescriptor(globalThis, name),
      );
    }
    runtimeGlobal.CONNECTION_STRING = "sdd-characterization-dummy";
    runtimeGlobal.DEVELOPMENT = false;
  }

  private clearExtensionCache(): void {
    const extensionModulePath = require.resolve("../../extension");
    const extensionRoot = path.dirname(extensionModulePath);
    for (const cachedPath of Object.keys(require.cache)) {
      const isExtensionModule = cachedPath.startsWith(
        `${extensionRoot}${path.sep}`,
      );
      const isTestModule = cachedPath.includes(`${path.sep}test${path.sep}`);
      if (isExtensionModule && !isTestModule) {
        delete require.cache[cachedPath];
      }
    }
  }

  private loadExtension(): LoadedExtension {
    this.clearExtensionCache();
    const moduleApi = require("node:module") as {
      _load: (request: string, parent: unknown, isMain: boolean) => unknown;
    };
    const originalLoad = moduleApi._load;
    const reporters = this.reporters;
    const mockedModules = new Map<string, unknown>([
      ["vscode", this.vscode],
      [
        "@vscode/extension-telemetry",
        {
          __esModule: true,
          default: class extends FakeReporter {
            public constructor(connectionString: string) {
              super(connectionString, reporters);
            }
          },
        },
      ],
    ]);
    addDefinitionOverrides(mockedModules, this.definitionOverrides);

    moduleApi._load = (request, parent, isMain) => {
      const replacement = mockedModules.get(request);
      return replacement === undefined
        ? originalLoad(request, parent, isMain)
        : replacement;
    };
    try {
      return require("../../extension") as LoadedExtension;
    } finally {
      moduleApi._load = originalLoad;
    }
  }

  private activateExtension(extension: LoadedExtension): void {
    const originalLog = console.log;
    const originalInfo = console.info;
    try {
      console.log = () => {};
      console.info = () => {};
      extension.activate({ subscriptions: this.subscriptions });
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
    }
  }

  private restoreGlobals(): void {
    const runtimeGlobal = globalThis as unknown as Record<string, unknown>;
    for (const [name, descriptor] of this.globalDescriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete runtimeGlobal[name];
      }
    }
    this.globalDescriptors.clear();
  }
}
