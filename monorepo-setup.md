I have a pnpm monorepo where each package is built using vite, where some packages depend on other packages in the repo. During development, each vite package builds using "vite build --watch". For example, say I have packages A, B and C where A depends on B and B depends on C. I have a separate "vite build --watch" command running for each package. When I make a change in C, it rebuilds and updates the dist folder. C is added as a pnpm workspace dependency in B/package.json. When C is rebuilt, it causes B to be rebuilt again. A which includes B as a dependency in its package.json file is then rebuilt.

This setup is slow and doesn't take advantage of vite's esbuild features during development. My ideal setup would be to have a single vite dev server which serves all the packages in the monorepo. Is this possible? Maybe have each package served under a different path in the server. For example files under package A would be localhost:5000/A/path/to/module.ts and B would be localhost:5000/B/path/to/module.ts. Or perhaps localhost:5000/path/to/module.ts for A and localhost:5001/path/to/module.ts for B. There would also need to be some way of making imports to other workspace packages map to these paths instead of build folders during development

✅ Here's what I found about **running a single Vite dev server for a PNPM monorepo with multiple packages**:

---

### 🧩 The Short Answer

Yes — you *can* serve multiple packages from a single Vite dev server, but you need to make the packages part of the same Vite “app” during development. Vite itself doesn’t natively spin up multiple dev servers under one process, but you can simulate this setup using **Vite’s workspace-aware configuration**, **`root`** and **`server.fs.allow`**, or tools like **VitePress’s multi-app pattern**.

---

### 🧱 Approaches

#### **1. Root-based multi-package setup**

You can create a single Vite config at the repo root:

```ts
// vite.config.ts at repo root
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: process.cwd(),
  server: {
    fs: {
      // Allow serving files from all workspace packages
      allow: ['.', '../packages']
    }
  },
  resolve: {
    alias: {
      '@a': path.resolve(__dirname, 'packages/a/src'),
      '@b': path.resolve(__dirname, 'packages/b/src'),
      '@c': path.resolve(__dirname, 'packages/c/src'),
    }
  }
});
```

Then, you can import directly between packages during development:

```ts
import { something } from '@b';
```

You can serve everything under the same `localhost:5173` dev server, without watch rebuild chains.

---

#### **2. `vite-plugin-multi-dev-server`**

This plugin (and similar ones like `vite-plugin-virtual-mpa`) let you host multiple independent Vite apps under one root:

```bash
npm install vite-plugin-multi-dev-server --save-dev
```

Example:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import multiDevServer from 'vite-plugin-multi-dev-server';

export default defineConfig({
  plugins: [
    multiDevServer({
      servers: {
        a: 'packages/a',
        b: 'packages/b',
        c: 'packages/c'
      }
    })
  ]
});
```

This serves:

* `localhost:5173/a/...`
* `localhost:5173/b/...`
* `localhost:5173/c/...`

and lets them import each other without rebuilding.

---

#### **3. Monorepo with “linked” packages (no rebuilds)**

You can configure `pnpm` and Vite to import source directly, not built dist files:

```jsonc
// in package.json of A
"dependencies": {
  "b": "workspace:*"
}
```

and in your Vite config:

```ts
resolve: {
  preserveSymlinks: true
}
```

This makes Vite follow symlinked imports in real time instead of waiting for `vite build --watch` outputs — effectively using esbuild’s speed for all workspace packages.

---

#### **4. Multi-root with Nginx or Proxy**

If you truly want separate `localhost:5000`, `5001`, etc., you can run each dev server separately but unify them under a reverse proxy (e.g., `vite-plugin-proxy` or Nginx). However, this doesn’t remove multiple processes — it just hides them.

---

### 🚀 Recommended Setup for You

Given your description (“C → B → A dependency chain” and wanting faster live dev):

* Keep a **single dev server at the repo root**
* Use **`preserveSymlinks: true`**
* Add **path aliases for each package**
* Remove all `vite build --watch` scripts during dev — only use `vite build` for production builds.

That way, Vite/ESBuild will instantly reflect changes in C → B → A without slow rebuilds.

---

Would you like me to show you an example of a **fully working monorepo folder structure + config files** for this setup (with pnpm workspaces and shared deps)?




Great — here’s an example monorepo setup (with packages A, B, C where A depends on B, B depends on C) using pnpm workspaces + Vite, plus config suggestions to allow a **single dev server** approach so that changes in C → B → A propagate instantly (rather than doing separate `build --watch` for each). You’ll likely need to tweak a few details for your real code, but this gives a scaffold you can adapt.

---

## 📂 Folder structure

```
/monorepo-root/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  vite.config.ts      ← root config for dev server
  /packages/
    /c/
      package.json
      tsconfig.json
      src/
        index.ts
    /b/
      package.json
      tsconfig.json
      src/
        index.ts
    /a/
      package.json
      tsconfig.json
      src/
        index.ts
