import { Router, type IRouter } from "express";
import livenessRouter from "./livenessRoutes";
import { createReadinessRouter } from "./readinessRoutes";

export function createHealthRouter(checkDatabase: () => Promise<void>): IRouter {
  const router: IRouter = Router();

  router.use(livenessRouter);
  router.use(createReadinessRouter(checkDatabase));

  return router;
}
