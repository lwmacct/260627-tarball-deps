import path from "node:path";
import { fileURLToPath } from "node:url";

export interface TarballInfo {
  kind: "remote" | "file" | "path";
  spec: string;
}

export function isTarballSpec(spec: string): boolean {
  const normalized = spec.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".tgz") || normalized.endsWith(".tar.gz");
}

export function parseTarballSpec(spec: string): TarballInfo | undefined {
  if (!isTarballSpec(spec)) {
    return undefined;
  }

  if (spec.startsWith("http://") || spec.startsWith("https://")) {
    return { kind: "remote", spec };
  }

  if (spec.startsWith("file:")) {
    return { kind: "file", spec };
  }

  return { kind: "path", spec };
}

export function replaceTarballVersion(spec: string, version: string): string {
  const releaseDownloadPattern = /(\/releases\/download\/)([^/]+)(\/)/;

  if (releaseDownloadPattern.test(spec)) {
    return spec.replace(releaseDownloadPattern, `$1${version}$3`);
  }

  const archiveTagPattern = /(\/archive\/refs\/tags\/)([^/]+)(\.tar\.gz|\.tgz)/;

  if (archiveTagPattern.test(spec)) {
    return spec.replace(archiveTagPattern, `$1${version}$3`);
  }

  throw new Error(`无法从 tarball URL 推断版本位置: ${spec}`);
}

export function resolveLocalTarballPath(spec: string, packageFile: string): string {
  const packageDir = path.dirname(packageFile);

  if (spec.startsWith("file:")) {
    if (spec.startsWith("file://")) {
      return fileURLToPath(spec);
    }

    const value = spec.slice("file:".length);

    return path.resolve(packageDir, value);
  }

  return path.resolve(packageDir, spec);
}
