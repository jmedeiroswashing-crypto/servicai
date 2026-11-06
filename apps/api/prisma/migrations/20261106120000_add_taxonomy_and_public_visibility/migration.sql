-- Visibilidade pública do prestador
ALTER TABLE "ProviderProfile" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProviderProfile" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ProviderProfile_isTest_profileComplete_idx" ON "ProviderProfile"("isTest", "profileComplete");

-- Taxonomia de serviços
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceSubcategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ServiceSubcategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");
CREATE UNIQUE INDEX "ServiceSubcategory_slug_key" ON "ServiceSubcategory"("slug");
CREATE UNIQUE INDEX "ServiceSubcategory_label_key" ON "ServiceSubcategory"("label");
CREATE INDEX "ServiceSubcategory_categoryId_idx" ON "ServiceSubcategory"("categoryId");

ALTER TABLE "ServiceSubcategory" ADD CONSTRAINT "ServiceSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ServiceCategory" ("id", "slug", "label", "position") VALUES
  ('reformas-e-construcao', 'reformas-e-construcao', 'Reformas e construção', 0),
  ('casa-e-manutencao', 'casa-e-manutencao', 'Casa e manutenção', 1),
  ('assistencia-tecnica', 'assistencia-tecnica', 'Assistência técnica', 2),
  ('automotivo', 'automotivo', 'Automotivo', 3),
  ('beleza', 'beleza', 'Beleza', 4),
  ('saude-e-bem-estar', 'saude-e-bem-estar', 'Saúde e bem-estar', 5),
  ('cuidados', 'cuidados', 'Cuidados', 6),
  ('eventos', 'eventos', 'Eventos', 7),
  ('pets', 'pets', 'Pets', 8),
  ('fretes-e-mudancas', 'fretes-e-mudancas', 'Fretes e mudanças', 9),
  ('aulas', 'aulas', 'Aulas', 10),
  ('tecnologia-e-design', 'tecnologia-e-design', 'Tecnologia e design', 11),
  ('juridico-e-financeiro', 'juridico-e-financeiro', 'Jurídico e financeiro', 12);

