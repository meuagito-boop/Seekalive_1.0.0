import { Router, type IRouter } from "express";
import { accountPatchSchema } from "@workspace/api-zod";
import { sendApiValidationError } from "../../../common/apiErrors";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { OwnerProfileLoader } from "../application/ownerProfile";
import type { OwnerProfileUpdater } from "../application/updateOwnerProfile";
import { activeAccountId, sendError } from "./routeSupport";

export function createOwnerProfileRouter(
  loadOwnerProfile: OwnerProfileLoader,
  updateOwnerProfile: OwnerProfileUpdater,
): IRouter {
  const router: IRouter = Router();

  router.get("/accounts/me", async (request, response) => {
    const accountId = await activeAccountId(request, response);
    if (!accountId) return;
    const ownerProfile = await loadOwnerProfile(accountId);
    if (!ownerProfile.ok) {
      sendError(
        response,
        ownerProfile.status,
        ownerProfile.code,
        ownerProfile.message,
      );
      return;
    }
    response.json(ownerProfile.data);
  });

  router.patch(
    "/accounts/me",
    createAuthRateLimit("account-profile-update", 30, 15 * 60 * 1000),
    requireCsrf,
    async (request, response) => {
      const accountId = await activeAccountId(request, response);
      if (!accountId) return;
      const parsed = accountPatchSchema.safeParse(request.body);
      if (!parsed.success) {
        sendApiValidationError(
          response,
          parsed.error.issues,
          "Confira os campos do perfil.",
        );
        return;
      }

      const result = await updateOwnerProfile(accountId, parsed.data);
      if (result.kind === "account_not_found") {
        sendError(response, 404, "ACCOUNT_NOT_FOUND", "Conta não encontrada.");
        return;
      }
      if (result.kind === "account_type_invalid") {
        sendError(
          response,
          500,
          "ACCOUNT_TYPE_INVALID",
          "Não foi possível identificar o tipo desta conta.",
        );
        return;
      }
      if (result.kind === "account_field_not_allowed") {
        sendError(
          response,
          400,
          "ACCOUNT_FIELD_NOT_ALLOWED",
          "Os campos enviados não correspondem ao tipo desta conta.",
        );
        return;
      }
      if (result.kind === "account_name_mismatch") {
        sendError(
          response,
          400,
          "ACCOUNT_NAME_MISMATCH",
          "O nome público deve corresponder ao nome e sobrenome.",
        );
        return;
      }
      if (result.kind === "name_change_cooldown") {
        sendError(
          response,
          409,
          "NAME_CHANGE_COOLDOWN",
          `Você poderá alterar o nome público novamente em ${result.availableAt.toISOString()}.`,
        );
        return;
      }
      if (result.kind === "username_change_cooldown") {
        sendError(
          response,
          409,
          "USERNAME_CHANGE_COOLDOWN",
          `Você poderá alterar o @ novamente em ${result.availableAt.toISOString()}.`,
        );
        return;
      }
      if (result.kind === "username_unavailable") {
        sendError(
          response,
          409,
          "USERNAME_UNAVAILABLE",
          "Esse nome de usuário não está disponível.",
        );
        return;
      }
      if (result.kind === "version_conflict") {
        sendError(
          response,
          409,
          "VERSION_CONFLICT",
          "O perfil mudou em outra solicitação. Atualize e tente novamente.",
        );
        return;
      }
      if (result.kind === "commercial_profile_missing") {
        sendError(
          response,
          409,
          "ACCOUNT_PROFILE_INCOMPLETE",
          "Os dados comerciais precisam ser revisados antes da edição.",
        );
        return;
      }

      const ownerProfile = await loadOwnerProfile(accountId);
      if (!ownerProfile.ok) {
        sendError(
          response,
          ownerProfile.status,
          ownerProfile.code,
          ownerProfile.message,
        );
        return;
      }
      response.json(ownerProfile.data);
    },
  );

  return router;
}
