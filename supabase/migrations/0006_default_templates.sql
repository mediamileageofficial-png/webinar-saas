-- ============================================================================
-- 0006_default_templates.sql
--
-- Extends create_organization_with_owner() (from 0003) to also seed a couple
-- of sensible default templates, so a brand-new tenant's free-registration
-- confirmation flow works without requiring template setup first. SMS/
-- WhatsApp templates are intentionally NOT auto-populated with a working
-- provider_template_id - those require a real DLT/Meta-approved template the
-- tenant must register themselves; leaving it null means sends fail loudly
-- and log a clear reason, rather than silently pretending to work.
-- ============================================================================

create or replace function create_organization_with_owner(org_name text, org_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  insert into organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, caller, 'organization_owner');

  insert into message_templates (organization_id, key, channel, version, subject, body, is_active)
  values
    (new_org_id, 'registration_confirmation', 'email', 1,
     'You''re registered for {{webinar_name}}',
     '<p>Hi {{name}},</p><p>You''re confirmed for <strong>{{webinar_name}}</strong> on {{date}} at {{time}}.</p><p><a href="{{join_link}}">Join here</a></p><p>Registration ID: {{registration_id}}</p>',
     true),
    (new_org_id, 'payment_confirmation', 'email', 1,
     'Payment received - {{webinar_name}}',
     '<p>Hi {{name}},</p><p>We''ve received your payment of {{amount}} for <strong>{{webinar_name}}</strong>. You''re all set for {{date}} at {{time}}.</p><p><a href="{{join_link}}">Join here</a></p>',
     true),
    (new_org_id, 'registration_confirmation', 'sms', 1, null,
     'Hi {{name}}, you are registered for {{webinar_name}} on {{date}} at {{time}}. Join: {{join_link}}',
     true);

  return org_slug;
end;
$$;
