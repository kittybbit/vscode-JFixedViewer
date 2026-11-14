export type Disposable = { dispose(): void };
export type Listener<T> = (value: T) => void;
export type Position = { line: number; character: number };
export type EditorEvents = {
  active: FakeEventEmitter<FakeEditor | undefined>;
  visible: FakeEventEmitter<readonly FakeEditor[]>;
  selection: FakeEventEmitter<{ textEditor: FakeEditor }>;
};
export type FakeDocument = {
  uri: FakeUri;
  fileName: string;
  lines: string[];
  encoding: string;
  version: number;
  isDirty: boolean;
  readonly lineCount: number;
  readonly lineAtCallCount: number;
  lineAt(index: number): { text: string; isEmptyOrWhitespace: boolean };
  getText(): string;
};
export type DecorationOption = {
  range: { start: Position; end: Position };
  hoverMessage?: { value: string; isTrusted: boolean };
  renderOptions?: Record<string, unknown>;
};
export type Configuration = {
  boundaryStyle?: unknown;
  boundaryColor?: unknown;
  boundaryWidth?: unknown;
  validationEnabled?: unknown;
};

type CharacterizedDocumentOptions = {
  fileName: string;
  lines: string[];
  uri: string;
  encoding?: string;
};

export class CharacterizedDocument implements FakeDocument {
  public readonly uri: FakeDocument["uri"];
  public readonly fileName: string;
  public lines: string[];
  public version = 1;
  public isDirty = false;
  private lineAtCalls = 0;

  public constructor({
    fileName,
    lines,
    uri,
    encoding = "utf8",
  }: CharacterizedDocumentOptions) {
    this.uri = new FakeUri(uri);
    this.fileName = fileName;
    this.lines = [...lines];
    this.encoding = encoding;
  }

  public encoding: string;

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

export class FakeEventEmitter<T> {
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

export class FakePosition {
  public constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

export class FakeRange {
  public constructor(
    public readonly start: FakePosition,
    public readonly end: FakePosition,
  ) {}
}

export class FakeUri {
  public readonly scheme: string;

  public constructor(private readonly value: string) {
    this.scheme = value.includes(":")
      ? value.slice(0, value.indexOf(":"))
      : "file";
  }

  public static parse(value: string): FakeUri {
    return new FakeUri(value);
  }

  public toString(): string {
    return this.value;
  }
}

export class FakeDiagnostic {
  public source: string | undefined;
  public code: string | number | undefined;

  public constructor(
    public readonly range: FakeRange,
    public readonly message: string,
    public readonly severity: number,
  ) {}
}

export class FakeDiagnosticCollection implements Disposable {
  private readonly diagnostics = new Map<string, FakeDiagnostic[]>();
  public disposeCount = 0;
  public setCount = 0;

  public constructor(public readonly name: string) {}

  public set(uri: FakeUri, diagnostics: readonly FakeDiagnostic[]): void {
    this.setCount += 1;
    this.diagnostics.set(uri.toString(), [...diagnostics]);
  }

  public delete(uri: FakeUri): void {
    this.diagnostics.delete(uri.toString());
  }

  public clear(): void {
    this.diagnostics.clear();
  }

  public get(uri: FakeUri): readonly FakeDiagnostic[] | undefined {
    return this.diagnostics.get(uri.toString());
  }

  public dispose(): void {
    this.disposeCount += 1;
    this.clear();
  }
}

export class FakeMarkdownString {
  public isTrusted = false;
  public value: string;

  public constructor(value = "") {
    this.value = value;
  }

  public appendText(value: string): FakeMarkdownString {
    this.value += value;
    return this;
  }

  public appendMarkdown(value: string): FakeMarkdownString {
    this.value += value;
    return this;
  }
}

export class FakeThemeColor {
  public constructor(public readonly id: string) {}
}

export class FakeDecorationType implements Disposable {
  public disposeCount = 0;

  public constructor(public readonly options: unknown) {}

  public dispose(): void {
    this.disposeCount += 1;
  }
}

export type FakeEditor = {
  document: FakeDocument;
  selection: { active: Position };
  decorationCalls: Array<{
    type: FakeDecorationType;
    options: DecorationOption[];
  }>;
  setDecorations(type: FakeDecorationType, options: DecorationOption[]): void;
};
