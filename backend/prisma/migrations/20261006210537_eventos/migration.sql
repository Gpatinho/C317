-- CreateTable
CREATE TABLE `evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(160) NOT NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NULL,
    `local` VARCHAR(160) NOT NULL,
    `contato` VARCHAR(120) NULL,
    `gratuito` BOOLEAN NOT NULL DEFAULT true,
    `icone` VARCHAR(8) NULL,
    `descricao` TEXT NULL,

    INDEX `evento_data_inicio_idx`(`data_inicio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
