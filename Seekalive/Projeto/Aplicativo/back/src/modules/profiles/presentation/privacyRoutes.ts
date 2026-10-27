import { Router, type IRouter } from "express";
import { privacyWriteSchema } from "@workspace/api-zod";
import { sendApiValidationError } from "../../../common/apiErrors";
import { requireCsrf } from "../../../security/session";
import {
  getPrivacySettings,
  updatePrivacySettings,
} from "../application/privacySettings";
import { activeAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

router.get("/accounts/me/privacy", async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const settings = await getPrivacySettings(accountId);
  if (!settings) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
    return;
  }
  response.json(settings);
});

router.put("/accounts/me/privacy", requireCsrf, async (request, response) => {
  const accountId = await activeAccountId(request, response);
  if (!accountId) return;
  const parsed = privacyWriteSchema.safeParse(request.body);
  if (!parsed.success) {
    sendApiValidationError(response, parsed.error.issues, "Confira as opções de privacidade.");
    return;
  }
  const settings = await updatePrivacySettings(accountId, parsed.data);
  if (!settings) {
    sendError(response, 409, "VERSION_CONFLICT", "As configurações mudaram. Atualize a página e tente novamente.");
    return;
  }
  response.json(settings);
});

export default router;
