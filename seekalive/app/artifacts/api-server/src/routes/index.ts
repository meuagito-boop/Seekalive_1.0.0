import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);

export default router;
