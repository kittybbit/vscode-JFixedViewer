import { builtinModules } from "node:module";
import * as path from "node:path";
import * as ts from "typescript";

type SourceLayer =
  | "domain"
  | "application"
  | "infrastructure"
  | "presentation"
  | "bootstrap"
  | "resource"
  | "entry";

type SourceDescription = {
  file: string;
  absoluteFile: string;
  sourceFile: ts.SourceFile;
  layer?: SourceLayer;
};

export type ArchitectureViolation = {
  file: string;
  rule: string;
  message: string;
  specifier?: string;
};

type InspectionContext = {
  root: string;
  source: SourceDescription;
  program: ts.Program;
  checker: ts.TypeChecker;
  violations: ArchitectureViolation[];
};

const allowedTargets: Record<SourceLayer, readonly SourceLayer[]> = {
  domain: ["domain"],
  application: ["domain", "application"],
  infrastructure: ["domain", "application", "infrastructure", "resource"],
  presentation: ["application", "presentation"],
  bootstrap: ["application", "infrastructure", "presentation", "bootstrap"],
  resource: [],
  entry: ["bootstrap"],
};

const sourceLayers: readonly SourceLayer[] = [
  "domain",
  "application",
  "infrastructure",
  "presentation",
  "bootstrap",
  "resource",
];

const builtins = new Set(
  builtinModules.map((name) => name.replace(/^node:/u, "")),
);

