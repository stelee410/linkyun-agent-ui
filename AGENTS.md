# AGENTS.md

> AI 操作手册。人类读 [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md)（含完整代码地图 / 150+ API 端点 / 9 条调用链序列图）。本文档只记录 "agent 必须知道、PROJECT_OVERVIEW 不写" 的**稳定约定**，**不含 changelog**——历史在 `openspec/changes/archive/`。

> **强制前置**（Write-Audit-Publish 模式）：Agent 接到本仓任务的**第一步**，必须按顺序做 2 件事：
>
> 1. **Audit hook 输出**：`Get-Content ~/.agents/skills/self-improving-agent/.learnings/.audit-log -Tail 30`，如有 `[SKILL-EXTRACT]` 建议或未处理 findings → 本回合主动告知用户并提议 promote 成正式 LRN/ERR 条目（不自动写，等用户确认）。
> 2. **Grep 历史学习库**：`~/.agents/skills/self-improving-agent/.learnings/{ERRORS,LEARNINGS}.md` 按本仓 area tag（`linkyun-agent-ui` / `creator-ui` / `user-hub` / `nextjs-15` / `vite-pwa` / `monorepo-shell`）+ priority=high|critical 过滤，把相关条目加载到任务上下文再继续。
>
> 规则矩阵见 §10.4。

## 0. 当前状态

**OpenSpec 现状**：0 active / 0 archived。`openspec/specs/` + `openspec/changes/` 目录就位但未启用，`config.yaml` 仍为默认 `schema: spec-driven` 占位（未填 `context` / `rules`）。

**Runtime test framework 缺失** **[BACKLOG: monorepo-test-foundation]**：
- `client-web-ui/package.json` 仅 `next dev / build / start / lint`，无 vitest/jest 等运行时测试框架
- `client-web-ui/src/lib/api.test.ts` 是用 TS 类型系统当 assertion 的契约测试萌芽（`tsc -b` 失败即 RED，`next build` 自动跑）
- `client-user-hub/lumina-ai-chat-hub/package.json` 仅 `vite / vite build / vite preview`，无 lint / format / test
- 当前**唯一**自动 gate = 双子项目 `npm run build` 各自通过 + Creator `next lint`（含 `api.test.ts` 类型断言，详见 §3.2）

**7 处已知瑕疵**链 [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) §11，每项可走 OpenSpec change 推动落地（建议 change 名见本文 §11）。

**与 `linkyun-concept` 关系**：互不干涉的独立产品线。`linkyun-concept` 是 Mobile H5 萌系新一代用户端；本仓两个客户端（Creator UI + 桌面 Web 版 User UI / "Lumina Chat Hub"）是另一条产品线，**不会互相替代**。

### 0.1 栈快照

| 维度 | client-web-ui (Creator UI) | lumina-ai-chat-hub (User UI) |
| --- | --- | --- |
| 框架 | Next.js 15 + React 19 + Tailwind 3 | Vite 6 + React 19 + PWA |
| 路由 | App Router 多路由 | `history.pushState` SPA + `getViewFromPath()` |
| Dev 端口 | `:3000` | `:3001` |
| API base env | `NEXT_PUBLIC_API_URL` | `VITE_API_URL` |
| 默认后端 | `http://localhost:8081` | `http://localhost:8080` |
| LS 认证键 | `linkyun_auth`（**下划线**） | `lumina_auth`（**下划线**） |
| LS API base 覆盖键 | `linkyun-api-url-override`（连字符） | `lumina-api-url-override`（连字符） |
| LS 主题键 | `linkyun-theme` | `lumina-theme` |
| LS 语言键 | （暂中文，无 LS） | `lumina-language` |
| LS 工作空间键 | （session 级，无 LS） | `lumina-workspace` |
| i18n | 暂中文（无 i18n 库） | `LanguageContext`（en / zh） |
| 主题 | dark / light / system | 6 preset + 自定义颜色 / 圆角 / 字体 |
| 测试 | TS 类型契约（`api.test.ts`，build-time gate，无 runtime framework） | ❌ 无 |
| Build 输出 | Next standalone（`.next/standalone` + `.next/static` + `public`） | 静态 SPA `dist/` + nginx 容器 |
| PWA | ❌ | ✅ `vite-plugin-pwa` (`registerType: 'prompt'`) |
| 包管理器 | npm（`package-lock.json`） | npm（`package-lock.json`，仓内还有失效 `pnpm-lock.yaml.2861995891` 残留） |

