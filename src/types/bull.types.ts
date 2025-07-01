// types/bull.types.ts
export type JobId = string | number;
export type TrackedError = Error & { context?: Record<string, unknown> };