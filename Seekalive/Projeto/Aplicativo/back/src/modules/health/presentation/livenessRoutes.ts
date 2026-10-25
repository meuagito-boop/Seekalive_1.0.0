import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_request, response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  response.json(data);
});

export default router;