> **包管理器一致性**：本仓**不使用 pnpm workspace**。两个子项目各自 `npm install`，仓根**没有**顶层 `package.json` / `pnpm-workspace.yaml`。`client-user-hub/package.json` 只是为了让兄弟脚本能拿 `html2canvas-pro` / `jspdf`，不是 workspace 根。

## 1. 身份与定位

**linkyun-agent-ui** = Linkyun Agent 平台的**双前端 monorepo**，包含两个独立部署的纯前端工作台：

1. **`client-web-ui/`**（**Creator UI**）— Next.js 15 + React 19，给"造 Agent 的人"用：Agent CRUD / 提示词调优 / Motherland 协作 / 知识库 / 共享 H2A 会话复核 / 角色设计稿（Nano Banana 管线）
2. **`client-user-hub/lumina-ai-chat-hub/`**（**User UI** / "Lumina AI Chat Hub"）— Vite 6 + React 19 + PWA，给"跟 Agent 聊天的人"用：发现 / 1v1 + 群聊 / 朋友圈 / 访客分享（Guest Sessions）

后端 = **外部仓库** Linkyun Agent，本仓**不含**后端代码，**只引用** `X-API-Key` header 名 + 端点路径。

**只改本仓**（仓根 = `git rev-parse --show-toplevel`）。后端补 endpoint / schema 的请求走 `.windsurf/workflows/cross-repo-brief.md`，产出 `docs/cross-repo-requests/<receiver>-<topic>-<YYYY-MM-DD>.md`，**不直接动后端代码**。

完整代码地图 / 150+ API 端点 / 9 条调用链序列图 / Docker 部署细节 → [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md)（869 行）。**本 AGENTS.md 不复制 PROJECT_OVERVIEW 内容**，只补 agent 视角的稳定约定。

## 2. OpenSpec 驱动

> **入口先读** `.windsurf/workflows/dev.md`（Single Source of Workflow Truth）。AGENTS.md 只补充本仓约束，不替代 dev.md 的工作流决策。

**任何需要 spec 化的变更走 5 阶段**：

```text
/opsx-explore (可选)
→ /opsx-new → proposal/design/specs/tasks  (4 artifact，分别独立 commit)
→ /opsx-apply (implementation commits)
→ /opsx-verify
→ /opsx-archive  (合并 spec → archive/)
```

- **profile**：expanded（11 个 `/opsx-*` actions，Windsurf 用 `-` 不是 `:`）
- **主 spec 目录**：`openspec/specs/<capability>/spec.md`
- **active changes**：`openspec/changes/<name>/`
- **archive**：`openspec/changes/archive/<YYYY-MM-DD>-<name>/`

### 2.1 命名约定（双前缀分线）

本仓 capability 一律按子项目边界加前缀：

| 前缀 | 适用范围 | 示例 |
| --- | --- | --- |
| `creator-*` | 仅改 `client-web-ui/` 单边 | `creator-avatar-crop` / `creator-skill-marketplace-filter` / `creator-i18n-foundation` |
| `user-hub-*` | 仅改 `client-user-hub/lumina-ai-chat-hub/` 单边 | `user-hub-pwa-update-banner` / `user-hub-group-chat-rename` / `user-hub-spec-flow-decision` |
| `monorepo-*` | 仓根脚本 / 部署 / 双子项目联动 / 跨子项目重构 | `monorepo-setup-sh-cleanup` / `monorepo-test-foundation` / `monorepo-deploy-sh-fix-hardcoded-ip` |

**小 bug / 一行修复不走 OpenSpec**，走 `.windsurf/workflows/dev.md`（30 min – 2 h 档位）。

**归档前必跑**：grep 本 change 涉及 area tag（§10.1）的 `.learnings/` 条目 → 决定 resolve（已修）/ promote（广泛适用，见 §10.3）/ priority bump（重复出现）。不要让 pending 条目跨 change 堆积。

### 2.2 归档后的文档同步

change 归档后若**改变下列面**，同步 [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md)：

- §2（双子项目对照表）/ §3（目录结构）/ §5（功能矩阵）
- §6（API 参考，新增 / 删除 / 改 endpoint 时）
- §8（LS 键 / HTTP 头）
- §9（命令矩阵 / 部署流程）
- §11（已知瑕疵的 resolve / 新增）

**触发**：新增 / 删 npm script / capability / 端口 / 公共 API / 验证 gate / LS 键 / 部署脚本面。
**不触发**：内部组件重构 / 单测新增 / 风格调整 / bug fix。
**Commit**：`docs: sync PROJECT_OVERVIEW with <change-name>`。

