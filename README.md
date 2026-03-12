# Synctec Next + Supabase

Migração do projeto legado em PHP para **Next.js + TypeScript + Tailwind CSS + Supabase**, usando a pasta zipada e o SQL legado como base.

## O que está incluído

- páginas públicas equivalentes: Home, Agendamentos, Serviços, Produtos, Assinaturas, Acesso Cliente e Portal
- controle de acesso por papel (`cliente`, `funcionario`, `administrador`)
- cliente autenticado com lista de agendamentos (data, hora, serviço e valor)
- funcionário autenticado com dashboard de métricas e gestão de produtos/serviços
- administrador com gestão de funcionários (dias/horários/serviços permitidos)
- rota server-side para criar preferência de pagamento do Mercado Pago Checkout Pro
- webhook público para confirmação oficial do pagamento com idempotência, logs e persistência em `orders`/`payments`
- `migrations/` com estrutura relacional em PostgreSQL/Supabase e seed baseados no dump legado
- fallback local com dados do dump legado quando o Supabase ainda não estiver configurado

## Setup

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Crie `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_URL=
ADMIN_BOOTSTRAP_SECRET=
```

## Observações importantes

- Rode as migrações `0001`, `0002`, `0003` e `0004` no Supabase.
- A confirmação de pagamento **não deve** usar apenas query params de retorno (`success/failure/pending`).
- O status oficial deve vir do webhook do Mercado Pago e, quando necessário, da consulta server-to-server do pagamento.
- Depois das migrations, execute `POST /api/portal/bootstrap-admin` com o header `x-admin-bootstrap-secret` para criar o acesso do admin padrão `vanessa.costa@admin.local` com senha `senha123`.
