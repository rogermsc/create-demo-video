#!/usr/bin/env node

/**
 * Scaffolds a demokit project.
 *
 *   npm create demo-video my-tour
 *   npx create-demo-video my-tour -- --ref v1.2.0 --no-git
 *
 * The template is fetched from github.com/rogermsc/demokit at run time rather
 * than vendored into this package. A vendored copy is a second source of truth:
 * it drifts from the repo the moment either is edited, and it would put 6 MB of
 * README stills into every install. This package stays ~5 KB and always hands
 * you whatever `main` currently is.
 *
 * No dependencies on purpose — `npm create` runs this before anything is
 * installed, so every dependency is latency the user waits through.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const REPO = "rogermsc/demokit";

/** Belongs to demokit-the-project, not to the video you are about to make. */
const PRUNE = [
  "docs",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  ".github/ISSUE_TEMPLATE",
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : undefined;
};

const positional = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--ref");
const dirName = positional[0] ?? "demo-video";
const ref = value("ref") ?? "main";
const target = resolve(process.cwd(), dirName);

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

if (existsSync(target) && readdirSync(target).length > 0) {
  die(`${dirName} already exists and is not empty.`);
}

// `tar` ships with macOS, Linux and Windows 10+, but say so plainly rather than
// failing later with a spawn error nobody can act on.
if (spawnSync("tar", ["--version"], { stdio: "ignore" }).status !== 0) {
  die("`tar` is not available on this system, and it is needed to unpack the template.");
}

const url = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/${ref}`;
console.log(`\nFetching the demokit template (${ref})…`);

const response = await fetch(url).catch((error) => {
  die(`Could not reach GitHub: ${error.message}`);
});

if (!response.ok) {
  die(
    response.status === 404
      ? `No branch or tag "${ref}" in ${REPO}.`
      : `GitHub returned ${response.status} for ${url}`,
  );
}

const staging = mkdtempSync(join(tmpdir(), "create-demo-video-"));
const tarball = join(staging, "template.tar.gz");
writeFileSync(tarball, Buffer.from(await response.arrayBuffer()));

mkdirSync(target, { recursive: true });
try {
  // --strip-components=1 drops the `demokit-main/` wrapper GitHub adds.
  execFileSync("tar", ["-xzf", tarball, "-C", target, "--strip-components=1"], {
    stdio: "pipe",
  });
} catch (error) {
  rmSync(target, { recursive: true, force: true });
  die(`Could not unpack the template: ${error.message}`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}

for (const path of PRUNE) {
  rmSync(join(target, path), { recursive: true, force: true });
}

// npm forbids uppercase and leading dots in a package name; a directory called
// `My Demo` is a perfectly reasonable thing to ask for.
const packageName =
  basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9-~]/g, "-")
    .replace(/^[-.]+/, "")
    .slice(0, 214) || "demo-video";

const manifestPath = join(target, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      ...manifest,
      name: packageName,
      version: "0.0.0",
      description: "",
      // Kept from the template: this is your video, not something to publish.
      private: true,
    },
    null,
    2,
  )}\n`,
);

// The template's README documents demokit. Yours should describe the video.
await writeFile(
  join(target, "README.md"),
  `# ${basename(target)}

A product demo video, built with [demokit](https://github.com/${REPO}).

\`\`\`bash
npm install
npm run dev       # Remotion Studio
\`\`\`

Everything on screen comes from \`video.config.ts\`, which is gitignored — it is
seeded from \`video.config.example.ts\` on first run. Edit it, not \`src/\`.

| | |
|---|---|
| \`npm run dev\` | Remotion Studio |
| \`npm run draft "<what your product does>"\` | write a whole config from a paragraph |
| \`npm run render\` | the whole video → \`out/demo.mp4\` |
| \`npm run render:vertical\` / \`:square\` | the 9:16 and 1:1 cuts, captions burned in |
| \`npm run gif\` / \`poster\` | the first 15s as a GIF; one frame as a PNG |
| \`npm run add <archetype>\` | append a filled-in scene to your config |
| \`npm run voice\` | speak each scene's narration into \`public/audio/\` |
| \`npm run narrate\` | measure narration in \`public/audio/\` |
| \`npm run doctor\` | check assets, contrast, layout capacity and pacing |
| \`npm run captions\` | write the WebVTT sidecar |
| \`npm run translate <lang>\` | the same video in another language |
| \`npm run smoke\` | render every composition, fail on a blank frame |

Full documentation: https://github.com/${REPO}
`,
);

if (!flag("no-git") && spawnSync("git", ["--version"], { stdio: "ignore" }).status === 0) {
  const git = (...a) => spawnSync("git", a, { cwd: target, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  // -c so this does not fail on a machine with no configured git identity,
  // which is a silly reason for a scaffold to look broken.
  spawnSync(
    "git",
    ["-c", "user.name=demokit", "-c", "user.email=demokit@localhost", "commit", "-qm", "Initial commit from create-demo-video"],
    { cwd: target, stdio: "ignore" },
  );
}

console.log(
  `\nCreated ${dirName}.\n\n` +
    `  cd ${dirName}\n` +
    "  npm install\n" +
    "  npm run dev\n\n" +
    "Then edit video.config.ts — brand, chrome and scenes. Nothing in src/.\n",
);
