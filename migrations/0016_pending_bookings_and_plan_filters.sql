create table if not exists agendamentos_pendentes (
  id uuid primary key default gen_random_uuid(),
  funcionario bigint not null references usuarios (id) on delete cascade,
  cliente bigint not null references clientes (id) on delete cascade,
  data date not null,
  hora time not null,
  servico bigint not null references servicos (id) on delete cascade,
  obs text,
  phone text,
  valor numeric(10,2) not null default 0,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_agendamentos_pendentes_slot on agendamentos_pendentes (funcionario, data, hora);
create index if not exists idx_agendamentos_pendentes_status_expires on agendamentos_pendentes (status, expires_at);
