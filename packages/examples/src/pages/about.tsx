import { Link } from "solid-app-router";
import { Component } from "solid-js";
import { Meta, Title } from "solidify-utils";

const About: Component = () => {
  return (
    <div>
      About Page
      <Title>About page</Title>
      <br />
      <Link href="/">Goto Main</Link>
    </div>
  );
};

export default About;
