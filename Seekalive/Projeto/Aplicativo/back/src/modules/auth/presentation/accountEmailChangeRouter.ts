import { Router, type IRouter } from "express";
import confirmCurrentEmailChangeRouter from "./email-change/confirmCurrentEmailChangeRoute";
import confirmNewEmailChangeRouter from "./email-change/confirmNewEmailChangeRoute";
import requestEmailChangeRouter from "./email-change/requestEmailChangeRoute";

const router: IRouter = Router();

router.use(requestEmailChangeRouter);
router.use(confirmCurrentEmailChangeRouter);
router.use(confirmNewEmailChangeRouter);

export default router;
