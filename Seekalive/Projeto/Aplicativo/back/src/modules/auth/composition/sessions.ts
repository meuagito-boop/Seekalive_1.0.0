import { createRotateSessionCsrfToken } from "../application/sessions/csrfSession";
import { createSessionManagement } from "../application/sessions/sessionManagement";
import { csrfSessionRepository } from "../infrastructure/csrfSessionRepository";
import { sessionManagementRepository } from "../infrastructure/sessionManagementRepository";

export const sessionOperations = createSessionManagement(
  sessionManagementRepository,
);

export const csrfSessionOperations = {
  rotateSessionCsrfToken: createRotateSessionCsrfToken(csrfSessionRepository),
};
