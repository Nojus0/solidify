import path from "path";
import { LoadHook, rollup, RollupOptions, watch } from "rollup";
import fs from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { BUILD_DIR, CHUNKS_DIR, SERVER_DIR, VIRTUAL_NAME } from "../constants";
import copy from "rollup-plugin-copy";
import { IBuildOptions } from "../build";

export const getClientBuildConfig = (
  entrypointCodeString: string,
  options: IBuildOptions
) => ({
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
            code: entrypointCodeString,
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
      targets: [
        {
          src: path.resolve(options.srcDir, "public"),
          dest: path.resolve(process.cwd(), BUILD_DIR),
        },
      ],
    }),
  ],
} as RollupOptions);
