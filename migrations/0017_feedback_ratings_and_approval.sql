alter table if exists comentarios
  add column if not exists nota integer not null default 5;

alter table if exists comentarios
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comentarios_nota_check'
  ) then
    alter table comentarios
      add constraint comentarios_nota_check check (nota between 0 and 5);
  end if;
end $$;

update comentarios
set nota = 5
where nota is null;

update comentarios
set foto = null;

update comentarios
set texto = 'Excelente atendimento e ambiente impecavel.',
    nota = 5,
    ativo = 'Sim',
    foto = null
where id = 1;

update comentarios
set texto = 'Servico rapido, profissional e com otimo resultado.',
    nota = 5,
    ativo = 'Sim',
    foto = null
where id = 2;

update comentarios
set texto = 'Minha barbearia de confianca.',
    nota = 5,
    ativo = 'Sim',
    foto = null
where id = 3;
