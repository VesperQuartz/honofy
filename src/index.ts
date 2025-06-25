import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import { auth } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { to } from "await-to-ts";
import { APIError } from "better-auth/api";
import { ContentfulStatusCode } from "hono/utils/http-status";
import log from "pino";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>().basePath("/api");

app.use(poweredBy());
app.use(logger());
app.use(secureHeaders());
app.use(requestId());
app.use(prettyJSON());
app.use(
  cors({
    origin: ["http://localhost:4000", "http://localhost:3002"],
    credentials: true,
  }),
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.on(["POST", "GET"], "/auth/**", (c) => auth.handler(c.req.raw));

app.post(
  "/auth/register",
  zValidator(
    "json",
    z.object({
      email: z.email(),
      password: z.string().min(6).max(64),
      username: z.string().min(3).max(64),
    }),
  ),
  async (c) => {
    const { email, password, username } = c.req.valid("json");
    const [error, response] = await to(
      auth.api.signUpEmail({
        body: {
          name: username,
          email,
          password,
        },
        asResponse: true,
      }),
    );
    if (error instanceof APIError) {
      console.log(error);
      return c.json(
        { message: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }
    return response;
  },
);

app.post(
  "/auth/login",
  zValidator(
    "json",
    z.object({
      email: z.email(),
      password: z.string().min(6).max(64),
    }),
  ),
  async (c) => {
    const { email, password } = c.req.valid("json");
    const [error, response] = await to(
      auth.api.signInEmail({
        body: {
          email,
          password,
        },
        asResponse: true,
      }),
    );
    if (error instanceof APIError) {
      return c.json(
        { message: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }
    return response;
  },
);

app.get(
  "/auth/verify-email",
  zValidator(
    "query",
    z.object({
      token: z.jwt(),
    }),
  ),
  async (c) => {
    const { token } = c.req.valid("query");
    const [error, response] = await to(
      auth.api.verifyEmail({
        query: {
          token,
          callbackURL: "/api/v1",
        },
        asResponse: true,
      }),
    );
    if (error instanceof APIError) {
      return c.json(
        { message: error.message },
        error.statusCode as ContentfulStatusCode,
      );
    }
    return response;
  },
);

app.get("/auth/session", async (c) => {
  const headers = c.req.raw.headers;
  const [error, response] = await to(
    auth.api.getSession({
      headers,
      asResponse: false,
    }),
  );
  if (error instanceof APIError) {
    return c.json(
      { message: error.message },
      error.statusCode as ContentfulStatusCode,
    );
  }
  return c.json(response, 200);
});

app.get("/v1", (c) => {
  log().error({ message: "Hello" }, "This is a message");
  return c.text("Hello Hono!");
});

export default app;
