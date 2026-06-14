import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

function messageFromClerkError(error: {
  errors?: Array<{ longMessage?: string; message?: string }>;
  message?: string;
}) {
  const first = error.errors?.[0];
  return first?.longMessage ?? first?.message ?? error.message;
}

export function getClerkErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (isClerkAPIResponseError(error)) {
    return messageFromClerkError(error) ?? fallback;
  }

  if (error && typeof error === "object" && "errors" in error) {
    return (
      messageFromClerkError(
        error as {
          errors?: Array<{ longMessage?: string; message?: string }>;
          message?: string;
        },
      ) ?? fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
