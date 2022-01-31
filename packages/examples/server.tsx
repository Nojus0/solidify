import express from "express";
import path from "path";
import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { renderToStringAsync } from "solid-js/web";
import { Component, Suspense } from "solid-js";
import { Outlet } from "solidify-utils";
const app = express();

declare var App: Component;
declare var Document: Component;
declare var routes: RouteDefinition[];

app.use("/static", express.static(path.resolve(__dirname, "../static/")));

app.get("/*", async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  const str = await renderToStringAsync(() => (
    <Document>
      <App>
        <Outlet routes={routes} url={req.url} />
      </App>
    </Document>
  ));

  res.setHeader("Content-Type", "text/html");

  res.send(str);
});

app.listen(4000, () => console.log(`Listening on http://localhost:4000`));
