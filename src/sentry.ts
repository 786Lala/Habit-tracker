// src/sentry.ts
import * as Sentry from '@sentry/react'
import { Integrations } from '@sentry/tracing'

export function initSentry(dsn?: string) {
  if (!dsn) return
  Sentry.init({
    dsn,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 0.05,
    release: `habit-journal@${process.env.npm_package_version || 'dev'}`
  })
}