## 3. Commands & 验证 gate

> 命令跨平台（macOS / Linux / Windows）。`run_command` 工具**禁止** `cd`，必须用 `Cwd` 参数。OS 特定语法（如 PowerShell `Get-Content` / `Remove-Item`）仅出现在【Windows PowerShell】注释行。

### 3.1 日常开发

```bash
# Creator UI（Cwd=client-web-ui）
npm install
npm run dev                # http://localhost:3000
npm run build              # next build → .next/standalone
npm run start              # 本地预览 standalone
npm run lint               # next lint

# User UI（Cwd=client-user-hub/lumina-ai-chat-hub）
npm install
npm run dev                # http://localhost:3001
npm run build              # vite build → dist/ + version.json
npm run preview            # 本地预览 dist
```

**热切后端地址**（无需重启 dev server）—— 浏览器 DevTools 控制台：

```js
localStorage.setItem("linkyun-api-url-override", "https://api.linkyun.co"); // Creator
localStorage.setItem("lumina-api-url-override",  "https://api.linkyun.co"); // User
localStorage.removeItem("linkyun-api-url-override"); // 取消覆盖
```

### 3.2 验证 gate（当前最小集，必须全绿才能 commit / archive）

```bash
# Creator UI（Cwd=client-web-ui）
npm run lint               # next lint
npm run build              # next build

# User UI（Cwd=client-user-hub/lumina-ai-chat-hub）
npm run build              # vite build（含 PWA workbox + version.json plugin）
```

**[BACKLOG: monorepo-test-foundation]**：当前**没有 runtime test framework**（无 vitest/jest/playwright），仅 Creator `api.test.ts` 用 TS 类型系统当契约 gate（随 `next build` 一起跑）。引入 `vitest` / `playwright` / `tsc --noEmit` 单独 script / Prettier flat config 须走该 OpenSpec change，目的：

- Creator UI：补 `tsc -b --noEmit` / `prettier --check`
- User UI：补 `vitest run` 单元测试 + `tsc --noEmit`
- 仓根：补 happy-path Playwright e2e（双客户端各 1 spec）

**目前 commit 前最低线**：上面 4 条 build/lint 命令全绿。

### 3.3 部署脚本（仓根 shell）

```bash
./setup.sh                 # 交互生成 docker-compose + nginx + .env.local + Dockerfile
./build.sh                 # 本地构建打 zip 到 dist/{client-web-ui,lumina-ai-chat-hub}.zip
./deploy.sh                # 交互输入 user@ip，scp dist/*.zip 到 ~/workspace/dist/
docker compose up -d --build   # setup.sh 后启动
```

⚠️ **已知瑕疵**（详 §11）：

- `setup.sh:441-447` 末尾混入 `</think>` / `<｜tool▁calls▁begin｜>` 模型 reasoning 痕迹，会 echo 几行无意义内容（不影响脚本成功率）
- `deploy.sh:59` 硬编码 `ssh root@47.76.253.198 "cd ~ && ./deploy.sh"`，与上方 `$REMOTE` 变量不一致

修这两个文件**必须走 OpenSpec change**（`monorepo-setup-sh-cleanup` / `monorepo-deploy-sh-fix-hardcoded-ip`），不顺手改其他逻辑。

### 3.4 OpenSpec

```bash
openspec list                          # 查 active changes
openspec list --archived               # 查已归档
openspec validate <name> --strict      # 归档前必跑
openspec archive <name> --yes          # 合并 spec + 移动到 archive/
```

### 3.5 长输出重定向

长输出会被 IDE 截断；用文件中转：

```bash
npm run build > .build.log 2>&1
# macOS / Linux:        tail -n 30 .build.log
# Windows PowerShell:   Get-Content .build.log -Tail 30
```

`.gitignore` 已排除 `/dist`、`*.exe` / `.dll` 等。临时 `.build.log` / `.e2e.log` 等本地文件**不要**提交。

## 4. 工作偏好

### 4.1 跨仓协议（已由 global_rules.md 定义，本仓不重复）

- **RIPER-5**：模式声明 `[MODE: X]` / 切换规则 / 连续 2 次修正失败停止 / FAST EXECUTE 轻量补充
- **Karpathy 准则**：编码前先思考 / 简洁优先 / 精准修改 / 目标驱动
- **TDD 铁律**（EXECUTE 强制，未来引入测试基础设施后生效）：RED → GREEN → REFACTOR；`tdd-guard.py` hook 拦截

