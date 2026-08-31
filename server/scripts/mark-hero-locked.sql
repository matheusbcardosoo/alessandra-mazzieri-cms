-- Marcar a seção Hero como bloqueada (isLocked = true)
-- Executar este script uma vez após aplicar a migration

UPDATE "HomeSection"
SET "isLocked" = true
WHERE type = 'hero';

-- Garantir que o Hero está na posição 0
UPDATE "HomeSection"
SET "order" = 0
WHERE type = 'hero';
