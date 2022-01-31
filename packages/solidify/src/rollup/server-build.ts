import path from "path";
import { LoadHook, rollup, RollupOptions, watch } from "rollup";
import fs from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { BUILD_DIR, CHUNKS_DIR, SERVER_DIR, VIRTUAL_NAME } from "../constants";
import copy from "rollup-plugin-copy";
import { IBuildOptions, IPageManifest } from "../build";

export const getServerBuildConfig = (
  manifest: IPageManifest,
  options: IBuildOptions
) =>
  ({
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
                ${manifest.pages
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
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [
          "@babel/preset-typescript",
          ["solid", { generate: "ssr", hydratable: true }],
        ],
      }),
      nodeResolve({
        exportConditions: ["solid", "ssr"],
        browser: false,
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      common(),
    ],
  } as RollupOptions);
