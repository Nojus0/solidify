import path from "path";
import { rollup } from "rollup";
import fs from "fs";
import { BUILD_DIR, CHUNKS_DIR, SERVER_DIR } from "./constants";
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
  fs.rmSync(path.join(process.cwd(), BUILD_DIR), {
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
  const code = `
import { lazy, Component, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { hydrate } from "solid-js/web";
import { Router, RouteDefinition, useRoutes } from "solid-app-router";
import { Outlet } from "solidify-utils";
${
  options.manifest.customDocument
    ? `import Document from ${JSON.stringify(options.manifest.customDocument)}`
    : `import { Document } from "solidify-utils";`
}
${
  options.manifest.customApp
    ? `import App from ${JSON.stringify(options.manifest.customApp)}`
    : `import { App } from "solidify-utils";`
}


const routes = [
  ${options.manifest.pages
    .map(
      (page) => `{
      path: "${page.path}",
      component: lazy(() => import(${JSON.stringify(
        page.component.split(".").shift()
      )}))
    }`
    )
    .join(",")}
];



hydrate(()=> (
  <Document App={() => (
  <App>
    <Outlet routes={routes} />
  </App>)
  }/>
), document);
    `;

  const bundle = await rollup(getClientBuildConfig(code, options));
  await bundle.write({
    format: "esm",
    dir: path.resolve(process.cwd(), CHUNKS_DIR),
  });
}

async function buildServer(options: InternalBuildOptions) {
  const code = `
  import { Headers, Request, Response, fetch } from "cross-fetch";
  global.fetch = fetch;
  global.Request = Request;
  global.Headers = Headers;
  global.Response = Response;
  import { lazy } from "solid-js";
  ${
    options.manifest.customDocument
      ? `import Document from ${JSON.stringify(
          options.manifest.customDocument
        )}`
      : `import { Document } from "solidify-utils";`
  }

  ${
    options.manifest.customApp
      ? `import App from ${JSON.stringify(options.manifest.customApp)}`
      : `import { App } from "solidify-utils";`
  }
  
  var routes = [
    ${options.manifest.pages
      .map(
        (page) => `{
        path: "${page.path}",
        component: lazy(()=> import(${JSON.stringify(page.component)}))
      }`
      )
      .join(",")}
  ];

  `;

  const bundle = await rollup(getServerBuildConfig(code, options));

  await bundle.write({
    format: "cjs",
    dir: path.resolve(process.cwd(), SERVER_DIR),
  });
}
