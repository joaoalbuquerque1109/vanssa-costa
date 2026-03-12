-- Seed de catalogo publico extraido de itens que estavam hardcoded nas paginas.
-- Pode ser executado de forma idempotente.

insert into cat_servicos (id, nome)
values
  (1, 'Corte'),
  (2, 'Quimica'),
  (5, 'Manicure e Pedicure'),
  (6, 'Depilacao')
on conflict (id) do update set nome = excluded.nome;

insert into servicos (id, nome, categoria, valor, foto, tempo, ativo)
values
  (1, 'Corte', 1, 25.00, '08-04-2025-12-15-48-corte.jpg', 45, 'Sim'),
  (2, 'Barba', 1, 30.00, '08-04-2025-12-15-40-barba.jpg', 30, 'Sim'),
  (4, 'Luzes', 2, 80.00, '08-04-2025-12-15-32-luzes.jpg', 50, 'Sim'),
  (5, 'Hidratacao', 2, 40.00, '14-06-2022-15-39-20-hidratacao.png', 90, 'Sim'),
  (8, 'Mao e Pe', 5, 50.00, '14-06-2022-15-39-09-unha.png', 60, 'Sim'),
  (9, 'Unha de Gel', 5, 150.00, '14-06-2022-15-38-59-unha-de-gel.png', 30, 'Sim'),
  (10, 'Corte + Barba', 1, 45.00, '14-06-2022-15-40-40-CORTE-E-BARBA.png', 60, 'Sim')
on conflict (id) do update
set
  nome = excluded.nome,
  categoria = excluded.categoria,
  valor = excluded.valor,
  foto = excluded.foto,
  tempo = excluded.tempo,
  ativo = excluded.ativo;

insert into produtos (id, nome, descricao, categoria, valor_venda, estoque, foto)
values
  (1, 'Pomada para Barbas', 'Pomada para barbas.', 1, 60.00, 12, '14-06-2022-16-44-05-BARBA-04.png'),
  (2, 'Creme Hidratacao', 'Creme para hidratar.', 2, 35.00, 11, '30-06-2025-23-34-22-creme.jpg'),
  (4, 'Locao Pos Barba', 'Locao para barba.', 5, 15.00, 45, '14-06-2022-16-43-17-BARBA-03.png'),
  (7, 'Pomada Gel Modeladora', 'Fixacao e modelagem prolongada.', 1, 30.00, 58, '14-06-2022-17-30-52-pomada.png')
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  categoria = excluded.categoria,
  valor_venda = excluded.valor_venda,
  estoque = excluded.estoque,
  foto = excluded.foto;
