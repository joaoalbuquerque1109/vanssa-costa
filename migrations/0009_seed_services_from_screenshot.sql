-- Seed de servicos baseado no print enviado.
-- Observacao: o print nao traz os arquivos/URLs das fotos.
-- Por isso, a coluna foto usa fallback em "sem-foto.jpg".
-- Se voce tiver os nomes/URLs corretos das imagens, substitua no campo "foto".

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
