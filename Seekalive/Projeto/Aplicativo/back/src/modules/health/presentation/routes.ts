import { Router, type IRouter } from "express";
import livenessRouter from "./livenessRoutes";
import readinessRouter from "./readinessRoutes";

const router: IRouter = Router();

router.use(livenessRouter);
router.use(readinessRouter);

export default router;
