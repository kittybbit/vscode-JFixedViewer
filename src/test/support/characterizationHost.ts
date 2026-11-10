import path = require("node:path");

type Disposable = { dispose(): void };
type Listener<T> = (value: T) => void;
type Position = { line: number; character: number };
type FakeDocument = {
  uri: { toString(): string };
  fileName: string;
  lines: string[];
  readonly lineCount: number;
  readonly lineAtCallCount: number;
  lineAt(index: number): { text: string; isEmptyOrWhitespace: boolean };
  getText(): string;
};

class CharacterizedDocument implements FakeDocument {
  public readonly uri: FakeDocument["uri"];
  public readonly fileName: string;
  public lines: string[];
  private lineAtCalls = 0;

  public constructor(fileName: string, lines: string[], uri: string) {
    this.uri = { toString: () => uri };
    this.fileName = fileName;
    this.lines = [...lines];
  }

  public get lineCount(): number {
    return this.lines.length;
  }

  public get lineAtCallCount(): number {
    return this.lineAtCalls;
  }

  public lineAt(index: number): {
    text: string;
    isEmptyOrWhitespace: boolean;
  } {
    this.lineAtCalls += 1;
    const text = this.lines[index];
    return { text, isEmptyOrWhitespace: /^\s*$/u.test(text) };
  }

  public getText(): string {
    return this.lines.join("\n");
  }
}
type DecorationOption = {
  range: { start: Position; end: Position };
  hoverMessage?: { value: string; isTrusted: boolean };
  renderOptions?: Record<string, unknown>;
};
type Configuration = {
  boundaryStyle?: unknown;
  boundaryColor?: unknown;
  boundaryWidth?: unknown;
};
type LoadedExtension = {
  activate(context: { subscriptions: Disposable[] }): unknown;
  deactivate(): void;
};

class FakeEventEmitter<T> {
  private listeners = new Set<Listener<T>>();
  private subscriptionCount = 0;
  private disposalCount = 0;

  public get subscriptionStats() {
    return {
      registered: this.subscriptionCount,
      disposed: this.disposalCount,
      active: this.listeners.size,
    };
  }

  public event = (
    listener: Listener<T>,
    _thisArgs?: unknown,
    disposables?: Disposable[],
  ): Disposable => {
    this.subscriptionCount += 1;
    this.listeners.add(listener);
    const disposable = {
      dispose: () => {
        this.disposalCount += 1;
        this.listeners.delete(listener);
      },
    };
    disposables?.push(disposable);
    return disposable;
  };

  public fire(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

class FakePosition {
  public constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

class FakeRange {
  public constructor(
    public readonly start: FakePosition,
    public readonly end: FakePosition,
  ) {}
}

class FakeMarkdownString {
  public isTrusted = false;

  public constructor(public readonly value: string) {}
}

class FakeThemeColor {
  public constructor(public readonly id: string) {}
}

class FakeDecorationType implements Disposable {
  public disposeCount = 0;

  public constructor(public readonly options: unknown) {}

  public dispose(): void {
    this.disposeCount += 1;
  }
}

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

export type FakeEditor = {
  document: FakeDocument;
  decorationCalls: Array<{
    type: FakeDecorationType;
    options: DecorationOption[];
  }>;
  setDecorations(type: FakeDecorationType, options: DecorationOption[]): void;
};

function createFakeWindow(
  host: CharacterizationHost,
  activeEditorEmitter: FakeEventEmitter<FakeEditor | undefined>,
  visibleEditorEmitter: FakeEventEmitter<readonly FakeEditor[]>,
) {
  return {
    get activeTextEditor() {
      return host.activeTextEditor;
    },
    get visibleTextEditors() {
      return host.visibleTextEditors;
    },
    showQuickPick: async () => {
      return host.nextQuickPick;
    },
    createTextEditorDecorationType: (options: unknown) => {
      const decoration = new FakeDecorationType(options);
      host.decorationTypes.push(decoration);
      return decoration;
    },
    onDidChangeActiveTextEditor: activeEditorEmitter.event,
    onDidChangeVisibleTextEditors: visibleEditorEmitter.event,
  };
}

function createFakeWorkspace(host: CharacterizationHost) {
  return {
    get textDocuments() {
      return host.textDocuments;
    },
    onDidChangeTextDocument: host.documentChangeEmitter.event,
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
  activeEditorEmitter: FakeEventEmitter<FakeEditor | undefined>,
  visibleEditorEmitter: FakeEventEmitter<readonly FakeEditor[]>,
): Record<string, unknown> {
  return {
    EventEmitter: FakeEventEmitter,
    Position: FakePosition,
    Range: FakeRange,
    MarkdownString: FakeMarkdownString,
    ThemeColor: FakeThemeColor,
    window: createFakeWindow(host, activeEditorEmitter, visibleEditorEmitter),
    workspace: createFakeWorkspace(host),
    commands: createFakeCommands(host),
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
  public readonly reporters: FakeReporter[] = [];
  public readonly documentChangeEmitter = new FakeEventEmitter<{
    document: FakeDocument;
    contentChanges: unknown[];
  }>();
  public readonly documentCloseEmitter = new FakeEventEmitter<FakeDocument>();
  public readonly configurationChangeEmitter = new FakeEventEmitter<{
    affectsConfiguration: (
      section: string,
      resource?: FakeDocument["uri"],
    ) => boolean;
  }>();
  public commandDisposalCount = 0;
  public nextQuickPick: string | undefined;
  public activeTextEditor: FakeEditor | undefined;
  public visibleTextEditors: readonly FakeEditor[] = [];

  private readonly activeEditorEmitter = new FakeEventEmitter<
    FakeEditor | undefined
  >();
  private readonly visibleEditorEmitter = new FakeEventEmitter<
    readonly FakeEditor[]
  >();
  private readonly documentsByUri = new Map<string, FakeDocument>();
  private readonly configurationByUri = new Map<string, Configuration>();
  private readonly vscode: Record<string, unknown>;
  private loadedExtension: LoadedExtension | undefined;
  private globalDescriptors = new Map<string, PropertyDescriptor | undefined>();
  private disposed = false;

  public constructor() {
    this.vscode = createFakeVscode(
      this,
      this.activeEditorEmitter,
      this.visibleEditorEmitter,
    );
  }

  public get textDocuments(): FakeDocument[] {
    return [...this.documentsByUri.values()];
  }

  public get eventSubscriptionStats() {
    return {
      activeEditor: this.activeEditorEmitter.subscriptionStats,
      visibleEditors: this.visibleEditorEmitter.subscriptionStats,
      documentChanges: this.documentChangeEmitter.subscriptionStats,
      documentClose: this.documentCloseEmitter.subscriptionStats,
    };
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
      decorationCalls: [],
      setDecorations(type, options) {
        this.decorationCalls.push({ type, options });
      },
    };
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

  public changeDocument(
    editor: FakeEditor,
    lines: string[],
    contentChangeCount = 1,
  ): void {
    editor.document.lines = [...lines];
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

    const document = new CharacterizedDocument(fileName, lines, uri);
    this.documentsByUri.set(uri, document);
    return document;
  }

  public async waitForPendingRender(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 125));
  }

  public async chooseFileType(label: string | undefined): Promise<void> {
    this.nextQuickPick = label;
    const command = this.registeredCommands.get(
      "vscode-JFixedViewer.FiletypePicker",
    );
    if (!command) {
      throw new Error("FiletypePicker コマンドが登録されていません。");
    }
    command();
    await Promise.resolve();
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
