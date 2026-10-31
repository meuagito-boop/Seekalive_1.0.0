import { Router, type IRouter } from "express";
import authRouter from "./auth/presentation/routes";
import { checkDatabaseReadiness } from "./health/infrastructure/databaseReadiness";
import { createHealthRouter } from "./health/presentation/routes";
import onboardingRouter from "./onboarding/composition/router";
import accountsRouter from "./profiles/composition/router";
import relationsRouter from "./social/composition/router";
import feedRouter, { readFeedPost } from "./feed/composition/router";
import { createMediaRouter } from "./media/composition/router";

const router: IRouter = Router();

router.use(createHealthRouter(checkDatabaseReadiness));
router.use("/v1/auth", authRouter);
router.use("/v1/onboarding", onboardingRouter);
router.use("/v1", accountsRouter);
router.use("/v1/social", relationsRouter);
router.use("/v1/social", createMediaRouter(readFeedPost));
router.use("/v1/social", feedRouter);

export default router;
