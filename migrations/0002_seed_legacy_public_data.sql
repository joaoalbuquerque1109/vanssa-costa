-- Seed base extraído do dump legado usado no ZIP.

insert into config (id, nome, email, telefone_fixo, telefone_whatsapp, endereco, logo, icone, logo_rel, tipo_rel, instagram, tipo_comissao, texto_rodape, img_banner_index, texto_sobre, imagem_sobre, icone_site) values
(2, 'Barbearia Freitas', 'contato@hugocursos.com.br', '(33) 3333-3333', '(31) 99534-8118', 'Rua X Número 150 - Bairro Centro Belo Horizonte - MG', 'logo.png', 'favicon.png', 'logo_rel.jpg', 'PDF', 'https://www.instagram.com/portal_hugo_cursos/', 'Porcentagem', 'Este texto pode ser modificado no painel do sistema, nas opções de configurações, é um texto com tamanho para até 255 caracteres e será apresentado no rodapé de todo o site!', 'hero-bg.jpg', 'Este texto pode ser alterado no painel administrativo nas configurações, aqui voce vai colocar um texto escrevendo sobre sua empresa. Este texto pode ser alterado no painel administrativo nas configurações, aqui voce vai colocar um texto escrevendo sobre.', 'area_sobre.jpg', 'favicon.png')
on conflict do nothing;

insert into textos_index (id, titulo, descricao) values
(1, 'Cortes Profissionais', 'Descrição relacionado ao texto, você poderá alterar essa descrição e o título do texto acima no painel administrativo, lá terá uma opção para gerenciar os recursos do site.'),
(2, 'Faça sua Barba', 'Descrição relacionado ao texto, você poderá alterar essa descrição e o título do texto acima no painel administrativo, lá terá uma opção para gerenciar os recursos do site.'),
(3, 'Mega Hair', 'Descrição relacionado ao texto, você poderá alterar essa descrição e o título do texto acima no painel administrativo, lá terá uma opção para gerenciar os recursos do site.'),
(4, 'Unha de Gel', 'Descrição relacionado ao texto, você poderá alterar essa descrição e o título do texto acima no painel administrativo, lá terá uma opção para gerenciar os recursos do site.')
on conflict do nothing;

insert into cat_servicos (id, nome) values
(1, 'Corte'),
(2, 'Química'),
(5, 'Manicure e Pedicure'),
(6, 'Depilação')
on conflict do nothing;

insert into servicos (id, nome, categoria, valor, foto, dias_retorno, ativo, comissao, tempo) values
(1, 'Corte', 1, 25.0, '08-04-2025-12-15-48-corte.jpg', 15, 'Sim', 10.0, 45),
(2, 'Barba', 1, 0.01, '08-04-2025-12-15-40-barba.jpg', 1, 'Sim', 10.0, 15),
(4, 'Luzes', 2, 1.0, '08-04-2025-12-15-32-luzes.jpg', 20, 'Sim', 8.0, 50),
(5, 'Hidrataçao', 2, 40.0, '14-06-2022-15-39-20-hidratacao.png', 180, 'Sim', 5.0, 90),
(8, 'Mão e Pé', 5, 50.0, '14-06-2022-15-39-09-unha.png', 15, 'Sim', 10.0, 60),
(9, 'Unha de Gel', 5, 150.0, '14-06-2022-15-38-59-unha-de-gel.png', 30, 'Sim', 10.0, 30),
(10, 'Corte + Barba', 1, 45.0, '14-06-2022-15-40-40-CORTE-E-BARBA.png', 15, 'Sim', 15.0, 60)
on conflict do nothing;

insert into usuarios (id, nome, email, cpf, senha, senha_crip, nivel, data, ativo, telefone, endereco, foto, atendimento, tipo_chave, chave_pix, intervalo, comissao, visualizar) values
(2, 'Barbeiro Teste', 'barbeiro@hotmail.com', '222.222.222-22', '', '$2y$10$4k4tDsdFW0n8UbejvAXuluwinr0U9D1CYaFZP0qkkAkrSLlycTNcq', 'Barbeiro', '2024-02-29', 'Sim', '(31) 99534-8118', 'Rua Boa Vista 50', '08-04-2025-12-12-31-foto.png', 'Sim', 'CPF', 555555555, 15, 50, 'Sim'),
(6, 'Barbeiro Teste 2', 'bar@hotmail.com', '', '', '$2y$10$V6GveLWZw0HLHlzVSpeXA.KnyCjm51owrwpg0WMi3g4R6HxZO9Aom', 'Barbeiro', '2024-12-18', 'Sim', '(10) 00000-0000', '', '08-04-2025-12-12-04-eupng.png', 'Sim', '', '', 15, 0, 'Sim'),
(9, 'Barbeiro Luzes', 'barbeiroluzes@hotmail.com', '000.000.222-22', '', '$2y$10$udLjIKKH7XduoSfGOT26k.sef5QDLKe3UcAGxjb09vEl1GtOIdq.y', 'Barbeiro', '2025-04-08', 'Sim', '(30) 00000-0000', '', 'sem-foto.jpg', 'Sim', '', '', 30, 0, 'Não')
on conflict do nothing;

