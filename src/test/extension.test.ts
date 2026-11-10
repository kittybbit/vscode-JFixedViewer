import * as assert from "assert";
import {
  CharacterizationHost,
  FakeEditor,
} from "./support/characterizationHost";

const commandId = "vscode-JFixedViewer.FiletypePicker";
const zenginAccount = "全銀協規定形式/振込入金通知(A)";
const zenginTransfer = "全銀協規定形式/入出金取引明細";
const zenginGeneralTransfer = "全銀協規定形式/総合振込";
const zenginLoanCalculation = "全銀協規定形式/借入金計算書";
const zenginForeignCurrency = "全銀協規定形式/外貨預金入出金取引明細";
const jpxFourPrices = "JPX/四本値(デリバティブ)";
const clearType = "なし/なし";

function header(mode: string): string {
  return `1${"0".repeat(61)}${mode}`;
}

function foreignCurrencyHeader(mode: string): string {
  return `1${"0".repeat(92)}${mode}`;
}

function optionsForLine(editor: FakeEditor, line: number) {
  const call = editor.decorationCalls.at(-1);
  return (
    call?.options.filter((option) => option.range.start.line === line) ?? []
  );
}

function renderOptionsForLine(editor: FakeEditor, line: number) {
  return optionsForLine(editor, line).map((option) => option.renderOptions);
}

function rowNames(editor: FakeEditor, line: number): string[] {
  return optionsForLine(editor, line).map((option) => {
    const match = option.hoverMessage?.value.match(/^\*\*(.*?)\*\*/u);
    return match?.[1] ?? "";
  });
}

function hasRow(editor: FakeEditor, line: number, name: string): boolean {
  return rowNames(editor, line).includes(name);
}