非 Windsurf agent（Claude Code / Cursor / Codex）需手动加载 `~/.codeium/windsurf/memories/global_rules.md`。

### 4.2 沟通

- **中文回复** + 模式声明 `[MODE: X]` 英文 + 代码块英文
- **不用 emoji**（✅ / ❌ / 🚫 / ⚠️ 状态标记除外）
- 重要决策用 `ask_user_question`（归档 / 部署 / 改 `setup.sh` `deploy.sh` / force-push 前）
- 写入长文件（> 300 行 或 > 8000 字符）**必须分段**：先 `write_to_file` 骨架，再 `edit` / `multi_edit` 追加段落

### 4.3 Commit

- artifact / feature / verification **各自独立 commit**；不主动 push
- **格式**：
  - `docs(openspec): ...` artifact
  - `feat(creator): ...` Creator UI 功能
  - `feat(user-hub): ...` User UI 功能
  - `chore(monorepo): ...` 仓根脚本 / 部署
  - `chore(openspec): archive <name>` 归档
- Body 带诊断信息（commit refs / build pass 状态 / bundle size delta 如可测）

## 5. 仓布局

```text
linkyun-agent-ui/
├── client-web-ui/                        ← Creator UI (Next.js 15)
│   ├── next.config.ts                    ← output: "standalone"
│   ├── src/{app,components,contexts,lib,hooks,data,types}/
│   ├── package.json                      ← linkyun-agent-web @ 0.1.0
│   ├── tailwind.config.ts / postcss.config.mjs / tsconfig.json
│   └── Dockerfile                        ← setup.sh 自动生成（若不存在）
│
├── client-user-hub/                      ← User UI 父目录
│   ├── lumina-ai-chat-hub/               ← 实际 Vite 项目（"Lumina Chat Hub"）
│   │   ├── App.tsx                       ← ★ 1683 行：顶层视图切换 + URL 同步
│   │   ├── components/                   ← ChatWindow / DiscoveryGrid / MomentsFeed / ...
│   │   ├── services/api.ts               ← ★ 1530 行：全部后端调用 + SSE 订阅
│   │   ├── contexts/                     ← Language / Theme / Workspace
│   │   ├── lib/{auth,exportChatToPdf,placeholder,viewportHeight}.ts
│   │   ├── nginx-spa.conf                ← SPA fallback try_files /index.html
│   │   ├── vite.config.ts                ← + PWA + version.json plugin
│   │   └── Dockerfile / Dockerfile.prebuilt
│   ├── package.json                      ← 仅声明 html2canvas-pro / jspdf（兄弟脚本用，不是 workspace 根）
│   └── SPEC-FLOW.md                      ← ⚠️ 未实现规格（§11.3 决定 backlog）
│
├── docs/
│   ├── PROJECT_OVERVIEW.md               ← ★ 869 行：人类入口（代码地图 + API 全图 + 调用链）
│   ├── LINKYUN_DEV_GUIDE.md              ← .gitignore'd local-only symlink
│   └── LINKYUN_ECOSYSTEM.md              ← .gitignore'd local-only symlink
│
├── openspec/
│   ├── config.yaml                       ← 仍是默认模板，未填 context / rules
│   ├── specs/                            ← 空
│   └── changes/                          ← 空
│
├── .windsurf/
│   ├── workflows/                        ← 14 个：cross-repo-brief / dev / opsx-* / review
│   └── skills/                           ← 11 个 agent skill
│
├── setup.sh                              ← 447 行：交互生成 docker-compose（含已知瑕疵 §11.1）
├── build.sh                              ← 63 行：本地构建打 zip
├── deploy.sh                             ← 62 行：scp 上传（含已知瑕疵 §11.2）
└── AGENTS.md                             ← 本文档
```

子项目内部目录（`src/app/dashboard/*` / `components/Sidebar/` / 各 `services|lib/api.ts` 函数清单等）详见 [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) §3.2 / §3.3 + §10 关键文件索引。**AGENTS.md 不复制**。

## 6. 双客户端约定

### 6.1 边界一览

参考 §0.1 栈快照。**永远不要**：

- 假设 Creator 和 User 共享 LS 键（**完全独立** —— `linkyun_*` vs `lumina_*`）
- 假设两侧 API base 默认值相同（Creator `:8081` ≠ User `:8080`）
- 把 Creator 组件直接 import 进 User UI（路径上是 monorepo 但**没有共享代码层**）—— 需要复用先抽到独立 npm 包，或在两侧各自实现

