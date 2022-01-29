import babel from "@rollup/plugin-babel";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
/**
 * @type {import('rollup').RollupOptions[]}
 */
const config = [
  {
    input: "src/index.tsx",
    output: {
      dir: "dist/ssr",
      format: "es",
      preserveModules: true,
    },
    external: ["solid-js", "solid-js/web", "solid-app-router"],
    plugins: [
      typescript({
        useTsconfigDeclarationDir: true,
      }),
      resolve({
        preferBuiltins: true,
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [["solid", { generate: "ssr", hydratable: true }]],
      }),
    ],
  },
  {
    input: "src/index.tsx",
    output: {
      dir: "dist/dom",
      format: "es",
      preserveModules: true,
    },
    external: ["solid-js", "solid-js/web", "solid-app-router"],
    plugins: [
      typescript({
        useTsconfigDeclarationDir: true,
      }),
      resolve({
        preferBuiltins: true,
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      }),
      babel({
        babelHelpers: "bundled",
        exclude: "node_modules/**",
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        presets: [["solid", { generate: "dom", hydratable: true }]],
      }),
    ],
  },
];

export default config;
