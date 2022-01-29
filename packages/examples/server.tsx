import express from "express";
import path from "path";
import { RouteDefinition } from "solid-app-router";
import { renderToStringAsync } from "solid-js/web";
import Index from "./src/pages/index";
import About from "./src/pages/about";
import { Document } from "solidify-utils";
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