### 6.2 i18n 现状

- **User UI**：`contexts/LanguageContext.tsx` 提供 en / zh 切换 + 内置字典；新文案通过该 context 接入，**不直接 import** dict
- **Creator UI**：暂中文，**无 i18n 库**；新增国际化能力须走 `creator-i18n-foundation` change（推荐 `react-i18next`，对齐 `linkyun-concept` 心智）
- **UGC vs chrome 优先级**（参考心智）：
  - **UGC**（后端返回的用户/Agent 字段：`name` / `description` / `bio` / `content` / `message` / `creator_name` 等）—— **直渲**，不包翻译函数
  - **Chrome**（按钮 / 标题 / aria-label / toast / 占位符 / empty state / tab 名）—— 包翻译函数（User UI 现状是 LanguageContext 字典查找；Creator UI 是直接中文字面）

### 6.3 路由 fallback

- **Creator UI**（Next App Router）：路由由 Next 接管，无需特别处理；嵌套路由放 `src/app/dashboard/<segment>/page.tsx`
- **User UI**（SPA + `history.pushState`）：容器内 `nginx-spa.conf` **必须**保留 `try_files $uri $uri/ /index.html;`，否则直接访问 `/messages` / `/contacts` / `/moments` / `/sharedAgent/<token>` 会 404
- 路由解析逻辑在 `App.tsx` 的 `getViewFromPath()`，未识别路径 fallback 到 `/discovery`，未登录显示 `AuthScreen`（`/sharedAgent/*` 例外，允许游客访问）

### 6.4 SSE 自实现陷阱

`EventSource` 不支持自定义 header → **不能**直接用 `new EventSource(url)`，必须 `fetch + ReadableStream` 自己解析 `text/event-stream` 行：

- Creator UI：`src/lib/api.ts` 内 `subscribeUserEvents()` 给 Edge Agent 状态推送
- User UI：`services/api.ts` 内 `subscribeToPushEvents()` 给 Agent 主动推送

新增 SSE 端点时**必须**：

1. 用 `fetch` + `AbortController` + `ReadableStream` 解析 `data: {...}\n\n`
2. 反代后端 nginx 设 `proxy_buffering off;`（否则前端收不到流）
3. 显式带 `X-API-Key` header（**不**走 cookie 鉴权）

### 6.5 头像 / 静态资源缓存破坏

- `getAgentAvatar()` 优先用 `agent.updated_at` 时间戳
- `getCreatorAvatar()` 分钟级 / 秒级时间戳
- `getAgentCharacterDesignSheetUrl()` 分钟级时间戳
- 所有 URL 形如：`<base>/api/v1/avatars/<filename>?t=<bust>`
- 改头像后**必须**派发 `creator-profile-updated` 等价事件让组件重渲染（参 `dashboard/layout.tsx`）

## 7. Security

### 7.1 Env / localStorage 键

| 维度 | Creator UI | User UI |
| --- | --- | --- |
| API base env | `NEXT_PUBLIC_API_URL` | `VITE_API_URL` |
| 默认值 | `http://localhost:8081`（dev）/ 部署域名 | `http://localhost:8080`（dev）/ 部署域名 |
| 认证 LS 键 | `linkyun_auth`（**下划线**） | `lumina_auth`（**下划线**） |
| API base 运行时覆盖 LS 键 | `linkyun-api-url-override`（连字符） | `lumina-api-url-override`（连字符） |
| 401 处理 | 由 `lib/api.ts` 内统一拦截 | 由 `services/api.ts` 内统一拦截 |

> 注意 LS 键命名风格不统一是历史现状（认证 = 下划线 / 覆盖 = 连字符），**不要**自作主张统一，会击穿用户已存的会话。如需统一须走 `monorepo-localstorage-key-naming` change 显式迁移。

### 7.2 🚫 Never 进 git

- `.env.local` / 任何 `*.key` / `*.pem` / 含 `et_xxx` / `Bearer ey...` 的文件或 fixture
- 含真实 `X-API-Key` / `X-Workspace-Code` 真值的注释、日志、commit message
- localStorage 真值写进 commit message 或 `.learnings/`
- 后端返回体里的限制席位账号、手机号、邮箱明文写进任何 fixture
- `vite.config.ts` `define` 里的 `GEMINI_API_KEY`（即使当前未使用，也不要把真值写进 `.env`）

### 7.3 ⚠️ 处理时检查