INSERT INTO "ServiceSubcategory" ("id", "slug", "label", "position", "categoryId") VALUES
  ('pedreiro', 'pedreiro', 'Pedreiro', 0, 'reformas-e-construcao'),
  ('eletricista', 'eletricista', 'Eletricista', 1, 'reformas-e-construcao'),
  ('encanador', 'encanador', 'Encanador', 2, 'reformas-e-construcao'),
  ('pintor', 'pintor', 'Pintor', 3, 'reformas-e-construcao'),
  ('gesseiro', 'gesseiro', 'Gesseiro', 4, 'reformas-e-construcao'),
  ('marceneiro', 'marceneiro', 'Marceneiro', 5, 'reformas-e-construcao'),
  ('serralheiro', 'serralheiro', 'Serralheiro', 6, 'reformas-e-construcao'),
  ('vidraceiro', 'vidraceiro', 'Vidraceiro', 7, 'reformas-e-construcao'),
  ('telhadista', 'telhadista', 'Telhadista', 8, 'reformas-e-construcao'),
  ('azulejista', 'azulejista', 'Azulejista', 9, 'reformas-e-construcao'),
  ('diarista', 'diarista', 'Diarista', 0, 'casa-e-manutencao'),
  ('faxina-pos-obra', 'faxina-pos-obra', 'Faxina pós-obra', 1, 'casa-e-manutencao'),
  ('jardinagem', 'jardinagem', 'Jardinagem', 2, 'casa-e-manutencao'),
  ('piscineiro', 'piscineiro', 'Piscineiro', 3, 'casa-e-manutencao'),
  ('dedetizacao', 'dedetizacao', 'Dedetização', 4, 'casa-e-manutencao'),
  ('chaveiro', 'chaveiro', 'Chaveiro', 5, 'casa-e-manutencao'),
  ('montador-de-moveis', 'montador-de-moveis', 'Montador de móveis', 6, 'casa-e-manutencao'),
  ('desentupidora', 'desentupidora', 'Desentupidora', 7, 'casa-e-manutencao'),
  ('instalador-de-cameras', 'instalador-de-cameras', 'Instalador de câmeras', 8, 'casa-e-manutencao'),
  ('conserto-de-celular', 'conserto-de-celular', 'Conserto de celular', 0, 'assistencia-tecnica'),
  ('conserto-de-informatica', 'conserto-de-informatica', 'Conserto de informática', 1, 'assistencia-tecnica'),
  ('eletrodomesticos', 'eletrodomesticos', 'Eletrodomésticos', 2, 'assistencia-tecnica'),
  ('tv-e-som', 'tv-e-som', 'TV e som', 3, 'assistencia-tecnica'),
  ('ar-condicionado', 'ar-condicionado', 'Ar-condicionado', 4, 'assistencia-tecnica'),
  ('geladeira-e-maquina-de-lavar', 'geladeira-e-maquina-de-lavar', 'Geladeira e máquina de lavar', 5, 'assistencia-tecnica'),
  ('mecanico', 'mecanico', 'Mecânico', 0, 'automotivo'),
  ('eletricista-automotivo', 'eletricista-automotivo', 'Eletricista automotivo', 1, 'automotivo'),
  ('funilaria-e-pintura', 'funilaria-e-pintura', 'Funilaria e pintura', 2, 'automotivo'),
  ('lavagem-e-estetica-automotiva', 'lavagem-e-estetica-automotiva', 'Lavagem e estética automotiva', 3, 'automotivo'),
  ('borracharia', 'borracharia', 'Borracharia', 4, 'automotivo'),
  ('guincho', 'guincho', 'Guincho', 5, 'automotivo'),
  ('cabeleireiro', 'cabeleireiro', 'Cabeleireiro', 0, 'beleza'),
  ('barbeiro', 'barbeiro', 'Barbeiro', 1, 'beleza'),
  ('manicure-e-pedicure', 'manicure-e-pedicure', 'Manicure e pedicure', 2, 'beleza'),
  ('maquiagem', 'maquiagem', 'Maquiagem', 3, 'beleza'),
  ('design-de-sobrancelhas', 'design-de-sobrancelhas', 'Design de sobrancelhas', 4, 'beleza'),
  ('estetica', 'estetica', 'Estética', 5, 'beleza'),
  ('depilacao', 'depilacao', 'Depilação', 6, 'beleza'),
  ('personal-trainer', 'personal-trainer', 'Personal trainer', 0, 'saude-e-bem-estar'),
  ('fisioterapeuta', 'fisioterapeuta', 'Fisioterapeuta', 1, 'saude-e-bem-estar'),
  ('nutricionista', 'nutricionista', 'Nutricionista', 2, 'saude-e-bem-estar'),
  ('psicologo', 'psicologo', 'Psicólogo', 3, 'saude-e-bem-estar'),
  ('massoterapeuta', 'massoterapeuta', 'Massoterapeuta', 4, 'saude-e-bem-estar'),
  ('cuidador-de-idosos', 'cuidador-de-idosos', 'Cuidador de idosos', 0, 'cuidados'),
  ('baba', 'baba', 'Babá', 1, 'cuidados'),
  ('acompanhante-hospitalar', 'acompanhante-hospitalar', 'Acompanhante hospitalar', 2, 'cuidados'),
  ('fotografo', 'fotografo', 'Fotógrafo', 0, 'eventos'),
  ('filmagem', 'filmagem', 'Filmagem', 1, 'eventos'),
  ('dj', 'dj', 'DJ', 2, 'eventos'),
  ('buffet', 'buffet', 'Buffet', 3, 'eventos'),
  ('confeiteira', 'confeiteira', 'Confeiteira', 4, 'eventos'),
  ('decoracao', 'decoracao', 'Decoração', 5, 'eventos'),
  ('garcom', 'garcom', 'Garçom', 6, 'eventos'),
  ('som-e-iluminacao', 'som-e-iluminacao', 'Som e iluminação', 7, 'eventos'),
  ('banho-e-tosa', 'banho-e-tosa', 'Banho e tosa', 0, 'pets'),
  ('adestrador', 'adestrador', 'Adestrador', 1, 'pets'),
  ('passeador', 'passeador', 'Passeador', 2, 'pets'),
  ('pet-sitter', 'pet-sitter', 'Pet sitter', 3, 'pets'),
  ('veterinario-a-domicilio', 'veterinario-a-domicilio', 'Veterinário a domicílio', 4, 'pets'),
  ('frete', 'frete', 'Frete', 0, 'fretes-e-mudancas'),
  ('mudanca', 'mudanca', 'Mudança', 1, 'fretes-e-mudancas'),
  ('carreto', 'carreto', 'Carreto', 2, 'fretes-e-mudancas'),
  ('motoboy-e-entregas', 'motoboy-e-entregas', 'Motoboy e entregas', 3, 'fretes-e-mudancas'),
  ('reforco-escolar', 'reforco-escolar', 'Reforço escolar', 0, 'aulas'),
  ('idiomas', 'idiomas', 'Idiomas', 1, 'aulas'),
  ('musica', 'musica', 'Música', 2, 'aulas'),
  ('aulas-de-informatica', 'aulas-de-informatica', 'Aulas de informática', 3, 'aulas'),
  ('preparatorio-para-concursos', 'preparatorio-para-concursos', 'Preparatório para concursos', 4, 'aulas'),
  ('desenvolvedor', 'desenvolvedor', 'Desenvolvedor', 0, 'tecnologia-e-design'),
  ('designer', 'designer', 'Designer', 1, 'tecnologia-e-design'),
  ('social-media', 'social-media', 'Social media', 2, 'tecnologia-e-design'),
  ('edicao-de-video', 'edicao-de-video', 'Edição de vídeo', 3, 'tecnologia-e-design'),
  ('suporte-de-ti', 'suporte-de-ti', 'Suporte de TI', 4, 'tecnologia-e-design'),
  ('advogado', 'advogado', 'Advogado', 0, 'juridico-e-financeiro'),
  ('contador', 'contador', 'Contador', 1, 'juridico-e-financeiro'),
  ('despachante', 'despachante', 'Despachante', 2, 'juridico-e-financeiro'),
  ('consultoria-empresarial', 'consultoria-empresarial', 'Consultoria empresarial', 3, 'juridico-e-financeiro');

