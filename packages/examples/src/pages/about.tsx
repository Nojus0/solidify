import { Link } from "solid-app-router";
import { Component } from "solid-js";

const About: Component = () => {
  return (
    <div>
      About Page
      <br />
      <Link href="/">Goto Main</Link>
    </div>
  );
};

export default About;