- 改 `client-web-ui/src/lib/api.ts` / `client-user-hub/lumina-ai-chat-hub/services/api.ts`：`X-API-Key` 不能 `console.log`；SSE `error` 字段不含真 token
- 改 `setup.sh`：echo 出来的 `LINKYUN_SERVER` 可以是占位（`https://api.linkyun.co`），不要 echo 真生产域名带 secrets path
- 测试 fixture：用 mock token（`mock_jwt_xxx` / `et_test_xxx`），不是录制的真值

### 7.4 ✅ Always

- 后端仓 `<linkyun-agent>/.env` 是 secrets 唯一真源；本仓只引用 header 名
- 前端只持有用户自己的 `X-API-Key`（保存在 `linkyun_auth` / `lumina_auth` LS，刷新时重读）
- `.gitignore` 已排除 `.env*` / `/dist` / `/data/` / `nginx/` / `docker-compose.yml` / `docs/LINKYUN_*.md` symlink；新增临时 `.build.log` / `.e2e.log` 不要提交

## 8. Boundaries

### 8.1 ✅ Always

- 读文件用 `read_file` / `grep_search` / `code_search`；独立工具调用**并行**
- artifact / feature / verification **各自独立 commit**；验证 gate 全绿（§3.2）
- i18n 遵 §6.2：UGC 直渲，chrome 走翻译函数（User UI 已落地，Creator UI 待 `creator-i18n-foundation` change 启动）
- SPA 路由变更必同步更新 `getViewFromPath()` + `nginx-spa.conf` fallback 列表
- SSE 端点经 `fetch + ReadableStream`（§6.4），不用 `EventSource`
- 长输出**重定向到文件再读尾部**（§3.5）；`run_command` 用 `Cwd` 而非 `cd`
- 归档后按 §2.2 同步 `docs/PROJECT_OVERVIEW.md` 镜像
- 触发事件（§10.1）出现时**立即**：先 grep 同类条目 → 有则 priority bump，无则新增；不堆到下次
- 不明确时 `search_web` 查权威来源，产出文档尾部"参考资料"列链接

### 8.2 ⚠️ Ask first

- 进入 EXECUTE 模式（用户说 `ENTER EXECUTE MODE`）
- 不可逆操作：`openspec archive` / push `origin/main` / force push / `docker compose down -v` / `rm -rf dist/`
- 推进 OpenSpec change 到下一 artifact 阶段（proposal → design → specs → tasks → apply）
- 修 `setup.sh` / `build.sh` / `deploy.sh`（包括 §11.1 / §11.2 已知瑕疵——必须走 OpenSpec change）
- 删/改公共 API（`client-web-ui/src/lib/api.ts` / `client-user-hub/lumina-ai-chat-hub/services/api.ts`）/ 新增 npm 依赖 / 改仓库级配置（`.gitignore` / `tsconfig.json` × 2 / `next.config.ts` / `vite.config.ts` / `tailwind.config.*`）
- 跨子项目大重构 / 改 LS 键命名

### 8.3 🚫 Never

- **OpenSpec 纪律**：跳过 workflow 直接改有 spec 的能力 / 一次性 dump 所有 artifact / implementation 夹在 artifact change 内
- **跨仓边界违反**：跨仓改后端代码（后端在 `<linkyun-agent>` 独立仓） / 把 Creator 组件直接 import 进 User UI 反之亦然 / 假设 pnpm workspace（本仓 npm × 2）
- **文档纪律**：在 AGENTS.md 复制 `PROJECT_OVERVIEW.md` 内容（API 列表 / 调用链 / 功能矩阵留给 PROJECT_OVERVIEW） / 改 `docs/LINKYUN_*.md`（是 .gitignore'd local-only symlink）
- **Tooling 硬线**：`cd` 在 `run_command`（用 `Cwd`）/ 主动 push / `git push -f` / 修/删测试让代码通过（未来引入测试后生效）/ 自动修 markdownlint MD041/MD025/MD032（OpenSpec / 本文档首行非 H1 不算错）
- **路径黑名单**：`node_modules/` / `dist/` / `client-web-ui/.next/` / `coverage/` / `playwright-report/` / `test-results/` / `_tmp_*` / `data/`（用户上传头像目录）

> secrets / `.env.local` / token 规则见 §7。

## 9. 紧急情况

