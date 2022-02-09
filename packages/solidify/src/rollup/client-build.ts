import path from "path";
import { RollupOptions } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import { BUILD_DIR, VIRTUAL_NAME } from "../constants";
import copy from "rollup-plugin-copy";
import { InternalBuildOptions } from "../build";

export const getClientBuildConfig = (
  code: string,
  options: InternalBuildOptions
) => {
  return {
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
      babel({
        babelHelpers: "bundled",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [
          "@babel/preset-typescript",
          ["solid", { generate: "dom", hydratable: true }],
        ],
      }),
      nodeResolve({
        exportConditions: ["solid", "dom"],
        extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"],
      }),
      copy({
        verbose: true,
        absolute: true,
        targets: [
          {
            absolute: true,
            cwd: process.cwd(),
            src: "src/static/*",
            dest: ".solidify/static",
          },
        ],
      }),
    ],
  } as RollupOptions;
};
