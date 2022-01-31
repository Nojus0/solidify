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

async function buildClient(options: IBuildOptions) {
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

async function buildServer(options: IBuildOptions) {
  const pagesDir = path.join(options.srcDir, "pages");
  const manifest = await getPageManifest(pagesDir);
  const bundle = await rollup(getServerBuildConfig(manifest, options));

  await bundle.write({
    format: "cjs",
    dir: path.resolve(process.cwd(), SERVER_DIR),
  });
}

interface IPage {
  path: string;
  component: string;
}

export interface IPageManifest {
  pages: IPage[];
}

async function getPageManifest(pagesDir: string): Promise<IPageManifest> {
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

  return {
    pages: Array.from(routes)
  } 
}
