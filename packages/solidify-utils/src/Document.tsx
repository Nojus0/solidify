import {  Component, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { Router, RouteDefinition, useRoutes } from "solid-app-router";

export const Document: Component<{
  url?: string;
  routes: RouteDefinition[];
}> = (p) => {
  const Routes = useRoutes(p.routes);

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <HydrationScript />
        <title>Document</title>
      </head>
      <body>
        <div id="root">
          <Router url={p.url}>
            <Suspense>
                <h1>nice</h1>
              <Routes />
            </Suspense>
          </Router>
        </div>
      </body>
      <script
        type="module"
        src="/static/chunks/virtual-entrypoint.js"
        async
      ></script>
    </html>
  );
};
