import { Router, type IRouter } from "express";
import confirmDeviceLoginRouter from "./device-verification/confirmDeviceLoginRoute";
import resendDeviceLoginCodeRouter from "./device-verification/resendDeviceLoginCodeRoute";

const router: IRouter = Router();

router.use(confirmDeviceLoginRouter);
router.use(resendDeviceLoginCodeRouter);

export default router;
