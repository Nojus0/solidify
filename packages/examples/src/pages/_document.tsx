import { Component, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { Router, RouteDefinition, useRoutes } from "solid-app-router";
import { Scripts } from "solidify-utils";

const Document: Component = (p) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Scripts />
        <title>Document</title>
      </head>
      <body>
        <div id="root">{p.children}</div>
      </body>
    </html>
  );
};

export default Document;