- **Creator `next build` 失败**：先看 `.next/` 目录是否被锁（Windows 下 `.next/` 偶发被占用，关掉 `npm run start` / dev server 再 build）；TS 报错先 `tsc --noEmit`（手动跑，目前没 script）；ESLint 报错跑 `npm run lint`
- **User UI `vite build` 失败**：常见是 PWA workbox 与 Rollup 收尾竞态 → `vite.config.ts` 已设 `workbox.mode: 'development'` 缓解；如仍失败，临时注释 `VitePWA(...)` 排除 workbox 因素
- **User UI 直接访问 `/messages` 等路径 404**：容器内 `nginx-spa.conf` 缺 `try_files $uri $uri/ /index.html;` —— 检查 Dockerfile 是否 `COPY nginx-spa.conf /etc/nginx/conf.d/default.conf`
- **PWA 提示新版刷新无效**：浏览器 Service Worker 缓存未清 → DevTools → Application → Service Workers → Unregister + Storage → Clear site data；`vite-plugin-pwa` 用的是 `registerType: 'prompt'`，本来就需要用户主动刷新
- **SSE 不工作 / 收不到流**：① 检查 nginx 反代是否设 `proxy_buffering off;` ② 检查 `X-API-Key` header 是否被 proxy 透传 ③ 用 DevTools Network 切到 EventStream tab 看是否有 `data: {...}` 行
- **图片上传 413**：nginx `client_max_body_size` < 20MB → `setup.sh` 已设 `50M`；自定义部署须对齐
- **跨域 CORS**：后端未允许前端 origin → 后端配置（外部仓）；或启用 `setup.sh` 的"同域代理"让 `/api/*` 走 nginx 反代
- **`Cannot find module @/...`**：TS path alias 失效 → 确认 `tsconfig.json` 的 `paths`，Next.js 项目重启 dev server；User UI 的 alias `@` 指 `lumina-ai-chat-hub/` 自身（见 `vite.config.ts:62-65`）
- **跨 OS commit message 多段**：跨平台推荐 `git commit -F <file>` 方式（PowerShell / bash / fish 对 `-m ""` 处理不一）；写临时文件 → commit → 删除
- **连续 2 次修正仍失败**：**停止**，总结失败原因，建议清空上下文重开（RIPER-5 协议）
- **处理完闭环**：grep `.learnings/` 同类条目 → 有则 priority bump 并补本次修复，无则新增 `ERR-YYYYMMDD-XXX`；不写就等下次同样栽

## 10. 记忆与自我进化

