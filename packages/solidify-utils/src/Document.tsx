import { Accessor, Component, createMemo, JSX } from "solid-js";
import { Scripts } from "./Scripts";
import { App, IApp } from "./App";

export const Document: Component = (props) => {
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
        <div id="root">{props.children}</div>
      </body>
    </html>
  );
};