-- Categorias antigas passam para o nome novo, para pedidos e prestadores continuarem se encontrando
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Lava Rápido', 'Lavagem e estética automotiva') WHERE 'Lava Rápido' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Lavagem e estética automotiva' WHERE "category" = 'Lava Rápido';
UPDATE "Service" SET "category" = 'Lavagem e estética automotiva' WHERE "category" = 'Lava Rápido';
UPDATE "LastMinuteDeal" SET "category" = 'Lavagem e estética automotiva' WHERE "category" = 'Lava Rápido';
UPDATE "Booking" SET "category" = 'Lavagem e estética automotiva' WHERE "category" = 'Lava Rápido';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Salão', 'Cabeleireiro') WHERE 'Salão' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Cabeleireiro' WHERE "category" = 'Salão';
UPDATE "Service" SET "category" = 'Cabeleireiro' WHERE "category" = 'Salão';
UPDATE "LastMinuteDeal" SET "category" = 'Cabeleireiro' WHERE "category" = 'Salão';
UPDATE "Booking" SET "category" = 'Cabeleireiro' WHERE "category" = 'Salão';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Limpeza', 'Diarista') WHERE 'Limpeza' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Diarista' WHERE "category" = 'Limpeza';
UPDATE "Service" SET "category" = 'Diarista' WHERE "category" = 'Limpeza';
UPDATE "LastMinuteDeal" SET "category" = 'Diarista' WHERE "category" = 'Limpeza';
UPDATE "Booking" SET "category" = 'Diarista' WHERE "category" = 'Limpeza';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Mudanças', 'Mudança') WHERE 'Mudanças' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Mudança' WHERE "category" = 'Mudanças';
UPDATE "Service" SET "category" = 'Mudança' WHERE "category" = 'Mudanças';
UPDATE "LastMinuteDeal" SET "category" = 'Mudança' WHERE "category" = 'Mudanças';
UPDATE "Booking" SET "category" = 'Mudança' WHERE "category" = 'Mudanças';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Refrigeração', 'Geladeira e máquina de lavar') WHERE 'Refrigeração' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Geladeira e máquina de lavar' WHERE "category" = 'Refrigeração';
UPDATE "Service" SET "category" = 'Geladeira e máquina de lavar' WHERE "category" = 'Refrigeração';
UPDATE "LastMinuteDeal" SET "category" = 'Geladeira e máquina de lavar' WHERE "category" = 'Refrigeração';
UPDATE "Booking" SET "category" = 'Geladeira e máquina de lavar' WHERE "category" = 'Refrigeração';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Assist. Técnica', 'Eletrodomésticos') WHERE 'Assist. Técnica' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Eletrodomésticos' WHERE "category" = 'Assist. Técnica';
UPDATE "Service" SET "category" = 'Eletrodomésticos' WHERE "category" = 'Assist. Técnica';
UPDATE "LastMinuteDeal" SET "category" = 'Eletrodomésticos' WHERE "category" = 'Assist. Técnica';
UPDATE "Booking" SET "category" = 'Eletrodomésticos' WHERE "category" = 'Assist. Técnica';
UPDATE "ProviderProfile" SET "categories" = array_replace("categories", 'Professor Particular', 'Reforço escolar') WHERE 'Professor Particular' = ANY("categories");
UPDATE "ServiceRequest" SET "category" = 'Reforço escolar' WHERE "category" = 'Professor Particular';
UPDATE "Service" SET "category" = 'Reforço escolar' WHERE "category" = 'Professor Particular';
UPDATE "LastMinuteDeal" SET "category" = 'Reforço escolar' WHERE "category" = 'Professor Particular';
UPDATE "Booking" SET "category" = 'Reforço escolar' WHERE "category" = 'Professor Particular';

