import { Router, type IRouter } from "express";
import confirmPasswordUpdateRouter from "./password-update/confirmPasswordUpdateRoute";
import requestPasswordUpdateRouter from "./password-update/requestPasswordUpdateRoute";

const router: IRouter = Router();

router.use(requestPasswordUpdateRouter);
router.use(confirmPasswordUpdateRouter);

export default router;
