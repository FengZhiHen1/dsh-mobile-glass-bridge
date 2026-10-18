# 上游 issue 草稿 — deepseek-harness-background

> 目标仓库：https://github.com/HaoyueQin/deepseek-harness-background
> 状态：待提交
> 依据：`github-expert` → `references/collaboration/issue.md`

---

**标题**

`0.6.1: dsh-web-mobile 的抽屉列与顶栏复用被置空的框架令牌，启用壁纸后失去底色`

**正文**

### 环境

| 项 | 值 |
| --- | --- |
| DSH | 0.2.1-rc.2（Web） |
| deepseek-harness-background | 0.6.1 |
| dsh-web-mobile | 3.1.0 — https://github.com/mexiaosqwq/dsh-web-mobile |
| 视口 | 399×879，`(max-width: 1023px) and (pointer: coarse)` |

### 现象

启用壁纸后，移动端有两处表面失去背景色：

1. `dsh-web-mobile` 的左侧抽屉（`[data-mobile-nav="frame"] > :first-child`）：打开抽屉时看不到抽屉底面，背后的会话内容与 40% 遮罩直接透出。
2. 会话顶栏（`[data-mobile-nav="frame"] [data-phase] header`）：浅色、深色均无底色；手机档消息滚动区从顶栏下方穿过。

必现，与 `panelOpacity` 无关（0–100 结果相同）。

### 根因

本仓库启用壁纸后在 `body[data-dsh-bg]` 上置空两个框架令牌：

```css
body[data-dsh-bg] {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
```

`dsh-web-mobile` 将这两个令牌用作面板填充色：

- 抽屉列 `src/client/styles/layout.css.ts:180`：`background: var(--dsw-specific-sidebar-fill, #f9fafb)`
- 深色顶栏 `src/client/styles/layout.css.ts:1146`：`background-color: var(--dsw-alias-bg-base, #151517) !important`

在移动端布局里这两处是浮层与遮罩面（抽屉浮在会话之上、顶栏遮挡滚动内容），透明会直接造成内容透叠；桌面宽屏没有这两个表面，因此不影响桌面。

本仓库已对三个依赖 `--dsw-alias-bg-base` 的宿主表面做过回填（Reasoning 折叠头、压缩标记、tool/skill inspect 按钮）。移动端这两处属于同类表面，未被覆盖。

### 建议修法

二选一。

**A. 在本仓库的样式表中直接回填**（与现有三处回填同构）：

```css
body[data-dsh-bg] [data-mobile-nav="frame"] > :first-child {
  background: var(--dsw-alias-bg-layer-1);
}

body[data-dsh-bg][data-ds-dark-theme] [data-mobile-nav="frame"] [data-phase] header,
html[data-ds-dark-theme] body[data-dsh-bg] [data-mobile-nav="frame"] [data-phase] header {
  background-color: var(--dsw-alias-bg-layer-1) !important;
}
```

顶栏需覆盖 `dsh-web-mobile` 的 `(0,3,2) !important` 声明，因此选择器带到 `(0,4,2)`；浅色档该插件无声明，可直接生效。

**B. 让 `dsh-web-mobile` 通过玻璃注册表登记这两处**：注册表拒绝 `>` 字符，抽屉列需要另设锚点，且注册表规则不带 `!important`，顶栏的既有声明需要由该插件调整。适合希望这两处跟随 `panelOpacity` 的毛玻璃观感的取舍。

两条补丁均未实测。

### 关联

同一现象已在 `dsh-web-mobile` 仓库提交同类 Issue，任一仓库修复即可解除。

> 本 Issue 由 AI 助手协助整理，现象与代码引用已由提交者在本机核对。
