/*
  Warnings:

  - A unique constraint covering the columns `[codigo_acesso_hash]` on the table `estabelecimento` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `registro_indicador` DROP FOREIGN KEY `registro_indicador_estabelecimento_id_fkey`;

-- AlterTable
ALTER TABLE `estabelecimento` ADD COLUMN `codigo_acesso_hash` CHAR(64) NULL;

-- AlterTable
ALTER TABLE `indicador` ADD COLUMN `coleta_estabelecimento` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `submissao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estabelecimento_id` INTEGER NOT NULL,
    `indicador_id` INTEGER NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `periodo` DATE NOT NULL,
    `observacao` TEXT NULL,
    `status` ENUM('PENDENTE', 'APROVADA', 'REJEITADA') NOT NULL DEFAULT 'PENDENTE',
    `motivo_rejeicao` VARCHAR(255) NULL,
    `enviado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `analisado_em` DATETIME(3) NULL,
    `analisado_por_id` INTEGER NULL,
    `registro_id` INTEGER NULL,

    UNIQUE INDEX `submissao_registro_id_key`(`registro_id`),
    INDEX `submissao_status_enviado_em_idx`(`status`, `enviado_em`),
    INDEX `submissao_estabelecimento_id_idx`(`estabelecimento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `estabelecimento_codigo_acesso_hash_key` ON `estabelecimento`(`codigo_acesso_hash`);

-- AddForeignKey
ALTER TABLE `registro_indicador` ADD CONSTRAINT `registro_indicador_estabelecimento_id_fkey` FOREIGN KEY (`estabelecimento_id`) REFERENCES `estabelecimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao` ADD CONSTRAINT `submissao_estabelecimento_id_fkey` FOREIGN KEY (`estabelecimento_id`) REFERENCES `estabelecimento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao` ADD CONSTRAINT `submissao_indicador_id_fkey` FOREIGN KEY (`indicador_id`) REFERENCES `indicador`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao` ADD CONSTRAINT `submissao_analisado_por_id_fkey` FOREIGN KEY (`analisado_por_id`) REFERENCES `usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao` ADD CONSTRAINT `submissao_registro_id_fkey` FOREIGN KEY (`registro_id`) REFERENCES `registro_indicador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
