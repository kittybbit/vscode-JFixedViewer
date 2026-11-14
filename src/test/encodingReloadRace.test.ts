import * as assert from "assert";
import { CharacterizationHost } from "./support/characterizationHost";
import { CharacterizedDocument } from "./support/fakeVscodeTypes";
import {
  byteDefinition,
  concurrentByteDefinition,
} from "./support/encodingFixtures";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const byteFormatName = "試験/Shift_JIS";
const utf8ByteFormatName = "試験/UTF-8";
const utf8ByteFormatType = "utf8_test@zengin";
const omittedByteFormatName = "試験/省略";
const omittedByteFormatType = "omitted_test@zengin";

suite("文字コード再読込競合", () => {
  test("再読込待ちの後続選択は最新文書を使って直列化する", async () => {
    for (const followup of ["utf8", "omitted"] as const) {
      const host = new CharacterizationHost({
        zengin: concurrentByteDefinition(),
      });
      let releaseReload: (() => void) | undefined;
      let notifyReloadStarted: (() => void) | undefined;
      const reloadStarted = new Promise<void>((resolve) => {
        notifyReloadStarted = resolve;
      });
      const reloadGate = new Promise<void>((resolve) => {
        releaseReload = resolve;
      });
      let reloadCount = 0;
      let staleSelection: Promise<void> | undefined;
      let latestSelection: Promise<void> | undefined;
      try {
        host.start();
        const editor = host.createEditor("serialized.txt", ["AあZ"]);
        host.setActiveEditor(editor);
        await host.chooseFileType(utf8ByteFormatName);
        host.openTextDocumentHook = async (uri, encoding, previous) => {
          reloadCount += 1;
          if (reloadCount === 1) {
            notifyReloadStarted?.();
            await reloadGate;
          }
          return new CharacterizedDocument({
            fileName: previous.fileName,
            lines: previous.lines,
            uri,
            encoding,
          });
        };

        staleSelection = host.chooseFileType(byteFormatName);
        await reloadStarted;
        latestSelection = host.chooseFileType(
          followup === "utf8" ? utf8ByteFormatName : omittedByteFormatName,
        );
        await host.waitForAnalysis();
        assert.strictEqual(host.openTextDocumentRequests.length, 1);

        releaseReload?.();
        await Promise.all([staleSelection, latestSelection]);

        const expectedEncoding = followup === "utf8" ? "utf8" : "shiftjis";
        const expectedFileType =
          followup === "utf8" ? utf8ByteFormatType : omittedByteFormatType;
        assert.strictEqual(editor.document.encoding, expectedEncoding);
        assert.deepStrictEqual(
          host.openTextDocumentRequests.map(({ encoding }) => encoding),
          followup === "utf8" ? ["shiftjis", "utf8"] : ["shiftjis"],
        );
        assert.strictEqual(host.encodeCallCount, 2);
        assert.strictEqual(host.decodeCallCount, 2);
        assert.strictEqual(
          host.reporters[0]?.events.at(-1)?.properties?.file_type,
          expectedFileType,
        );
        assert.strictEqual(host.windowMessages.length, 0);
        assert.strictEqual(
          editor.decorationCalls.some(({ options }) =>
            options.some((option) => option.hoverMessage !== undefined),
          ),
          true,
        );
      } finally {
        releaseReload?.();
        await Promise.all([staleSelection, latestSelection]);
        host.dispose();
      }
    }
  });

  test("新しい選択は古い再読込失敗通知を抑止する", async () => {
    const host = new CharacterizationHost({
      zengin: concurrentByteDefinition(),
    });
    let releaseReload: (() => void) | undefined;
    let notifyReloadStarted: (() => void) | undefined;
    const reloadStarted = new Promise<void>((resolve) => {
      notifyReloadStarted = resolve;
    });
    const reloadGate = new Promise<void>((resolve) => {
      releaseReload = resolve;
    });
    let staleSelection: Promise<void> | undefined;
    let latestSelection: Promise<void> | undefined;
    try {
      host.start();
      const editor = host.createEditor("stale-failure.txt", ["AあZ"]);
      host.setActiveEditor(editor);
      await host.chooseFileType(utf8ByteFormatName);
      host.openTextDocumentHook = async () => {
        notifyReloadStarted?.();
        await reloadGate;
        throw new Error("stale reload failure");
      };

      staleSelection = host.chooseFileType(byteFormatName);
      await reloadStarted;
      latestSelection = host.chooseFileType(utf8ByteFormatName);
      await host.waitForAnalysis();
      releaseReload?.();
      await Promise.all([staleSelection, latestSelection]);

      assert.strictEqual(editor.document.encoding, "utf8");
      assert.deepStrictEqual(
        host.openTextDocumentRequests.map(({ encoding }) => encoding),
        ["shiftjis"],
      );
      assert.deepStrictEqual(host.windowMessages, []);
      assert.strictEqual(
        host.reporters[0]?.events.at(-1)?.properties?.file_type,
        utf8ByteFormatType,
      );
      assert.strictEqual(
        editor.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        true,
      );
    } finally {
      releaseReload?.();
      await Promise.all([staleSelection, latestSelection]);
      host.dispose();
    }
  });

  test("close・dispose後の古い再読込失敗は通知しない", async () => {
    for (const invalidation of ["close", "dispose"] as const) {
      const host = new CharacterizationHost({
        zengin: concurrentByteDefinition(),
      });
      let releaseReload: (() => void) | undefined;
      let notifyReloadStarted: (() => void) | undefined;
      const reloadStarted = new Promise<void>((resolve) => {
        notifyReloadStarted = resolve;
      });
      const reloadGate = new Promise<void>((resolve) => {
        releaseReload = resolve;
      });
      let selection: Promise<void> | undefined;
      try {
        host.start();
        const editor = host.createEditor("closed-race.txt", ["AあZ"]);
        host.setActiveEditor(editor);
        await host.chooseFileType(utf8ByteFormatName);
        host.openTextDocumentHook = async () => {
          notifyReloadStarted?.();
          await reloadGate;
          throw new Error("invalidated reload failure");
        };

        selection = host.chooseFileType(byteFormatName);
        await reloadStarted;
        if (invalidation === "close") {
          host.closeDocument(editor);
        } else {
          host.dispose();
        }
        releaseReload?.();
        await selection;
        assert.deepStrictEqual(host.windowMessages, []);
      } finally {
        releaseReload?.();
        await selection;
        host.dispose();
      }
    }
  });

  test("再読込待機中の新しい選択は古い完了結果を失効させる", async () => {
    const host = new CharacterizationHost({ zengin: byteDefinition() });
    let releaseReload: (() => void) | undefined;
    let notifyReloadStarted: (() => void) | undefined;
    const reloadStarted = new Promise<void>((resolve) => {
      notifyReloadStarted = resolve;
    });
    const reloadGate = new Promise<void>((resolve) => {
      releaseReload = resolve;
    });
    try {
      host.start();
      const editor = host.createEditor("race.txt", ["AあZ"]);
      host.setActiveEditor(editor);
      host.openTextDocumentHook = async (uri, encoding, previous) => {
        notifyReloadStarted?.();
        await reloadGate;
        return {
          ...previous,
          uri: previous.uri,
          fileName: previous.fileName,
          lines: [...previous.lines],
          encoding,
          version: previous.version,
          isDirty: false,
          lineAt: previous.lineAt.bind(previous),
          getText: previous.getText.bind(previous),
          lineAtCallCount: previous.lineAtCallCount,
          lineCount: previous.lineCount,
        };
      };
      let pickCount = 0;
      host.quickPickHandler = async () =>
        pickCount++ === 0 ? byteFormatName : "なし/なし";
      const command = host.registeredCommands.get(commandId);
      assert.ok(command);
      const staleSelection = command();
      await reloadStarted;
      const clearSelection = command();
      await clearSelection;
      releaseReload?.();
      await staleSelection;

      assert.deepStrictEqual(host.reporters[0]?.events.at(-1)?.properties, {
        file_type: "clear@clear",
        development: "false",
      });
      assert.strictEqual(host.encodeCallCount, 0);
      assert.strictEqual(
        editor.decorationCalls.some(({ options }) =>
          options.some((option) => option.hoverMessage !== undefined),
        ),
        false,
      );
    } finally {
      releaseReload?.();
      host.dispose();
    }
  });
});
