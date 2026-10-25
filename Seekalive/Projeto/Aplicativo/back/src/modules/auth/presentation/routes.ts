import { Router, type IRouter } from "express";
import { setAuthEmailDeliveryForTests } from "../infrastructure/emailDelivery";
import accountSecurityRouter from "./accountSecurityRoutes";
import csrfRouter from "./csrfRoutes";
import deviceVerificationRouter from "./deviceVerificationRouter";
import emailVerificationRouter from "./emailVerificationRouter";
import loginRouter from "./loginRoutes";
import passwordResetRouter from "./passwordResetRouter";
import passwordUpdateRouter from "./passwordUpdateRouter";
import registrationRouter from "./registrationRoutes";
import sessionRouter from "./sessionRouter";
import trustedDeviceRouter from "./trustedDeviceRouter";

const router: IRouter = Router();

router.use("/account", accountSecurityRouter);
router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

router.use(registrationRouter);
router.use(csrfRouter);
router.use(loginRouter);
router.use(deviceVerificationRouter);
router.use(passwordUpdateRouter);
router.use(passwordResetRouter);
router.use(emailVerificationRouter);
router.use(sessionRouter);
router.use(trustedDeviceRouter);

export { setAuthEmailDeliveryForTests };
export default router;
