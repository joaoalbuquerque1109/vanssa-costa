-- Seed unico (servicos + produtos) com base nos prints enviados.
-- Idempotente: pode ser executado mais de uma vez.

-- =========================
-- SERVICOS
-- =========================
insert into cat_servicos (id, nome)
values
  (1, 'Corte'),
  (2, 'Tratamentos Capilares'),
  (3, 'Fitagem'),
  (4, 'Maquiagem'),
  (5, 'Penteados')
on conflict (id) do update
set nome = excluded.nome;

insert into servicos (id, nome, categoria, valor, foto, tempo, ativo)
values
  (101, 'So Corte', 1, 95.00, 'sem-foto.jpg', 60, 'Sim'),
  (102, 'Acidificacao', 2, 150.00, 'sem-foto.jpg', 90, 'Sim'),
  (103, 'Nutricao', 2, 1.00, 'sem-foto.jpg', 60, 'Sim'),
  (104, 'Reconstrucao', 2, 140.00, 'sem-foto.jpg', 90, 'Sim'),
  (105, 'Vita Fort Fortale...', 2, 130.00, 'sem-foto.jpg', 90, 'Sim'),
  (106, 'Banho de Colageno', 2, 180.00, 'sem-foto.jpg', 90, 'Sim'),
  (107, 'Hidronutricao', 2, 120.00, 'sem-foto.jpg', 90, 'Sim'),
  (108, 'Corte + Lavagem +...', 1, 130.00, 'sem-foto.jpg', 90, 'Sim'),
  (109, 'Corte + Lavagem +...', 1, 150.00, 'sem-foto.jpg', 90, 'Sim'),
  (110, 'Corte + Lavagem +...', 1, 110.00, 'sem-foto.jpg', 90, 'Sim'),
  (111, 'Fitagem (Cabelo c...)', 3, 60.00, 'sem-foto.jpg', 90, 'Sim'),
  (112, 'Fitagem (Cabelo m...)', 3, 80.00, 'sem-foto.jpg', 90, 'Sim'),
  (113, 'Fitagem (cabelo l...)', 3, 100.00, 'sem-foto.jpg', 90, 'Sim'),
  (114, 'Maquiagem Express', 4, 100.00, 'sem-foto.jpg', 60, 'Sim'),
  (115, 'Maquiagem Social', 4, 150.00, 'sem-foto.jpg', 90, 'Sim'),
  (116, 'Penteado incluso ...', 5, 150.00, 'sem-foto.jpg', 90, 'Sim'),
  (117, 'Penteado cacheado...', 5, 250.00, 'sem-foto.jpg', 120, 'Sim'),
  (118, 'Escova', 2, 50.00, 'sem-foto.jpg', 60, 'Sim'),
  (119, 'Babyliss', 5, 60.00, 'sem-foto.jpg', 60, 'Sim')
on conflict (id) do update
set
  nome = excluded.nome,
  categoria = excluded.categoria,
  valor = excluded.valor,
  foto = excluded.foto,
  tempo = excluded.tempo,
  ativo = excluded.ativo;

update servicos
set ativo = 'Não'
where id not in (101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119);

update servicos
set ativo = 'Sim'
where id in (101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119);

-- =========================
-- PRODUTOS
-- =========================
-- Mapa de categorias:
-- 1 = Cremes
-- 2 = Shampoo, hidratante e condicionador
-- 3 = Esmaltes

insert into produtos (id, nome, descricao, categoria, valor_compra, valor_venda, estoque, foto, nivel_estoque)
values
  (201, 'Ativador de cachos Bellis Semente de Uva', null, 1, 100.00, 100.00, 0, 'sem-foto.jpg', 0),
  (202, 'Deva Curl Styling Cream - Creme Modelador', null, 1, 32.50, 35.00, 86, 'sem-foto.jpg', 5),
  (203, 'Leave In Deva Curl Cachos Light Defining Gel', null, 2, 26.00, 100.00, 131, 'sem-foto.jpg', 5),
  (204, 'Condicionador Deva Curl One Condition', null, 2, 26.00, 100.00, 78, 'sem-foto.jpg', 5),
  (205, 'Shampoo Deva Curl Low-Poo', null, 2, 2.00, 100.00, 10, 'sem-foto.jpg', 5),
  (206, 'Creme Pele', null, 1, 20.00, 35.00, 25, '14-06-2022-16-52-39-p2.png', 5),
  (207, 'Esmalte Longa Duracao', null, 3, 10.00, 7.00, 12, '14-06-2022-17-32-16-MANICURE-04.png', 5),
  (208, 'Esmalte Risque', null, 3, 10.00, 12.00, 17, '14-06-2022-16-47-12-esmalte.png', 5),
  (209, 'Creme Hidratacao', null, 1, 75.00, 35.00, 11, '30-06-2025-23-34-22-creme.jpg', 5)
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  categoria = excluded.categoria,
  valor_compra = excluded.valor_compra,
  valor_venda = excluded.valor_venda,
  estoque = excluded.estoque,
  foto = excluded.foto,
  nivel_estoque = excluded.nivel_estoque;

-- Mantem apenas a lista nova de produtos visivel no site.
delete from produtos
where id not in (201, 202, 203, 204, 205, 206, 207, 208, 209);

