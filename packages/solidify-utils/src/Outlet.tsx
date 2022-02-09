import { RouteDefinition, Router, useRoutes } from "solid-app-router";
import { Component, createSignal, Suspense } from "solid-js";


export const [props, setProps] = createSignal<any>();

export const Outlet: Component<{
  routes: RouteDefinition[];
  url?: string;
  props?: any;
}> = (p) => {
  const Routes = useRoutes(p.routes);
  setProps(p.props);
  return (
    <Router url={p.url}>
      <Suspense>
        <Routes />
      </Suspense>
    </Router>
  );
};
