import { run } from "./smoke";

suite("実ホストのスモークテスト", () => {
  test("拡張を起動して既存コマンドを登録する", async () => {
    await run();
  });
});
