import path from "path";
import { LoadHook, rollup } from "rollup";
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
      (page) => `{
      path: "${page.path}",
      component: lazy(() => import(${JSON.stringify(
        page.component.split(".")[0]
      )}))
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
            const resolution = await this.resolve(source, importer, {
              skipSelf: true,
              ...options,
            });
            if (!resolution || resolution.external) return resolution;
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

            const Hook: ReturnType<LoadHook> = {
              code:
                `
              import { lazy } from "solid-js";
              var routes = [
                ${pages
                  .map(
                    (page) => `{
                    path: "${page.path}",
                    component: lazy(()=> import(${JSON.stringify(
                      page.component
                    )}))
                  }`
                  )
                  .join(",")}
              ];
              ` + code,
            };
            console.log(Hook.code);
            return Hook;
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

interface IPage {
  path: string;
  component: string;
}

async function getPages(pagesDir: string) {
  const routes = new Set<IPage>([]);

  for (let file of fs.readdirSync(pagesDir)) {
    let Path = path.basename(file, path.extname(file)).toLocaleLowerCase();

    if (Path === "index") {
      Path = "/";
    } else {
      Path = `/${Path}`;
    }

    routes.add({
      path: Path,
      component: path.join(pagesDir, file),
    });
  }

  return Array.from(routes);
}
