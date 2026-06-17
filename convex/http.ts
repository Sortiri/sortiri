import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { jsonOk } from "./lib/httpResponse";
import {
  handleHealth,
  handleIngestEvents,
  handleIngestArtifacts,
  handleIngestWorkstreamStart,
  handleIngestWorkstreamFinish,
} from "./http/ingestHandlers";
import {
  handleGithubWebhook,
  handleStripeWebhook,
  handlePosthogWebhook,
  handleSlackWebhook,
  handleObservabilityWebhook,
} from "./http/webhookHandlers";
import { dispatchCliOrMcp } from "./http/cliDispatch";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => handleHealth(ctx, request)),
});

http.route({
  path: "/ingest/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleIngestEvents(ctx, request)),
});

http.route({
  path: "/ingest/artifacts",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleIngestArtifacts(ctx, request)),
});

http.route({
  path: "/ingest/workstreams/start",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleIngestWorkstreamStart(ctx, request)),
});

http.route({
  path: "/ingest/workstreams/finish",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleIngestWorkstreamFinish(ctx, request)),
});

http.route({
  path: "/webhooks/github",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleGithubWebhook(ctx, request)),
});

http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleStripeWebhook(ctx, request)),
});

http.route({
  path: "/webhooks/posthog",
  method: "POST",
  handler: httpAction(async (ctx, request) => handlePosthogWebhook(ctx, request)),
});

http.route({
  path: "/webhooks/slack",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleSlackWebhook(ctx, request)),
});

http.route({
  path: "/webhooks/observability",
  method: "POST",
  handler: httpAction(async (ctx, request) => handleObservabilityWebhook(ctx, request)),
});

http.route({
  pathPrefix: "/cli/",
  method: "GET",
  handler: httpAction(async (ctx, request) => dispatchCliOrMcp(ctx, request, "cli")),
});

http.route({
  pathPrefix: "/cli/",
  method: "POST",
  handler: httpAction(async (ctx, request) => dispatchCliOrMcp(ctx, request, "cli")),
});

http.route({
  path: "/cli/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => handleHealth(ctx, request)),
});

http.route({
  pathPrefix: "/mcp/",
  method: "GET",
  handler: httpAction(async (ctx, request) => dispatchCliOrMcp(ctx, request, "mcp")),
});

http.route({
  pathPrefix: "/mcp/",
  method: "POST",
  handler: httpAction(async (ctx, request) => dispatchCliOrMcp(ctx, request, "mcp")),
});

export default http;
