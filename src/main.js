import App from "./App.svelte";
import "./main.css";

import { akitaDevtools, persistState } from '@datorama/akita';

akitaDevtools();
persistState();

const app = new App({
	target: document.body,
	props: {
		name: "world"
	}
});

export default app;