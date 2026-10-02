-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `papel` ENUM('ADMIN', 'EDITOR') NOT NULL DEFAULT 'ADMIN',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indicador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `categoria` VARCHAR(60) NOT NULL,
    `unidade` VARCHAR(30) NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `agregacao` ENUM('SOMA', 'ULTIMO', 'MEDIA') NOT NULL DEFAULT 'SOMA',
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `indicador_categoria_idx`(`categoria`),
    UNIQUE INDEX `indicador_nome_categoria_key`(`nome`, `categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estabelecimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(160) NOT NULL,
    `categoria` VARCHAR(60) NOT NULL,
    `endereco` VARCHAR(255) NULL,
    `regiao` VARCHAR(80) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_indicador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indicador_id` INTEGER NOT NULL,
    `estabelecimento_id` INTEGER NULL,
    `usuario_id` INTEGER NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `periodo` DATE NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `registro_indicador_indicador_id_periodo_idx`(`indicador_id`, `periodo`),
    INDEX `registro_indicador_estabelecimento_id_idx`(`estabelecimento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relatorio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(200) NOT NULL,
    `descricao` TEXT NULL,
    `ano` INTEGER NULL,
    `arquivo_nome` VARCHAR(255) NOT NULL,
    `arquivo_path` VARCHAR(255) NOT NULL,
    `tamanho_bytes` INTEGER NOT NULL,
    `publicado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `registro_indicador` ADD CONSTRAINT `registro_indicador_indicador_id_fkey` FOREIGN KEY (`indicador_id`) REFERENCES `indicador`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_indicador` ADD CONSTRAINT `registro_indicador_estabelecimento_id_fkey` FOREIGN KEY (`estabelecimento_id`) REFERENCES `estabelecimento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_indicador` ADD CONSTRAINT `registro_indicador_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relatorio` ADD CONSTRAINT `relatorio_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
