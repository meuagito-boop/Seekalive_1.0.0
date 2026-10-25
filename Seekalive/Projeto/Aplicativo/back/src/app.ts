import { randomUUID } from "node:crypto";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./modules";
import { logger } from "./common/logger";

const app: Express = express();

app.set("trust proxy", false);

app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((request, response, next) => {
  const requestId = String(request.id);
  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Recurso não encontrado.",
      requestId: response.locals.requestId ?? "unknown",
    },
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestError = error as { type?: string; status?: number; name?: string; code?: string };
  const status = requestError.type === "entity.too.large"
    ? 413
    : requestError.type === "entity.parse.failed"
      ? 400
      : requestError.status && requestError.status >= 400 && requestError.status < 500
        ? requestError.status
        : 500;
  logger.error({ errorName: requestError.name ?? "Error", errorCode: requestError.code }, "API request failed");
  response.status(status).json({
    error: {
      code: status === 400 ? "INVALID_REQUEST" : status === 413 ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR",
      message: status === 500 ? "Não foi possível concluir a solicitação." : "Solicitação inválida.",
      requestId: response.locals.requestId ?? "unknown",
    },
  });
});

export default app;
