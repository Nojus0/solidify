import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { Component, Suspense } from "solid-js";

export interface IApp {
  routes: RouteDefinition[];
  url?: string;
}

export const App: Component = (p) => {
  return p.children;
};
