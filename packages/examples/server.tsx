import express from "express";
import path from "path";
import { RouteDefinition, useRoutes, Router } from "solid-app-router";
import { HydrationScript, renderToStringAsync } from "solid-js/web";
import Index from "./src/pages/index";
import About from "./src/pages/about";
import { Component, Suspense } from "solid-js";

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

const app = express();

app.use("/static", express.static(path.resolve(__dirname, "../static/")));

app.get("/*", async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  const routes: RouteDefinition[] = [
    {
      path: "/",
      component: Index,
    },
    {
      path: "/about",
      component: About,
    },
  ];

  const str = await renderToStringAsync(() => (
    <Document routes={routes} url={req.url} />
  ));

  res.setHeader("Content-Type", "text/html");

  res.send(str);
});

app.listen(4000, () => console.log(`Listening on http://localhost:4000`));
