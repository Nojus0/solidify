import { Link } from "solid-app-router";
import { Component } from "solid-js";
import { Title } from "solidify-utils";

const Index: Component = () => {
  return (
    <div>
      Main Page
      <Title>Main page</Title>
      <br />
      <Link href="/about">Goto About</Link>
      <br />
      <Link href="/profile/1">Go to Profile 1</Link>
      <br />
      <Link href="/profile/nest/1">Go to nest</Link>
    </div>
  );
};

export default Index;
