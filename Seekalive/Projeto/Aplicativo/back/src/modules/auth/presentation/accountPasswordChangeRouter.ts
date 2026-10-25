import { Router, type IRouter } from "express";
import confirmPasswordChangeRouter from "./password-change/confirmPasswordChangeRoute";
import requestPasswordChangeRouter from "./password-change/requestPasswordChangeRoute";

const router: IRouter = Router();

router.use(requestPasswordChangeRouter);
router.use(confirmPasswordChangeRouter);

export default router;
