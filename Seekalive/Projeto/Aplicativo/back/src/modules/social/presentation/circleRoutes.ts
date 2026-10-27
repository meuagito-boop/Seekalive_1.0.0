import { Router, type IRouter } from "express";
import { circleAccountViews } from "../composition/relationshipListServices";
import { activeAccountId, pageResult, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

router.get("/circles", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const items = await circleAccountViews(actorId, page);
  response.json(pageResult(items, page.limit, page.offset));
});

export default router;
