export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return
  }

  await import("./sentry.server.config")

  if (process.env.NODE_ENV !== "production") {
    return
  }

  try {
    const { runStartupEnvironmentValidation } = await import("./lib/health-check")
    runStartupEnvironmentValidation()
  } catch (error) {
    console.warn("[startup] Health check issue:", error)

    if (!process.env.SENTRY_DSN) {
      return
    }

    try {
      const Sentry = await import("@sentry/nextjs")
      Sentry.captureException(error)
    } catch (sentryError) {
      console.warn("Failed to log health check error to Sentry:", sentryError)
    }
  }
}

export function onRequestError() {
  // Intentionally disabled for edge safety.
}
