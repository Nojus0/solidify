import { Component } from "solid-js";
import { TagDescription } from "./meta/index";
import { SolidifyApp } from "./App";
import { Scripts } from "./Scripts";

export type SolidifyDocument = Component<{
  App: SolidifyApp;
}>;

export const Document: SolidifyDocument = (props) => {
  let tags: TagDescription[] = [];

  const App = <props.App tags={tags} />;
  
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        <Scripts />
      </head>
      <body>
        <div id="root">{App}</div>
      </body>
    </html>
  );
};
