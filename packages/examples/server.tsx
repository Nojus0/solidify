import express from "express";
import { RouteDefinition } from "solid-app-router";
import { renderToStringAsync } from "solid-js/web";
import { Component } from "solid-js";
import { Outlet, SolidifyApp, SolidifyDocument } from "solidify-utils";

export interface TagDescription {
  tag: string;
  props: Record<string, unknown>;
}

const app = express();

declare var App: SolidifyApp;
declare var Document: SolidifyDocument;
declare var routes: RouteDefinition[];

app.use(
  "/static",
  express.static("./.solidify/static/", { fallthrough: false })
);

(async () => {})();

app.get("/*", async (req, res) => {
  let props: any;

  for (const rt of routes) {
    const a = await (rt.component as any).preload();

    const data = await a.getServerProps();

    props = data;
  }

  if (req.query.data == "true") {
    return res.json(props);
  }

  const str = await renderToStringAsync(() => (
    <Document
      App={(p) => (
        <App tags={p.tags}>
          <Outlet props={props} routes={routes} url={req.url} />
        </App>
      )}
    />
  ));
  res.setHeader("Content-Type", "text/html");

  res.send(str);
});

app.listen(4000, () => console.log(`Listening on http://localhost:4000`));
