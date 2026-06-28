import fs from "node:fs";
import path from "node:path";

export const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

export type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

export interface PackageJsonData {
  [key: string]: unknown;
}

export interface PackageJsonDocument {
  data: PackageJsonData;
  file: string;
  indent: string | number;
}

export interface DependencyEntry {
  name: string;
  section: DependencySection;
  spec: string;
}

export function readPackageJson(file = "package.json"): PackageJsonDocument {
  const resolvedFile = path.resolve(file);
  const content = fs.readFileSync(resolvedFile, "utf8");
  const data = JSON.parse(content) as PackageJsonData;

  return {
    data,
    file: resolvedFile,
    indent: detectIndent(content),
  };
}

export function writePackageJson(document: PackageJsonDocument): void {
  const content = `${JSON.stringify(document.data, null, document.indent)}\n`;
  const tempFile = `${document.file}.${process.pid}.${Date.now()}.tmp`;

  fs.writeFileSync(tempFile, content);
  fs.renameSync(tempFile, document.file);
}

export function getDependencyEntries(data: PackageJsonData): DependencyEntry[] {
  const entries: DependencyEntry[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = readDependencySection(data, section);

    for (const [name, spec] of Object.entries(dependencies)) {
      entries.push({ name, section, spec });
    }
  }

  return entries;
}

export function setDependencySpec(
  data: PackageJsonData,
  section: DependencySection,
  name: string,
  spec: string,
): void {
  const dependencies = readDependencySection(data, section);
  dependencies[name] = spec;
  data[section] = dependencies;
}

function readDependencySection(
  data: PackageJsonData,
  section: DependencySection,
): Record<string, string> {
  const value = data[section];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const dependencies: Record<string, string> = {};

  for (const [name, spec] of Object.entries(value)) {
    if (typeof spec === "string") {
      dependencies[name] = spec;
    }
  }

  return dependencies;
}

function detectIndent(content: string): string | number {
  const match = content.match(/\n([ \t]+)"/);
  return match?.[1] ?? 2;
}
