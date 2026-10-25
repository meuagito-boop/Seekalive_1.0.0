import { Router, type IRouter } from "express";
import accountEmailChangeRouter from "./accountEmailChangeRoutes";
import accountPasswordChangeRouter from "./accountPasswordChangeRoutes";

const router: IRouter = Router();

router.use(accountEmailChangeRouter);
router.use(accountPasswordChangeRouter);

export default router;