function relativeName(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

function sourceLayerOf(file: string): SourceLayer | undefined {
  if (file === "src/extension.ts") {
    return "entry";
  }
  return sourceLayers.find((layer) => file.startsWith(`src/${layer}/`));
}

function sourceFiles(root: string): string[] {
  const sourceRoot = path.join(root, "src");
  return ts.sys
    .readDirectory(sourceRoot, [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ])
    .filter((file) => {
      const relative = relativeName(root, file);
      return (
        !relative.split("/").includes("test") &&
        !/\.test\.tsx?$/u.test(relative)
      );
    });
}

function createProgram(root: string, files: readonly string[]): ts.Program {
  return ts.createProgram(files, {
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    allowJs: true,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
  });
}

function describeSource(
  root: string,
  program: ts.Program,
  absoluteFile: string,
): SourceDescription {
  const file = relativeName(root, absoluteFile);
  const sourceFile = program.getSourceFile(absoluteFile);
  if (!sourceFile) {
    throw new Error(`TypeScript ソースを読み込めません: ${file}`);
  }
  return { file, absoluteFile, sourceFile, layer: sourceLayerOf(file) };
}

function loadSources(root: string): {
  files: SourceDescription[];
  program: ts.Program;
} {
  const paths = sourceFiles(root);
  const program = createProgram(root, paths);
  return {
    files: paths.map((file) => describeSource(root, program, file)),
    program,
  };
}

function sourceReferences(source: SourceDescription): string[] {
  return ts
    .preProcessFile(source.sourceFile.text, true, true)
    .importedFiles.map(({ fileName }) => fileName);
}

function targetPath(
  context: InspectionContext,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const resolution = ts.resolveModuleName(
    specifier,
    context.source.absoluteFile,
    context.program.getCompilerOptions(),
    ts.sys,
  ).resolvedModule?.resolvedFileName;
  return resolution
    ? relativeName(context.root, path.resolve(resolution))
    : path.posix.normalize(
        path.posix.join(path.posix.dirname(context.source.file), specifier),
      );
}

function isBuiltin(specifier: string): boolean {
  const name = specifier.replace(/^node:/u, "");
  return builtins.has(name) || builtins.has(name.split("/")[0]);
}

function isVscode(specifier: string): boolean {
  return specifier === "vscode" || specifier.startsWith("vscode/");
}

function isTelemetrySdk(specifier: string): boolean {
  return (
    specifier === "@vscode/extension-telemetry" ||
    specifier.startsWith("@vscode/extension-telemetry/")
  );
}

function isJson(specifier: string, target: string | undefined): boolean {
  return specifier.endsWith(".json") || target?.endsWith(".json") === true;
}

function allowedVscodeSource(file: string): boolean {
  return (
    file === "src/extension.ts" ||
    file.startsWith("src/bootstrap/") ||
    file.startsWith("src/infrastructure/") ||
    file.startsWith("src/presentation/vscode/")
  );
}

function checkRelativeTarget(
  context: InspectionContext,
  specifier: string,
  target: string | undefined,
): void {
  if (!specifier.startsWith(".")) {
    return;
  }
  const rule = relativeTargetRule(context, target);
  if (rule) {
    context.violations.push({
      file: context.source.file,
      specifier,
      rule,
      message: "相対参照の対象または依存方向が許可されていません。",
    });
  }
}

function relativeTargetRule(
  context: InspectionContext,
  target: string | undefined,
): string | undefined {
  if (!target || !target.startsWith("src/")) {
    return "relative-import-outside-source";
  }
  const targetLayer = sourceLayerOf(target);
  if (!targetLayer) {
    return "unclassified-dependency";
  }
  return dependencyRule(context.source.layer, targetLayer);
}

function dependencyRule(
  sourceLayer: SourceLayer | undefined,
  targetLayer: SourceLayer,
): string | undefined {
  if (sourceLayer && allowedTargets[sourceLayer].includes(targetLayer)) {
    return undefined;
  }
  return "layer-dependency";
}

function checkReference(context: InspectionContext, specifier: string): void {
  const target = targetPath(context, specifier);
  const restrictions = [
    [
      isBuiltin(specifier),
      "node-builtin-import",
      "本番ソースから Node.js 組み込みを参照できません。",
    ],
    [
      isVscode(specifier) && !allowedVscodeSource(context.source.file),
      "vscode-import",
      "VS Code API の import 先が許可された境界の外です。",
    ],
    [
      isTelemetrySdk(specifier) &&
        !context.source.file.startsWith("src/infrastructure/telemetry/"),
      "telemetry-sdk-import",
      "テレメトリ SDK は infrastructure/telemetry に限定してください。",
    ],
    [
      isJson(specifier, target) &&
        !context.source.file.startsWith("src/infrastructure/definitions/"),
      "definition-json-import",
      "定義 JSON は infrastructure/definitions から読み込んでください。",
    ],
  ] as const;
  for (const [rejected, rule, message] of restrictions) {
    if (rejected) {
      context.violations.push({
        file: context.source.file,
        specifier,
        rule,
        message,
      });
    }
  }
  checkRelativeTarget(context, specifier, target);
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isModuleExpression(expression: ts.Expression): boolean {
  return ts.isIdentifier(expression) && expression.text === "module";
}

function isModuleRequire(expression: ts.Expression): boolean {
  const callee = unwrap(expression);
  if (
    ts.isPropertyAccessExpression(callee) &&
    isModuleExpression(callee.expression)
  ) {
    return callee.name.text === "require";
  }
  return (
    ts.isElementAccessExpression(callee) &&
    isModuleExpression(callee.expression) &&
    isStringLiteral(callee.argumentExpression) &&
    callee.argumentExpression.text === "require"
  );
}

function isRequireCall(node: ts.CallExpression): boolean {
  const callee = unwrap(node.expression);
  return (
    (ts.isIdentifier(callee) && callee.text === "require") ||
    isModuleRequire(callee)
  );
}

function isStringLiteral(
  node: ts.Expression | undefined,
): node is ts.StringLiteralLike {
  return node !== undefined && ts.isStringLiteralLike(node);
}

function isLoaderCallee(node: ts.Node): boolean {
  let current = node;
  while (
    ts.isParenthesizedExpression(current.parent) &&
    current.parent.expression === current
  ) {
    current = current.parent;
  }
  return (
    ts.isCallExpression(current.parent) && current.parent.expression === current
  );
}

function callLoaderProblem(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return !isStringLiteral(node.arguments[0]);
  }
  return isRequireCall(node) && !isStaticRequireCall(node);
}

function isStaticRequireCall(node: ts.CallExpression): boolean {
  return (
    ts.isIdentifier(node.expression) &&
    node.expression.text === "require" &&
    node.questionDotToken === undefined &&
    isStringLiteral(node.arguments[0])
  );
}

function isRequireMember(node: ts.Node): boolean {
  return (
    (ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)) &&
    isModuleRequire(node)
  );
}

function referenceLoaderProblem(node: ts.Node): boolean {
  if (ts.isIdentifier(node) && node.text === "require") {
    return (
      !isLoaderCallee(node) &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
    );
  }
  return isRequireMember(node) && !isLoaderCallee(node);
}

function loaderProblem(node: ts.Node): boolean {
  return callLoaderProblem(node) || referenceLoaderProblem(node);
}

function loaderProblemCount(source: SourceDescription): number {
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (loaderProblem(node)) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(source.sourceFile);
  return count;
}

function addLoaderViolations(context: InspectionContext): void {
  const count = loaderProblemCount(context.source);
  for (let index = 0; index < count; index += 1) {
    context.violations.push({
      file: context.source.file,
      rule: "dynamic-module-reference",
      message: "静的に解析できない import または require は使用できません。",
    });
  }
}

function resolveSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

function isApplicationFactory(
  context: InspectionContext,
  symbol: ts.Symbol,
): boolean {
  const target = resolveSymbol(context.checker, symbol);
  return (
    /^create[A-Z]/u.test(target.getName()) &&
    target.declarations?.some((declaration) =>
      relativeName(
        context.root,
        declaration.getSourceFile().fileName,
      ).startsWith("src/application/"),
    ) === true
  );
}

