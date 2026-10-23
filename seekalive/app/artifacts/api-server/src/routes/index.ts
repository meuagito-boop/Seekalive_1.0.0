import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import onboardingRouter from "./onboarding";
import accountsRouter from "./accounts";
import relationsRouter from "./relations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);

export default router;