suite("固定長表示の現行挙動", () => {
  let host: CharacterizationHost;

  setup(() => {
    host = new CharacterizationHost();
    host.start();
  });

  teardown(() => {
    host.dispose();
  });

  test("組み込みの全銀と JPX の定義、空白行、不一致行、ホバー、UTF-16 範囲を保つ", async () => {
    const zengin = host.createEditor("50200001-a.txt", [
      "1😀",
      "   ",
      "不一致の行",
      "2😀",
      "8",
      "9",
    ]);
    host.setActiveEditor(zengin);
    await host.chooseFileType(zenginAccount);

    const decorationStyle = host.decorationTypes[0].options as {
      isWholeLine: boolean;
    };
    assert.strictEqual(decorationStyle.isWholeLine, false);

    const shortHeader = optionsForLine(zengin, 0);
    assert.strictEqual(shortHeader[1].range.end.character, 3);
    const defaultBoundary = renderOptionsForLine(zengin, 0)[1]?.after as {
      contentText: string;
      backgroundColor: { id: string };
      width: string;
      height: string;
    };
    assert.deepStrictEqual(
      {
        ...defaultBoundary,
        backgroundColor: defaultBoundary.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );
    const partialDataField = optionsForLine(zengin, 3)[1];
    assert.strictEqual(partialDataField.range.end.character, 3);
    assert.strictEqual(partialDataField.renderOptions, undefined);

    assert.strictEqual(host.registeredCommands.has(commandId), true);
    assert.deepStrictEqual(rowNames(zengin, 0).slice(0, 1), ["ヘッダー"]);
    assert.deepStrictEqual(rowNames(zengin, 3).slice(0, 1), ["データ"]);
    assert.deepStrictEqual(rowNames(zengin, 4).slice(0, 1), ["トレーラ"]);
    assert.deepStrictEqual(rowNames(zengin, 5).slice(0, 1), ["エンド"]);
    assert.deepStrictEqual(optionsForLine(zengin, 1), []);
    assert.deepStrictEqual(optionsForLine(zengin, 2), []);

    const dataFields = optionsForLine(zengin, 3);
    assert.deepStrictEqual(
      {
        start: dataFields[1].range.start.character,
        end: dataFields[1].range.end.character,
      },
      { start: 1, end: 3 },
    );
    assert.strictEqual(zengin.document.lineAt(3).text.length, 3);
    assert.strictEqual(
      dataFields[1].hoverMessage?.value,
      "**データ**  \n位置: 2 - 7 (6桁)",
    );
    assert.strictEqual(dataFields[1].hoverMessage?.isTrusted, true);
    assert.strictEqual(dataFields.at(-1)?.range.end.character, 3);

    const jpx = host.createEditor("jpx.txt", ["2Ａ😀"]);
    host.setActiveEditor(jpx);
    await host.chooseFileType(jpxFourPrices);
    assert.strictEqual(hasRow(jpx, 0, "レコード"), true);
    assert.strictEqual(jpx.document.lineAt(0).text.length, 4);
    assert.strictEqual(optionsForLine(jpx, 0)[1].range.end.character, 4);
    assert.strictEqual(
      optionsForLine(jpx, 0)[1].hoverMessage?.value,
      "**レコード**  \n位置: 2 - 4 (3桁)",
    );
    assert.ok(optionsForLine(jpx, 0)[1].renderOptions?.after);

    const loan = host.createEditor("50200231-loan.txt", ["230"]);
    host.setActiveEditor(loan);
    await host.chooseFileType(zenginLoanCalculation);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔内訳〕)"), true);
    assert.strictEqual(hasRow(loan, 0, "データ(商業手形割引〔合計〕)"), false);
  });

  test("境界線、交互色、区切り記号の色と太さを切り替える", async () => {
    const uri = "file:///boundary-style.txt";
    const editor = host.createEditor(
      "50200003-boundary-style.txt",
      [header("1"), `2${"x".repeat(180)}`],
      uri,
    );
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventCount = reporter.events.length;
    const headerFields = optionsForLine(editor, 0);
    const fields = optionsForLine(editor, 1);
    assert.ok(fields.length > 2);
    const defaultLine = fields[0].renderOptions?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.deepStrictEqual(
      {
        ...defaultLine,
        backgroundColor: defaultLine.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );

    host.setConfiguration(uri, {
      boundaryStyle: "marker",
      boundaryColor: "invalid",
      boundaryWidth: 7,
    });
    const marked = optionsForLine(editor, 1);
    const marker = marked[0].renderOptions?.after as {
      contentText: string;
      color: { id: string };
    };
    assert.deepStrictEqual(
      { contentText: marker.contentText, color: marker.color.id },
      { contentText: "│", color: "editor.foreground" },
    );
    assert.strictEqual(marked.at(-1)?.renderOptions, undefined);

    host.setConfiguration(uri, {
      boundaryStyle: "line",
      boundaryColor: "#1a2b3c",
      boundaryWidth: 4,
    });
    const customLine = optionsForLine(editor, 1)[0].renderOptions?.after as {
      width: string;
      backgroundColor: string;
    };
    assert.deepStrictEqual(customLine, {
      contentText: "",
      backgroundColor: "#1a2b3c",
      width: "4px",
      height: "1em",
    });

    host.setConfiguration(uri, {
      boundaryStyle: "alternating",
      boundaryColor: "#1a2b3c",
      boundaryWidth: 4,
    });
    const backgroundType = host.decorationTypes.find((type) => {
      const options = type.options as { backgroundColor?: string };
      return options.backgroundColor === "#1a2b3c40";
    });
    assert.ok(backgroundType);
    const alternating = editor.decorationCalls.at(-1);
    assert.strictEqual(alternating?.type, backgroundType);
    assert.strictEqual(
      alternating?.options.length,
      Math.floor(headerFields.length / 2) + Math.floor(fields.length / 2),
    );
    assert.ok(
      alternating?.options.every((option) => option.hoverMessage === undefined),
    );
    assert.strictEqual(reporter.events.length, eventCount);
  });

  test("各文書の設定範囲を保ち、色と太さの不正値を既定に戻す", async () => {
    const firstUri = "file:///one/fixed.txt";
    const secondUri = "file:///two/fixed.txt";
    const lines = [header("1"), `2${"x".repeat(210)}`];
    const first = host.createEditor("50200003-one-fixed.txt", lines, firstUri);
    const firstSplit = host.createEditor(
      "50200003-one-fixed.txt",
      lines,
      firstUri,
    );
    const second = host.createEditor(
      "50200003-two-fixed.txt",
      lines,
      secondUri,
    );

    host.setActiveEditor(first);
    host.setConfiguration(firstUri, {
      boundaryStyle: "unknown",
      boundaryColor: "#12345g",
      boundaryWidth: 1.5,
    });
    await host.chooseFileType(zenginTransfer);
    const firstDefaultLine = optionsForLine(first, 1)[0].renderOptions
      ?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.deepStrictEqual(
      {
        ...firstDefaultLine,
        backgroundColor: firstDefaultLine.backgroundColor.id,
      },
      {
        contentText: "",
        backgroundColor: "editor.foreground",
        width: "1px",
        height: "1em",
      },
    );

    host.setActiveEditor(second);
    await host.chooseFileType(zenginTransfer);
    const firstCallsWhileHidden = first.document.lineAtCallCount;
    const secondCallsBeforeConfiguration = second.document.lineAtCallCount;
    const secondDecorationsBeforeConfiguration = second.decorationCalls.length;

    host.setConfiguration(firstUri, {
      boundaryStyle: "alternating",
      boundaryColor: "#abcdef",
      boundaryWidth: 2,
    });
    assert.strictEqual(first.document.lineAtCallCount, firstCallsWhileHidden);
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondCallsBeforeConfiguration,
    );
    assert.strictEqual(
      second.decorationCalls.length,
      secondDecorationsBeforeConfiguration,
    );
    assert.strictEqual(firstSplit.decorationCalls.length, 0);

    host.setVisibleEditors([first, firstSplit, second]);
    const firstType = first.decorationCalls.at(-2)?.type;
    const secondType = second.decorationCalls.at(-1)?.type;
    const firstSplitType = firstSplit.decorationCalls.at(-2)?.type;
    assert.strictEqual(
      first.document.lineAtCallCount,
      firstCallsWhileHidden + first.document.lineCount,
    );
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondCallsBeforeConfiguration,
    );
    assert.strictEqual(
      second.decorationCalls.length,
      secondDecorationsBeforeConfiguration,
    );
    const secondLine = optionsForLine(second, 1)[0].renderOptions?.after as {
      width: string;
      backgroundColor: { id: string };
    };
    assert.strictEqual(secondLine.backgroundColor.id, "editor.foreground");

    const firstBackground = first.decorationCalls.at(-1);
    const splitBackground = firstSplit.decorationCalls.at(-1);
    const firstBackgroundType = firstBackground?.type;
    const splitBackgroundType = splitBackground?.type;
    assert.deepStrictEqual(
      (firstBackground?.type.options as { backgroundColor: string })
        .backgroundColor,
      "#abcdef40",
    );
    assert.deepStrictEqual(
      (splitBackground?.type.options as { backgroundColor: string })
        .backgroundColor,
      "#abcdef40",
    );
    assert.strictEqual(second.decorationCalls.at(-1)?.type, secondType);
    assert.strictEqual(
      (
        optionsForLine(second, 1)[0].renderOptions?.after as {
          backgroundColor: { id: string };
        }
      ).backgroundColor.id,
      "editor.foreground",
    );

    const firstCallsBeforeVisibleConfiguration = first.document.lineAtCallCount;
    const secondCallsBeforeVisibleConfiguration =
      second.document.lineAtCallCount;
    const secondDecorationsBeforeVisibleConfiguration =
      second.decorationCalls.length;
    host.setConfiguration(firstUri, {
      boundaryStyle: "marker",
      boundaryColor: "#abcdef",
      boundaryWidth: 2,
    });
    assert.strictEqual(
      first.document.lineAtCallCount,
      firstCallsBeforeVisibleConfiguration + first.document.lineCount,
    );
    assert.strictEqual(
      second.document.lineAtCallCount,
      secondCallsBeforeVisibleConfiguration,
    );
    assert.strictEqual(
      second.decorationCalls.length,
      secondDecorationsBeforeVisibleConfiguration,
    );
    assert.strictEqual(firstBackgroundType?.disposeCount, 1);
    assert.strictEqual(splitBackgroundType?.disposeCount, 1);
    assert.ok(
      first.decorationCalls
        .filter((call) => call.type === firstType)
        .at(-1)
        ?.options.some(
          (option) =>
            (
              option.renderOptions?.after as
                | { contentText?: string }
                | undefined
            )?.contentText === "│",
        ),
    );
    assert.ok(
      firstSplit.decorationCalls
        .filter((call) => call.type === firstSplitType)
        .at(-1)
        ?.options.some(
          (option) =>
            (
              option.renderOptions?.after as
                | { contentText?: string }
                | undefined
            )?.contentText === "│",
        ),
    );
    assert.strictEqual(second.decorationCalls.at(-1)?.type, secondType);

    host.dispose();
    assert.strictEqual(firstBackgroundType?.disposeCount, 1);
    assert.strictEqual(splitBackgroundType?.disposeCount, 1);
  });

  test("1回の解析ではモードを引き継ぎ、別文書では先頭から解析する", async () => {
    const normal = `2${"x".repeat(112)} `;
    const edi = `2${"x".repeat(112)}Y`;
    const general = host.createEditor("50200121-general.txt", [normal, edi]);
    host.setActiveEditor(general);
    await host.chooseFileType(zenginGeneralTransfer);
    assert.strictEqual(hasRow(general, 0, "データ"), true);
    assert.strictEqual(hasRow(general, 0, "データ(EDI)"), false);
    assert.strictEqual(hasRow(general, 1, "データ(EDI)"), true);
    assert.strictEqual(hasRow(general, 1, "データ"), false);

    const first = host.createEditor("50200003-first.txt", [header("5"), "2"]);
    host.setActiveEditor(first);
    await host.chooseFileType(zenginTransfer);
    const firstType = first.decorationCalls.at(-1)?.type;
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );

    const sameType = host.createEditor("50200003-second.txt", ["2"]);
    host.setActiveEditor(sameType);
    await host.chooseFileType(zenginTransfer);
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    const sameTypeHandleBeforeForeign = sameType.decorationCalls.at(-1)?.type;

    const otherType = host.createEditor("50200009-foreign.txt", [
      foreignCurrencyHeader("1"),
      "201",
    ]);
    host.setActiveEditor(otherType);
    await host.chooseFileType(zenginForeignCurrency);
    assert.strictEqual(
      hasRow(
        otherType,
        1,
        "データ(本体情報(1)：普通預金･当座預金･貯蓄預金の場合)",
      ),
      true,
    );
    const beforeSwitch = host.reporters[0].events.length;
    host.setActiveEditor(sameType);
    assert.deepStrictEqual(optionsForLine(sameType, 0), []);
    const sameTypeHeadHandle = sameType.decorationCalls.at(-1)?.type;
    assert.strictEqual(sameTypeHandleBeforeForeign?.disposeCount, 1);
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    host.setActiveEditor(first);
    assert.strictEqual(sameTypeHeadHandle?.disposeCount, 1);
    assert.strictEqual(firstType?.disposeCount, 1);
    assert.strictEqual(first.decorationCalls.length, 3);
    assert.strictEqual(
      hasRow(first, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.strictEqual(host.reporters[0].events.length, beforeSwitch);

    const badHeader = `1${"0".repeat(61)}X`;
    const reset = host.createEditor("50200003-reset.txt", [badHeader, "2"]);
    host.setActiveEditor(reset);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(hasRow(reset, 0, "ヘッダー"), true);
    assert.deepStrictEqual(optionsForLine(reset, 1), []);

    const update = host.createEditor("50200003-updated.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(update);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(update, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
  });

  test("エディターがない選択、キャンセル、テレメトリの順序と安全な値を保つ", async () => {
    await host.chooseFileType(zenginAccount);
    const reporter = host.reporters[0];
    assert.strictEqual(reporter.connectionString, "sdd-characterization-dummy");
    assert.deepStrictEqual(
      reporter.events.map((event) => event.name),
      ["ext.activate", "ext.decorate"],
    );
    assert.deepStrictEqual(reporter.events[0].properties, {
      development: "false",
    });
    assert.deepStrictEqual(reporter.events[1].properties, {
      file_type: "furikomi_nyuukin_tuuchi_a@zengin",
      development: "false",
    });
    assert.strictEqual(host.decorationTypes.length, 0);

    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = editor.decorationCalls.at(-1)?.type;
    const callCount = editor.decorationCalls.length;
    const eventsBeforeCancel = reporter.events.length;
    await host.chooseFileType(undefined);
    assert.strictEqual(editor.decorationCalls.length, callCount);
    assert.strictEqual(originalType?.disposeCount, 0);
    assert.strictEqual(reporter.events.length, eventsBeforeCancel + 1);
    assert.deepStrictEqual(reporter.events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "", development: "false" },
    });

    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    const eventsBeforeSwitch = reporter.events.length;
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.strictEqual(replacementEditor.decorationCalls.length, 1);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);
  });

  test("編集をまとめて再解析し、編集後のヘッダーと最新内容に追随する", async () => {
    const editor = host.createEditor("50200003-edited.txt", [header("5"), "2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );

    const originalType = editor.decorationCalls.at(-1)?.type;
    const callsBeforeEdit = editor.decorationCalls.length;
    host.changeDocument(editor, [header("1"), "2"]);
    host.changeDocument(editor, [header("5"), "2"]);
    host.changeDocument(editor, [header("1"), "2"]);
    host.sendEmptyDocumentChange(editor);
    await host.waitForPendingRender();

    assert.strictEqual(editor.decorationCalls.length, callsBeforeEdit + 1);
    assert.strictEqual(
      hasRow(editor, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      false,
    );
    assert.strictEqual(editor.decorationCalls.at(-1)?.type, originalType);
    assert.strictEqual(originalType?.disposeCount, 0);

    host.changeDocument(editor, [header("5"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(editor, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    host.changeDocument(editor, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(editor, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );

    const unselected = host.createEditor("unselected.txt", ["2"]);
    host.setActiveEditor(unselected);
    host.changeDocument(unselected, [header("5"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(unselected.decorationCalls.length, 0);
  });

  test("1000行を10回編集しても、最後の通知から一度だけ描画する", async () => {
    const uri = "file:///large/50200003.txt";
    const primary = host.createEditor("50200003.txt", [header("1"), "2"], uri);
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginTransfer);
    const split = host.createEditor("50200003.txt", [], uri);
    host.setVisibleEditors([primary, split]);

    const primaryCallsBefore = primary.decorationCalls.length;
    const splitCallsBefore = split.decorationCalls.length;
    const timers = host.useFakeTimers();
    try {
      for (let edit = 1; edit <= 10; edit += 1) {
        const lines = [header("1"), ...Array<string>(998).fill("2"), "9"];
        lines[1] = `2${"x".repeat(edit)}`;
        host.changeDocument(primary, lines);
        if (edit < 10) {
          timers.advanceBy(9);
        }
      }

      timers.advanceBy(99);
      assert.strictEqual(primary.decorationCalls.length, primaryCallsBefore);
      assert.strictEqual(split.decorationCalls.length, splitCallsBefore);
      timers.advanceBy(1);
      assert.strictEqual(
        primary.decorationCalls.length,
        primaryCallsBefore + 1,
      );
      assert.strictEqual(split.decorationCalls.length, splitCallsBefore + 1);
      assert.strictEqual(primary.document.lineCount, 1000);
      assert.strictEqual(hasRow(primary, 999, "エンド"), true);
      assert.strictEqual(hasRow(split, 999, "エンド"), true);
    } finally {
      timers.restore();
    }
  });

  test("同じ URI の分割表示に同じ解析結果を配り、別 URI と解除を分ける", async () => {
    const primary = host.createEditor(
      "50200003-split.txt",
      [header("5"), "2"],
      "file:///first/50200003-split.txt?view=primary#left",
    );
    host.setActiveEditor(primary);
    await host.chooseFileType(zenginTransfer);

    const split = host.createEditor(
      "50200003-split.txt",
      [],
      "file:///first/50200003-split.txt?view=primary#left",
    );
    const sameNameOtherUri = host.createEditor(
      "50200003-split.txt",
      ["2"],
      "vscode-remote://authority/first/50200003-split.txt?view=other#right",
    );
    assert.notStrictEqual(
      sameNameOtherUri.document.uri.toString(),
      primary.document.uri.toString(),
    );
    assert.strictEqual(
      new URL(sameNameOtherUri.document.uri.toString()).pathname,
      new URL(primary.document.uri.toString()).pathname,
    );
    host.setVisibleEditors([primary, split, sameNameOtherUri]);
    assert.strictEqual(
      hasRow(split, 1, "データ(通知預金・定期預金・積立定期預金)"),
      true,
    );
    assert.strictEqual(sameNameOtherUri.decorationCalls.length, 0);
    assert.notStrictEqual(
      primary.decorationCalls.at(-1)?.type,
      split.decorationCalls.at(-1)?.type,
    );

    host.changeDocument(primary, [header("1"), "2"]);
    await host.waitForPendingRender();
    assert.strictEqual(
      hasRow(primary, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(
      hasRow(split, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );
    assert.strictEqual(sameNameOtherUri.decorationCalls.length, 0);

    host.setActiveEditor(primary);
    host.setVisibleEditors([primary, split, sameNameOtherUri]);
    const primaryType = primary.decorationCalls.at(-1)?.type;
    const splitType = split.decorationCalls.at(-1)?.type;
    await host.chooseFileType(clearType);
    assert.strictEqual(primaryType?.disposeCount, 1);
    assert.strictEqual(splitType?.disposeCount, 1);
    assert.deepStrictEqual(primary.decorationCalls.at(-1)?.options, []);
    assert.deepStrictEqual(split.decorationCalls.at(-1)?.options, []);
    assert.strictEqual(sameNameOtherUri.decorationCalls.length, 0);
  });

  test("閉じて開き直した URI は形式を保ち、古い待機処理を破棄する", async () => {
    const uri = "file:///reopened/50200003.txt";
    const editor = host.createEditor("50200003.txt", [header("5"), "2"], uri);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);
    host.changeDocument(editor, [header("1"), "2"]);
    host.closeDocument(editor);
    await host.waitForPendingRender();
    assert.strictEqual(editor.decorationCalls.length, 2);
    assert.deepStrictEqual(editor.decorationCalls.at(-1)?.options, []);

    const reopened = host.createEditor("50200003.txt", [header("1"), "2"], uri);
    host.setVisibleEditors([reopened]);
    assert.strictEqual(
      hasRow(reopened, 1, "データ(普通預金・当座預金・貯蓄預金)"),
      true,
    );

    host.changeDocument(reopened, [header("5"), "2"]);
    const callsBeforeDispose = reopened.decorationCalls.length;
    const currentType = reopened.decorationCalls.at(-1)?.type;
    host.dispose();
    assert.strictEqual(currentType?.disposeCount, 1);
    await host.waitForPendingRender();
    assert.strictEqual(reopened.decorationCalls.length, callsBeforeDispose);
  });

  test("待機中に再選択すると古い更新を取り消し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-reselect.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = editor.decorationCalls.length;
    const originalType = editor.decorationCalls.at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      await host.chooseFileType(zenginTransfer);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 0);
      assert.strictEqual(editor.decorationCalls.length, callsBeforeEdit + 1);
      assert.strictEqual(editor.decorationCalls.at(-1)?.type, originalType);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);

      const callsAfterReselection = editor.decorationCalls.length;
      const eventsAfterReselection = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(editor.decorationCalls.length, callsAfterReselection);
      assert.strictEqual(reporter.events.length, eventsAfterReselection);
    } finally {
      timers.restore();
    }
  });

  test("解除すると待機中の更新を取り消し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-clear-pending.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = editor.decorationCalls.length;
    const originalType = editor.decorationCalls.at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      await host.chooseFileType(clearType);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.strictEqual(editor.decorationCalls.length, callsBeforeEdit + 1);
      assert.deepStrictEqual(editor.decorationCalls.at(-1)?.options, []);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);
      assert.deepStrictEqual(reporter.events.at(-1), {
        name: "ext.decorate",
        properties: { file_type: "clear@clear", development: "false" },
      });

      const callsAfterClear = editor.decorationCalls.length;
      const eventsAfterClear = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(editor.decorationCalls.length, callsAfterClear);
      assert.strictEqual(reporter.events.length, eventsAfterClear);
    } finally {
      timers.restore();
    }
  });

  test("Close なしで表示から外れると待機中の更新と装飾を破棄する", async () => {
    const editor = host.createEditor("50200003-hidden.txt", [header("1"), "2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = editor.decorationCalls.length;
    const originalType = editor.decorationCalls.at(-1)?.type;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.setVisibleEditors([]);
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(originalType?.disposeCount, 1);
      assert.strictEqual(editor.decorationCalls.length, callsBeforeEdit + 1);
      assert.deepStrictEqual(editor.decorationCalls.at(-1)?.options, []);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      const callsAfterHide = editor.decorationCalls.length;
      timers.advanceBy(100);
      assert.strictEqual(editor.decorationCalls.length, callsAfterHide);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);
    } finally {
      timers.restore();
    }
  });

  test("破棄時に待機処理と購読を一度だけ破棄し、余分なイベントを送らない", async () => {
    const editor = host.createEditor("50200003-dispose-pending.txt", [
      header("1"),
      "2",
    ]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginTransfer);

    const reporter = host.reporters[0];
    const eventsBeforeEdit = reporter.events.length;
    const callsBeforeEdit = editor.decorationCalls.length;
    const timers = host.useFakeTimers();
    try {
      host.changeDocument(editor, [header("5"), "2"]);
      assert.strictEqual(timers.pendingCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit);

      host.dispose();
      assert.strictEqual(timers.pendingCount, 0);
      assert.strictEqual(host.commandDisposalCount, 1);
      assert.deepStrictEqual(host.eventSubscriptionStats, {
        activeEditor: { registered: 0, disposed: 0, active: 0 },
        visibleEditors: { registered: 1, disposed: 1, active: 0 },
        documentChanges: { registered: 1, disposed: 1, active: 0 },
        documentClose: { registered: 1, disposed: 1, active: 0 },
      });
      assert.strictEqual(host.registeredCommands.has(commandId), false);
      assert.strictEqual(reporter.disposeCount, 1);
      assert.strictEqual(reporter.events.length, eventsBeforeEdit + 1);
      assert.strictEqual(reporter.events.at(-1)?.name, "ext.deactivate");

      host.dispose();
      const eventsAfterDispose = reporter.events.length;
      timers.advanceBy(100);
      assert.strictEqual(editor.decorationCalls.length, callsBeforeEdit);
      assert.strictEqual(reporter.events.length, eventsAfterDispose);
      assert.strictEqual(reporter.disposeCount, 1);
      assert.strictEqual(host.commandDisposalCount, 1);
      assert.strictEqual(
        host.eventSubscriptionStats.visibleEditors.disposed,
        1,
      );
      assert.strictEqual(
        host.eventSubscriptionStats.documentChanges.disposed,
        1,
      );
      assert.strictEqual(host.eventSubscriptionStats.documentClose.disposed, 1);
    } finally {
      timers.restore();
    }
  });

  test("空形式で装飾を解除し、同じ文書の再適用と破棄を保つ", async () => {
    const editor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(editor);
    await host.chooseFileType(zenginAccount);
    const originalType = editor.decorationCalls.at(-1)?.type;
    assert.strictEqual(optionsForLine(editor, 0).length, 1);

    const eventsBeforeClear = host.reporters[0].events.length;
    await host.chooseFileType(clearType);
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.deepStrictEqual(editor.decorationCalls.at(-1)?.options, []);
    assert.strictEqual(host.reporters[0].events.length, eventsBeforeClear + 1);
    assert.deepStrictEqual(host.reporters[0].events.at(-1), {
      name: "ext.decorate",
      properties: { file_type: "clear@clear", development: "false" },
    });

    const reporter = host.reporters[0];
    const eventsBeforeSwitch = reporter.events.length;
    const replacementEditor = host.createEditor("50200001.txt", ["2"]);
    host.setActiveEditor(replacementEditor);
    assert.strictEqual(replacementEditor.decorationCalls.length, 0);
    assert.strictEqual(reporter.events.length, eventsBeforeSwitch);

    host.dispose();
    assert.strictEqual(originalType?.disposeCount, 1);
    assert.strictEqual(reporter.events.at(-1)?.name, "ext.deactivate");
    assert.deepStrictEqual(reporter.events.at(-1)?.properties, {
      development: "false",
    });
    assert.strictEqual(reporter.disposeCount, 1);
  });
});
