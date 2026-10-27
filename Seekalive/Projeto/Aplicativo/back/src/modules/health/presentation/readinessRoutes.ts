import { Router, type IRouter } from "express";

export function createReadinessRouter(checkDatabase: () => Promise<void>): IRouter {
  const router: IRouter = Router();

  router.get("/readyz", async (_request, response) => {
    try {
      await checkDatabase();
      response.json({ status: "ready" });
    } catch {
      response.status(503).json({ status: "not_ready" });
    }
  });

  return router;
}
