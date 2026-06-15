/**
 * Shared integration primitives — re-exported for GitHub, Stripe, and future sources.
 */
export {
  clearIntegrationConnectionError,
  ensureIntegrationConnection,
  findDeliveryBySourceId,
  getActiveIntegrationSecret,
  getActiveIntegrationSecretForServer,
  getActiveIntegrationSecretMetadata,
  getConnectionByWorkspaceSource,
  getIntegrationConnection,
  isDuplicateDelivery,
  markDeliveryFailed,
  markDeliveryProcessed,
  markLegacySecretPathUsed,
  recordIntegrationConnectionEvent,
  recordIntegrationDelivery,
  recordIntegrationSystemEvent,
  revokeActiveIntegrationSecrets,
  revokeIntegrationSecret,
  revokeIntegrationSecretDoc,
  saveEncryptedIntegrationSecret,
  setIntegrationConnectionError,
  setIntegrationConnectionStatus,
  updateIntegrationStatus,
  upsertIntegrationConnection,
  type IntegrationConnectionMetadata,
} from "../lib/integrationSharedLib";
