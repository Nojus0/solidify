import { useParams } from "solid-app-router";
import { Component, createMemo, createResource } from "solid-js";
import { isServer, NoHydration } from "solid-js/web";
import { Title, props, setProps } from "solidify-utils";
const Id: Component = (p) => {
  const d = props();

  return (
    <>
      <Title>Profile {d.name}</Title>
      <div>
        <h1>{d.props.name}</h1>
      </div>
    </>
  );
};

export default function () {
  const d = props();
  const params = useParams();

  if (!d) {
    const [data] = createResource(async () => {
      const res = await fetch(`/profile/nest/${params.id}?data=true`);
      return res.json();
    });

    return createMemo(() => {
      const re = data();

      if (re) {
        setProps(re);
        return <Id />;
      }
    });
  } else {
    return <Id />;
  }
}

export var getServerProps = isServer
  ? async () => {
      const parmas = useParams();
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/1`);
      const a = await res.json();
      return {
        props: a,
        nice: 1,
      };
    }
  : null;
