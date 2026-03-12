-- Garante que apenas a lista nova de servicos fique ativa no site.
-- Execute apos a 0009_seed_services_from_screenshot.sql.

-- 1) Desativa todos os servicos atuais
update servicos
set ativo = 'Não'
where ativo is distinct from 'Não';

-- 2) Ativa apenas os servicos importados do print
update servicos
set ativo = 'Sim'
where id in (101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119);

