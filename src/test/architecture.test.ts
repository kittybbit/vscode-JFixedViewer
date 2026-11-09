import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { findArchitectureViolations } from "./support/architectureRules";

const repositoryRoot = path.resolve(__dirname, "../..");

function withFixture(
  files: Record<string, string>,
  inspect: (rootDirectory: string) => void,
): void {
  const rootDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "jfixedviewer-architecture-"),
  );
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(rootDirectory, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, source);
    }
    inspect(rootDirectory);
  } finally {
    fs.rmSync(rootDirectory, { force: true, recursive: true });
  }
}

function rulesIn(rootDirectory: string): string[] {
  return findArchitectureViolations(rootDirectory).map(({ rule }) => rule);
}

test("本番ソースをすべて分類し、依存違反を残さない", () => {
  assert.deepStrictEqual(findArchitectureViolations(repositoryRoot), []);
});

test("許可された層間依存、API、組み立てを受け入れる", () => {
  withFixture(
    {
      "src/domain/internal.ts": "export const domainValue = 1;",
      "src/domain/model.ts":
        'import { domainValue } from "./internal"; export { domainValue };',
      "src/application/fixedWidth/FixedWidthDecoration.ts":
        "export function createExample() { return 1; }",
      "src/application/inner.ts": "export const applicationValue = 1;",
      "src/infrastructure/definitions/loader.ts":
        'import "../../resource/definitions/sample.json"; import "../../domain/internal"; import "../../application/inner"; import "../helper";',
      "src/infrastructure/helper.ts": "export const infrastructureValue = 1;",
      "src/infrastructure/telemetry/adapter.ts":
        'import "vscode"; import "@vscode/extension-telemetry";',
      "src/infrastructure/adapter.ts": "export class ExampleAdapter {}",
      "src/presentation/vscode/inner.ts": "export const view = 1;",
      "src/presentation/vscode/view.ts":
        'import "../../application/inner"; import "./inner"; import "vscode";',
      "src/bootstrap/inner.ts": "export const bootstrapValue = 1;",
      "src/bootstrap/activate.ts":
        'import { createExample } from "../application/fixedWidth/FixedWidthDecoration"; import { ExampleAdapter } from "../infrastructure/adapter"; import "../infrastructure/definitions/loader"; import "../presentation/vscode/view"; import "./inner"; import "vscode"; new ExampleAdapter(); createExample();',
      "src/extension.ts": 'import "vscode"; import "./bootstrap/activate";',
      "src/resource/definitions/sample.json": "{}",
    },
    (rootDirectory) => {
      assert.deepStrictEqual(rulesIn(rootDirectory), []);
    },
  );
});

test("禁止する層、ホスト、SDK、Node、定義、組み立ての参照を検出する", () => {
  withFixture(
    {
      "src/domain/internal.ts":
        'import "../application/app"; import "node:test"; import "fs";',
      "src/application/app.ts":
        'import "../infrastructure/adapter"; import "vscode"; import "@vscode/extension-telemetry"; import "../resource/definitions/sample.json";',
      "src/application/factory.ts":
        "export function createExample() { return 1; }",
      "src/infrastructure/adapter.ts": "export class ExampleAdapter {}",
      "src/infrastructure/factoryUser.ts":
        'import { createExample } from "../application/factory"; createExample();',
      "src/infrastructure/definitions/loader.ts":
        'import "../../resource/definitions/sample.json";',
      "src/presentation/vscode/presenter.ts":
        'import { ExampleAdapter } from "../../infrastructure/adapter"; new ExampleAdapter(); import "../other";',
      "src/presentation/other.ts": "export const other = 1;",
      "src/bootstrap/activate.ts": "export const activate = 1;",
      "src/extension.ts": 'import "./presentation/other";',
      "src/resource/definitions/sample.json": "{}",
      "src/misc/unclassified.mts": "export const misplacedTypeScript = true;",
      "src/misc/unclassified.js": "export const misplacedJavaScript = true;",
    },
    (rootDirectory) => {
      const violations = findArchitectureViolations(rootDirectory);
      const rules = violations.map(({ rule }) => rule);
      for (const expected of [
        "layer-dependency",
        "node-builtin-import",
        "vscode-import",
        "telemetry-sdk-import",
        "definition-json-import",
        "application-factory-use",
        "infrastructure-concrete-use",
        "unclassified-source",
      ]) {
        assert.ok(rules.includes(expected), `違反 ${expected} を検出します。`);
      }
      assert.deepStrictEqual(
        violations
          .filter(({ rule }) => rule === "unclassified-source")
          .map(({ file }) => file)
          .sort(),
        ["src/misc/unclassified.js", "src/misc/unclassified.mts"],
      );
      assert.deepStrictEqual(
        violations
          .filter(({ rule }) => rule === "node-builtin-import")
          .map(({ specifier }) => specifier)
          .sort(),
        ["fs", "node:test"],
      );
    },
  );
});

