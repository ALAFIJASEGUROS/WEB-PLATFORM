import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");

describe("versionamiento", () => {
  it("la versión es semver válida", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
  });

  it("el CHANGELOG documenta la versión de package.json", () => {
    expect(changelog).toContain(`## [${pkg.version}]`);
    expect(changelog).toMatch(new RegExp(`^\\[${pkg.version.replace(/\./g, "\\.")}\\]: `, "m"));
  });
});
