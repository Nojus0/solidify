import { ssr, Assets, render } from "solid-js/web";
import {
  renderTags,
  Scripts,
  SolidifyDocument,
  TagDescription,
  Tags,
} from "solidify-utils";

export const Document: SolidifyDocument = (props) => {
  let tags: TagDescription[] = [];

  const App = <props.App tags={tags} />;

  console.log(tags);
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/static/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/static/global.css" />
        <Assets>{ssr(renderTags(tags)) as any}</Assets>
        <Scripts />
      </head>
      <body>
        <div id="root">{App}</div>
      </body>
    </html>
  );
};

export default Document;
