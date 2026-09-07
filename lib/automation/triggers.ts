// Mirrors the `automation_rules.trigger` check constraint from 0001_core_schema.sql.
export const automationTriggers = [
  "registration_created",
  "payment_success",
  "before_webinar",
  "after_webinar",
  "no_show",
] as const;
export type AutomationTrigger = (typeof automationTriggers)[number];

/**
 * "registration_created" and "payment_success" are event-based and fire
 * synchronously at the moment they happen (see the submit route and the
 * Cashfree webhook) - there's no useful "polling window" for an event that
 * either just happened or didn't. Only these two need the scheduled tick,
 * since they're defined by proximity to a wall-clock moment rather than by
 * an application event.
 */
export const TIME_BASED_TRIGGERS: AutomationTrigger[] = ["before_webinar", "after_webinar"];
