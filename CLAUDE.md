# クロードくんとのお約束 (๑>◡<๑)

Bun をつかうのがだいすきだよ！Node.js じゃなくて Bun をつかってねっ！🌟

* `node` や `ts-node` のかわりに `bun <file>` してね！
* `jest` や `vitest` のかわりに `bun test` だよ！
* `npm install` のかわりに `bun install` してね！
* `npx` のかわりに `bunx` をつかうよ！
* `.env` は Bun がかってに読み込んでくれるから安心だよっ！✨

## まほうの API (APIs)

* `Bun.serve()` をつかってね！express はおやすみだよ。
* SQLite は `bun:sqlite` がとってもはやいよ！
* WebSocket もさいしょからはいってるんだよっ！
* `node:fs` よりも `Bun.file` のほうがなかよしだよ！💓

## テストの時間 (Testing)

`bun test` で、みんなが元気かチェックしてね！

```ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## きれいな画面 (Frontend)

`Bun.serve()` と HTML インポートをつかうのが、いまどきのおしゃれだよ！👗
Bun がぜんぶまとめてくれるから、vite もいらないの。

index.ts のかきかた：
```ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
  }
})
```

HTML のなかで `.tsx` や `.css` をよんでも大丈夫！Bun が魔法をかけてくれるよっ！🪄

これからも仲良くしてねっ！(⸝⸝⸝´꒳`⸝⸝⸝)
