import { Router, type IRouter } from "express";
import articleReadRouter from "./articleReadRoutes";
import articleWriteRouter from "./articleWriteRoutes";
import postReadRouter from "./postReadRoutes";
import postCreateRouter from "./postCreateRoutes";
import postDeleteRouter from "./postDeleteRoutes";
import profileContentRouter from "./profileContentRoutes";

const router: IRouter = Router();

router.use(articleWriteRouter);
router.use(articleReadRouter);
router.use(postReadRouter);
router.use(postCreateRouter);
router.use(postDeleteRouter);
router.use(profileContentRouter);

export default router;
