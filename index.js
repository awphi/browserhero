import { handler } from "./build/handler.js";
import express from "express";

const app = express();

// add a route that lives separately from the SvelteKit app
app.get("/health", (req, res) => {
  res.status(200).end("ok");
});

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

app.listen(3000, () => {
  console.log("listening on port 3000");
});
