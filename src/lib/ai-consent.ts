export const AI_PROCESSING_CONSENT_VERSION = "ai-processing-v1";

export function hasCurrentAiProcessingConsent(body: Record<string, unknown>) {
  return (
    body.aiProcessingConsentAccepted === true &&
    body.aiProcessingConsentVersion === AI_PROCESSING_CONSENT_VERSION
  );
}
