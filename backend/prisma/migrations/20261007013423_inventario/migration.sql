-- CreateTable
CREATE TABLE `atrativo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(160) NOT NULL,
    `tipo` ENUM('ATRATIVO', 'EQUIPAMENTO', 'SERVICO') NOT NULL,
    `categoria` VARCHAR(60) NOT NULL,
    `descricao` TEXT NULL,
    `endereco` VARCHAR(255) NULL,
    `contato` VARCHAR(120) NULL,
    `revisado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `atrativo_tipo_categoria_idx`(`tipo`, `categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
