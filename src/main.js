import App from "./App.svelte";
import "./main.css";

const app = new App({
  target: document.getElementById("app"),
  props: {
    name: "world",
  },
});

export default app;
