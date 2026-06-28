#!/usr/bin/env node
import {
  checkTarballDeps,
  listTarballDeps,
  updateTarballDeps,
  type TarballDependency,
  type TarballDependencyChange,
  type TarballDependencyCheck,
} from "./index";

interface CliOptions {
  all?: boolean;
  dryRun?: boolean;
  json?: boolean;
  packageFile?: string;
  scope?: string;
  timeoutMs?: number;
  url?: string;
  version?: string;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "list") {
    const options = parseOptions(args);
    const deps = listTarballDeps(options);
    printList(deps, options);
    return;
  }

  if (command === "update") {
    const { positional, options } = parseOptionsWithPositionals(args);
    const changes = updateTarballDeps({
      all: options.all,
      dryRun: options.dryRun,
      name: positional[0],
      packageFile: options.packageFile,
      scope: options.scope,
      url: options.url,
      version: options.version,
    });
    printChanges(changes, options);
    return;
  }

  if (command === "check") {
    const options = parseOptions(args);
    const checks = await checkTarballDeps(options);
    printChecks(checks, options);

    if (checks.some((check) => !check.ok)) {
      process.exit(1);
    }

    return;
  }

  throw new Error(`未知命令: ${command}`);
}

function parseOptions(args: string[]): CliOptions {
  return parseOptionsWithPositionals(args).options;
}

function parseOptionsWithPositionals(args: string[]): {
  options: CliOptions;
  positional: string[];
} {
  const options: CliOptions = {};
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if ((arg === "--package" || arg === "--file") && next) {
      options.packageFile = next;
      index += 1;
    } else if (arg === "--scope" && next) {
      options.scope = next;
      index += 1;
    } else if (arg === "--version" && next) {
      options.version = next;
      index += 1;
    } else if (arg === "--url" && next) {
      options.url = next;
      index += 1;
    } else if (arg === "--timeout" && next) {
      options.timeoutMs = Number(next);
      index += 1;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`未知参数: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function printList(deps: TarballDependency[], options: CliOptions): void {
  if (options.json) {
    printJson(deps);
    return;
  }

  if (deps.length === 0) {
    console.log("未找到 tarball 依赖");
    return;
  }

  for (const dep of deps) {
    console.log(`${dep.section} ${dep.name} ${dep.spec}`);
  }
}

function printChanges(
  changes: TarballDependencyChange[],
  options: CliOptions,
): void {
  if (options.json) {
    printJson(changes);
    return;
  }

  for (const change of changes) {
    const prefix = options.dryRun ? "dry-run" : "updated";
    console.log(`${prefix} ${change.section} ${change.name}`);
    console.log(`  - ${change.previousSpec}`);
    console.log(`  + ${change.nextSpec}`);
  }
}

function printChecks(
  checks: TarballDependencyCheck[],
  options: CliOptions,
): void {
  if (options.json) {
    printJson(checks);
    return;
  }

  if (checks.length === 0) {
    console.log("未找到 tarball 依赖");
    return;
  }

  for (const check of checks) {
    const status = check.ok ? "ok" : "fail";
    const detail = check.status ? ` ${check.status}` : "";
    const message = check.message ? ` ${check.message}` : "";
    console.log(`${status}${detail} ${check.section} ${check.name}${message}`);
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp(): void {
  console.log(`tarball-deps

Usage:
  tarball-deps list [--package package.json] [--scope @scope] [--json]
  tarball-deps update <name> --version v0.2.260628 [--package package.json] [--dry-run] [--json]
  tarball-deps update <name> --url https://example.com/package.tar.gz [--package package.json] [--dry-run] [--json]
  tarball-deps update --scope @scope --version v0.2.260628 [--package package.json] [--dry-run] [--json]
  tarball-deps update --all --version v0.2.260628 [--package package.json] [--dry-run] [--json]
  tarball-deps check [--package package.json] [--scope @scope] [--timeout 15000] [--json]
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
