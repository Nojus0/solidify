import { RouteDefinition } from "solid-app-router";
import { Component } from "solid-js";
import { MetaProvider, TagDescription } from "./meta/index";

export interface IApp {
  tags?: TagDescription[];
}

export type SolidifyApp = Component<IApp>;

export const App: SolidifyApp = (p) => {
  return <MetaProvider tags={p.tags}>{p.children}</MetaProvider>;
};
