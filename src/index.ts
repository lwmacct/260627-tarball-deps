import fs from "node:fs";
import {
  getDependencyEntries,
  readPackageJson,
  setDependencySpec,
  writePackageJson,
  type DependencyEntry,
  type DependencySection,
} from "./package-json";
import {
  parseTarballSpec,
  replaceTarballVersion,
  resolveLocalTarballPath,
} from "./tarball";

export interface TarballDependency extends DependencyEntry {
  packageFile: string;
}

export interface ListTarballDepsOptions {
  packageFile?: string;
  scope?: string;
}

export interface UpdateTarballDepsOptions {
  all?: boolean;
  dryRun?: boolean;
  name?: string;
  packageFile?: string;
  scope?: string;
  url?: string;
  version?: string;
}

export interface TarballDependencyChange {
  name: string;
  nextSpec: string;
  packageFile: string;
  previousSpec: string;
  section: DependencySection;
}

export interface CheckTarballDepsOptions {
  packageFile?: string;
  scope?: string;
  timeoutMs?: number;
}

export interface TarballDependencyCheck extends TarballDependency {
  ok: boolean;
  status?: number;
  message?: string;
}

export function listTarballDeps(
  options: ListTarballDepsOptions = {},
): TarballDependency[] {
  const document = readPackageJson(options.packageFile);

  return getDependencyEntries(document.data)
    .filter((entry) => parseTarballSpec(entry.spec))
    .filter((entry) => matchesScope(entry.name, options.scope))
    .map((entry) => ({
      ...entry,
      packageFile: document.file,
    }));
}

export function updateTarballDeps(
  options: UpdateTarballDepsOptions,
): TarballDependencyChange[] {
  if (!options.version && !options.url) {
    throw new Error("必须提供 --version 或 --url");
  }

  if (options.url && !options.name) {
    throw new Error("--url 只能和单个依赖名一起使用");
  }

  const document = readPackageJson(options.packageFile);
  const candidates = getDependencyEntries(document.data)
    .filter((entry) => parseTarballSpec(entry.spec))
    .filter((entry) => matchesUpdateTarget(entry, options));

  if (candidates.length === 0) {
    throw new Error("未找到匹配的 tarball 依赖");
  }

  const changes = candidates.map((entry) => {
    const nextSpec = options.url ?? replaceTarballVersion(entry.spec, options.version ?? "");

    return {
      name: entry.name,
      nextSpec,
      packageFile: document.file,
      previousSpec: entry.spec,
      section: entry.section,
    };
  });

  if (!options.dryRun) {
    for (const change of changes) {
      setDependencySpec(document.data, change.section, change.name, change.nextSpec);
    }

    writePackageJson(document);
  }

  return changes;
}

export async function checkTarballDeps(
  options: CheckTarballDepsOptions = {},
): Promise<TarballDependencyCheck[]> {
  const deps = listTarballDeps(options);

  return Promise.all(
    deps.map(async (dep) => {
      const info = parseTarballSpec(dep.spec);

      if (!info) {
        return {
          ...dep,
          ok: false,
          message: "不是 tarball 依赖",
        };
      }

      if (info.kind === "remote") {
        return checkRemoteTarball(dep, options.timeoutMs ?? 15000);
      }

      return checkLocalTarball(dep);
    }),
  );
}

function matchesUpdateTarget(
  entry: DependencyEntry,
  options: UpdateTarballDepsOptions,
): boolean {
  if (options.name) {
    return entry.name === options.name;
  }

  if (options.scope) {
    return matchesScope(entry.name, options.scope);
  }

  return options.all === true;
}

function matchesScope(name: string, scope?: string): boolean {
  return !scope || name === scope || name.startsWith(`${scope}/`);
}

async function checkRemoteTarball(
  dep: TarballDependency,
  timeoutMs: number,
): Promise<TarballDependencyCheck> {
  try {
    const head = await fetch(dep.spec, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (head.ok) {
      return { ...dep, ok: true, status: head.status };
    }

    if (head.status !== 405) {
      return {
        ...dep,
        ok: false,
        status: head.status,
        message: head.statusText,
      };
    }

    const get = await fetch(dep.spec, {
      headers: { Range: "bytes=0-0" },
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    return {
      ...dep,
      ok: get.ok,
      status: get.status,
      message: get.ok ? undefined : get.statusText,
    };
  } catch (error) {
    return {
      ...dep,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkLocalTarball(dep: TarballDependency): TarballDependencyCheck {
  const file = resolveLocalTarballPath(dep.spec, dep.packageFile);
  const ok = fs.existsSync(file);

  return {
    ...dep,
    ok,
    message: ok ? undefined : `文件不存在: ${file}`,
  };
}
