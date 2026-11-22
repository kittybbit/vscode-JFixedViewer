---
name: release-extension
description: JFixedViewer の公開準備、バージョン更新、VSIX の検証、リリース PR、Visual Studio Marketplace への公開を行う。
---

# JFixedViewer の公開

対象は Visual Studio Marketplace の `kittybbit.vscode-JFixedViewer`。
リリース準備は SDD の機能実装と分ける。公開対象の製品変更はリポジトリの SDD 方針に従う。

## 公開準備

1. `package.json`、`package-lock.json`、`CHANGELOG.md`、`README.md`、
   `.vscodeignore`、`.github/workflows/` を確認する。クリーンな作業環境で
   `origin/main` とタグを取得し、`npm exec -- vsce show kittybbit.vscode-JFixedViewer --json`
   で前回の公開版を照合する。Marketplace の版と `v<X.Y.Z>` の対応が不明な場合や、
   対象の版またはタグが既に存在する場合は、状況を確認して判断を求める。
2. 前回の公開タグからの差分と `CHANGELOG.md` の「未リリース」を確認する。
   互換性を壊す変更は major、互換性を保った新機能は minor、修正や文書変更のみなら patch とし、
   該当するうち最も大きい変更を選ぶ。固定長形式、デスクトップ版と Web 版、
   `engines.vscode` の最低対応バージョンを確認する。最低対応バージョンの引き上げは互換性に影響する。
3. 最新の `origin/main` を起点に `codex/release-v<X.Y.Z>` を作る。
   公開する変更履歴を `CHANGELOG.md` の対象バージョンに移し、変更した Markdown を検査してコミットする。
   `npm version X.Y.Z --no-git-tag-version` を実行し、
   `package.json` と `package-lock.json` のバージョン更新を確認してコミットする。

## 検証とパッケージ

Verify に合わせて Node.js 24 と `npm ci` を使う。変更した Markdown に対して Verify と同じ
`markdownlint-cli2` を実行し、`git diff --check` も実行する。製品の検証は次の順で行う。

```sh
npm exec -- tsc -p . --noEmit
npm exec -- webpack --mode production --devtool false
npm run test:prepare
npm run test:architecture
npm run test:desktop
npm run test:desktop:min
npm run test:web
```

Web テストには Playwright の Chromium が必要。Linux の CI では
`npm exec -- playwright install --with-deps chromium` で用意し、
デスクトップと Web のテストは `xvfb-run -a` 経由で実行する。

公開ビルドで既存のテレメトリ設定を使う場合は、承認された `.env` を検証環境に用意する。
`connection_string` は Webpack がバンドルへ埋め込むため、公開用の値であることを確認し、
`.env` 自体や設定値を Git、ログ、報告に載せない。

検証環境の外に VSIX の出力先 `vsix_path` を設定し、
`npm exec -- vsce package --githubBranch main --out "$vsix_path"` を実行する。
`vscode:prepublish` は `npm run package` を呼び、`clean` と Qlty
（`qlty fmt`、`qlty check`）を経て本番ビルドする。整形で追跡中のファイルが変わった場合は
差分を確認し、検証済みのコミットと一致する状態でパッケージを作り直す。

VSIX 内のマニフェストで拡張 ID、対象バージョン、`engines.vscode`、
`main` と `browser` を確認する。`dist/extension.js`、`dist/web.js`、
README、CHANGELOG、LICENSE が入り、`.agents/`、`.codex/`、開発用ソース、テスト、
ローカルファイルや認証情報が含まれないことを確認する。公開時の照合用に VSIX の SHA-256 を記録する。

## PR・タグ・Marketplace

1. リリースブランチだけを push し、`main` 向けの PR に対象バージョン、検証結果、
   VSIX のハッシュを記録する。PR の最新ヘッドで Verify、CodeQL と適用されるチェックを確認し、
   マージの承認を得る。GitHub のルールを維持し、`main` への直接 push、履歴の書き換え、
   公開済みタグの移動は行わない。
2. マージ後に `origin/main` を取得し、実際に取り込まれたリリースコミットを特定する。
   squash や rebase 後は SHA が変わるため、検証した内容とリリースコミットのツリーを照合する。
   差分があれば、取り込まれたコミットでパッケージを作り直して再検証する。
3. 対象バージョン、タグを付けるコミット、VSIX の内容とハッシュ、公開コマンドについて承認を得る。
   タグと Marketplace のバージョンに重複がないことを再確認する。
   `v<X.Y.Z>` をそのコミットに付け、対象のタグだけを push する。
   GitHub 上でタグが意図したコミットを指し、そのコミットが `origin/main` に含まれることを確認する。
4. 承認済みの VSIX を `npm exec -- vsce publish --packagePath "$vsix_path"` で公開し、
   `vsce show` で対象バージョンを確認する。push や公開が拒否されたら、GitHub のルール、
   タグ、公開状況を確認し、原因と現在の状態を報告する。

## 報告

前回の公開タグ、今回の版と選定理由、PR、リリースコミット、タグ、CHANGELOG の要点、
検証結果、VSIX のハッシュ、Marketplace で確認した結果を報告する。