function isInfrastructureClass(
  context: InspectionContext,
  symbol: ts.Symbol,
): boolean {
  const target = resolveSymbol(context.checker, symbol);
  return (
    (target.flags & ts.SymbolFlags.Class) !== 0 &&
    target.declarations?.some((declaration) =>
      relativeName(
        context.root,
        declaration.getSourceFile().fileName,
      ).startsWith("src/infrastructure/"),
    ) === true
  );
}

function checkResolvedSymbol(
  context: InspectionContext,
  symbol: ts.Symbol,
): void {
  if (
    isApplicationFactory(context, symbol) &&
    context.source.layer !== "application" &&
    context.source.layer !== "bootstrap"
  ) {
    context.violations.push({
      file: context.source.file,
      rule: "application-factory-use",
      message:
        "アプリケーションのファクトリーは application と bootstrap に限定してください。",
    });
  }
  if (
    isInfrastructureClass(context, symbol) &&
    context.source.layer !== "infrastructure" &&
    context.source.layer !== "bootstrap"
  ) {
    context.violations.push({
      file: context.source.file,
      rule: "infrastructure-concrete-use",
      message:
        "infrastructure の具体クラスは infrastructure と bootstrap に限定してください。",
    });
  }
}

function checkIdentifier(
  context: InspectionContext,
  node: ts.Identifier,
): void {
  const symbol = context.checker.getSymbolAtLocation(node);
  if (symbol) {
    checkResolvedSymbol(context, symbol);
    checkNamespaceExports(context, symbol);
  }
}

function checkModuleExports(
  context: InspectionContext,
  moduleSpecifier: ts.Expression,
): void {
  if (!isStringLiteral(moduleSpecifier)) {
    return;
  }
  const module = moduleSymbol(context, moduleSpecifier);
  if (!module) {
    return;
  }
  inspectModuleExports(context, module);
}

function moduleSymbol(
  context: InspectionContext,
  moduleSpecifier: ts.StringLiteralLike,
): ts.Symbol | undefined {
  const symbol = context.checker.getSymbolAtLocation(moduleSpecifier);
  const target = targetPath(context, moduleSpecifier.text);
  const sourceFile = target
    ? context.program.getSourceFile(path.resolve(context.root, target))
    : undefined;
  return (
    (symbol && resolveSymbol(context.checker, symbol)) ??
    (sourceFile && context.checker.getSymbolAtLocation(sourceFile))
  );
}

function inspectModuleExports(
  context: InspectionContext,
  module: ts.Symbol,
): void {
  let exports: readonly ts.Symbol[];
  try {
    exports = context.checker.getExportsOfModule(module);
  } catch {
    return;
  }
  for (const exported of exports) {
    checkResolvedSymbol(context, exported);
  }
}

function checkNamespaceExports(
  context: InspectionContext,
  symbol: ts.Symbol,
): void {
  const target = resolveSymbol(context.checker, symbol);
  if ((target.flags & ts.SymbolFlags.Module) !== 0) {
    inspectModuleExports(context, target);
  }
}

function checkLiteralLoader(context: InspectionContext, node: ts.Node): void {
  if (!ts.isCallExpression(node)) {
    return;
  }
  const loader =
    node.expression.kind === ts.SyntaxKind.ImportKeyword || isRequireCall(node);
  if (!loader) {
    return;
  }
  const argument = node.arguments[0];
  if (isStringLiteral(argument)) {
    checkModuleExports(context, argument);
  }
}

function checkFullReexport(context: InspectionContext, node: ts.Node): void {
  if (!ts.isExportDeclaration(node) || !node.moduleSpecifier) {
    return;
  }
  if (node.exportClause && !ts.isNamespaceExport(node.exportClause)) {
    return;
  }
  checkModuleExports(context, node.moduleSpecifier);
}

function checkCompositionNode(context: InspectionContext, node: ts.Node): void {
  if (ts.isIdentifier(node)) {
    checkIdentifier(context, node);
  }
  checkLiteralLoader(context, node);
  checkFullReexport(context, node);
}

function checkComposition(context: InspectionContext): void {
  const visit = (node: ts.Node): void => {
    checkCompositionNode(context, node);
    ts.forEachChild(node, visit);
  };
  visit(context.source.sourceFile);
}

function checkSource(context: InspectionContext): void {
  if (!context.source.layer) {
    context.violations.push({
      file: context.source.file,
      rule: "unclassified-source",
      message: "本番ソースをアーキテクチャの層に分類してください。",
    });
    return;
  }
  for (const specifier of sourceReferences(context.source)) {
    checkReference(context, specifier);
  }
  addLoaderViolations(context);
  checkComposition(context);
}

export function findArchitectureViolations(
  root: string,
): ArchitectureViolation[] {
  const { files, program } = loadSources(root);
  const violations: ArchitectureViolation[] = [];
  const checker = program.getTypeChecker();
  for (const source of files) {
    checkSource({ root, source, program, checker, violations });
  }
  return violations;
}
