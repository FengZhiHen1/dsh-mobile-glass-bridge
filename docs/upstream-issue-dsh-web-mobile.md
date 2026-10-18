# 上游 issue 草稿 — dsh-web-mobile

> 目标仓库：https://github.com/mexiaosqwq/dsh-web-mobile
> 状态：**已提交** — https://github.com/mexiaosqwq/dsh-web-mobile/issues/228 （2026-10-18，OPEN）
> 依据：`github-expert` → `references/collaboration/issue.md`

---

**标题**

`[Bug] 启用 deepseek-harness-background 壁纸后，抽屉列与会话顶栏失去背景色`

**正文**

### 环境

| 项 | 值 |
| --- | --- |
| DSH | 0.2.1-rc.2（Web） |
| dsh-web-mobile | 3.1.0（main `049e7cf`） |
| deepseek-harness-background | 0.6.1 — https://github.com/HaoyueQin/deepseek-harness-background |
| 视口 | 399×879，`(max-width: 1023px) and (pointer: coarse)` |
| 主题 | 浅色、深色均复现 |

### 现象

1. 打开左侧抽屉，抽屉没有背景色。背后的会话内容、气泡与 40% 遮罩直接透出，抽屉内文字与背景内容重叠。
2. 会话顶栏没有背景色，浅色与深色都是。手机档的消息滚动区从顶栏下方穿过，滚动时文字经过顶栏区域。
3. 必现。调整 background 插件的 `panelOpacity`（0–100）不改变结果。

### 根因

background 启用壁纸后在 `body[data-dsh-bg]` 上置空两个框架令牌：

```css
body[data-dsh-bg] {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
```

本插件把这两个令牌用作面板填充色：

| 表面 | 位置 | 声明 |
| --- | --- | --- |
| 抽屉列 | `src/client/styles/layout.css.ts:180` | `background: var(--dsw-specific-sidebar-fill, #f9fafb)` |
| 深色顶栏 | `src/client/styles/layout.css.ts:1146` | `background-color: var(--dsw-alias-bg-base, #151517) !important` |

`:1146` 的注释以 `--dsw-alias-bg-base == #151517` 为前提（"page/body 与 frame 都是 #151517"）。壁纸启用时该令牌为 `transparent`，前提不成立，声明退化为无背景。

浅色档没有对应规则。宿主侧 `ui-conversation` 的 `ConversationRoot.module.css` 中 `.header` 只有 `border-bottom`，没有 `background`，底色由会话根节点提供，因此同样为 `transparent`。

两个插件互不引用：background 产物中 `mobile-nav` / `data-mobile` 命中 0 次，本仓库 `src/` 中 `data-dsh-bg` 命中 0 次。

### 复现

1. 安装并启用 `deepseek-harness-background@0.6.1` 与本插件 3.1.0。
2. background 设置：启用任意壁纸，`opacity 1`、`scrim 0.85`、`panelOpacity 0.15`、`blur 16`。
3. 窄视口 + 触摸指针打开会话。
4. 打开左侧抽屉；再关闭抽屉查看顶栏。

不装 background 时的等价复现（已在 0.2.1-rc.2 核对）：

```js
document.body.style.setProperty('--dsw-alias-bg-base', 'transparent')
document.body.style.setProperty('--dsw-specific-sidebar-fill', 'transparent')
```

### 建议修法

`--dsw-alias-bg-layer-1` 已在本插件 `panel-ghost` 规则中使用，background 不覆盖它。给两处加壁纸门控并回退到该令牌：

```css
body[data-dsh-bg] [data-mobile-nav="frame"] > :first-child {
  background: var(--dsw-alias-bg-layer-1, #fff);
}

body[data-dsh-bg] [data-mobile-nav="frame"] [data-phase] header {
  background-color: var(--dsw-alias-bg-layer-1, #fff) !important;
}
```

顶栏原规则为深色专用、特异性 `(0,3,2) !important`；改为两主题通用即可覆盖 `:1146` 与浅色档。补丁未实测。

### 关联

- #192：同一个 `--dsw-specific-sidebar-fill` 声明。该次成因为变量不存在导致写死浅色；本次为变量被另一插件置空。
- 同时向 background 仓库提一条同类问题，任一仓库修复均可解除该现象。

> 本 Issue 由 AI 助手协助整理，现象与代码引用已由提交者在本机核对。
