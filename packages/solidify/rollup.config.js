import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "commonjs",
  },
  external: ["solid-js", "solid-js/web", "path", "express"],
  plugins: [
    typescript(),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["solid", "node"],
    }),
    babel({
      babelHelpers: "bundled",
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      presets: [["solid", { generate: "ssr", hydratable: true }]],
    }),
    common(),
  ],
};

export default config;
