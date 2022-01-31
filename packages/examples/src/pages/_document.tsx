import { Component } from "solid-js";
import { Scripts } from "solidify-utils";

const Document: Component = (p) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin="anonymous"
        />
        <link
          href={`https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap`}
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/static/global.css" />
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
