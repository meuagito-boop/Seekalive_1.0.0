import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/request-origin";
import { searchAccountViews } from "../application/relationshipListQueries";
import { activeAccountId, parsePage, sendError } from "./routeSupport";

const router: IRouter = Router();

router.get(
  "/accounts",
  createAuthRateLimit("social-account-search", 60, 60_000),
  async (request, response) => {
    const viewerId = await activeAccountId(request, response);
    if (!viewerId) return;

    const rawQuery = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const query = rawQuery.replace(/^@/, "");
    if (query.length < 2 || query.length > 80) {
      sendError(response, 400, "VALIDATION_ERROR", "Busque por pelo menos 2 caracteres.");
      return;
    }

    const page = parsePage(request);
    if (!page) {
      sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
      return;
    }

    response.json(await searchAccountViews(query, viewerId, page));
  },
);

export default router;
