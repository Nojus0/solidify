import path from "path";
import { rollup } from "rollup";
import fs from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { BUILD_DIR, CHUNKS_DIR, SERVER_DIR } from "./constants";
import copy from "rollup-plugin-copy";

export interface IBuildOptions {
  srcDir: string;
  serverEntry: string;
}

export async function build(options: IBuildOptions) {
  fs.rmdirSync(path.join(process.cwd(), BUILD_DIR), {
    recursive: true,
  });

  try {
    await Promise.all([buildClient(options), buildServer(options)]);
  } catch (err: any) {
    console.log(err.message);
  }
}

const VIRTUAL_NAME = "virtual-entrypoint.tsx";
async function buildClient(options: IBuildOptions) {
  const pagesDir = path.join(options.srcDir, "pages");
  const pages = await getPages(pagesDir);

  const code = `
import { lazy, Component, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { hydrate } from "solid-js/web";
import { Router, RouteDefinition, useRoutes } from "solid-app-router";
import { Document } from "solidify-utils";

const routes = [
  ${pages
    .map(
      (pageName, index) => `{
      path: "${
        pageName.toLowerCase() === "index" ? "/" : `/${pageName.toLowerCase()}`
      }",
      component: lazy(() => import("./src/pages/${pageName}"))
    }`
    )
    .join(",")}
];

hydrate(()=> <Document routes={routes} />, document);
    `;
  console.log(code);
  const bundle = await rollup({
    input: VIRTUAL_NAME,
    preserveEntrySignatures: false,
    external: ["path", "express"],
    output: {
      dir: path.join(process.cwd(), BUILD_DIR),
      format: "esm",
    },
    plugins: [
      {
        name: "myplug",
        async resolveId(source, importer, { isEntry }) {
          if (source === VIRTUAL_NAME) {
            return {
              id: VIRTUAL_NAME,
            };
          }
          return null;
        },
        async load(id) {
          if (id == VIRTUAL_NAME) {
            return {
              code,
            };
          }
          return null;
        },
      },
      typescript({
        tsconfigOverride: {
          jsxImportSource: "solid-js",
          jsx: "preserve",
          target: "esnext",
          module: "esnext",
          moduleResolution: "node",
        },
      }),
      nodeResolve({
        exportConditions: ["solid", "dom"],
        extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"],
      }),
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [["solid", { generate: "dom", hydratable: true }]],
      }),
      common(),
      copy({
        targets: [
          {
            src: path.resolve(options.srcDir, "public"),
            dest: path.resolve(process.cwd(), BUILD_DIR),
          },
        ],
      }),
    ],
  });
  await bundle.write({
    format: "esm",
    dir: path.resolve(process.cwd(), CHUNKS_DIR),
  });
}

async function buildServer(options: IBuildOptions) {
  const pagesDir = path.join(options.srcDir, "pages");
  const pages = await getPages(pagesDir);

  const bundle = await rollup({
    input: options.serverEntry,
    external: ["solid-js", "solid-js/web", "path", "express", "solidify"],
    output: {
      dir: path.join(process.cwd(), SERVER_DIR),
      format: "cjs",
    },
    preserveEntrySignatures: false,
    plugins: [
      {
        name: "inject-routes",
        async resolveId(source, importer, options) {
          if (options.isEntry) {
            // We need to skip this plugin to avoid an infinite loop
            const resolution = await this.resolve(source, importer, {
              skipSelf: true,
              ...options,
            });
            // If it cannot be resolved or is external, just return it so that
            // Rollup can display an error
            if (!resolution || resolution.external) return resolution;
            // In the load hook of the proxy, we want to use this.load to find out
            // if the entry has a default export. In the load hook, however, we no
            // longer have the full "resolution" object that may contain meta-data
            // from other plugins that is only added on first load. Therefore we
            // trigger loading here without waiting for it.
            this.load(resolution);
            return `${resolution.id}?entry-proxy`;
          }
          return null;
        },
        async load(id) {
          if (id.endsWith("?entry-proxy")) {
            const entryId = id.slice(0, -"?entry-proxy".length);
            // We need to load and parse the original entry first because we need
            // to know if it has a default export
            const { code } = await this.load({ id: entryId });
            console.log(code);
            return {
              code:
                `
              import { lazy } from "solid-js";
              var routes = [
                ${pages
                  .map(
                    (pageName, index) => `{
                    path: "${
                      pageName.toLowerCase() === "index"
                        ? "/"
                        : `/${pageName.toLowerCase()}`
                    }",
                    component: lazy(()=>import("./src/pages/${pageName}"))
                  }`
                  )
                  .join(",")}
              ];
              ` + code,
            };
          }
          return null;
        },
      },
      typescript({
        tsconfigOverride: {
          jsxImportSource: "solid-js",
          jsx: "preserve",
          target: "esnext",
          module: "esnext",
          moduleResolution: "node",
        },
      }),
      nodeResolve({
        exportConditions: ["solid", "ssr"],
        browser: false,
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [["solid", { generate: "ssr", hydratable: true }]],
      }),
      common(),
    ],
  });

  const gen = await bundle.write({
    format: "cjs",
    dir: path.resolve(process.cwd(), SERVER_DIR),
  });
}

async function getPages(pagesDir: string, withExtension = false) {
  const routes = new Set<string>([]);

  for (let file of fs.readdirSync(pagesDir)) {
    routes.add(path.basename(file, withExtension ? "" : path.extname(file)));
  }

  return Array.from(routes);
}
