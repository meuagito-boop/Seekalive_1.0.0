import { Router, type IRouter } from "express";
import logoutRouter from "./sessions/logoutRoute";
import revokeOtherSessionsRouter from "./sessions/revokeOtherSessionsRoute";
import revokeSessionRouter from "./sessions/revokeSessionRoute";
import sessionListRouter from "./sessions/sessionListRoute";
import sessionStatusRouter from "./sessions/sessionStatusRoute";

const router: IRouter = Router();

router.use(sessionStatusRouter);
router.use(sessionListRouter);
router.use(revokeOtherSessionsRouter);
router.use(revokeSessionRouter);
router.use(logoutRouter);

export default router;