test("静的な import 構文を解析し、動的ローダー参照を拒否する", () => {
  withFixture(
    {
      "src/infrastructure/definitions/base.ts": "export type Model = string;",
      "src/infrastructure/definitions/probe.ts": [
        'import { Model } from "./base";',
        'import type { Model as TypeModel } from "./base";',
        'export { Model } from "./base";',
        'type Imported = import("./base").Model;',
        'import base = require("./base");',
        'void import("./base");',
        'void require("./base");',
        "void import(target);",
        "void require(target);",
        'void module.require("./base");',
        'void (require)("./base");',
        "const loader = require;",
        "void Model; void TypeModel; void Imported; void base;",
      ].join("\n"),
    },
    (rootDirectory) => {
      const violations = findArchitectureViolations(rootDirectory);
      assert.strictEqual(
        violations.filter(({ rule }) => rule === "dynamic-module-reference")
          .length,
        5,
      );
      assert.strictEqual(
        violations.filter(({ rule }) => rule === "layer-dependency").length,
        0,
      );
    },
  );
});

test("各 import 形式で禁止された依存先を検出する", () => {
  const prohibitedImports = [
    'import { Value } from "../application/target";',
    'import type { Value as TypeValue } from "../application/target";',
    'export { Value as ReExported } from "../application/target";',
    'type Imported = import("../application/target").Value;',
    'import application = require("../application/target");',
    'void import("../application/target");',
    'void require("../application/target");',
  ];
  withFixture(
    {
      "src/domain/probe.ts": prohibitedImports.join("\n"),
      "src/application/target.ts": "export const Value = 1;",
    },
    (rootDirectory) => {
      const violations = findArchitectureViolations(rootDirectory).filter(
        ({ rule }) => rule === "layer-dependency",
      );
      assert.strictEqual(violations.length, prohibitedImports.length);
    },
  );
});

test("typeof import のファクトリー型参照も組み立て境界に含める", () => {
  withFixture(
    {
      "src/application/factory.ts":
        "export function createExample() { return 1; }",
      "src/infrastructure/probe.ts":
        'type Factory = typeof import("../application/factory").createExample; void (0 as unknown as Factory);',
      "src/bootstrap/activate.ts": "export const activate = 1;",
    },
    (rootDirectory) => {
      assert.ok(rulesIn(rootDirectory).includes("application-factory-use"));
    },
  );
});

test("特殊なローダー構文と間接的なファクトリー参照を検出する", () => {
  const cases = [
    {
      name: "optional call の require",
      source: 'void require?.("node:fs");',
      rule: "dynamic-module-reference",
    },
    {
      name: 'element access の module["require"]',
      source: 'void module["require"]("node:fs");',
      rule: "dynamic-module-reference",
    },
    {
      name: "require で読み込んだ名前空間からのファクトリー呼び出し",
      source:
        'const factory = require("../application/factory"); factory.createExample();',
      rule: "application-factory-use",
    },
    {
      name: "namespace import からの分割代入",
      source:
        'import * as app from "../application/factory"; const { createExample } = app; createExample();',
      rule: "application-factory-use",
    },
    {
      name: "namespace import の element access 呼び出し",
      source:
        'import * as app from "../application/factory"; app["createExample"]();',
      rule: "application-factory-use",
    },
  ];

  for (const scenario of cases) {
    withFixture(
      {
        "src/infrastructure/probe.ts": scenario.source,
        "src/application/factory.ts":
          "export function createExample() { return 1; }",
      },
      (rootDirectory) => {
        const violations = findArchitectureViolations(rootDirectory);
        assert.ok(
          violations.some(({ rule }) => rule === scenario.rule),
          `${scenario.name} を ${scenario.rule} として検出します。`,
        );
      },
    );
  }
});
