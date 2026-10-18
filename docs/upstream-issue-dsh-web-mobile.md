# 上游 issue 草稿 — dsh-web-mobile 与壁纸插件的底色冲突

> 目标仓库：`mexiaosqwq/dsh-web-mobile`（GitHub issue）
> 状态：**待用户审查，未提交**。审查通过后再用本文件正文发 issue。
> 证据基线：DSH `0.2.1-rc.2` · `dsh-web-mobile` 3.1.0（main `049e7cf`，含 `45b1e8f` 的 stats 行修复）· `deepseek-harness-background` 0.6.1 · 2026-10-18 实机截图。

---

## 标题

`[0.2.1] 与壁纸插件共存时，左侧抽屉与深色顶栏失去底色`

## 正文

### 环境

- DSH `0.2.1-rc.2`（Web）
- `dsh-web-mobile` 3.1.0（main `049e7cf`）
- `deepseek-harness-background` 0.6.1，已启用壁纸
- 手机档：`(max-width: 1023px) and (pointer: coarse)`，深色主题

### 症状

1. 打开左侧抽屉时，抽屉**没有底色**：背后的会话内容、气泡和 40% 遮罩直接透上来，抽屉文字与背景内容叠在一起，几乎不可读。
2. 会话顶栏失去底色：深色档是被上面那条规则覆盖成 `transparent`；浅色档上游根本没有对应规则，而宿主 `.header` 本身不画底色（只有一条下边框），底色由背后的会话根节点提供，所以在壁纸下同样透空。手机档的消息滚动区会从顶栏下方穿过，透空时能看到文字滚过顶栏。
3. 与壁纸插件的「面板不透明度」滑块无关：0%–100% 都不恢复。那几处拿到的令牌是 `transparent`，不是"调低的不透明度"。

### 最小复现（不装壁纸插件也能看到）

在 0.2.1 + 手机档打开会话，控制台执行：

```js
document.body.style.setProperty('--dsw-specific-sidebar-fill', 'transparent')
document.body.style.setProperty('--dsw-alias-bg-base', 'transparent')
```

再打开抽屉：抽屉底面消失，症状与装壁纸插件时一致。

### 根因

`deepseek-harness-background` 为了让壁纸透出来，按设计在 `body[data-dsh-bg]` 上置空两个"应用框架"令牌（其产物原文注释：*make the app frame + sidebar background transparent so all columns share the same wallpaper*）：

```css
body[data-dsh-bg] {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
```

`dsh-web-mobile` 把这两个令牌当作**面板底色**使用：

| 表面 | 位置 | 声明 |
| --- | --- | --- |
| 抽屉列 | `src/client/styles/layout.css.ts:180`（`[data-mobile-nav="frame"] > :first-child`） | `background: var(--dsw-specific-sidebar-fill, #f9fafb)` |
| 深色顶栏 | `src/client/styles/layout.css.ts:1146`（`… [data-phase] header`） | `background-color: var(--dsw-alias-bg-base, #151517) !important` |
| 浅色顶栏 | 无规则 | 宿主 `ui-conversation` 的 `.header` 只有 `border-bottom`，没有 `background`；底色来自会话根节点的 `--dsw-alias-bg-base` |

顶栏那段的注释写明了前提：*实测 page/body 与 frame 都是 `#151517`（`--dsw-alias-bg-base`）*。壁纸场景下这个前提失效——令牌是 `transparent`，于是"把头部底色并到页面底色"的意图退化成"没有底色"。

两个插件互不感知，所以谁都没覆盖到这段交互：

- `deepseek-harness-background` 产物里 `mobile-nav` / `data-mobile` 命中 **0 次**；
- 本仓库 `src/` 里 `data-dsh-bg` / `壁纸` 命中 **0 次**。

壁纸插件对同类问题是自知并逐个补过的（它给 Reasoning 折叠头、压缩标记、tool/skill inspect 按钮等三处"靠 base 令牌打底"的宿主表面补了不透明回填）。移动端这两处只是没被列进去。

### 建议修法

**方案 A（推荐，最小改动）**：给这两条规则加壁纸门控，回退到不参与置空的层级令牌。

```css
/* 抽屉列 */
body[data-dsh-bg] [data-mobile-nav="frame"] > :first-child {
  background: var(--dsw-alias-bg-layer-1, #fff);
}

/* 顶栏：把现有那条只在深色档生效的规则改成两种主题都覆盖
   （原有选择器特异性 (0,3,2)，加 --dsh-bg 后为 (0,4,2)，不会被别的 !important 反压） */
body[data-dsh-bg] [data-mobile-nav="frame"] [data-phase] header {
  background-color: var(--dsw-alias-bg-layer-1, #fff) !important;
}
```

`--dsw-alias-bg-layer-1` 是本仓库已有的令牌（`panel-ghost` 那条规则就在用），且壁纸插件不覆盖它，因此浅色/深色、桌面档与手机档在这几处会一致。

**方案 B（保留毛玻璃观感）**：改用壁纸插件的第三方玻璃注册表，让填充与模糊跟随用户的面板不透明度：

```js
window.__DSH_BACKGROUND_GLASS__?.register({
  plugin: 'dsh-web-mobile',
  mode: 'fill',
  selectors: [
    '[data-mobile-nav="frame"] > :first-child',
    '[data-mobile-nav="frame"] [data-phase] header',
  ],
})
```

注意该接口拒绝 `>` 字符，选择器需改写（例如给抽屉列加一个自己的属性锚点）。注册表规则不带 `!important`，顶栏那条现有声明需要相应降级或调整特异性。

任一方案落地后，第三方临时桥即可退场。

### 附：当前临时方案

`dsh-mobile-glass-bridge` 0.1.0（独立仓库，client-only，注入一条样式表）：仅在壁纸启用 + 手机档时给这两个表面补 82% 底色，抽屉额外跟随 `--bg-glass-blur`。可作为参考实现，不要求上游采纳。

---

### 用户审查清单（不随 issue 发出）

- [ ] 标题与措辞是否合适
- [ ] 是否需要附截图（当前描述基于本地实机截图，未包含图片文件）
- [ ] 方案 A / B 的取舍是否要一并给出
- [ ] 是否同时给 `deepseek-harness-background` 提一条（把移动端两个表面加入其玻璃白名单）
