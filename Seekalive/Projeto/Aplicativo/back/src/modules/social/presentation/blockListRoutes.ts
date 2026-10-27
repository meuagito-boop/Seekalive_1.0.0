import { Router, type IRouter } from "express";
import { blockedAccountViews } from "../composition/relationshipListServices";
import { activeAccountId } from "./routeSupport";

const router: IRouter = Router();

router.get("/blocks", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const items = await blockedAccountViews(actorId);
  response.json({ items, nextCursor: null });
});

export default router;