-- Grafias da mesma cidade encontradas nos dados públicos
UPDATE "ProviderProfile" SET "city" = 'São Paulo' WHERE "city" IN ('Sao Paulo', 'sao paulo', 'são paulo', U&'S\FFFDo Paulo');
UPDATE "User" SET "city" = 'São Paulo' WHERE "city" IN ('Sao Paulo', 'sao paulo', 'são paulo', U&'S\FFFDo Paulo');
UPDATE "ServiceRequest" SET "city" = 'São Paulo' WHERE "city" IN ('Sao Paulo', 'sao paulo', 'são paulo', U&'S\FFFDo Paulo');
UPDATE "LastMinuteDeal" SET "city" = 'São Paulo' WHERE "city" IN ('Sao Paulo', 'sao paulo', 'são paulo', U&'S\FFFDo Paulo');

-- Marca contas de teste e calcula a completude. Nenhum registro é apagado.
UPDATE "ProviderProfile" p
SET "isTest" = u."name" ~* '\m(test|teste|testes)\M'
FROM "User" u
WHERE u."id" = p."userId";

UPDATE "ProviderProfile" p
SET "profileComplete" = (
  btrim(u."name") <> ''
  AND position(U&'\FFFD' IN u."name") = 0
  AND u."avatarUrl" IS NOT NULL
  AND btrim(p."specialty") <> ''
  AND lower(btrim(p."specialty")) <> 'a definir'
  AND cardinality(p."categories") > 0
  AND btrim(p."city") <> ''
  AND lower(btrim(p."city")) <> 'não informado'
  AND position(U&'\FFFD' IN p."city") = 0
)
FROM "User" u
WHERE u."id" = p."userId";
