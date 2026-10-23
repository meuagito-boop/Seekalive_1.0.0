import { Router, type IRouter } from "express";
import authRouter from "./auth/presentation/routes";
import healthRouter from "./health/presentation/routes";
import onboardingRouter from "./onboarding/presentation/routes";
import accountsRouter from "./profiles/presentation/routes";
import relationsRouter from "./social/presentation/routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);

export default router;
