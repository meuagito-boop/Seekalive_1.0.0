import { Router, type IRouter } from "express";
import confirmEmailVerificationRouter from "./email-verification/confirmEmailVerificationRoute";
import requestEmailVerificationRouter from "./email-verification/requestEmailVerificationRoute";

const router: IRouter = Router();

router.use(requestEmailVerificationRouter);
router.use(confirmEmailVerificationRouter);

export default router;
