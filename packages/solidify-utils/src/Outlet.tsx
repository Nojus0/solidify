import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { Component, Suspense } from "solid-js";

export const Outlet: Component<{ routes: RouteDefinition[]; url?: string }> = (
  p
) => {
  const Routes = useRoutes(p.routes);

  return (
    <Router url={p.url}>
      <Suspense>
        <Routes />
      </Suspense>
    </Router>
  );
};
