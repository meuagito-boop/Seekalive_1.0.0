import { Router, type IRouter } from "express";
import articleWriteRouter from "./articleWriteRoutes";
import postReadRouter from "./postReadRoutes";
import postWriteRouter from "./postWriteRoutes";
import profileContentRouter from "./profileContentRoutes";

const router: IRouter = Router();

router.use(articleWriteRouter);
router.use(postReadRouter);
router.use(postWriteRouter);
router.use(profileContentRouter);

export default router;
