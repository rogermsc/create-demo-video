import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const cli = join(dirname(fileURLToPath(import.meta.url)), "index.js");

/** Runs the scaffolder and returns { status, output } rather than throwing. */
const run = (cwd, ...args) => {
  try {
    return { status: 0, output: execFileSync("node", [cli, ...args], { cwd, encoding: "utf8" }) };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
};

describe("refusals", () => {
  let work;
  before(() => {
    work = mkdtempSync(join(tmpdir(), "cdv-refuse-"));
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("refuses a directory that already has something in it", () => {
    // Overwriting someone's work is not a recoverable mistake.
    const occupied = join(work, "taken");
    execFileSync("mkdir", ["-p", occupied]);
    writeFileSync(join(occupied, "notes.md"), "mine");

    const { status, output } = run(work, "taken");
    assert.equal(status, 1);
    assert.match(output, /already exists and is not empty/);
    assert.equal(readFileSync(join(occupied, "notes.md"), "utf8"), "mine");
  });

  it("names the ref when there is no such branch", () => {
    const { status, output } = run(work, "nope", "--ref", "definitely-not-a-branch");
    assert.equal(status, 1);
    assert.match(output, /definitely-not-a-branch/);
    // And leaves nothing half-made behind.
    assert.equal(existsSync(join(work, "nope")), false);
  });
});

describe("a scaffolded project", () => {
  let work;
  let project;

  before(() => {
    work = mkdtempSync(join(tmpdir(), "cdv-make-"));
    const { status, output } = run(work, "My Demo");
    assert.equal(status, 0, output);
    project = join(work, "My Demo");
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("has what a video needs", () => {
    for (const path of ["src", "scripts", "video.config.example.ts", "package.json"]) {
      assert.ok(existsSync(join(project, path)), `missing ${path}`);
    }
    // Without this the screenshot archetype in the example cannot render.
    assert.ok(existsSync(join(project, "public/.demokit-placeholder.svg")));
  });

  it("drops what belongs to demokit rather than to your video", () => {
    // docs/ alone is 6 MB of README stills — the reason this prunes at all.
    for (const path of ["docs", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md"]) {
      assert.equal(existsSync(join(project, path)), false, `${path} should be pruned`);
    }
  });

  it("rewrites the manifest into a name npm would accept", () => {
    // "My Demo" is a reasonable directory name and an illegal package name.
    const manifest = JSON.parse(readFileSync(join(project, "package.json"), "utf8"));
    assert.equal(manifest.name, "my-demo");
    assert.equal(manifest.version, "0.0.0");
    assert.equal(manifest.private, true, "a scaffolded video must not be publishable");
    assert.ok(manifest.scripts.dev, "the template's scripts survive");
  });

  it("replaces the README, which otherwise documents demokit and not your video", () => {
    const readme = readFileSync(join(project, "README.md"), "utf8");
    assert.match(readme, /^# My Demo/);
    assert.match(readme, /video\.config\.ts/);
  });

  it("starts a git repository", () => {
    assert.ok(existsSync(join(project, ".git")));
    const log = execFileSync("git", ["log", "--oneline"], { cwd: project, encoding: "utf8" });
    assert.match(log, /Initial commit/);
  });
});

describe("--no-git", () => {
  it("leaves version control alone", () => {
    const work = mkdtempSync(join(tmpdir(), "cdv-nogit-"));
    const { status, output } = run(work, "bare", "--no-git");
    assert.equal(status, 0, output);
    assert.equal(existsSync(join(work, "bare", ".git")), false);
    rmSync(work, { recursive: true, force: true });
  });
});
