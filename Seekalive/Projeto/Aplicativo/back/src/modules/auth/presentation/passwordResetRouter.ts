import { Router, type IRouter } from "express";
import confirmPasswordResetRouter from "./password-reset/confirmPasswordResetRoute";
import requestPasswordResetRouter from "./password-reset/requestPasswordResetRoute";

const router: IRouter = Router();

router.use(requestPasswordResetRouter);
router.use(confirmPasswordResetRouter);

export default router;
