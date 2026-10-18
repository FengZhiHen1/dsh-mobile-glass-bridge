# 上游 issue 草稿 — 与背景图插件同装时，移动端抽屉与会话顶栏没有底色

> 目标仓库：https://github.com/mexiaosqwq/dsh-web-mobile （Issue）
> 状态：**待提交者审查，尚未发布**
> 写法依据：`github-expert` → `references/collaboration/issue.md`（一个 Issue 一个成因；实际/预期均可观察；步骤可独立执行；证据可复制；末尾附 AI 声明；不自行加维护者标签）。
> 目标仓库现状：无 `ISSUE_TEMPLATE` / `CONTRIBUTING` / `SECURITY`；README 有「兼容插件」清单，本组合不在其中。

---

**标题**

`[Bug] 与背景图插件同装时，移动端抽屉与会话顶栏没有底色（会透出会话内容）`

**正文**

### 背景

我在 DSH 0.2.1-rc.2 的 test 实例上同时使用本插件和背景图插件，做窄屏下的阅读体验。背景图插件是：

- **deepseek-harness-background 0.6.1** — https://github.com/HaoyueQin/deepseek-harness-background

这个组合不在 README 的「兼容插件」清单里，所以先作为兼容性反馈提交：现象、复现、证据和一个可选方向都在下面，是否处理、如何处理由你判断。两个表面是同一成因，因此合在一个 Issue 里。

### 实际结果

1. 打开左侧抽屉时，抽屉**没有底色**：背后的会话内容、气泡以及 40% 遮罩直接透上来，抽屉里的文字和背景内容叠在一起。
2. 会话顶栏同样没有底色。深色档是被本插件的一条规则写成 `transparent`（见「证据」）；浅色档没有对应规则，而宿主 `.header` 本身不画背景（只有下边框），底色来自背后的会话根节点，所以壁纸下也会透空。手机档的消息滚动区会从顶栏下方穿过。
3. 必现。与背景图插件的「面板不透明度」滑块无关：0%–100% 都不恢复。

### 预期结果

判断依据：

- 不启用背景图插件时，这两处表现正常；
- 桌面宽屏开壁纸时整列都会透出壁纸，但那是背景图插件的设计目标，且桌面顶栏不承担"遮挡滚动内容"的职责；移动端这两个表面是浮层与遮罩面，透明会直接造成内容透叠；
- README 里 #192 的修法，也是把抽屉列当作"应当有稳定底色"的表面。

期望二选一即可：

- 与背景图插件同装时，这两处仍有可读的底色；或
- 在「兼容插件」清单里注明该组合未验证——这也完全可以接受。

### 复现步骤

1. 在 profile 中安装并启用 `deepseek-harness-background@0.6.1` 与本插件 3.1.0。
2. 背景图插件启用任意壁纸（不透明度 100 / 遮罩 85 / 面板不透明度 15 / 毛玻璃模糊 16px）。
3. 窄视口 + 触摸指针（`(max-width: 1023px) and (pointer: coarse)`），打开一个已有会话。
4. 打开左侧抽屉，观察抽屉底面与会话顶栏。

### 最小复现（不依赖第二个插件，已核对）

在 0.2.1-rc.2 + 手机档的会话页控制台执行下面两行，再打开抽屉：

```js
document.body.style.setProperty('--dsw-alias-bg-base', 'transparent')
document.body.style.setProperty('--dsw-specific-sidebar-fill', 'transparent')
```

抽屉底面消失、顶栏透空，与装背景图插件时一致。

### 环境

| 项 | 值 |
| --- | --- |
| DSH | 0.2.1-rc.2（Web，test 实例） |
| 本插件 | 3.1.0（main `049e7cf`，含 `45b1e8f`） |
| 背景图插件 | **deepseek-harness-background 0.6.1** — https://github.com/HaoyueQin/deepseek-harness-background |
| 视口 | 399 × 879，`(max-width: 1023px) and (pointer: coarse)` |
| 主题 | 浅色、深色均可复现 |
| 浏览器 | 移动端 Chromium；其他设备未测 |

### 证据

背景图插件启用壁纸后，会在 `body[data-dsh-bg]` 上把两个「应用框架」令牌置空。其产物中该规则的注释是 *make the app frame + sidebar background transparent so all columns share the same wallpaper*：

```css
body[data-dsh-bg] {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
```

本插件侧把这两个令牌当作面板底色使用：

| 表面 | 位置 | 声明 |
| --- | --- | --- |
| 抽屉列 | `src/client/styles/layout.css.ts:180` | `background: var(--dsw-specific-sidebar-fill, #f9fafb)` |
| 深色顶栏 | `src/client/styles/layout.css.ts:1146` | `background-color: var(--dsw-alias-bg-base, #151517) !important` |

第 1146 行附近的注释写明了前提：*实测 page/body 与 frame 都是 `#151517`（`--dsw-alias-bg-base`）*。壁纸场景下这个令牌是 `transparent`，前提不成立，于是"把头部底色并到页面底色"退化成"没有底色"。

浅色档没有对应规则。宿主侧 `ui-conversation` 的 `ConversationRoot.module.css` 中 `.header` 只有 `border-bottom`，没有 `background`。

两个插件互不感知：背景图插件产物里 `mobile-nav` / `data-mobile` 命中 0 次；本仓库 `src/` 里 `data-dsh-bg` 命中 0 次。所以这段组合大概没有被任何一方验证过——写在这里只是补充上下文，不是归责。

### 可能的方向（供参考，不要求采纳）

以下为阅读两方源码后的推断，未逐条实测。

**A. 给这两条规则加壁纸门控，回退到不受置空影响的层级令牌**

```css
body[data-dsh-bg] [data-mobile-nav="frame"] > :first-child {
  background: var(--dsw-alias-bg-layer-1, #fff);
}

body[data-dsh-bg] [data-mobile-nav="frame"] [data-phase] header {
  background-color: var(--dsw-alias-bg-layer-1, #fff) !important;
}
```

`--dsw-alias-bg-layer-1` 在本插件里已有使用（`panel-ghost` 那条规则），且背景图插件不覆盖它。顶栏原规则是深色专用、特异性 `(0,3,2)`，改为两种主题通用即可。

**B. 接入背景图插件的玻璃注册表**，让填充与模糊跟随用户的「面板不透明度」：

```js
window.__DSH_BACKGROUND_GLASS__?.register({
  plugin: 'dsh-web-mobile',
  mode: 'fill',
  selectors: ['…'],
})
```

该接口会拒绝 `>` 等字符，顶栏规则又带 `!important`，需要调整选择器结构与特异性。如果更希望保持毛玻璃观感，这条路更合适。

### 关联

- #192 —— 同一个 `--dsw-specific-sidebar-fill` 声明。那次是变量不存在导致写死浅色；这次是变量被另一个插件置空，成因不同。
- 我这边先用了一个很小的临时插件 `dsh-mobile-glass-bridge` 0.1.1 兜住这两处；它只是临时件，不要求本仓库采纳。

> 本 Issue 由 AI 助手协助整理，现象与代码引用已由提交者在本机核对。

---

## 审查清单（不随 Issue 发出）

- [ ] 标题：是否接受 `[Bug]` 前缀与当前措辞
- [ ] 语气：是否还需要更缓和（例如去掉"不被任何一方验证过"这类句子）
- [ ] 是否附截图：需要你提供，或授权使用本机现有截图
- [ ] 方案 A / B 是否都保留，还是只留更倾向的一条
- [ ] 是否同时给 `HaoyueQin/deepseek-harness-background` 提一条（把移动端两个表面加入玻璃白名单）
