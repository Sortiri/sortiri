/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_askSortiriAgent from "../agents/askSortiriAgent.js";
import type * as agents_insightAgent from "../agents/insightAgent.js";
import type * as apiKeys from "../apiKeys.js";
import type * as artifacts from "../artifacts.js";
import type * as ask from "../ask.js";
import type * as cliRun from "../cliRun.js";
import type * as cliSetup from "../cliSetup.js";
import type * as devSeed from "../devSeed.js";
import type * as entities from "../entities.js";
import type * as eventLinks from "../eventLinks.js";
import type * as events from "../events.js";
import type * as home from "../home.js";
import type * as ingest from "../ingest.js";
import type * as insights from "../insights.js";
import type * as integrations_github from "../integrations/github.js";
import type * as lib_apiKeysLib from "../lib/apiKeysLib.js";
import type * as lib_artifactMutations from "../lib/artifactMutations.js";
import type * as lib_artifactsLib from "../lib/artifactsLib.js";
import type * as lib_askContext from "../lib/askContext.js";
import type * as lib_askSessionsLib from "../lib/askSessionsLib.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_cliSetupLib from "../lib/cliSetupLib.js";
import type * as lib_entitiesLib from "../lib/entitiesLib.js";
import type * as lib_eventDisplay from "../lib/eventDisplay.js";
import type * as lib_eventLinksLib from "../lib/eventLinksLib.js";
import type * as lib_eventTypes from "../lib/eventTypes.js";
import type * as lib_eventsLib from "../lib/eventsLib.js";
import type * as lib_githubWebhookSecretsLib from "../lib/githubWebhookSecretsLib.js";
import type * as lib_homePulse from "../lib/homePulse.js";
import type * as lib_ingestAuth from "../lib/ingestAuth.js";
import type * as lib_insightData from "../lib/insightData.js";
import type * as lib_insightOverview from "../lib/insightOverview.js";
import type * as lib_insightRules from "../lib/insightRules.js";
import type * as lib_insightRunsLib from "../lib/insightRunsLib.js";
import type * as lib_insightWindow from "../lib/insightWindow.js";
import type * as lib_linkRules from "../lib/linkRules.js";
import type * as lib_onboardingDoc from "../lib/onboardingDoc.js";
import type * as lib_pinnedReplaysLib from "../lib/pinnedReplaysLib.js";
import type * as lib_projectPulse from "../lib/projectPulse.js";
import type * as lib_projectsLib from "../lib/projectsLib.js";
import type * as lib_savedViewEvents from "../lib/savedViewEvents.js";
import type * as lib_savedViewsLib from "../lib/savedViewsLib.js";
import type * as lib_search from "../lib/search.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_viewFilters from "../lib/viewFilters.js";
import type * as lib_viewTemplates from "../lib/viewTemplates.js";
import type * as lib_workspaceMembersLib from "../lib/workspaceMembersLib.js";
import type * as lib_workspacesLib from "../lib/workspacesLib.js";
import type * as lib_workstreamMutations from "../lib/workstreamMutations.js";
import type * as lib_workstreamsLib from "../lib/workstreamsLib.js";
import type * as onboarding from "../onboarding.js";
import type * as pinnedReplays from "../pinnedReplays.js";
import type * as projects from "../projects.js";
import type * as savedViews from "../savedViews.js";
import type * as sources from "../sources.js";
import type * as testSeed from "../testSeed.js";
import type * as workspaceMembers from "../workspaceMembers.js";
import type * as workspaces from "../workspaces.js";
import type * as workstreams from "../workstreams.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/askSortiriAgent": typeof agents_askSortiriAgent;
  "agents/insightAgent": typeof agents_insightAgent;
  apiKeys: typeof apiKeys;
  artifacts: typeof artifacts;
  ask: typeof ask;
  cliRun: typeof cliRun;
  cliSetup: typeof cliSetup;
  devSeed: typeof devSeed;
  entities: typeof entities;
  eventLinks: typeof eventLinks;
  events: typeof events;
  home: typeof home;
  ingest: typeof ingest;
  insights: typeof insights;
  "integrations/github": typeof integrations_github;
  "lib/apiKeysLib": typeof lib_apiKeysLib;
  "lib/artifactMutations": typeof lib_artifactMutations;
  "lib/artifactsLib": typeof lib_artifactsLib;
  "lib/askContext": typeof lib_askContext;
  "lib/askSessionsLib": typeof lib_askSessionsLib;
  "lib/auth": typeof lib_auth;
  "lib/authz": typeof lib_authz;
  "lib/cliSetupLib": typeof lib_cliSetupLib;
  "lib/entitiesLib": typeof lib_entitiesLib;
  "lib/eventDisplay": typeof lib_eventDisplay;
  "lib/eventLinksLib": typeof lib_eventLinksLib;
  "lib/eventTypes": typeof lib_eventTypes;
  "lib/eventsLib": typeof lib_eventsLib;
  "lib/githubWebhookSecretsLib": typeof lib_githubWebhookSecretsLib;
  "lib/homePulse": typeof lib_homePulse;
  "lib/ingestAuth": typeof lib_ingestAuth;
  "lib/insightData": typeof lib_insightData;
  "lib/insightOverview": typeof lib_insightOverview;
  "lib/insightRules": typeof lib_insightRules;
  "lib/insightRunsLib": typeof lib_insightRunsLib;
  "lib/insightWindow": typeof lib_insightWindow;
  "lib/linkRules": typeof lib_linkRules;
  "lib/onboardingDoc": typeof lib_onboardingDoc;
  "lib/pinnedReplaysLib": typeof lib_pinnedReplaysLib;
  "lib/projectPulse": typeof lib_projectPulse;
  "lib/projectsLib": typeof lib_projectsLib;
  "lib/savedViewEvents": typeof lib_savedViewEvents;
  "lib/savedViewsLib": typeof lib_savedViewsLib;
  "lib/search": typeof lib_search;
  "lib/validators": typeof lib_validators;
  "lib/viewFilters": typeof lib_viewFilters;
  "lib/viewTemplates": typeof lib_viewTemplates;
  "lib/workspaceMembersLib": typeof lib_workspaceMembersLib;
  "lib/workspacesLib": typeof lib_workspacesLib;
  "lib/workstreamMutations": typeof lib_workstreamMutations;
  "lib/workstreamsLib": typeof lib_workstreamsLib;
  onboarding: typeof onboarding;
  pinnedReplays: typeof pinnedReplays;
  projects: typeof projects;
  savedViews: typeof savedViews;
  sources: typeof sources;
  testSeed: typeof testSeed;
  workspaceMembers: typeof workspaceMembers;
  workspaces: typeof workspaces;
  workstreams: typeof workstreams;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
