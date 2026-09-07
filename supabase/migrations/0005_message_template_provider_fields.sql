-- ============================================================================
-- 0005_message_template_provider_fields.sql
--
-- Indian SMS regulation (DLT) and WhatsApp Business both require messages to
-- use a PRE-APPROVED template registered with the provider - you cannot send
-- arbitrary free-text transactional SMS/WhatsApp. Our own `body` column
-- remains the source of truth for the template's content (used as-is for
-- email, and as documentation/preview for SMS/WhatsApp), but sending via
-- MSG91 additionally needs to know which of the tenant's already-approved
-- provider templates to invoke, and in what order to pass variables
-- (MSG91's SMS Flow API takes positional VAR1/VAR2/... parameters).
-- ============================================================================

alter table message_templates
  add column provider_template_id text,
  add column provider_variable_order jsonb;

comment on column message_templates.provider_template_id is
  'MSG91 flow/template id (SMS) or WhatsApp template name - required to actually send via that channel; null means send will fail with a clear, logged error rather than attempting free-text.';
comment on column message_templates.provider_variable_order is
  'Ordered array of {{variable}} names matching the provider template''s positional parameters, e.g. ["name","webinar_name","date"].';