insert into servicos_func (id, funcionario, servico) values
(23, 6, 2),
(24, 6, 1),
(25, 6, 10),
(26, 6, 5),
(27, 6, 4),
(37, 40, 2),
(38, 40, 1),
(39, 40, 5),
(40, 2, 2),
(41, 2, 1),
(42, 2, 10),
(43, 2, 5),
(44, 2, 4),
(45, 9, 4),
(46, 9, 10)
on conflict do nothing;

insert into dias (id, dia, funcionario, inicio, final, inicio_almoco, final_almoco) values
(7, 'Segunda-Feira', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(8, 'Terça-Feira', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(9, 'Quarta-Feira', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(10, 'Quinta-Feira', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(11, 'Sexta-Feira', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(12, 'Sábado', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(13, 'Domingo', 40, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(14, 'Segunda-Feira', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(15, 'Terça-Feira', 6, '03:00:00', '22:00:00', '14:00:00', '15:00:00'),
(16, 'Quarta-Feira', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(17, 'Quinta-Feira', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(18, 'Sexta-Feira', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(19, 'Sábado', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(20, 'Domingo', 6, '03:00:00', '22:00:00', '12:00:00', '13:00:00'),
(21, 'Segunda-Feira', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(22, 'Terça-Feira', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(23, 'Quarta-Feira', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(24, 'Quinta-Feira', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(25, 'Sexta-Feira', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(26, 'Sábado', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(27, 'Domingo', 2, '06:00:00', '23:00:00', '00:00:00', '00:00:00'),
(28, 'Segunda-Feira', 9, '08:00:00', '18:00:00', '00:00:00', '00:00:00'),
(29, 'Terça-Feira', 9, '08:00:00', '23:00:00', '00:00:00', '00:00:00'),
(30, 'Quarta-Feira', 9, '08:00:00', '18:00:00', '00:00:00', '00:00:00'),
(31, 'Quinta-Feira', 9, '07:00:00', '23:00:00', '12:00:00', '13:00:00'),
(32, 'Sexta-Feira', 9, '07:00:00', '23:00:00', '00:00:00', '00:00:00'),
(33, 'Segunda-Feira', 0, '08:00:00', '14:00:00', '00:00:00', '00:00:00'),
(34, 'Sábado', 0, '08:00:00', '14:00:00', '00:00:00', '00:00:00'),
(36, '', 9, '00:00:00', '00:00:00', '00:00:00', '00:00:00')
on conflict do nothing;

insert into dias_bloqueio (id, data, funcionario, usuario) values
(11, '2025-07-02', 9, 9)
on conflict do nothing;

insert into produtos (id, nome, descricao, categoria, valor_compra, valor_venda, estoque, foto, nivel_estoque) values
(1, 'Pomada para Barbas', 'Pomada para barbas...', 1, 24.0, 60.0, 12, '14-06-2022-16-44-05-BARBA-04.png', 5),
(2, 'Creme Hidratação', 'Creme para hidratar...', 2, 75.0, 35.0, 11, '30-06-2025-23-34-22-creme.jpg', 5),
(4, 'Loção Pós Barba', 'Loção para barba creme X', 5, 10.0, 15.0, 45, '14-06-2022-16-43-17-BARBA-03.png', 5),
(5, 'Pomada Modeladora', 'Pomada Modeladora para Cabelos', 1, 10.0, 10.0, 8, '14-06-2022-16-42-47-BARBA-06.png', 5),
(6, 'Creme para Barbas', 'Evita a pele ficar hirritada...', 2, 0.0, 35.0, 6, '14-06-2022-16-44-44-BARBA-05.png', 5),
(7, 'Pomada Gel Modeladora', 'Pomada que tem uma ação de gel que mantém seu cabelo modelado mais tempo', 1, 10.0, 30.0, 58, '14-06-2022-17-30-52-pomada.png', 5),
(8, 'Esmalte Risqué', 'Esmalte de alta duração xx', 7, 10.0, 12.0, 17, '14-06-2022-16-47-12-esmalte.png', 0),
(9, 'Esmalte Longa Duração', 'Esmalte Risque ....', 7, 10.0, 7.0, 12, '14-06-2022-17-32-16-MANICURE-04.png', 10),
(10, 'Creme Pele', 'Creme ...', 2, 20.0, 35.0, 23, '14-06-2022-16-52-39-p2.png', 10)
on conflict do nothing;

insert into comentarios (id, nome, texto, foto, ativo) values
(1, 'Hugo Vasconcelos', 'Aqui será o texto do comentário referente a essa mensagem e poderá ser aprovado ou não pelo administrador do site.', '14-06-2022-19-11-18-24-05-2022-20-46-30-eu.jpeg', 'Sim'),
(2, 'Paula Campos', 'Aqui será o texto do comentário referente a essa mensagem e poderá ser aprovado ou não pelo administrador do site. Aqui será o texto do comentário referente a essa mensagem e poderá ser aprovado ou não pelo administrador do site.', '12-10-2023-10-31-42-ARTE-PERFIL-WHATSAPP.jpg', 'Sim'),
(3, 'Marcos Silva', 'Aqui será o texto do comentário referente a essa mensagem e poderá ser aprovado ou não pelo administrador do site.', '14-06-2022-19-11-32-30-05-2022-13-19-34-08-03-2022-22-21-20-02-03-2022-09-59-04-Arthur.jpg', 'Sim'),
(4, 'Marcos Santos', 'Aqui será o texto do comentário referente a essa mensagem e poderá ser aprovado ou não pelo administrador do site.', '14-06-2022-19-11-50-c2.jpg', 'Sim'),
(15, 'Fabricio Campos', 'Excelente barbearia, sempre bom atendimento, preços assecíveis, Excelente barbearia, sempre bom atendimento, preços assecíveis, Excelente barbearia, sempre bom atendimento, preços assecíveis,', '14-06-2022-20-10-40-c1.jpg', 'Sim'),
(16, 'Marcelo Silva', 'Excelente barbearia, sempre bom atendimento, preços assecíveis, Excelente barbearia, sempre bom atendimento, preços assecíveis, Excelente barbearia, sempre bom atendimento, preços assecíveis,', '14-06-2022-20-13-02-c2.jpg', 'Sim')
on conflict do nothing;

insert into grupo_assinaturas (id, nome, ativo) values
(1, 'Assinatura - cabelo - barba - bigode - sobrancelha', 'Sim'),
(3, 'Assinaturas de Tratamentos capilares', 'Sim')
on conflict do nothing;

insert into itens_assinaturas (id, grupo, nome, valor, ativo, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12) values
(3, 1, 'COMBO BRONZE', 69.99, 'Sim', 'Corte cabelo', 'Lavar cabelo', '*Acabamento Ilimitado', 'Nenhum', 'Nenhum', 'Nenhum', '20% Des. produto/serviço', '', '', '', '', ''),
(4, 1, 'COMBO PRATA', 120.0, 'Sim', '*Corte Ilimitado', 'Designer barba', 'Acabamento Ilimitado', 'Designer sobrancelha', 'Lavar cabelo', 'Nenhum', '20% Des. produto/serviço', '', '', '', '', ''),
(5, 1, 'COMBO OURO', 130.0, 'Sim', 'Barba Ilimitado', 'Corte cabelo', 'Acabamento Ilimitado', 'Designer sobrancelha', 'Lavar cabelo', 'Nenhum', '20% Des. produto/serviço', '', '', '', '', ''),
(6, 1, 'COMBO DIAMANTE', 220.0, 'Sim', 'Corte Ilimitado', 'Barba Ilimitado', 'Acabamento Ilimitado', 'Designer sobrancelha', 'Depilação orelha ou nariz', 'Lavar cabelo', '20% Des. produto/serviço', '', '', '', '', ''),
(7, 3, 'COMBO PRATA', 99.99, 'Sim', 'Hidratação', 'Escova Ilimitado', 'Nenhum', 'Nenhum', 'Nenhum', '20% Des. produto/serviço', '', '', '', '', '', ''),
(8, 3, 'COMBO OURO', 149.99, 'Sim', 'Reconstrução', 'Hidratação', 'Escova Ilimitado', 'Nenhum', 'Nenhum', '20% Des. produto/serviço', '', '', '', '', '', ''),
(9, 3, 'COMBO DIAMANTE', 199.0, 'Sim', 'Reconstrução', 'Nutrição', 'Umectação', 'Hidratação', 'Escova Ilimitado', '20% Des. produto/serviço', '', '', '', '', '', '')
on conflict do nothing;

insert into frequencias (id, frequencia, dias) values
(1, 'Nenhuma', 0),
(2, 'Diária', 1),
(3, 'Semanal', 7),
(4, 'Mensal', 30),
(5, 'Trimestral', 90),
(6, 'Semestral', 180),
(7, 'Anual', 365),
(8, 'Quinzenal', 15)
on conflict do nothing;
