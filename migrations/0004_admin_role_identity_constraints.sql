-- Add administrador role, enforce identity constraints and bootstrap admin user

-- Keep migration idempotent for existing environments.

-- Ensure role set includes administrador.
alter table if exists user_profiles drop constraint if exists user_profiles_role_check;
alter table if exists user_profiles drop constraint if exists user_profiles_role_ref_check;

alter table if exists user_profiles
  add constraint user_profiles_role_check
  check (role in ('cliente', 'funcionario', 'administrador'));

alter table if exists user_profiles
  add constraint user_profiles_role_ref_check
  check (
    (role = 'cliente' and cliente_id is not null and usuario_id is null)
    or
    (role = 'funcionario' and usuario_id is not null and cliente_id is null)
    or
    (role = 'administrador' and usuario_id is not null and cliente_id is null)
  );

alter table if exists user_login_events drop constraint if exists user_login_events_role_check;
alter table if exists user_login_events
  add constraint user_login_events_role_check
  check (role in ('cliente', 'funcionario', 'administrador'));

-- Normalize legacy user rows before mandatory constraints.
update usuarios
set email = concat('usuario', id, '@placeholder.local')
where email is null or btrim(email) = '';

update usuarios
set cpf = lpad(id::text, 11, '0')
where cpf is null or regexp_replace(cpf, '\\D', '', 'g') = '';

-- clientes may not have rows yet, but keep safe for existing environments.
update clientes
set email = concat('cliente', id, '@placeholder.local')
where email is null or btrim(email) = '';

update clientes
set cpf = lpad(id::text, 11, '9')
where cpf is null or regexp_replace(cpf, '\\D', '', 'g') = '';

-- Enforce mandatory email and cpf.
alter table usuarios alter column email set not null;
alter table usuarios alter column cpf set not null;

alter table clientes alter column email set not null;
alter table clientes alter column cpf set not null;

-- Enforce unique CPF normalized (digits only).
create unique index if not exists uq_usuarios_cpf_normalized on usuarios ((regexp_replace(cpf, '\\D', '', 'g')));
create unique index if not exists uq_clientes_cpf_normalized on clientes ((regexp_replace(cpf, '\\D', '', 'g')));

-- Optional email uniqueness to avoid ambiguous auth mapping.
create unique index if not exists uq_usuarios_email_lower on usuarios ((lower(email)));
create unique index if not exists uq_clientes_email_lower on clientes ((lower(email)));

-- Administrator bootstrap moved to runtime endpoint (/api/portal/bootstrap-admin)
-- to avoid hardcoded personal data in source-controlled migrations.

-- Keep the admin profile mapped when auth user is created later with same email.
