// vite.config.ts at root

import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamically discover workspace packages
function getWorkspacePackages() {
  const packagesDir = path.resolve(__dirname, 'packages');
  const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const aliases: Record<string, string> = {};
  const packageNames: string[] = [];

  for (const pkg of packages) {
    const packageJsonPath = path.join(packagesDir, pkg, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const packageName = packageJson.name;
      if (packageName) {
        aliases[packageName] = path.resolve(__dirname, 'packages', pkg, 'src');
        packageNames.push(packageName);
      }
    }
  }

  return { aliases, packageNames };
}

const { aliases, packageNames } = getWorkspacePackages();

export default defineConfig({
  // root default – Vite serves from the root folder
  resolve: {
    alias: aliases,
    // this lets Vite follow symlinked workspace imports
    preserveSymlinks: true
  },
  server: {
    fs: {
      allow: [__dirname]
    },
    watch: {
      // Watch all package source directories for changes
      ignored: ['!**/node_modules/**', '!**/dist/**']
    }
  },
  optimizeDeps: {
    // Exclude workspace packages from pre-bundling so they're watched for changes
    exclude: packageNames
  }
});

