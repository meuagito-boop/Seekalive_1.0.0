import { Router, type IRouter } from "express";
import accountAvailabilityRouter from "./accountAvailabilityRoutes";
import ownerProfileRouter from "./ownerProfileRoutes";
import privacyRouter from "./privacyRoutes";
import publicProfileRouter from "./publicProfileRoutes";

export {
  accountView,
  accountViewsByIds,
  findActiveAccountById,
} from "../application/accountViews";

const router: IRouter = Router();

router.use(accountAvailabilityRouter);
router.use(ownerProfileRouter);
router.use(privacyRouter);
router.use(publicProfileRouter);

export default router;
