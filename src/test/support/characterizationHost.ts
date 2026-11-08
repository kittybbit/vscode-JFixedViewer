import path = require("node:path");

type Disposable = { dispose(): void };
type Listener<T> = (value: T) => void;
type Position = { line: number; character: number };
type DecorationOption = {
  range: { start: Position; end: Position };
  hoverMessage?: { value: string; isTrusted: boolean };
};
type LoadedExtension = {
  activate(context: { subscriptions: Disposable[] }): unknown;
  deactivate(): void;
};

class FakeEventEmitter<T> {
  private listeners = new Set<Listener<T>>();

  public event = (
    listener: Listener<T>,
    _thisArgs?: unknown,
    disposables?: Disposable[],
  ): Disposable => {
    this.listeners.add(listener);
    const disposable = {
      dispose: () => this.listeners.delete(listener),
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
  document: {
    fileName: string;
    lineCount: number;
    lineAt(index: number): { text: string; isEmptyOrWhitespace: boolean };
  };
  decorationCalls: Array<{
    type: FakeDecorationType;
    options: DecorationOption[];
  }>;
  setDecorations(type: FakeDecorationType, options: DecorationOption[]): void;
};

function createFakeWindow(
  host: CharacterizationHost,
  activeEditorEmitter: FakeEventEmitter<FakeEditor | undefined>,
) {
  return {
    get activeTextEditor() {
      return host.activeTextEditor;
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
        dispose: () => host.registeredCommands.delete(name),
      };
    },
  };
}

function createFakeVscode(
  host: CharacterizationHost,
  activeEditorEmitter: FakeEventEmitter<FakeEditor | undefined>,
): Record<string, unknown> {
  return {
    EventEmitter: FakeEventEmitter,
    Position: FakePosition,
    Range: FakeRange,
    MarkdownString: FakeMarkdownString,
    ThemeColor: FakeThemeColor,
    window: createFakeWindow(host, activeEditorEmitter),
    commands: createFakeCommands(host),
  };
}

export class CharacterizationHost {
  public readonly subscriptions: Disposable[] = [];
  public readonly registeredCommands = new Map<
    string,
    (...args: unknown[]) => unknown
  >();
  public readonly decorationTypes: FakeDecorationType[] = [];
  public readonly reporters: FakeReporter[] = [];
  public nextQuickPick: string | undefined;
  public activeTextEditor: FakeEditor | undefined;

  private readonly activeEditorEmitter = new FakeEventEmitter<
    FakeEditor | undefined
  >();
  private readonly vscode: Record<string, unknown>;
  private loadedExtension: LoadedExtension | undefined;
  private globalDescriptors = new Map<string, PropertyDescriptor | undefined>();
  private disposed = false;

  public constructor() {
    this.vscode = createFakeVscode(this, this.activeEditorEmitter);
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

  public createEditor(fileName: string, lines: string[]): FakeEditor {
    const editor: FakeEditor = {
      document: {
        fileName,
        lineCount: lines.length,
        lineAt: (index) => {
          const text = lines[index];
          return { text, isEmptyOrWhitespace: /^\s*$/u.test(text) };
        },
      },
      decorationCalls: [],
      setDecorations(type, options) {
        this.decorationCalls.push({ type, options });
      },
    };
    return editor;
  }

  public setActiveEditor(editor: FakeEditor | undefined): void {
    this.activeTextEditor = editor;
    this.activeEditorEmitter.fire(editor);
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
