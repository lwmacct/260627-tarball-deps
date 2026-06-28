# @lwmacct/260627-tarball-deps

管理 `package.json` 中以 tarball URL 引入的 npm 依赖。

这个工具面向这种依赖形态：

```json
{
  "dependencies": {
    "@lwmacct/260627-antd-workbench": "https://github.com/lwmacct/260627-antd-workbench/releases/download/v0.24.260628/package.tar.gz"
  }
}
```

## 安装

```bash
VERSION="$(curl -s https://api.github.com/repos/lwmacct/260627-tarball-deps/releases/latest | jq -r '.tag_name')"
npm install --save-dev --save-exact "https://github.com/lwmacct/260627-tarball-deps/releases/download/${VERSION}/package.tar.gz"
```

## 命令

列出当前项目里的 tarball 依赖：

```bash
npx tarball-deps list
```

按 GitHub Release tag 更新指定依赖：

```bash
npx tarball-deps update @lwmacct/260627-antd-workbench --version v0.25.260628
```

批量更新某个 scope 下的 tarball 依赖：

```bash
npx tarball-deps update --scope @lwmacct --version v0.25.260628
```

预览变更但不写入文件：

```bash
npx tarball-deps update --scope @lwmacct --version v0.25.260628 --dry-run
```

直接替换单个依赖的完整 URL：

```bash
npx tarball-deps update @lwmacct/260627-antd-workbench --url https://github.com/lwmacct/260627-antd-workbench/releases/download/v0.25.260628/package.tar.gz
```

检查 tarball URL 或本地 tarball 文件是否可访问：

```bash
npx tarball-deps check
```

## 支持范围

当前会扫描这些依赖字段：

- `dependencies`
- `devDependencies`
- `peerDependencies`
- `optionalDependencies`

当前会识别这些 tarball spec：

- `https://.../*.tgz`
- `https://.../*.tar.gz`
- `file:./package.tgz`
- `file:./package.tar.gz`
- `./package.tgz`
- `./package.tar.gz`

`--version` 会优先改写 GitHub Release URL 中的 `/releases/download/<tag>/`，也支持 `/archive/refs/tags/<tag>.tar.gz`。其他 URL 形态可以用 `--url` 显式替换。

## 发版

发版沿用当前项目的 Taskfile 远程任务：

```bash
task git:tag:next
```

推送 `v*` tag 后，GitHub Actions 会执行 typecheck、build、`npm pack`，并把产物作为 `package.tar.gz` 上传到 Release。