```

### Root `pnpm-workspace.yaml`

```yaml
packages:
  - "packages/*"
```

This tells pnpm which folders constitute workspace packages. ([pnpm.io][1])

### Root `package.json` (important bits)

```jsonc
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "vite",
    "build": "pnpm -r run build"
  },
  "devDependencies": {
    "vite": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Package C (`packages/c/package.json`)

```json
{
  "name": "@myorg/c",
  "version": "0.0.1",
  "main": "src/index.ts",
  "scripts": {
    // maybe build for production, but for dev we’ll import source
  }
}
```

### Package B (`packages/b/package.json`)

```json
{
  "name": "@myorg/b",
  "version": "0.0.1",
  "dependencies": {
    "@myorg/c": "workspace:*"
  },
  "main": "src/index.ts",
  "scripts": {
  }
}
```

### Package A (`packages/a/package.json`)

```json
{
  "name": "@myorg/a",
  "version": "0.0.1",
  "dependencies": {
    "@myorg/b": "workspace:*"
  },
  "main": "src/index.ts",
  "scripts": {
  }
}
```

### `tsconfig.base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Node",
    "baseUrl": ".",
    "paths": {
      "@myorg/c": ["packages/c/src"],
      "@myorg/b": ["packages/b/src"],
      "@myorg/a": ["packages/a/src"]
    },
    "preserveSymlinks": true
  }
}
```

### Each package `tsconfig.json` (e.g., `packages/b/tsconfig.json`)

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

---

## 🔧 Root `vite.config.ts`

Here’s how you might configure Vite at the root so that you have one dev server and it resolves workspace sources directly.

```ts
// vite.config.ts at root

import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // root default – Vite serves from the root folder
  resolve: {
    alias: {
      '@myorg/c': path.resolve(__dirname, 'packages/c/src'),
      '@myorg/b': path.resolve(__dirname, 'packages/b/src'),
      '@myorg/a': path.resolve(__dirname, 'packages/a/src')
    },
    // this lets Vite follow symlinked workspace imports
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [
        // allow serving files from workspace packages
        path.resolve(__dirname, 'packages')
      ]
    }
  },
  optimizeDeps: {
    // optionally include the workspace packages so Vite pre-bundles them
    include: [
      '@myorg/c',
      '@myorg/b',
      '@myorg/a'
    ]
  }
});
```

### Explanation of key parts

* `alias`: By aliasing `@myorg/b` → `packages/b/src`, etc., you can import from the source files directly rather than from built `dist` folders.
* `preserveSymlinks: true`: Ensures Node/Vite resolves the workspace symlink to the actual source path rather than thinking it’s an external package. This helps instant‐reload when you change C → B → A.
* `server.fs.allow`: Lets Vite dev server serve files from outside the root (i.e., the other packages).
* `optimizeDeps.include`: Pre-bundles workspace packages to speed up startup.

---

## ✅ How Development Works

* You run `pnpm install` at root. Because dependencies like `"@myorg/c": "workspace:*"` are declared, pnpm links the workspace packages. ([pnpm.io][1])
* You run `pnpm run dev` at the root which starts Vite.
* When you change a file in `packages/c/src/...`, Vite picks up the change, re‐bundles as needed, and everything that depends on `@myorg/c` (including B → A) updates live.
* You don’t need separate `vite build --watch` tasks for each package during development.
* For production builds you can still build each package (or build together) but that’s separate.

---

## ⚠️ Limitations & Things to Note

* Builds for production may still need per-package builds (dist folders) unless you always run everything from source.
* Circular dependencies can cause issues in workspaces. ([pnpm.io][1])
* If you have completely independent apps (rather than packages), you might want separate root configs or prefixing paths.
* If you still need separate dev servers (e.g., different ports), you’d need to run multiple Vite configs instead of true “single server”.
* Performance: large workspace packages might cause slower hot reloads—tweak `optimizeDeps`, use `exclude`, etc.

---

If you like, I can **generate a full minimal GitHub repo example** (with actual `packages/a/b/c` files, build scripts, everything) which you can clone and adapt to your stack (React, TS, etc.). Would you like me to build that for you?

[1]: https://pnpm.io/workspaces?utm_source=chatgpt.com "Workspace | pnpm"
