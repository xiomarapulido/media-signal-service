import express from "express";

import articlesRouter from "./routes/articles.routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
  });
});

app.use("/articles", articlesRouter);

export default app;