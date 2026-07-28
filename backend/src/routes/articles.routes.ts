import { Router } from "express";

import {
  getArticleCountsHandler,
  getArticlesHandler,
} from "../controllers/articles.controller.js";

const router = Router();

router.get("/", getArticlesHandler);
router.get("/aggregate", getArticleCountsHandler);

export default router;