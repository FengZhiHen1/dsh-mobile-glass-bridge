# dsh-mobile-glass-bridge

> **状态：临时件（2026-10-18 起）**
> 这不是功能插件，是 DSH 0.2.1-rc.2 上两个第三方插件之间的兼容补丁。根因归属上游 `dsh-web-mobile`（它把壁纸插件置空的「框架令牌」当作面板底色）。**上游修好后本仓库即可归档删除**；在此之前只应装在 test 实例或显式选择它的 profile 里，不要默认挂进稳定环境。
> 上游 issue 草稿：[`docs/upstream-issue-dsh-web-mobile.md`](docs/upstream-issue-dsh-web-mobile.md)。

把 `dsh-web-mobile` 的**左侧抽屉**和**会话顶栏**（浅色/深色都覆盖），在 `deepseek-harness-background` 开启壁纸时补回可读的玻璃底色。

这是一个**兼容桥**，不提供独立功能；两个上游都不感知对方，所以修在哪一边都需要对方配合，桥放在中间最便宜。

## 冲突是什么

壁纸插件为了让壁纸透出来，在 `body[data-dsh-bg]` 上把两个"应用框架"令牌置空：

```css
body[data-dsh-bg] {
  --dsw-alias-bg-base: transparent;
  --dsw-specific-sidebar-fill: transparent;
}
```

而 `dsh-web-mobile` 把这两个令牌当作**面板底色**用：

| 表面 | 上游规则 | 壁纸下的结果 |
| --- | --- | --- |
| 抽屉列 | `[data-mobile-nav="frame"] > :first-child` → `background: var(--dsw-specific-sidebar-fill)`（`styles/layout.css.ts:180`） | 抽屉无底色（不是 15%，是 0%），会话与 40% 遮罩直接透上来 |
| 深色顶栏 | `… [data-phase] header` → `background-color: var(--dsw-alias-bg-base) !important`（`styles/layout.css.ts:1146`） | 顶栏失去宿主本来的层色 |
| 浅色顶栏 | 上游**没有**这条规则；宿主 `.header` 本身不画底色（只有一条下边框），底色由背后的会话根节点提供 | 顶栏同样透空，而且手机档的消息滚动区会从它下方穿过 |

注意这些值和壁纸插件的「面板不透明度」滑块无关：滑块只缩放它自己的玻璃白名单表面，拉到 100% 这几处仍然是 `transparent`。

## 它做了什么

在满足 **壁纸启用 + 手机档（`max-width:1023px` 且 `pointer:coarse`）** 时，只给上面两个表面加底色 + `backdrop-filter`：

- 抽屉：写入 `--dsw-specific-sidebar-fill`（宿主侧栏列自己也用这个令牌自绘，所以必须写变量），加 `background-color` 与 `backdrop-filter`。抽屉本来就带 `transform`，加滤镜不会新增 fixed 后代的包含块。
- 会话顶栏（浅色/深色）：只加 `background-color`。用 `:root body[data-dsh-bg] …` 把特异性抬到 `(0,4,2) !important`，压过深色档上游的 `(0,3,2) !important`——靠特异性而不是样式表顺序，因为两张插件样式表的注入顺序没有保证；浅色档上游没有规则，这条是唯一候选。**不加 `backdrop-filter`**：顶栏没有 `transform`，加滤镜会把它变成 fixed 后代的包含块，就地渲染的菜单可能跳位；底色已足够恢复可读性。
- 桌面档、无壁纸时：**一条规则都不命中**，行为与未安装时完全一致。

## 可调项

| 变量 | 默认（浅/深） | 说明 |
| --- | --- | --- |
| `--dsh-mobile-glass-fill` | `rgba(249,250,251,.82)` / `rgba(21,21,23,.82)` | 底色。想多透一点壁纸就把它调低 |
| `--bg-glass-blur` | 由壁纸插件提供 | 抽屉的模糊不另设档位，直接跟随壁纸插件的「毛玻璃模糊」滑块；该插件在面板不透明度 100% 时把它置 0px，抽屉随之变成实色 |

## 安装 / 卸载

```sh
# 安装（发布的 tag）
dsh plugin --profile test add github:FengZhiHen1/dsh-mobile-glass-bridge#v0.1.0

# 安装（本地源码，开发时用）
dsh plugin --profile test add link:E:/Project/DSH_Plugins/plugins/dsh-mobile-glass-bridge

# 卸载
dsh plugin --profile test rm dsh-mobile-glass-bridge
```

浏览器半区是手写的惰性工厂（`src/client.js`），**没有构建步骤**：改完刷新页面即可，不需要 `pnpm build`。

## 边界

- 只修上述两个表面。壁纸插件自身的半透明语义（包括 15% 面板）保持不变。
- 上游任一插件修好这件事后，本桥可以直接卸载，不留下配置。
- 依赖上游的内部选择器：`dsh-web-mobile` 改了抽屉/顶栏的结构或选择器后，本桥需要同步；规则不命中时是**无操作**，不会把页面改坏。