**4 步闭环**（per [Eric J. Ma real-time technique](https://ericmjl.github.io/blog/2025/11/8/safe-ways-to-let-your-coding-agent-work-autonomously/) + [MindStudio learnings loop](https://www.mindstudio.ai/blog/self-improving-ai-agent-feedback-loop)）：**(1)** 入场读 `.learnings/` → **(2)** 工作中触发 → real-time append → **(3)** 归档前 grep 同类 → resolve / promote / priority bump → **(4)** commit ref 闭环。

> **包括当前会话**：写规则不等于跑规则。LLM 倾向把规则当 documentation 产出物，commit 后忘记自我约束。每个工作流节点都需 runtime self-check；RESEARCH 开始先 grep `.learnings/`，用户纠正信号出现即刻 record。

三阶漏斗：**短期触发**（`.learnings/`）→ **长期决策**（`create_memory`）→ **永久约定**（本 AGENTS.md）。完整规则在 `@~/.agents/skills/self-improving-agent/SKILL.md`。

### 10.1 触发表

| 触发 | 写入文件 | 何时 + 怎样执行 |
| --- | --- | --- |
| 命令失败 / 异常 / API 失败 | `.../ERRORS.md` | **故障当下**：grep 同类 → priority bump；新则 `ERR-YYYYMMDD-XXX` |
| 用户纠正 / 知识过时 / 更好做法 | `.../LEARNINGS.md` | **本回合内**：record → 当回合内继续任务（real-time per Eric J. Ma） |
| 用户期望但缺失的能力 | `.../FEATURE_REQUESTS.md` | 期望识别即刻：新增 `FEAT-YYYYMMDD-XXX` |

> 全路径：`~/.agents/skills/self-improving-agent/.learnings/{ERRORS,LEARNINGS,FEATURE_REQUESTS}.md`

**本仓常用 area tag**：`linkyun-agent-ui` / `creator-ui` / `user-hub` / `nextjs-15` / `vite-pwa` / `monorepo-shell`。

### 10.2 长期决策

存 `create_memory`（`UserTriggered=false`，snake_case tag）。**不要**创建 `NOTES.md` / `PROGRESS.md` / `TODO.md` 等零散文件 → 放 memory 或 OpenSpec `tasks.md`。

### 10.3 Promote 流程

`.learnings/` 中**广泛适用**的学习（跨多次出现 / 影响工作流 / 本仓独特约定）→ 精炼为 1–3 行加到 AGENTS.md 对应章节；原 `.learnings/` 条目标记 `**Status**: promoted` + `**Promoted**: AGENTS.md §<章>`。

### 10.4 何时读 `.learnings/`

| 时机 | 强度 | 动作 |
| --- | --- | --- |
| 会话首次进入本仓 | **必须** | grep 本仓 area tag 高优条目（priority high/critical），加载到任务上下文（**显性入口已固定到顶部强制前置 block**） |
| 重大任务前（≥ 30 min / 跨子项目 / 改公共 API） | 必须 | grep area tag + topic 过滤 |
| OpenSpec change 归档前（见 §2 "归档前必跑"） | 必须 | 扫本 change area tag → resolve / promote / priority bump |
| 紧急情况处理完（见 §9 末项） | 必须 | grep 同类 → 加修复方案 + commit ref |

## 11. 已知瑕疵 backlog

来源：[`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) §11。每项标注**建议 OpenSpec change 名**（按 §2.1 双前缀分线）：

### 11.1 `setup.sh` 末尾脏数据

`setup.sh:441-447` 末尾混入 `</think>` / `<｜tool▁calls▁begin｜>` / `Read` 等模型 reasoning 痕迹，会 echo 几行无意义内容（不影响脚本退出码）。

→ **建议 change**：`monorepo-setup-sh-cleanup`

### 11.2 `deploy.sh` 硬编码远端 IP

`deploy.sh:59` 硬编码 `ssh root@47.76.253.198 "cd ~ && ./deploy.sh"`，与上方交互输入的 `$REMOTE` 变量不一致。需改为 `ssh "$REMOTE" "cd ~ && ./deploy.sh"`。

→ **建议 change**：`monorepo-deploy-sh-fix-hardcoded-ip`

### 11.3 `SPEC-FLOW.md` 未实现规格

`client-user-hub/SPEC-FLOW.md`（169 行，0.1 草案，2026-03-29）描述的「Flow 工作台」+ `creator_handled_at` 过滤**没落地**，当前 `dashboard/sessions/page.tsx` 是 "Agent → User → Session" 三级筛选 + "all-h2a" 平铺视图。

→ **建议 change**：`user-hub-spec-flow-decision`（三选一：落地 / 删除 / 转 OpenSpec proposal 进 backlog）

### 11.4 `AI_HUMANS` 占位 Persona

`client-user-hub/lumina-ai-chat-hub/constants.ts` 的 `AI_HUMANS` 是 5 个示例 Persona 占位数据，与真实数据无关。

→ **建议 change**：`user-hub-cleanup-ai-humans`（移除 + README 标注；或落实到一个 onboarding feature）

### 11.5 `GEMINI_API_KEY` AI Studio 模板遗留

`client-user-hub/lumina-ai-chat-hub/vite.config.ts:58-61` 通过 `define` 注入 `process.env.API_KEY` / `process.env.GEMINI_API_KEY`，但**当前源码未使用**（grep 不到引用）。来自上游 AI Studio 模板。

→ **建议 change**：`user-hub-cleanup-gemini-key`（清理 define + `.env.example` 提及；或落实到一个具体 feature）

### 11.6 `Sidebar.tsx` 与 `Sidebar/Sidebar.tsx` 共存

`client-user-hub/lumina-ai-chat-hub/components/` 下 `Sidebar.tsx`（旧版 ~5.5 KB）与 `Sidebar/Sidebar.tsx`（新版 ~4.5 KB）共存，可能存在新旧版本。

→ **建议 change**：`user-hub-sidebar-dedup`（确认入口实际引用并删除遗留版本）

### 11.7 HTTPS / certbot 不在 `setup.sh` 输出范围

`setup.sh` 只生成 80 端口配置，证书自行配（推荐 certbot + nginx），后续可加 443 server block。

→ **建议 change**：`monorepo-https-certbot`（生成 443 server block 模板 + certbot 引导 README）

---

> **本节是 backlog 索引，不是 changelog**。瑕疵 resolve 后改 §0「7 处已知瑕疵」计数 + 删除本节对应小节，**不**累积「已修复」记录（历史进 `openspec/changes/archive/`）。
