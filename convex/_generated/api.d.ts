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
import type * as auditReports from "../auditReports.js";
import type * as auditSharing from "../auditSharing.js";
import type * as cliRun from "../cliRun.js";
import type * as cliSetup from "../cliSetup.js";
import type * as contextIngest from "../contextIngest.js";
import type * as contextPacks from "../contextPacks.js";
import type * as devSeed from "../devSeed.js";
import type * as entities from "../entities.js";
import type * as evalIngest from "../evalIngest.js";
import type * as evals from "../evals.js";
import type * as eventLinks from "../eventLinks.js";
import type * as events from "../events.js";
import type * as evidenceReview from "../evidenceReview.js";
import type * as home from "../home.js";
import type * as impactAnalyses from "../impactAnalyses.js";
import type * as ingest from "../ingest.js";
import type * as insights from "../insights.js";
import type * as integrations_github from "../integrations/github.js";
import type * as integrations_health from "../integrations/health.js";
import type * as integrations_migrate from "../integrations/migrate.js";
import type * as integrations_posthog from "../integrations/posthog.js";
import type * as integrations_shared from "../integrations/shared.js";
import type * as integrations_stripe from "../integrations/stripe.js";
import type * as intelligenceHub from "../intelligenceHub.js";
import type * as lessons from "../lessons.js";
import type * as lib_apiKeysLib from "../lib/apiKeysLib.js";
import type * as lib_artifactMutations from "../lib/artifactMutations.js";
import type * as lib_artifactsLib from "../lib/artifactsLib.js";
import type * as lib_askContext from "../lib/askContext.js";
import type * as lib_askSessionsLib from "../lib/askSessionsLib.js";
import type * as lib_auditExportLib from "../lib/auditExportLib.js";
import type * as lib_auditReportAccessLib from "../lib/auditReportAccessLib.js";
import type * as lib_auditReportsLib from "../lib/auditReportsLib.js";
import type * as lib_auditShareLib from "../lib/auditShareLib.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_cliSetupLib from "../lib/cliSetupLib.js";
import type * as lib_contextPackFormat from "../lib/contextPackFormat.js";
import type * as lib_contextPackGeneration from "../lib/contextPackGeneration.js";
import type * as lib_contextPackLib from "../lib/contextPackLib.js";
import type * as lib_contextRelevance from "../lib/contextRelevance.js";
import type * as lib_entitiesLib from "../lib/entitiesLib.js";
import type * as lib_evalGeneration from "../lib/evalGeneration.js";
import type * as lib_evalLib from "../lib/evalLib.js";
import type * as lib_evalRemediation from "../lib/evalRemediation.js";
import type * as lib_evalRunnerLib from "../lib/evalRunnerLib.js";
import type * as lib_eventDisplay from "../lib/eventDisplay.js";
import type * as lib_eventLinksLib from "../lib/eventLinksLib.js";
import type * as lib_eventTypes from "../lib/eventTypes.js";
import type * as lib_eventsLib from "../lib/eventsLib.js";
import type * as lib_evidenceInsight from "../lib/evidenceInsight.js";
import type * as lib_failurePatterns from "../lib/failurePatterns.js";
import type * as lib_githubWebhookSecretsLib from "../lib/githubWebhookSecretsLib.js";
import type * as lib_homePulse from "../lib/homePulse.js";
import type * as lib_impactAnalysesLib from "../lib/impactAnalysesLib.js";
import type * as lib_impactData from "../lib/impactData.js";
import type * as lib_impactFindings from "../lib/impactFindings.js";
import type * as lib_impactMetrics from "../lib/impactMetrics.js";
import type * as lib_impactSummary from "../lib/impactSummary.js";
import type * as lib_impactWindows from "../lib/impactWindows.js";
import type * as lib_ingestAuth from "../lib/ingestAuth.js";
import type * as lib_insightData from "../lib/insightData.js";
import type * as lib_insightOverview from "../lib/insightOverview.js";
import type * as lib_insightRules from "../lib/insightRules.js";
import type * as lib_insightRunsLib from "../lib/insightRunsLib.js";
import type * as lib_insightWindow from "../lib/insightWindow.js";
import type * as lib_integrationConnectionsLib from "../lib/integrationConnectionsLib.js";
import type * as lib_integrationDeliveriesLib from "../lib/integrationDeliveriesLib.js";
import type * as lib_integrationEventsLib from "../lib/integrationEventsLib.js";
import type * as lib_integrationSecretsLib from "../lib/integrationSecretsLib.js";
import type * as lib_integrationSharedLib from "../lib/integrationSharedLib.js";
import type * as lib_intelligenceHubLib from "../lib/intelligenceHubLib.js";
import type * as lib_knownFailures from "../lib/knownFailures.js";
import type * as lib_lessonCopy from "../lib/lessonCopy.js";
import type * as lib_lessonGeneration from "../lib/lessonGeneration.js";
import type * as lib_lessonsLib from "../lib/lessonsLib.js";
import type * as lib_linkRules from "../lib/linkRules.js";
import type * as lib_onboardingDoc from "../lib/onboardingDoc.js";
import type * as lib_pinnedReplaysLib from "../lib/pinnedReplaysLib.js";
import type * as lib_playbookGeneration from "../lib/playbookGeneration.js";
import type * as lib_playbookTemplates from "../lib/playbookTemplates.js";
import type * as lib_playbooksLib from "../lib/playbooksLib.js";
import type * as lib_posthogProjectLink from "../lib/posthogProjectLink.js";
import type * as lib_posthogSecretsLib from "../lib/posthogSecretsLib.js";
import type * as lib_projectAccessLib from "../lib/projectAccessLib.js";
import type * as lib_projectPulse from "../lib/projectPulse.js";
import type * as lib_projectsLib from "../lib/projectsLib.js";
import type * as lib_recommendationCopy from "../lib/recommendationCopy.js";
import type * as lib_recommendationEngine from "../lib/recommendationEngine.js";
import type * as lib_recommendationLib from "../lib/recommendationLib.js";
import type * as lib_recommendationPriority from "../lib/recommendationPriority.js";
import type * as lib_savedViewEvents from "../lib/savedViewEvents.js";
import type * as lib_savedViewsLib from "../lib/savedViewsLib.js";
import type * as lib_search from "../lib/search.js";
import type * as lib_secretsLib from "../lib/secretsLib.js";
import type * as lib_sensitiveContent from "../lib/sensitiveContent.js";
import type * as lib_validationRequirements from "../lib/validationRequirements.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_viewFilters from "../lib/viewFilters.js";
import type * as lib_viewTemplates from "../lib/viewTemplates.js";
import type * as lib_workspaceMembersLib from "../lib/workspaceMembersLib.js";
import type * as lib_workspacesLib from "../lib/workspacesLib.js";
import type * as lib_workstreamMutations from "../lib/workstreamMutations.js";
import type * as lib_workstreamsLib from "../lib/workstreamsLib.js";
import type * as onboarding from "../onboarding.js";
import type * as pinnedReplays from "../pinnedReplays.js";
import type * as playbooks from "../playbooks.js";
import type * as projectAccess from "../projectAccess.js";
import type * as projects from "../projects.js";
import type * as recommendationIngest from "../recommendationIngest.js";
import type * as recommendations from "../recommendations.js";
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
  auditReports: typeof auditReports;
  auditSharing: typeof auditSharing;
  cliRun: typeof cliRun;
  cliSetup: typeof cliSetup;
  contextIngest: typeof contextIngest;
  contextPacks: typeof contextPacks;
  devSeed: typeof devSeed;
  entities: typeof entities;
  evalIngest: typeof evalIngest;
  evals: typeof evals;
  eventLinks: typeof eventLinks;
  events: typeof events;
  evidenceReview: typeof evidenceReview;
  home: typeof home;
  impactAnalyses: typeof impactAnalyses;
  ingest: typeof ingest;
  insights: typeof insights;
  "integrations/github": typeof integrations_github;
  "integrations/health": typeof integrations_health;
  "integrations/migrate": typeof integrations_migrate;
  "integrations/posthog": typeof integrations_posthog;
  "integrations/shared": typeof integrations_shared;
  "integrations/stripe": typeof integrations_stripe;
  intelligenceHub: typeof intelligenceHub;
  lessons: typeof lessons;
  "lib/apiKeysLib": typeof lib_apiKeysLib;
  "lib/artifactMutations": typeof lib_artifactMutations;
  "lib/artifactsLib": typeof lib_artifactsLib;
  "lib/askContext": typeof lib_askContext;
  "lib/askSessionsLib": typeof lib_askSessionsLib;
  "lib/auditExportLib": typeof lib_auditExportLib;
  "lib/auditReportAccessLib": typeof lib_auditReportAccessLib;
  "lib/auditReportsLib": typeof lib_auditReportsLib;
  "lib/auditShareLib": typeof lib_auditShareLib;
  "lib/auth": typeof lib_auth;
  "lib/authz": typeof lib_authz;
  "lib/cliSetupLib": typeof lib_cliSetupLib;
  "lib/contextPackFormat": typeof lib_contextPackFormat;
  "lib/contextPackGeneration": typeof lib_contextPackGeneration;
  "lib/contextPackLib": typeof lib_contextPackLib;
  "lib/contextRelevance": typeof lib_contextRelevance;
  "lib/entitiesLib": typeof lib_entitiesLib;
  "lib/evalGeneration": typeof lib_evalGeneration;
  "lib/evalLib": typeof lib_evalLib;
  "lib/evalRemediation": typeof lib_evalRemediation;
  "lib/evalRunnerLib": typeof lib_evalRunnerLib;
  "lib/eventDisplay": typeof lib_eventDisplay;
  "lib/eventLinksLib": typeof lib_eventLinksLib;
  "lib/eventTypes": typeof lib_eventTypes;
  "lib/eventsLib": typeof lib_eventsLib;
  "lib/evidenceInsight": typeof lib_evidenceInsight;
  "lib/failurePatterns": typeof lib_failurePatterns;
  "lib/githubWebhookSecretsLib": typeof lib_githubWebhookSecretsLib;
  "lib/homePulse": typeof lib_homePulse;
  "lib/impactAnalysesLib": typeof lib_impactAnalysesLib;
  "lib/impactData": typeof lib_impactData;
  "lib/impactFindings": typeof lib_impactFindings;
  "lib/impactMetrics": typeof lib_impactMetrics;
  "lib/impactSummary": typeof lib_impactSummary;
  "lib/impactWindows": typeof lib_impactWindows;
  "lib/ingestAuth": typeof lib_ingestAuth;
  "lib/insightData": typeof lib_insightData;
  "lib/insightOverview": typeof lib_insightOverview;
  "lib/insightRules": typeof lib_insightRules;
  "lib/insightRunsLib": typeof lib_insightRunsLib;
  "lib/insightWindow": typeof lib_insightWindow;
  "lib/integrationConnectionsLib": typeof lib_integrationConnectionsLib;
  "lib/integrationDeliveriesLib": typeof lib_integrationDeliveriesLib;
  "lib/integrationEventsLib": typeof lib_integrationEventsLib;
  "lib/integrationSecretsLib": typeof lib_integrationSecretsLib;
  "lib/integrationSharedLib": typeof lib_integrationSharedLib;
  "lib/intelligenceHubLib": typeof lib_intelligenceHubLib;
  "lib/knownFailures": typeof lib_knownFailures;
  "lib/lessonCopy": typeof lib_lessonCopy;
  "lib/lessonGeneration": typeof lib_lessonGeneration;
  "lib/lessonsLib": typeof lib_lessonsLib;
  "lib/linkRules": typeof lib_linkRules;
  "lib/onboardingDoc": typeof lib_onboardingDoc;
  "lib/pinnedReplaysLib": typeof lib_pinnedReplaysLib;
  "lib/playbookGeneration": typeof lib_playbookGeneration;
  "lib/playbookTemplates": typeof lib_playbookTemplates;
  "lib/playbooksLib": typeof lib_playbooksLib;
  "lib/posthogProjectLink": typeof lib_posthogProjectLink;
  "lib/posthogSecretsLib": typeof lib_posthogSecretsLib;
  "lib/projectAccessLib": typeof lib_projectAccessLib;
  "lib/projectPulse": typeof lib_projectPulse;
  "lib/projectsLib": typeof lib_projectsLib;
  "lib/recommendationCopy": typeof lib_recommendationCopy;
  "lib/recommendationEngine": typeof lib_recommendationEngine;
  "lib/recommendationLib": typeof lib_recommendationLib;
  "lib/recommendationPriority": typeof lib_recommendationPriority;
  "lib/savedViewEvents": typeof lib_savedViewEvents;
  "lib/savedViewsLib": typeof lib_savedViewsLib;
  "lib/search": typeof lib_search;
  "lib/secretsLib": typeof lib_secretsLib;
  "lib/sensitiveContent": typeof lib_sensitiveContent;
  "lib/validationRequirements": typeof lib_validationRequirements;
  "lib/validators": typeof lib_validators;
  "lib/viewFilters": typeof lib_viewFilters;
  "lib/viewTemplates": typeof lib_viewTemplates;
  "lib/workspaceMembersLib": typeof lib_workspaceMembersLib;
  "lib/workspacesLib": typeof lib_workspacesLib;
  "lib/workstreamMutations": typeof lib_workstreamMutations;
  "lib/workstreamsLib": typeof lib_workstreamsLib;
  onboarding: typeof onboarding;
  pinnedReplays: typeof pinnedReplays;
  playbooks: typeof playbooks;
  projectAccess: typeof projectAccess;
  projects: typeof projects;
  recommendationIngest: typeof recommendationIngest;
  recommendations: typeof recommendations;
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
