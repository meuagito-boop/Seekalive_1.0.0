import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);
app.use(
  pinoHttp({
    logger,
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
app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

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
    },
  });
});

export default app;
