import * as assert from "assert";
import { CharacterizationHost } from "./support/characterizationHost";
import {
  byteDefinition,
  utf16CompatibilityDefinition,
} from "./support/encodingFixtures";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const byteFormatName = "試験/Shift_JIS";
const byteFormatType = "byte_test@zengin";

suite("文字コード選択", () => {
  test("単位の省略と明示utf16は現在encodingのまま従来範囲を表示する", async () => {
    const host = new CharacterizationHost({
      zengin: utf16CompatibilityDefinition(),
    });
    try {
      host.start();
      for (const name of ["単位省略", "UTF-16明示"]) {
        const editor = host.createEditor(`${name}.txt`, ["AB"]);
        editor.document.encoding = "shiftjis";
        host.setActiveEditor(editor);
        await host.chooseFileType(`試験/${name}`);

        const field = editor.decorationCalls
          .flatMap(({ options }) => options)
          .find((option) => option.hoverMessage !== undefined);
        assert.deepStrictEqual(
          {
            start: field?.range.start.character,
            end: field?.range.end.character,
            hover: field?.hoverMessage?.value,
          },
          {
            start: 0,
            end: 2,
            hover:
              "**互換レコード / ASCII (項目 1)**  \n位置: 1 - 2 (2桁)\nデータ型: C",
          },
        );
      }
      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.strictEqual(host.encodeCallCount, 0);
      assert.strictEqual(host.decodeCallCount, 0);
    } finally {
      host.dispose();
    }
  });

  test("選択元 URI に文字コードを適用し、byte 項目をホバーへ表示する", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const editor = host.createEditor(
        "sample.txt",
        ["AあZ"],
        "file:///sample.txt",
      );
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);

      assert.deepStrictEqual(host.openTextDocumentRequests, [
        { uri: "file:///sample.txt", encoding: "shiftjis" },
      ]);
      assert.strictEqual(editor.document.encoding, "shiftjis");
      assert.strictEqual(host.encodeCallCount, 1);
      assert.strictEqual(host.decodeCallCount, 1);
      const options = editor.decorationCalls
        .flatMap(({ options: values }) => values)
        .filter((option) => option.hoverMessage !== undefined);
      assert.deepStrictEqual(
        options.map(({ range }) => [
          range.start.character,
          range.end.character,
        ]),
        [
          [0, 1],
          [2, 3],
        ],
      );
      assert.ok(options[0]?.hoverMessage?.value.includes("(1バイト)"));
      assert.ok(options[1]?.hoverMessage?.value.includes("(1バイト)"));
      assert.deepStrictEqual(
        host.diagnosticsFor(editor)?.map(({ code }) => code),
        ["INVALID_BYTE_BOUNDARY", "INVALID_BYTE_BOUNDARY"],
      );
    } finally {
      host.dispose();
    }
  });

  test("dirty 文書と再読込失敗を保護し、失敗 telemetry は空 ID にする", async () => {
    const dirtyHost = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      dirtyHost.start();
      const editor = dirtyHost.createEditor("dirty.txt", ["AあZ"]);
      editor.document.isDirty = true;
      dirtyHost.setActiveEditor(editor);
      await dirtyHost.chooseFileType(byteFormatName);
      assert.strictEqual(dirtyHost.openTextDocumentRequests.length, 0);
      assert.ok(dirtyHost.windowMessages[0]?.includes("未保存"));
      assert.deepStrictEqual(
        dirtyHost.reporters[0]?.events.at(-1)?.properties,
        {
          file_type: "",
          development: "false",
        },
      );
      assert.ok(
        !dirtyHost.windowMessages.some((message) =>
          message.includes("dirty.txt"),
        ),
      );
    } finally {
      dirtyHost.dispose();
    }

    const failedHost = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      failedHost.start();
      const editor = failedHost.createEditor("failed.txt", ["AあZ"]);
      failedHost.openTextDocumentFailure = true;
      failedHost.setActiveEditor(editor);
      await failedHost.chooseFileType(byteFormatName);
      assert.strictEqual(failedHost.openTextDocumentRequests.length, 1);
      assert.deepStrictEqual(
        failedHost.reporters[0]?.events.at(-1)?.properties,
        {
          file_type: "",
          development: "false",
        },
      );
      assert.strictEqual(failedHost.encodeCallCount, 0);
      assert.strictEqual(failedHost.decodeCallCount, 0);
    } finally {
      failedHost.dispose();
    }
  });

  test("untitled・closed・encoding不一致を再読込せず安全停止する", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const untitled = host.createEditor(
        "untitled.txt",
        ["AあZ"],
        "untitled:record",
      );
      host.setActiveEditor(untitled);
      await host.chooseFileType(byteFormatName);
      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.ok(host.windowMessages.at(-1)?.includes("名前のない文書"));
      assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
        file_type: "",
        development: "false",
      });
    } finally {
      host.dispose();
    }

    const closedHost = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      closedHost.start();
      const closed = closedHost.createEditor("closed.txt", ["AあZ"]);
      closedHost.closeDocument(closed);
      closedHost.setActiveEditor(closed);
      await closedHost.chooseFileType(byteFormatName);
      assert.strictEqual(closedHost.openTextDocumentRequests.length, 0);
      assert.strictEqual(closedHost.encodeCallCount, 0);
      assert.deepStrictEqual(
        closedHost.reporters[0]?.events.at(-1)?.properties,
        {
          file_type: "",
          development: "false",
        },
      );
    } finally {
      closedHost.dispose();
    }

    const mismatchHost = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      mismatchHost.start();
      const editor = mismatchHost.createEditor("mismatch.txt", ["AあZ"]);
      mismatchHost.openTextDocumentHook = async (
        _uri,
        _encoding,
        previous,
      ) => ({
        ...previous,
        encoding: "utf8",
      });
      mismatchHost.setActiveEditor(editor);
      await mismatchHost.chooseFileType(byteFormatName);
      assert.strictEqual(mismatchHost.openTextDocumentRequests.length, 1);
      assert.strictEqual(mismatchHost.encodeCallCount, 0);
      assert.strictEqual(mismatchHost.decodeCallCount, 0);
      assert.deepStrictEqual(
        mismatchHost.reporters[0]?.events.at(-1)?.properties,
        {
          file_type: "",
          development: "false",
        },
      );
    } finally {
      mismatchHost.dispose();
    }
  });

  test("未知 encoding と encode/decode 例外は解析せず選択を解除する", async () => {
    const unsupportedHost = new CharacterizationHost({
      zengin: byteDefinition({ encoding: "x-unsupported" }),
    });
    try {
      unsupportedHost.start();
      const editor = unsupportedHost.createEditor("unsupported.txt", ["AあZ"]);
      editor.document.encoding = "x-unsupported";
      unsupportedHost.setActiveEditor(editor);
      await unsupportedHost.chooseFileType(byteFormatName);
      assert.strictEqual(unsupportedHost.encodeCallCount, 0);
      assert.strictEqual(unsupportedHost.decodeCallCount, 0);
      assert.deepStrictEqual(
        unsupportedHost.reporters[0]?.events.at(-1)?.properties,
        {
          file_type: "",
          development: "false",
        },
      );
    } finally {
      unsupportedHost.dispose();
    }

    for (const failure of ["encode", "decode"] as const) {
      const host = new CharacterizationHost({ zengin: byteDefinition() });
      try {
        host.start();
        const editor = host.createEditor(`${failure}-failure.txt`, ["AあZ"]);
        editor.document.encoding = "shiftjis";
        if (failure === "encode") {
          host.encodeTextFailure = true;
        } else {
          host.decodeTextFailure = true;
        }
        host.setActiveEditor(editor);
        await host.chooseFileType(byteFormatName);
        assert.strictEqual(host.encodeCallCount, 1);
        assert.strictEqual(host.decodeCallCount, failure === "encode" ? 0 : 1);
        assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
          file_type: "",
          development: "false",
        });
        assert.strictEqual(
          editor.decorationCalls.some(({ options }) =>
            options.some((option) => option.hoverMessage !== undefined),
          ),
          false,
        );
      } finally {
        host.dispose();
      }
    }
  });

  test("byte encoding 省略時に未対応の現在 encoding なら安全停止する", async () => {
    const host = new CharacterizationHost({
      zengin: byteDefinition({ omitEncoding: true }),
    });
    try {
      host.start();
      const editor = host.createEditor("unsupported-current.txt", ["AあZ"]);
      editor.document.encoding = "x-unsupported";
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);

      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.strictEqual(host.encodeCallCount, 0);
      assert.strictEqual(host.decodeCallCount, 0);
      assert.deepStrictEqual(host.diagnosticsFor(editor), undefined);
      assert.strictEqual(
        editor.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        false,
      );
      assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
        file_type: "",
        development: "false",
      });
      assert.ok(host.windowMessages.at(-1)?.includes("安全に確認できません"));
    } finally {
      host.dispose();
    }
  });

  test("workspace.decode の意図的不一致は byte 解析を安全停止する", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const editor = host.createEditor("decode-mismatch.txt", ["AあZ"]);
      editor.document.encoding = "shiftjis";
      host.decodeTextHook = async () => "A不一致";
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);

      assert.strictEqual(host.encodeCallCount, 1);
      assert.strictEqual(host.decodeCallCount, 1);
      assert.deepStrictEqual(host.diagnosticsFor(editor), undefined);
      assert.strictEqual(
        editor.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        false,
      );
      assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
        file_type: "",
        development: "false",
      });
      assert.ok(host.windowMessages.at(-1)?.includes("安全に確認できません"));
    } finally {
      host.dispose();
    }
  });

  test("same encoding は再読込せず、encoding 変更は選択を解除する", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const editor = host.createEditor("same.txt", ["AあZ"]);
      editor.document.encoding = "shiftjis";
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);
      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.strictEqual(host.encodeCallCount, 1);

      host.setDocumentEncoding(editor, "utf8");
      assert.ok(host.windowMessages.at(-1)?.includes("異なります"));
      assert.deepStrictEqual(host.diagnosticsFor(editor), undefined);
      const callsAfterChange = host.encodeCallCount;
      await host.waitForPendingRender();
      assert.strictEqual(host.encodeCallCount, callsAfterChange);
    } finally {
      host.dispose();
    }
  });

  test("明示 encoding は再open時に照合し、不一致なら選択を解除する", async () => {
    const matchingHost = new CharacterizationHost({
      zengin: byteDefinition(),
    });
    try {
      matchingHost.start();
      const editor = matchingHost.createEditor(
        "reopen-same.txt",
        ["AあZ"],
        "file:///reopen-same.txt",
      );
      editor.document.encoding = "shiftjis";
      matchingHost.setActiveEditor(editor);
      await matchingHost.chooseFileType(byteFormatName);
      matchingHost.closeDocument(editor);

      const reopened = matchingHost.createEditor(
        "reopen-same.txt",
        ["AあZ"],
        "file:///reopen-same.txt",
      );
      reopened.document.encoding = "shiftjis";
      matchingHost.setActiveEditor(reopened);
      await matchingHost.waitForAnalysis();

      assert.strictEqual(matchingHost.encodeCallCount, 2);
      assert.strictEqual(
        reopened.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        true,
      );
      assert.strictEqual(matchingHost.windowMessages.length, 0);
    } finally {
      matchingHost.dispose();
    }

    const mismatchHost = new CharacterizationHost({
      zengin: byteDefinition(),
    });
    try {
      mismatchHost.start();
      const editor = mismatchHost.createEditor(
        "reopen-mismatch.txt",
        ["AあZ"],
        "file:///reopen-mismatch.txt",
      );
      editor.document.encoding = "shiftjis";
      mismatchHost.setActiveEditor(editor);
      await mismatchHost.chooseFileType(byteFormatName);
      mismatchHost.closeDocument(editor);

      const reopened = mismatchHost.createEditor(
        "reopen-mismatch.txt",
        ["AあZ"],
        "file:///reopen-mismatch.txt",
      );
      mismatchHost.setActiveEditor(reopened);
      await mismatchHost.waitForAnalysis();

      assert.strictEqual(mismatchHost.encodeCallCount, 1);
      assert.deepStrictEqual(mismatchHost.diagnosticsFor(reopened), undefined);
      assert.strictEqual(
        reopened.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        false,
      );
      assert.ok(mismatchHost.windowMessages.at(-1)?.includes("異なります"));
    } finally {
      mismatchHost.dispose();
    }
  });

  test("encoding省略は非表示後と再open後に現在encodingで再解析する", async () => {
    const host = new CharacterizationHost({
      zengin: byteDefinition({ omitEncoding: true }),
    });
    try {
      host.start();
      const editor = host.createEditor(
        "reopen-omitted.txt",
        ["AあZ"],
        "file:///reopen-omitted.txt",
      );
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);
      assert.strictEqual(editor.document.encoding, "utf8");
      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.strictEqual(host.encodeCallCount, 1);

      host.setVisibleEditors([]);
      host.changeDocument(editor, ["AあY"]);
      await host.waitForAnalysis();
      assert.strictEqual(host.encodeCallCount, 1);
      host.setVisibleEditors([editor]);
      await host.waitForAnalysis();
      assert.strictEqual(host.encodeCallCount, 2);

      host.closeDocument(editor);
      const reopened = host.createEditor(
        "reopen-omitted.txt",
        ["AあY"],
        "file:///reopen-omitted.txt",
      );
      host.setActiveEditor(reopened);
      await host.waitForAnalysis();

      assert.strictEqual(reopened.document.encoding, "utf8");
      assert.strictEqual(host.openTextDocumentRequests.length, 0);
      assert.strictEqual(host.encodeCallCount, 3);
      assert.strictEqual(
        host.windowMessages.some((message) => message.includes("異なります")),
        false,
      );
      assert.strictEqual(
        reopened.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        true,
      );
    } finally {
      host.dispose();
    }
  });

  test("byte の全量往復で置換が生じた場合は内容を解析せず選択を解除する", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const editor = host.createEditor("unrepresentable.txt", ["A\uD800Z"]);
      editor.document.encoding = "shiftjis";
      host.replaceUnsupportedShiftJis = true;
      host.setActiveEditor(editor);
      await host.chooseFileType(byteFormatName);

      assert.strictEqual(host.encodeCallCount, 1);
      assert.strictEqual(host.decodeCallCount, 1);
      assert.deepStrictEqual(host.diagnosticsFor(editor), undefined);
      assert.strictEqual(
        editor.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        false,
      );
      assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
        file_type: "",
        development: "false",
      });
      assert.ok(host.windowMessages.at(-1)?.includes("安全に確認できません"));
      assert.ok(
        !host.windowMessages.some((message) =>
          message.includes("unrepresentable.txt"),
        ),
      );
    } finally {
      host.dispose();
    }
  });

  test("Quick Pick 中に active editor が変わっても開始時の URI を使う", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    try {
      host.start();
      const first = host.createEditor(
        "first.txt",
        ["AあZ"],
        "file:///first.txt",
      );
      const second = host.createEditor(
        "second.txt",
        ["AあZ"],
        "file:///second.txt",
      );
      host.setActiveEditor(first);
      let choose: ((value: string) => void) | undefined;
      host.quickPickHandler = () =>
        new Promise<string>((resolve) => {
          choose = resolve;
        });
      const command = host.registeredCommands.get(commandId);
      assert.ok(command);
      const pending = command();
      await Promise.resolve();
      host.setActiveEditor(second);
      choose?.(byteFormatName);
      await pending;

      assert.deepStrictEqual(host.openTextDocumentRequests, [
        { uri: "file:///first.txt", encoding: "shiftjis" },
      ]);
      assert.strictEqual(
        host.reporters[0]?.events.at(-1)?.properties?.file_type,
        byteFormatType,
      );
    } finally {
      host.dispose();
    }
  });
});
