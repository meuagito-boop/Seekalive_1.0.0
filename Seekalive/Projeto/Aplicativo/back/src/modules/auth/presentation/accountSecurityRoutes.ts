import { Router, type IRouter } from "express";
import accountEmailChangeRouter from "./accountEmailChangeRouter";
import accountPasswordChangeRouter from "./accountPasswordChangeRouter";

const router: IRouter = Router();

router.use(accountEmailChangeRouter);
router.use(accountPasswordChangeRouter);

export default router;
