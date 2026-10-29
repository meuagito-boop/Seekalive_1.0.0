import { Router, type IRouter } from "express";
import accountSecurityRouter from "./accountSecurityRoutes";
import accountDeletionRouter from "./accountDeletionRoutes";
import csrfRouter from "./csrfRoutes";
import deviceVerificationRouter from "./deviceVerificationRoutes";
import emailVerificationRouter from "./emailVerificationRoutes";
import loginRouter from "./loginRoutes";
import passwordResetRouter from "./passwordResetRoutes";
import passwordUpdateRouter from "./passwordUpdateRoutes";
import registrationRouter from "./registrationRoutes";
import sessionRouter from "./sessionRoutes";
import trustedDeviceRouter from "./trustedDeviceRoutes";

const router: IRouter = Router();

router.use("/account", accountSecurityRouter);
router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

router.use("/account/deletion", accountDeletionRouter);
router.use(registrationRouter);
router.use(csrfRouter);
router.use(loginRouter);
router.use(deviceVerificationRouter);
router.use(passwordUpdateRouter);
router.use(passwordResetRouter);
router.use(emailVerificationRouter);
router.use(sessionRouter);
router.use(trustedDeviceRouter);

export default router;
