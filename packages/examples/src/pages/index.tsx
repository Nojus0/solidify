import { Link } from "solid-app-router";
import { Component } from "solid-js";

const Index: Component = () => {
  return (
    <div>
      Main Page
      <br />
      <Link href="/about">Goto About</Link>
    </div>
  );
};

export default Index;
