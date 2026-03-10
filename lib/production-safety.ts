export function isProductionDestructiveOperationBlocked() {
  return process.env.NODE_ENV === "production";
}

export function assertProductionDestructiveOperationAllowed(operation: string) {
  if (!isProductionDestructiveOperationBlocked()) return;

  console.error(`[production-safety] Blocked destructive operation in production: ${operation}`);
  throw new Error(`Destructive operation blocked in production: ${operation}`);
}
