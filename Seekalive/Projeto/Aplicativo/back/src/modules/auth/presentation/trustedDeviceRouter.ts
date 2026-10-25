import { Router, type IRouter } from "express";
import listTrustedDevicesRouter from "./devices/listTrustedDevicesRoute";
import revokeOtherTrustedDevicesRouter from "./devices/revokeOtherTrustedDevicesRoute";
import revokeTrustedDeviceRouter from "./devices/revokeTrustedDeviceRoute";

const router: IRouter = Router();

router.use(listTrustedDevicesRouter);
router.use(revokeOtherTrustedDevicesRouter);
router.use(revokeTrustedDeviceRouter);

export default router;
