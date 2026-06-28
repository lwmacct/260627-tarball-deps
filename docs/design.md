# tarball-deps Design

## 目标

`tarball-deps` 是一个面向 `package.json` 的 npm tarball 依赖管理工具。它不负责发布 npm 包，也不负责生成 release asset；它只负责发现、展示、改写和校验项目中已经以 tarball spec 引入的依赖。

核心场景：

- 项目依赖 GitHub Release 上的 `package.tar.gz`。
- 多个 `@lwmacct/*` 包需要同步到同一个 release tag。
- 修改前需要 dry-run 预览。
- CI 或本地脚本需要检查 tarball URL 是否仍可访问。

## 命令边界

### list

扫描一个 `package.json`，列出 tarball 依赖。

```bash
tarball-deps list --package package.json --scope @lwmacct
```

### update

更新匹配依赖的 spec。

```bash
tarball-deps update @lwmacct/260627-antd-workbench --version v0.25.260628
tarball-deps update --scope @lwmacct --version v0.25.260628
tarball-deps update --all --version v0.25.260628
tarball-deps update @lwmacct/260627-antd-workbench --url https://github.com/lwmacct/260627-antd-workbench/releases/download/v0.25.260628/package.tar.gz
```

`--version` 只处理可推断版本位置的 URL：

- `/releases/download/<tag>/`
- `/archive/refs/tags/<tag>.tar.gz`
- `/archive/refs/tags/<tag>.tgz`

无法推断时要求使用 `--url`，避免错误替换。

### check

校验 tarball spec 是否可访问：

- remote tarball 用 `HEAD`，遇到 `405` 时降级为带 Range 的 `GET`。
- local tarball 解析为相对 `package.json` 的路径后检查文件是否存在。

## 模块职责

- `src/cli.ts`：参数解析、命令分派、终端输出。
- `src/index.ts`：公开 API，编排 list/update/check。
- `src/package-json.ts`：读写 `package.json`，扫描依赖字段，保持基础缩进风格。
- `src/tarball.ts`：识别 tarball spec、改写 release tag、解析本地文件路径。

## 数据约束

扫描字段：

- `dependencies`
- `devDependencies`
- `peerDependencies`
- `optionalDependencies`

识别形态：

- `https://.../*.tgz`
- `https://.../*.tar.gz`
- `file:./package.tgz`
- `file:./package.tar.gz`
- `file:///abs/package.tgz`
- `./package.tgz`
- `./package.tar.gz`

## 发布

发布流程沿用 `260627-vite-workspace`：

```bash
task git:tag:next
```

推送 `v*` tag 后，GitHub Actions 执行：

1. `npm ci`
2. `npm run typecheck`
3. `npm run build`
4. `npm pack`
5. 将产物重命名为 `package.tar.gz`
6. 上传到当前 GitHub Release

## 后续路线

优先级从高到低：

1. workspace/monorepo 扫描：支持自动读取 npm workspaces 并批量处理多个 `package.json`。
2. GitHub latest 查询：`--latest` 从 GitHub Releases API 获取最新 tag。
3. lockfile 提示：更新 `package.json` 后提示用户运行对应包管理器 install。
4. URL 模板：允许项目配置默认 release URL 模板，减少手写完整 URL。
5. 变更摘要格式：为 CI 输出 markdown summary。
