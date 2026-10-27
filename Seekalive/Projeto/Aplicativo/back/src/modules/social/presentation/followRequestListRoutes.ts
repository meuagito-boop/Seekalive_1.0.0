import { Router, type IRouter } from "express";
import { incomingFollowRequestViews } from "../application/relationshipListQueries";
import { activeAccountId, pageResult, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

router.get("/follow-requests", async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const result = await incomingFollowRequestViews(actorId, page);
  response.json(pageResult(result.items, page.limit, page.offset, result.hasMore));
});

export default router;
