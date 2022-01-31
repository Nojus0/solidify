import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { Component, Suspense } from "solid-js";
import { MetaProvider } from "solid-meta";
export interface IApp {
  routes: RouteDefinition[];
  url?: string;
}

export const App: Component = (p) => {
  return <MetaProvider>{p.children}</MetaProvider>;
};
