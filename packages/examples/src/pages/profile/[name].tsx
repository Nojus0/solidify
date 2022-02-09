import { useParams } from "solid-app-router";
import { Component } from "solid-js";
import { NoHydration } from "solid-js/web";
import { Title } from "solidify-utils";

const Name: Component = (p) => {
  const params = useParams();
  
  return (
    <>
      <Title>Profile {params.name}</Title>
      <div>
        <h1>Hello, my name is {params.name}</h1>
      </div>
    </>
  );
};

export default Name;
