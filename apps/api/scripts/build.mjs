/**
 * Build de production de l'API.
 * ----------------------------------------------------------------
 * Pourquoi un bundler (esbuild) plutot que `tsc` seul ?
 *   1. Le monorepo expose les packages @accelyo/* en SOURCE TypeScript
 *      (pas de dist). Les inliner dans le bundle evite toute dependance
 *      a la resolution des workspaces au runtime.
 *   2. Le projet est en ESM (`"type": "module"`). esbuild produit un
 *      bundle ESM coherent, sans le piege des imports sans extension
 *      que Node refuse d'executer.
 *
 * Strategie:
 *   - On bundle UNIQUEMENT le code @accelyo (api + packages partages).
 *   - Toutes les autres dependances npm restent externes : elles sont
 *     resolues depuis node_modules au runtime (Prisma, bcrypt, etc.).
 *   - La resolution de @accelyo/* s'appuie sur les `paths` du tsconfig,
 *     donc deterministe meme si les symlinks de workspace manquent.
 */

import esbuild from 'esbuild';

/**
 * Externalise tout import "bare" (npm / builtin Node) SAUF @accelyo/*,
 * que l'on veut inliner dans le bundle.
 */
const externalizeNonAccelyo = {
  name: 'externalize-non-accelyo',
  setup(build) {
    build.onResolve({ filter: /^[^.\/]/ }, (args) => {
      if (args.path.startsWith('@accelyo/')) return undefined;
      return { path: args.path, external: true };
    });
  },
};

await esbuild.build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  minify: false,
  tsconfig: 'tsconfig.json',
  logLevel: 'info',
  plugins: [externalizeNonAccelyo],
  // Certaines deps CJS appellent `require`/`__dirname` : on fournit les
  // shims ESM standards pour eviter les "require is not defined".
  banner: {
    js: [
      "import { createRequire as __cr } from 'module';",
      "import { fileURLToPath as __fu } from 'url';",
      "import { dirname as __dn } from 'path';",
      'const require = __cr(import.meta.url);',
      'const __filename = __fu(import.meta.url);',
      'const __dirname = __dn(__filename);',
    ].join('\n'),
  },
});

console.log('[build] dist/server.js genere avec succes.');
