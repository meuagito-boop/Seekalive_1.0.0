import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/readyz", async (_request, response) => {
  try {
    const readinessQuery = { text: "SELECT 1", query_timeout: 1_500 };
    await pool.query(readinessQuery);
    response.json({ status: "ready" });
  } catch {
    response.status(503).json({ status: "not_ready" });
  }
});

export default router;
