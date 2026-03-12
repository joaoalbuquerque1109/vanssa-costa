-- Remove role "cliente" do portal: somente funcionario e administrador.

delete from user_profiles where role = 'cliente';

alter table if exists user_profiles drop constraint if exists user_profiles_role_check;
alter table if exists user_profiles
  add constraint user_profiles_role_check
  check (role in ('funcionario', 'administrador'));

alter table if exists user_profiles drop constraint if exists user_profiles_role_ref_check;
alter table if exists user_profiles
  add constraint user_profiles_role_ref_check
  check (
    (role in ('funcionario', 'administrador') and usuario_id is not null and cliente_id is null)
  );
