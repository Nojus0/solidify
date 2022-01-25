import path from "path";
import { rollup } from "rollup";
import fs from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { BUILD_DIR } from ".";
import copy from "rollup-plugin-copy";

export interface IBuildOptions {
  srcDir: string;
}

export async function build(options: IBuildOptions) {
  await buildClient(options);
}

const VIRTUAL_NAME = "virtual-entrypoint.tsx";
async function buildClient(options: IBuildOptions) {
  const pagesDir = path.join(options.srcDir, "pages");
  const pages = await getPages(pagesDir);

  const code = `
  import { Router, Routes, useRoutes } from "solid-app-router";
  import { lazy } from "solid-js";
  import { hydrate } from "solid-js/web";

  const routes = [
    ${pages
      .map(
        (pageName, index) => `{
        path: "${pageName.toLowerCase() === "index" ? "/" : pageName}",
        component: lazy(() => import("./src/pages/${pageName}"))
      }`
      )
      .join(",")}
  ];


  
  const Document = () => {
    const Routes = useRoutes(routes);
  
    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Document</title>
        </head>
        <body>
          <div id="root">
            <Router>
              <Routes />
            </Router>
          </div>
        </body>
      </html>
    );
  };

  hydrate(()=> <Document />, document);
    `;
  console.log(code);

  const bundle = await rollup({
    input: VIRTUAL_NAME,
    preserveEntrySignatures: false,
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
        exportConditions: ["solid"],
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
  // await bundle.close();

  await bundle.write({
    format: "es",
    dir: path.resolve(process.cwd(), BUILD_DIR),
  });
}

async function getPages(pagesDir: string) {
  const routes = new Set<string>([]);

  for (let file of await fs.promises.readdir(pagesDir)) {
    routes.add(path.basename(file, path.extname(file)));
  }

  return Array.from(routes);
}
