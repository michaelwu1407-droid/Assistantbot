export function getDemoCallErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "");
}

export function isDemoCallValidationMessage(message: string): boolean {
  return /phone number required|valid international number/i.test(message);
}

export function isDemoCallValidationError(error: unknown): boolean {
  return isDemoCallValidationMessage(getDemoCallErrorMessage(error));
}

export function getDemoCallUserMessage(error: unknown): string {
  const message = getDemoCallErrorMessage(error);
  if (isDemoCallValidationMessage(message)) {
    return message;
  }

  return "Could not reach voice service. Please try again shortly - we have your details and will call you back.";
}
