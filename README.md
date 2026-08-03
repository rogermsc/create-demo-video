# create-demo-video

Scaffolds a [demokit](https://github.com/rogermsc/demokit) project — product
demo videos from a config file.

```bash
npm create demo-video my-tour
cd my-tour
npm install
npm run dev
```

That gives you a Remotion project where the app on screen is **drawn from a
config**, not recorded — so you can demo a product that does not exist yet, one
too rough to film, or move through a screenshot of the one you already have.

Everything you edit lives in `video.config.ts`. Nothing in `src/`.

## Options

| | |
|---|---|
| `npm create demo-video <dir>` | defaults to `demo-video` |
| `--ref <branch\|tag>` | pin the template version; defaults to `main` |
| `--no-git` | skip `git init` and the first commit |

## What you get

The demokit template, minus the parts that belong to demokit rather than to
your video — `docs/` (6 MB of README stills), its changelog, contributing guide
and issue templates. Roughly 1 MB instead of 6.

`package.json` is renamed after your directory, reset to `0.0.0`, and kept
`private` — a demo video is not something you publish to a registry.

## Why it downloads instead of bundling

The template is fetched from GitHub when you run this, rather than vendored
into the package. A vendored copy is a second source of truth that drifts from
the repo the moment either is edited, and it would put those 6 MB of stills into
every install. This package is a few kilobytes and hands you whatever `main`
currently is — or whatever you pin with `--ref`.

It has no dependencies, because `npm create` runs before anything is installed
and every dependency is latency you wait through.

Requires Node 18+ and `tar` (macOS, Linux, and Windows 10+ all ship it).

MIT.
