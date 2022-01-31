import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { Component, Suspense } from "solid-js";

export interface IApp {
  routes: RouteDefinition[];
  url?: string;
}

export const App: Component<IApp> = (p) => {
  const Routes = useRoutes(p.routes);

  return (
    <Router url={p.url}>
      <Suspense>
        <h1>nice</h1>
        <Routes />
      </Suspense>
    </Router>
  );
};
