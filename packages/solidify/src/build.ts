import path from "path";
import { LoadHook, rollup, watch } from "rollup";
import fs from "fs";
import nodeResolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";
import { BUILD_DIR, CHUNKS_DIR, SERVER_DIR } from "./constants";
import copy from "rollup-plugin-copy";
import { getClientBuildConfig } from "./rollup/client-build";
import { getServerBuildConfig } from "./rollup/server-build";
import { getPageManifest, IPageManifest } from "./manifest";

export interface IBuildOptions {
  srcDir: string;
  serverEntry: string;
}

export interface InternalBuildOptions extends IBuildOptions {
  manifest: IPageManifest;
}

export async function build(options: IBuildOptions) {
  fs.rmdirSync(path.join(process.cwd(), BUILD_DIR), {
    recursive: true,
  });

  try {
    const manifest: InternalBuildOptions = {
      srcDir: options.srcDir,
      serverEntry: options.serverEntry,
      manifest: await getPageManifest(path.join(options.srcDir, "pages")),
    };

    await Promise.all([buildClient(manifest), buildServer(manifest)]);
  } catch (err: any) {
    console.log(err.message);
  }
}

async function buildClient(options: InternalBuildOptions) {
  const pagesDir = path.join(options.srcDir, "pages");
  const manifest = await getPageManifest(pagesDir);

  const code = `
import { lazy, Component, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { hydrate } from "solid-js/web";
import { Router, RouteDefinition, useRoutes } from "solid-app-router";
import { Document } from "solidify-utils";

const routes = [
  ${manifest.pages
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

  const bundle = await rollup(getClientBuildConfig(code, options));
  await bundle.write({
    format: "esm",
    dir: path.resolve(process.cwd(), CHUNKS_DIR),
  });
}

async function buildServer(options: InternalBuildOptions) {
  const bundle = await rollup(getServerBuildConfig(options));

  await bundle.write({
    format: "cjs",
    dir: path.resolve(process.cwd(), SERVER_DIR),
  });
}
