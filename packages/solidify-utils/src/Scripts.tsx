import { Component } from "solid-js";
import { HydrationScript } from "solid-js/web";

export const Scripts: Component = () => {
  return (
    <>
      <HydrationScript />
      <script
        type="module"
        src="/static/chunks/virtual-entrypoint.js"
        async
        defer
      ></script>
    </>
  );
};