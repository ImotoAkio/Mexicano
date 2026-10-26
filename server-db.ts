import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

let pool: mysql.Pool | null = null;
let connectionError: string | null = null;
let isInitialized = false;

const cleanEnv = (val?: string) => val ? val.replace(/^['"]|['"]$/g, '').trim() : '';

// Initialize standard lazy-loaded MySQL/MariaDB database connection pool
export function getDbPool(): mysql.Pool | null {
  if (pool) return pool;

  const host = cleanEnv(process.env.DB_HOST);
  const port = parseInt(cleanEnv(process.env.DB_PORT) || "3306", 10);
  const user = cleanEnv(process.env.DB_USER);
  const password = cleanEnv(process.env.DB_PASSWORD);
  const database = cleanEnv(process.env.DB_NAME);

  if (!host || !user || !database) {
    connectionError = "Database environment credentials missing (DB_HOST, DB_USER, or DB_NAME is empty). Running in local device fallback mode.";
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
    connectionError = null;
    return pool;
  } catch (err: any) {
    console.error("Failed to create MySQL Pool:", err);
    connectionError = err.message || "Unknown database pool creation error.";
    pool = null;
    return null;
  }
}

import { getFuelPrice } from "./src/utils/constants";

// Check database status
export async function getDbStatus() {
  const currentPool = getDbPool();
  if (!currentPool) {
    return {
      connected: false,
      error: connectionError || "Database credentials not configured.",
      vpsHost: process.env.DB_HOST || null,
      database: process.env.DB_NAME || null,
    };
  }

  try {
    // Attempt a simple ping to verify connectivity to MariaDB/MySQL
    const connection = await currentPool.getConnection();
    await connection.ping();
    connection.release();

    return {
      connected: true,
      error: null,
      vpsHost: process.env.DB_HOST,
      database: process.env.DB_NAME,
      initialized: isInitialized,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: `Connection check failed: ${err.message || err}`,
      vpsHost: process.env.DB_HOST,
      database: process.env.DB_NAME,
    };
  }
}

// Automatically create tables if they do not exist when connection is verified
export async function initializeDatabase() {
  const host = cleanEnv(process.env.DB_HOST);
  const port = parseInt(cleanEnv(process.env.DB_PORT) || "3306", 10);
  const user = cleanEnv(process.env.DB_USER);
  const password = cleanEnv(process.env.DB_PASSWORD);
  const database = cleanEnv(process.env.DB_NAME);

  if (!host || !user || !database) {
    console.log("MySQL/MariaDB connection settings missing. Skipping database auto-creation.");
    return false;
  }

  // Pre-create the database if it doesn't exist
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(database)) {
    throw new Error("Invalid database name configuration. Only alphanumeric characters and underscores are allowed.");
  }

  try {
    console.log(`Connecting to MariaDB to ensure database "${database}" exists...`);
    const tempConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempConnection.end();
    console.log(`Database "${database}" exists or was successfully created.`);
  } catch (err: any) {
    console.warn(`Database pre-creation check failed (likely no permissions or connection error yet): ${err.message || err}`);
  }

  const currentPool = getDbPool();
  if (!currentPool) {
    console.log("MySQL Database not configured. Skipping schema initialization.");
    return false;
  }

  try {
    const connection = await currentPool.getConnection();
    console.log("VPS Database connected. Ensuring tables exist...");

    try {
      const colsToAdd = [
        'cpf VARCHAR(20)', 'admissao VARCHAR(20)',
        'rg VARCHAR(50)', 'rgEmissao VARCHAR(20)', 'rgOrgao VARCHAR(50)', 'rgUF VARCHAR(5)',
        'ctps VARCHAR(50)', 'pis VARCHAR(50)', 'dataNascimento VARCHAR(20)', 'estadoCivil VARCHAR(50)',
        'filiacao VARCHAR(255)', 'conjugue VARCHAR(255)', 'grauInstrucao VARCHAR(100)', 
        'primeiroEmprego TINYINT(1) DEFAULT 0', 'contratoExperiencia VARCHAR(20)',
        'endereco VARCHAR(255)', 'numero VARCHAR(50)', 'cep VARCHAR(20)', 'cidade VARCHAR(100)',
        'estado VARCHAR(5)', 'telefone VARCHAR(50)', 'contatoEmergencia VARCHAR(100)',
        'salarioBase VARCHAR(50)', 'dadosBancarios VARCHAR(255)',
        'tamanhoCalca VARCHAR(20)', 'tamanhoCamisa VARCHAR(20)', 'tamanhoBota VARCHAR(20)', 'tamanhoCinto VARCHAR(20)'
      ];
      for (const col of colsToAdd) {
        const colName = col.split(' ')[0];
        try {
          await connection.query(`ALTER TABLE Funcionarios ADD COLUMN ${col}`);
          console.log(`[Migration] Added column ${colName} to Funcionarios`);
        } catch(e) {
          // Column probably already exists, ignore
        }
      }
    } catch(e) { console.error("Migration error:", e); }


    // 1. Clientes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Clientes (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        embarcacaoId VARCHAR(50),
        cota VARCHAR(50),
        telefone VARCHAR(50),
        email VARCHAR(100),
        cpf VARCHAR(50),
        dataCadastro VARCHAR(50),
        cep VARCHAR(20),
        logradouro VARCHAR(255),
        numeroEnd VARCHAR(20),
        complemento VARCHAR(255),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(10),
        embarcacoes TEXT,
        cnh_cha VARCHAR(50),
        profissao VARCHAR(100),
        estadoCivil VARCHAR(50),
        rg VARCHAR(50),
        orgaoEmissor VARCHAR(100),
        numeroHabilitacao VARCHAR(50),
        validadeHabilitacao VARCHAR(50),
        orgaoEmissorHabilitacao VARCHAR(100),
        categoriaHabilitacao VARCHAR(50),
        dataNascimento VARCHAR(50),
        statusFinanceiro VARCHAR(50) DEFAULT 'em_dia',
        observacoesFinanceiras TEXT,
        plano VARCHAR(20) DEFAULT 'normal',
        asaasCustomerId VARCHAR(100),
        status VARCHAR(20) DEFAULT 'ativo',
        nacionalidade VARCHAR(100),
        statusContrato VARCHAR(50) DEFAULT 'sem_contrato',
        tipoContrato VARCHAR(50) DEFAULT 'aquisicao',
        contratoDataEmissao VARCHAR(50),
        contratoDataAssinatura VARCHAR(50),
        contratoArquivoUrl LONGTEXT,
        contratoArquivoNome VARCHAR(255),
        contratoArquivoTamanho INT,
        contratoObservacoes TEXT,
        contratoAquisicaoStatus VARCHAR(50) DEFAULT 'sem_contrato',
        contratoAquisicaoArquivoUrl LONGTEXT,
        contratoAquisicaoArquivoNome VARCHAR(255),
        contratoAquisicaoArquivoTamanho INT,
        contratoAquisicaoDataAssinatura VARCHAR(50),
        contratoAquisicaoArquivoKey VARCHAR(255),
        contratoAquisicaoArquivoStorage VARCHAR(20),
        contratoAdmStatus VARCHAR(50) DEFAULT 'sem_contrato',
        contratoAdmArquivoUrl LONGTEXT,
        contratoAdmArquivoNome VARCHAR(255),
        contratoAdmArquivoTamanho INT,
        contratoAdmDataAssinatura VARCHAR(50),
        contratoAdmArquivoKey VARCHAR(255),
        contratoAdmArquivoStorage VARCHAR(20),
        contratoValores LONGTEXT,
        contratos LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN bairro VARCHAR(100);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN dataNascimento VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN statusFinanceiro VARCHAR(50) DEFAULT 'em_dia';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN observacoesFinanceiras TEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN cnh_cha VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN profissao VARCHAR(100);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN estadoCivil VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN rg VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN orgaoEmissor VARCHAR(100);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN numeroHabilitacao VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN validadeHabilitacao VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN orgaoEmissorHabilitacao VARCHAR(100);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN categoriaHabilitacao VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN status VARCHAR(20) DEFAULT 'ativo';`); } catch (e) {}

    try {
      await connection.query(`ALTER TABLE Clientes ADD COLUMN plano VARCHAR(20) DEFAULT 'normal';`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE Clientes ADD COLUMN asaasCustomerId VARCHAR(100);`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE Clientes ADD COLUMN acessorios TEXT;`);
    } catch (e) {}

    // Migrações para suporte a contratos oficiais e assinados (R2 / Local)
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN nacionalidade VARCHAR(100);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN statusContrato VARCHAR(50) DEFAULT 'sem_contrato';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN tipoContrato VARCHAR(50) DEFAULT 'aquisicao';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoDataEmissao VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoDataAssinatura VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoArquivoUrl LONGTEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoArquivoNome VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoArquivoTamanho INT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoObservacoes TEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoStatus VARCHAR(50) DEFAULT 'sem_contrato';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoArquivoUrl LONGTEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoArquivoNome VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoArquivoTamanho INT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoDataAssinatura VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoArquivoKey VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAquisicaoArquivoStorage VARCHAR(20);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmStatus VARCHAR(50) DEFAULT 'sem_contrato';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmArquivoUrl LONGTEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmArquivoNome VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmArquivoTamanho INT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmDataAssinatura VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmArquivoKey VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAdmArquivoStorage VARCHAR(20);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoStatus VARCHAR(50) DEFAULT 'sem_contrato';`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoArquivoUrl LONGTEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoArquivoNome VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoArquivoTamanho INT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoDataAssinatura VARCHAR(50);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoArquivoKey VARCHAR(255);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoAditivoArquivoStorage VARCHAR(20);`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratoValores LONGTEXT;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Clientes ADD COLUMN contratos LONGTEXT;`); } catch (e) {}

    // 2. Embarcacoes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Embarcacoes (
        id VARCHAR(50) PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        numero VARCHAR(20),
        modelo VARCHAR(255),
        fabricante VARCHAR(255),
        ano INT,
        chassi VARCHAR(100),
        inscricao VARCHAR(100),
        tipo_propulsao VARCHAR(100),
        potencia VARCHAR(100),
        donos TEXT,
        googleCalendarId VARCHAR(100),
        whatsappGroupId VARCHAR(255),
        emManutencao TINYINT(1) DEFAULT 0,
        temSom TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Attempt to add columns if missing
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN emManutencao TINYINT(1) DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN whatsappGroupId VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN imagemUrl VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN temSom TINYINT(1) DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN documentoUrl VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN seguroUrl VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN chassi VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN inscricao VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN tipo_propulsao VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN potencia VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN acessorios TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN horasMotor INT DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN ultimaAtualizacaoHoras VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN horasUltimaManutencao INT DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN historicoHoras TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN capacidadePassageiros INT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN totalCotas INT DEFAULT 4;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN vaga VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN tamanho VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN valorCota DECIMAL(12,2) DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Embarcacoes ADD COLUMN taxaAdmMensal DECIMAL(10,2) DEFAULT 0;`);
    } catch (e) {}

    // 3. Reservas Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Reservas (
        id VARCHAR(50) PRIMARY KEY,
        embarcacaoId VARCHAR(50) NOT NULL,
        clienteId VARCHAR(50) NOT NULL,
        data VARCHAR(20) NOT NULL,
        periodo VARCHAR(50) NOT NULL,
        observacoes TEXT,
        googleEventId VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'confirmado',
        createdAt VARCHAR(50) NOT NULL,
        horaSaida VARCHAR(50),
        horaChegada VARCHAR(50),
        destino VARCHAR(255),
        pessoasABordo VARCHAR(50),
        fotosChecklistSaida TEXT,
        fotosChecklistChegada TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN horaSaida VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN horaChegada VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN fotosChecklistSaida TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN fotosChecklistChegada TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN acessoriosSolicitados TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN previsaoSaida VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN previsaoChegada VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN statusMarina VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN horaDescida VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN fotosChecklistDescida TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN operadorDescida VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN operadorSaida VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN operadorChegada VARCHAR(100);`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN destino VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN pessoasABordo VARCHAR(50);`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN somTesteRetorno VARCHAR(50) DEFAULT NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN confirmacaoEnviada TINYINT(1) DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN litrosAbastecidos VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN horaSubida VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN operadorSubida VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN fotosChecklistSubida TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoLitros VARCHAR(50);`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoStatusCobranca VARCHAR(50);`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoFormaPagamento VARCHAR(50);`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoValorTotal DECIMAL(10, 2);`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoComprovanteUrl TEXT;`);
      await connection.query(`ALTER TABLE Reservas ADD COLUMN abastecimentoOperador VARCHAR(100);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN tipoReserva VARCHAR(20) DEFAULT 'garantida';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN contestadaPor VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN contestadaEm VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN acessoriosSolicitados TEXT;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN origem VARCHAR(20) DEFAULT 'cota';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN nomeAvulso VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN telefoneAvulso VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN modeloAvulso VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN tipoAvulso VARCHAR(20);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN posicaoFila INT DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN combustivelInicial VARCHAR(50);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN litrosAbastecerPrevio VARCHAR(20);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN marinheiroPiloto VARCHAR(150);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE Reservas ADD COLUMN observacoesDescida TEXT;`);
    } catch (e) {}

    // 4. ControlesSom Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ControlesSom (
        id VARCHAR(50) PRIMARY KEY,
        reservaId VARCHAR(50),
        embarcacaoId VARCHAR(50) NOT NULL,
        clienteId VARCHAR(50) NOT NULL,
        data VARCHAR(50) NOT NULL,
        somRetirado TINYINT(1) DEFAULT 0,
        somTesteSaida VARCHAR(50),
        somTesteRetorno VARCHAR(50),
        observacoes TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Config Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Config (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. AdminUsers Table (Security Phase 1)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS AdminUsers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE AdminUsers ADD COLUMN role VARCHAR(50) DEFAULT 'admin';`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE AdminUsers ADD COLUMN funcionarioId VARCHAR(50) NULL;`);
    } catch (e) {}

    // 7. ClienteAuth Table (Security Phase 1)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ClienteAuth (
        clienteId VARCHAR(50) PRIMARY KEY,
        passwordHash VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7b. UserPreferences Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS UserPreferences (
        userId INT PRIMARY KEY,
        logoUrl VARCHAR(500),
        backgroundUrl VARCHAR(500),
        greetingText VARCHAR(500),
        FOREIGN KEY (userId) REFERENCES AdminUsers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. TransacoesFinanceiras Table (Financial Module)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TransacoesFinanceiras (
        id VARCHAR(50) PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        dataVencimento VARCHAR(20) NOT NULL,
        dataPagamento VARCHAR(20),
        status VARCHAR(20) NOT NULL,
        descricao TEXT,
        clienteId VARCHAR(50),
        embarcacaoId VARCHAR(50),
        comprovante VARCHAR(255),
        createdAt VARCHAR(50) NOT NULL,
        asaasPaymentId VARCHAR(100),
        asaasPaymentUrl VARCHAR(255),
        empresa VARCHAR(50) NOT NULL DEFAULT 'Marina',
        contaBancariaId VARCHAR(50),
        planoContasId VARCHAR(50),
        centroCustoId VARCHAR(50),
        fornecedorId VARCHAR(50),
        grupoParcelamentoId VARCHAR(50),
        numeroParcela INT DEFAULT 1,
        totalParcelas INT DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN comprovante VARCHAR(255) NULL;`);
    } catch (e) {
      // Ignore if column already exists
    }

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN asaasPaymentId VARCHAR(100) NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN asaasPaymentUrl VARCHAR(255) NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN asaasBatchId VARCHAR(100) NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN reservaId VARCHAR(50) NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN metodoPagamento VARCHAR(50) NULL;`);
    } catch (e) {}

    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN operador VARCHAR(100) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN metadata JSON NULL;`);
    } catch (e) {}

    // Multi-empresa Finance additions:
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN empresa VARCHAR(50) NOT NULL DEFAULT 'Marina';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN contaBancariaId VARCHAR(50) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN planoContasId VARCHAR(50) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN centroCustoId VARCHAR(50) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN fornecedorId VARCHAR(50) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN grupoParcelamentoId VARCHAR(50) NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN numeroParcela INT DEFAULT 1;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE TransacoesFinanceiras ADD COLUMN totalParcelas INT DEFAULT 1;`);
    } catch (e) {}

    // 8a. ContasBancarias Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ContasBancarias (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        banco VARCHAR(100),
        agencia VARCHAR(50),
        conta VARCHAR(50),
        saldoInicial DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ativo',
        parentId VARCHAR(50),
        asaasWalletId VARCHAR(255),
        asaasSplitAtivo TINYINT(1) DEFAULT 0,
        asaasSplitTipo VARCHAR(20) DEFAULT 'PERCENTAGE',
        asaasSplitValor DECIMAL(10, 2) DEFAULT 100.00,
        isContaPrincipalAsaas TINYINT(1) DEFAULT 0,
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE ContasBancarias ADD COLUMN asaasWalletId VARCHAR(255);`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE ContasBancarias ADD COLUMN asaasSplitAtivo TINYINT(1) DEFAULT 0;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE ContasBancarias ADD COLUMN asaasSplitTipo VARCHAR(20) DEFAULT 'PERCENTAGE';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE ContasBancarias ADD COLUMN asaasSplitValor DECIMAL(10, 2) DEFAULT 100.00;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE ContasBancarias ADD COLUMN isContaPrincipalAsaas TINYINT(1) DEFAULT 0;`);
    } catch (e) {}

    
    // 8.5 CentrosDeCusto Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CentrosDeCusto (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8b. PlanosDeContas Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS PlanosDeContas (
        id VARCHAR(50) PRIMARY KEY,
        codigoContabil VARCHAR(50),
        descricao VARCHAR(255) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        empresa VARCHAR(50) DEFAULT 'Todos',
        status VARCHAR(20) DEFAULT 'ativo',
        parentId VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE PlanosDeContas ADD COLUMN parentId VARCHAR(50);`);
    } catch (e) {}

    // 8c. Fornecedores Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Fornecedores (
        id VARCHAR(50) PRIMARY KEY,
        nomeFantasia VARCHAR(255) NOT NULL,
        razaoSocial VARCHAR(255),
        cnpjCpf VARCHAR(50),
        empresaId VARCHAR(50),
        dadosBancarios TEXT,
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. AtividadesFinanceiras Table (Kanban)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS AtividadesFinanceiras (
        id VARCHAR(50) PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'a_fazer',
        setor VARCHAR(50) DEFAULT 'financeiro',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE AtividadesFinanceiras ADD COLUMN setor VARCHAR(50) DEFAULT 'financeiro';`);
    } catch (e) {}

    // 10. Feedbacks Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Feedbacks (
        id VARCHAR(50) PRIMARY KEY,
        clienteId VARCHAR(50),
        nomeCliente VARCHAR(255),
        telefoneCliente VARCHAR(50),
        categoria VARCHAR(100) NOT NULL,
        nota INT NOT NULL,
        comentario TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pendente',
        respostaAdmin TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Manutencoes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Manutencoes (
        id VARCHAR(50) PRIMARY KEY,
        embarcacaoId VARCHAR(50) NOT NULL,
        dataSaida VARCHAR(20) NOT NULL,
        mecanico VARCHAR(255),
        orcamento DECIMAL(10, 2),
        custo DECIMAL(10, 2),
        valorRepassado DECIMAL(10, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'em_andamento',
        createdAt VARCHAR(50) NOT NULL,
        descricaoServico TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const manutCols = [
      "ALTER TABLE Manutencoes ADD COLUMN codigoOS VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN chamadoId VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN tipoManutencaoId VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN tipoManutencaoNome VARCHAR(255);",
      "ALTER TABLE Manutencoes ADD COLUMN categoria VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN mecanicoResponsavelId VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN mecanicoNome VARCHAR(255);",
      "ALTER TABLE Manutencoes ADD COLUMN dataEntradaOficina VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN previsaoTermino VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN dataTermino VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN concluidoEm VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN urgencia VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN custoTotal DECIMAL(10, 2);",
      "ALTER TABLE Manutencoes ADD COLUMN titulo VARCHAR(255);",
      "ALTER TABLE Manutencoes ADD COLUMN tituloChamado VARCHAR(255);",
      "ALTER TABLE Manutencoes ADD COLUMN dataChamado VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN prazoEntrega VARCHAR(20);",
      "ALTER TABLE Manutencoes ADD COLUMN orcamentoAprovado TINYINT(1) DEFAULT 0;",
      "ALTER TABLE Manutencoes ADD COLUMN localizacao VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN descricaoServico TEXT;",
      "ALTER TABLE Manutencoes ADD COLUMN gerarFinanceiro TINYINT(1) DEFAULT 1;",
      "ALTER TABLE Manutencoes ADD COLUMN horasMotorAtual INT;",
      "ALTER TABLE Manutencoes ADD COLUMN proximaRevisaoHoras INT;",
      "ALTER TABLE Manutencoes ADD COLUMN acessorios TEXT;",
      "ALTER TABLE Manutencoes ADD COLUMN pecas TEXT;",
      "ALTER TABLE Manutencoes ADD COLUMN whatsappStatus VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN clienteId VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN fornecedorId VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN oficinaNome VARCHAR(255);",
      "ALTER TABLE Manutencoes ADD COLUMN custoReal DECIMAL(10, 2);",
      "ALTER TABLE Manutencoes ADD COLUMN margemLucro DECIMAL(10, 2);",
      "ALTER TABLE Manutencoes ADD COLUMN dataEnvioOrcamento VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN orcamentoStatus VARCHAR(50);",
      "ALTER TABLE Manutencoes ADD COLUMN cotistasSelecionados TEXT;"
    ];
    for (const sql of manutCols) {
      try { await connection.query(sql); } catch (e) {}
    }

    // 12. Mecanicos Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Mecanicos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12.1 TiposManutencao Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TiposManutencao (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [existingTipos] = await connection.query("SELECT COUNT(*) as cnt FROM TiposManutencao");
      if ((existingTipos as any[])[0]?.cnt === 0) {
        const defaultTipos = [
          ['tip_1', 'Troca de Óleo e Filtros', 'Substituição de óleo do motor, filtro de óleo, filtro de combustível e rotor', new Date().toISOString()],
          ['tip_2', 'Revisão Preventiva Periódica', 'Checagem completa de 50h, 100h ou anual com troca de fluidos', new Date().toISOString()],
          ['tip_3', 'Reparo de Motor / Rabeta', 'Serviço mecânico em bloco, cabeçote, hélice ou rabeta', new Date().toISOString()],
          ['tip_4', 'Sistema Elétrico & Baterias', 'Inspeção de chicote, alternador, baterias e fiação', new Date().toISOString()],
          ['tip_5', 'Bomba de Porão & Automático', 'Troca ou reparo da bomba de esgotamento e sensor', new Date().toISOString()],
          ['tip_6', 'Tapeçaria & Estofamento', 'Reparo de bancos, capas e acabamento de couro náutico', new Date().toISOString()],
          ['tip_7', 'Pintura, Fibra & Gel Coat', 'Reparos de casco, polimento, retoque de tinta e gel coat', new Date().toISOString()],
          ['tip_8', 'Instalação de Eletrônicos & Som', 'Instalação de GPS, sonar, som náutico e acessórios', new Date().toISOString()],
          ['tip_9', 'Manutenção de Jet Ski', 'Revisão de turbina, cinta, vela e motor de jet ski', new Date().toISOString()],
          ['tip_10', 'Outros Serviços Náuticos', 'Serviços gerais sob demanda', new Date().toISOString()]
        ];
        for (const t of defaultTipos) {
          await connection.query(
            "INSERT IGNORE INTO TiposManutencao (id, nome, descricao, createdAt) VALUES (?, ?, ?, ?)",
            t
          );
        }
      }
    } catch (errTipos) {
      console.warn("Could not seed default TiposManutencao:", errTipos);
    }

    // 13. ChatMessages Table (Internal Portal)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ChatMessages (
        id VARCHAR(50) PRIMARY KEY,
        senderId VARCHAR(50) NOT NULL,
        senderName VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        isSystemMessage TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. DriveFolders Table (Internal Portal)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DriveFolders (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parentId VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. DriveFiles Table (Internal Portal)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DriveFiles (
        id VARCHAR(50) PRIMARY KEY,
        folderId VARCHAR(50),
        filename VARCHAR(255) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(100),
        size INT,
        uploadedBy VARCHAR(100) NOT NULL,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`ALTER TABLE DriveFolders ADD COLUMN clienteId VARCHAR(50) DEFAULT NULL;`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE DriveFiles ADD COLUMN clienteId VARCHAR(50) DEFAULT NULL;`);
    } catch (e) {}

    // 16. Funcionarios Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Funcionarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cargo VARCHAR(255),
        setor VARCHAR(255),
        cpf VARCHAR(20),
        admissao VARCHAR(20),
        usuarioId VARCHAR(50),
        turnos TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. Folgas Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Folgas (
        id VARCHAR(50) PRIMARY KEY,
        funcionarioId VARCHAR(50) NOT NULL,
        data VARCHAR(20) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        motivo TEXT,
        observacao TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. Leads Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Leads (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        pontuacao INT DEFAULT 0,
        detalhes TEXT,
        status VARCHAR(50) DEFAULT 'novo',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Auto-migration for Leads columns
    const leadColumnsMigration = [
      "ALTER TABLE Leads ADD COLUMN cidade VARCHAR(100);",
      "ALTER TABLE Leads ADD COLUMN cpf VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN etapaFunil VARCHAR(50) DEFAULT 'novo';",
      "ALTER TABLE Leads ADD COLUMN perfilNautico TEXT;",
      "ALTER TABLE Leads ADD COLUMN embarcacoesInteresse TEXT;",
      "ALTER TABLE Leads ADD COLUMN tipoInteresse VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN vendedorId VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN vendedorNome VARCHAR(150);",
      "ALTER TABLE Leads ADD COLUMN origem VARCHAR(50) DEFAULT 'instagram';",
      "ALTER TABLE Leads ADD COLUMN indicadoPorClienteId VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN indicadoPorClienteNome VARCHAR(150);",
      "ALTER TABLE Leads ADD COLUMN temperatura VARCHAR(20) DEFAULT 'morno';",
      "ALTER TABLE Leads ADD COLUMN valorEstimado DECIMAL(12,2) DEFAULT 0;",
      "ALTER TABLE Leads ADD COLUMN proximoContatoEm VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN dataVisitaAgendada VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN possuiPermuta TINYINT(1) DEFAULT 0;",
      "ALTER TABLE Leads ADD COLUMN resumoPermuta TEXT;",
      "ALTER TABLE Leads ADD COLUMN motivoPerda VARCHAR(255);",
      "ALTER TABLE Leads ADD COLUMN timeline TEXT;",
      "ALTER TABLE Leads ADD COLUMN filaEsperaEmbarcacaoId VARCHAR(50);",
      "ALTER TABLE Leads ADD COLUMN utmSource VARCHAR(100);",
      "ALTER TABLE Leads ADD COLUMN utmMedium VARCHAR(100);",
      "ALTER TABLE Leads ADD COLUMN utmCampaign VARCHAR(100);"
    ];
    for (const migQuery of leadColumnsMigration) {
      try {
        await connection.query(migQuery);
      } catch (e) {
        // Ignora caso coluna já exista
      }
    }

    // Tabelas Comerciais Adicionais (CRM, Propostas, Cotas Reservadas, Permutas, CheckinVisitas)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS PropostasComerciais (
        id VARCHAR(50) PRIMARY KEY,
        codigoProposta VARCHAR(50) NOT NULL,
        leadId VARCHAR(50),
        leadNome VARCHAR(255),
        leadTelefone VARCHAR(50),
        leadEmail VARCHAR(100),
        leadCpf VARCHAR(50),
        vendedorId VARCHAR(50),
        vendedorNome VARCHAR(150),
        embarcacaoId VARCHAR(50) NOT NULL,
        cota VARCHAR(50) NOT NULL,
        tipoCota VARCHAR(50) DEFAULT 'estoque_mexicano',
        repasseClienteId VARCHAR(50),
        valorTotal DECIMAL(12,2) DEFAULT 0,
        valorEntrada DECIMAL(12,2) DEFAULT 0,
        dataVencimentoEntrada VARCHAR(50),
        formaPagamentoEntrada VARCHAR(50),
        numParcelas INT DEFAULT 0,
        valorParcela DECIMAL(12,2) DEFAULT 0,
        diaVencimento INT DEFAULT 10,
        dataPrimeiraParcela VARCHAR(50),
        formaPagamentoParcelas VARCHAR(50),
        baloesIntermediarios TEXT,
        permutaInfo TEXT,
        taxaAdmEstimada DECIMAL(10,2) DEFAULT 0,
        comparativoCustoInfo TEXT,
        status VARCHAR(50) DEFAULT 'enviada',
        validadeAte VARCHAR(50),
        tokenPublico VARCHAR(100) UNIQUE,
        visualizadaEm VARCHAR(50),
        aceitaEm VARCHAR(50),
        observacoes TEXT,
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS CotasReservadas (
        id VARCHAR(50) PRIMARY KEY,
        embarcacaoId VARCHAR(50) NOT NULL,
        cota VARCHAR(50) NOT NULL,
        propostaId VARCHAR(50),
        leadId VARCHAR(50),
        leadNome VARCHAR(255),
        vendedorId VARCHAR(50),
        vendedorNome VARCHAR(150),
        motivoReserva VARCHAR(255),
        expiraEm VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'ativa',
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS Permutas (
        id VARCHAR(50) PRIMARY KEY,
        propostaId VARCHAR(50),
        leadId VARCHAR(50),
        leadNome VARCHAR(255),
        tipoBem VARCHAR(50) DEFAULT 'lancha',
        marcaModelo VARCHAR(255) NOT NULL,
        ano INT,
        valorPropostoCliente DECIMAL(12,2) DEFAULT 0,
        valorAprovadoDiretoria DECIMAL(12,2),
        statusAvaliacao VARCHAR(50) DEFAULT 'aguardando_avaliacao',
        motivoAvaliacao TEXT,
        avaliadoPor VARCHAR(150),
        avaliadoEm VARCHAR(50),
        fotos TEXT,
        documentos TEXT,
        observacoes TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS CheckinVisitas (
        id VARCHAR(50) PRIMARY KEY,
        reservaId VARCHAR(50),
        leadId VARCHAR(50),
        embarcacaoId VARCHAR(50) NOT NULL,
        vendedorId VARCHAR(50),
        dataVisita VARCHAR(50) NOT NULL,
        compareceu TINYINT(1) DEFAULT 1,
        avaliacaoLead INT DEFAULT 5,
        feedbackLead TEXT,
        proximosPassos TEXT,
        temperaturaLead VARCHAR(50) DEFAULT 'quente',
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS HistoricoCotas (
        id VARCHAR(50) PRIMARY KEY,
        embarcacaoId VARCHAR(50) NOT NULL,
        cota VARCHAR(50) NOT NULL,
        tipoOperacao VARCHAR(50) NOT NULL,
        clienteOrigemId VARCHAR(50),
        clienteOrigemNome VARCHAR(255),
        clienteDestinoId VARCHAR(50),
        clienteDestinoNome VARCHAR(255),
        valor DECIMAL(12,2) DEFAULT 0,
        dataOperacao VARCHAR(50) NOT NULL,
        observacoes TEXT,
        criadoPor VARCHAR(150),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default admin user if none exists
    const [existingAdmins] = await connection.query("SELECT COUNT(*) as cnt FROM AdminUsers");
    const adminCount = (existingAdmins as any[])[0]?.cnt || 0;
    if (adminCount === 0) {
      const crypto = await import("crypto");
      const randomPassword = crypto.randomBytes(8).toString('hex');
      const bcrypt = await import("bcryptjs");
      const defaultHash = await bcrypt.hash(randomPassword, 12);
      await connection.query(
        "INSERT INTO AdminUsers (username, passwordHash) VALUES (?, ?)",
        ["admin", defaultHash]
      );
      console.log(`================================================================`);
      console.log(`⚠️ DEFAULT ADMIN CREATED.`);
      console.log(`USERNAME: admin`);
      console.log(`PASSWORD: ${randomPassword}`);
      console.log(`SAVE THIS PASSWORD NOW. IT WILL NOT BE SHOWN AGAIN.`);
      console.log(`================================================================`);
    }
    
    // Migration: Clean up bad auto-generated duplicate observations (like "M19 - DEIVID NICO")
    try {
      console.log("Running migration to clean up auto-generated duplicate event observations in Reservas...");
      const [migResult] = await connection.query(`
        UPDATE Reservas 
        SET observacoes = '' 
        WHERE observacoes IN ('Nenhuma', 'Nenhuma.', 'Atualizado via Google Agenda', 'Atualizado via Google Agenda.', 'Nenhuma descrição relevante', 'Nenhuma descrição relevante.', 'Nenhuma observação', 'Nenhuma observacao')
           OR observacoes REGEXP '^M[0-9]{2}[[:space:]]*-'
      `);
      console.log(`Cleaned up ${(migResult as any).affectedRows} duplicate/placeholder observations in Reservas table.`);
    } catch (migErr) {
      console.warn("Skipped or failed Reservas observations cleanup migration:", migErr);
    }

    // Migration: Clean up duplicate reservations by googleEventId (keeping the best one)
    try {
      console.log("Running migration to clean up duplicate reservations by googleEventId...");
      const [dupRows] = await connection.query(`
        SELECT googleEventId, GROUP_CONCAT(id ORDER BY 
          CASE WHEN status IN ('confirmado', 'agendado') THEN 0 ELSE 1 END,
          createdAt DESC
        ) as ids
        FROM Reservas 
        WHERE googleEventId IS NOT NULL AND googleEventId != '' AND googleEventId NOT LIKE 'g_sim_%'
        GROUP BY googleEventId 
        HAVING COUNT(*) > 1
      `);
      
      let dupDeleted = 0;
      for (const row of dupRows as any[]) {
        const ids = row.ids.split(',');
        const deleteIds = ids.slice(1);
        if (deleteIds.length > 0) {
          await connection.query('DELETE FROM Reservas WHERE id IN (?)', [deleteIds]);
          dupDeleted += deleteIds.length;
        }
      }
      if (dupDeleted > 0) {
        console.log(`Cleaned up ${dupDeleted} duplicate reservations from Reservas table.`);
      }
    } catch (dupErr) {
      console.warn("Skipped or failed duplicate reservations cleanup migration:", dupErr);
    }

    // 18. FuncionariosEPIs Table (Lista fixa de EPIs por funcionário)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS FuncionariosEPIs (
        id VARCHAR(50) PRIMARY KEY,
        funcionarioId VARCHAR(50) NOT NULL,
        descricao VARCHAR(255),
        ca VARCHAR(50),
        quantidade VARCHAR(50),
        dataEntrega VARCHAR(50),
        dataDevolucao VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pendente',
        geradoEm VARCHAR(50),
        historicoTrocas JSON
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 19. HistoricoEPIMensal Table (Log de impressões)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS HistoricoEPIMensal (
        id VARCHAR(50) PRIMARY KEY,
        funcionarioId VARCHAR(50) NOT NULL,
        mesAno VARCHAR(20) NOT NULL,
        dadosSnapshot TEXT NOT NULL,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 20. CatalogoEPIs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CatalogoEPIs (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        caPadrao VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 21. RegistrosAtividades Table (Audit Logs)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS RegistrosAtividades (
        id VARCHAR(50) PRIMARY KEY,
        operadorNome VARCHAR(255) NOT NULL,
        acao VARCHAR(255) NOT NULL,
        detalhes TEXT,
        embarcacaoId VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ClienteEmpresas (
        clienteId VARCHAR(50) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        PRIMARY KEY (clienteId, empresa),
        FOREIGN KEY (clienteId) REFERENCES Clientes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS EmbarcacaoEmpresas (
        embarcacaoId VARCHAR(50) NOT NULL,
        empresa VARCHAR(50) NOT NULL,
        PRIMARY KEY (embarcacaoId, empresa),
        FOREIGN KEY (embarcacaoId) REFERENCES Embarcacoes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query(`
        INSERT INTO ClienteEmpresas (clienteId, empresa)
        SELECT id, 'VALE' FROM Clientes
        WHERE id NOT IN (SELECT clienteId FROM ClienteEmpresas)
      `);
      await connection.query(`
        INSERT INTO EmbarcacaoEmpresas (embarcacaoId, empresa)
        SELECT id, 'VALE' FROM Embarcacoes
        WHERE id NOT IN (SELECT embarcacaoId FROM EmbarcacaoEmpresas)
      `);
      console.log("✅ Multi-company associations migrated for existing records.");
    } catch(migErr) {
      console.warn("Failed to migrate multi-company associations:", migErr);
    }

    try {
      const [existingEPIs] = await connection.query("SELECT COUNT(*) as cnt FROM CatalogoEPIs");
      const epiCount = (existingEPIs as any[])[0]?.cnt || 0;
      if (epiCount === 0) {
        const defaultEPIs = [
          { nome: "Óculos Preto", caPadrao: "" },
          { nome: "Chapéu Árabe", caPadrao: "" },
          { nome: "Luva de Borracha", caPadrao: "" },
          { nome: "Luva de Pano", caPadrao: "" },
          { nome: "Sapatilha", caPadrao: "" },
          { nome: "Óculos Transparente", caPadrao: "" },
          { nome: "Calça Térmica", caPadrao: "" },
          { nome: "Protetor Auricular", caPadrao: "" },
          { nome: "Camisa UV", caPadrao: "" },
          { nome: "Repelente", caPadrao: "" },
          { nome: "Protetor Solar", caPadrao: "" },
          { nome: "Macacão de Água", caPadrao: "" },
          { nome: "Colete Homologado Classe 5", caPadrao: "" },
          { nome: "Lanterna de Mão", caPadrao: "" },
          { nome: "Lanterna de Cabeça", caPadrao: "" }
        ];
        
        for (const epi of defaultEPIs) {
          await connection.query(
            "INSERT INTO CatalogoEPIs (id, nome, caPadrao, createdAt) VALUES (?, ?, ?, ?)",
            [`epi_cat_${Date.now()}_${Math.floor(Math.random()*1000)}`, epi.nome, epi.caPadrao, new Date().toISOString()]
          );
        }
        console.log(`✅ CatalogoEPIs table seeded with ${defaultEPIs.length} default items.`);
      }
    } catch(seedErr) {
      console.warn("Failed to seed CatalogoEPIs:", seedErr);
    }

    try {
      await connection.query("UPDATE TransacoesFinanceiras SET status = 'lancado' WHERE status IN ('pendente', 'em_aprovacao', 'aguardando_aprovacao')");
      await connection.query("UPDATE TransacoesFinanceiras SET status = 'vencido' WHERE status = 'atrasado'");
      console.log("✅ Financial statuses migrated to unified format.");
    } catch(migErr) {
      console.warn("Failed to migrate financial statuses:", migErr);
    }

    // ── Chamados table ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Chamados (
        id VARCHAR(50) PRIMARY KEY,
        codigoChamado VARCHAR(50) NOT NULL,
        embarcacaoId VARCHAR(50) NOT NULL,
        solicitanteTipo VARCHAR(50) NOT NULL,
        solicitanteNome VARCHAR(255) NOT NULL,
        clienteId VARCHAR(50),
        titulo VARCHAR(255) NOT NULL,
        descricaoAvaria TEXT NOT NULL,
        urgencia VARCHAR(20) NOT NULL DEFAULT 'media',
        status VARCHAR(50) NOT NULL DEFAULT 'pendente',
        osId VARCHAR(50),
        dataAbertura VARCHAR(20) NOT NULL,
        observacoesAnalise TEXT,
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Chamados table ready.");

    try {
      await ensureInternalMexicanoClient(connection);
      await reconcileBoatCotasWithMexicano(connection);
      console.log("✅ Mexicano internal quotas and inventory reconciled for all boats.");
    } catch(mexErr) {
      console.warn("Failed to reconcile Mexicano boat quotas:", mexErr);
    }

    // ── 27. CaixaMarinaTransacoes Table ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CaixaMarinaTransacoes (
        id VARCHAR(50) PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        formaPagamento VARCHAR(50) NOT NULL,
        data VARCHAR(20) NOT NULL,
        hora VARCHAR(10),
        status VARCHAR(20) DEFAULT 'confirmado',
        clienteTipo VARCHAR(20) DEFAULT 'avulso',
        clienteId VARCHAR(50) NULL,
        clienteNome VARCHAR(255) NULL,
        embarcacaoId VARCHAR(50) NULL,
        embarcacaoNome VARCHAR(255) NULL,
        reservaId VARCHAR(50) NULL,
        combustivelLitros DECIMAL(10, 2) NULL,
        quantidadeColetes INT NULL,
        coletesDevolvidos TINYINT(1) DEFAULT 0,
        dataDevolucaoColetes VARCHAR(50) NULL,
        comprovanteUrl VARCHAR(500) NULL,
        observacoes TEXT NULL,
        registradoPor VARCHAR(100) NOT NULL,
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NULL,
        INDEX idx_caixa_data (data),
        INDEX idx_caixa_tipo (tipo),
        INDEX idx_caixa_categoria (categoria),
        INDEX idx_caixa_status (status),
        INDEX idx_caixa_forma_pagto (formaPagamento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ── 28. CaixaMarinaFechamentos Table ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS CombustivelEstoque (
        id INT PRIMARY KEY DEFAULT 1,
        tanque_principal DECIMAL(10,2) DEFAULT 0,
        tanque_capacidade DECIMAL(10,2) DEFAULT 1000,
        alerta_minimo DECIMAL(10,2) DEFAULT 200,
        galoes_qtd INT DEFAULT 0,
        galoes_capacidade DECIMAL(10,2) DEFAULT 20,
        galao_parcial DECIMAL(10,2) DEFAULT 0,
        ultima_atualizacao VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure the default row exists
    try {
      await connection.query('INSERT IGNORE INTO CombustivelEstoque (id, ultima_atualizacao) VALUES (1, ?)', [new Date().toLocaleDateString('pt-BR')]);
    } catch (e) {
      console.error('Error inserting CombustivelEstoque default row', e);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS CombustivelMovimentacoes (
        id VARCHAR(50) PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL,
        litros DECIMAL(10,2) DEFAULT 0,
        galoes INT DEFAULT 0,
        fornecedor VARCHAR(100),
        nota_fiscal VARCHAR(50),
        valor_total DECIMAL(10,2),
        barco_nome VARCHAR(100),
        operador VARCHAR(100),
        data_hora DATETIME,
        detalhes TEXT,
        diferenca_litros DECIMAL(10,2) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS CombustivelHistorico (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data VARCHAR(20) NOT NULL,
        operador VARCHAR(100),
        barco VARCHAR(100),
        litros DECIMAL(10,2),
        detalhes TEXT,
        tipo VARCHAR(20) DEFAULT 'consumo'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS CaixaMarinaFechamentos (
        id VARCHAR(50) PRIMARY KEY,
        data VARCHAR(20) NOT NULL UNIQUE,
        saldoAberturaDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        totalEntradasDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        totalSaidasDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        totalSangriasDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        saldoEsperadoDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        saldoContadoDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        diferencaDinheiro DECIMAL(10, 2) DEFAULT 0.00,
        totalPix DECIMAL(10, 2) DEFAULT 0.00,
        totalCartaoDebito DECIMAL(10, 2) DEFAULT 0.00,
        totalCartaoCredito DECIMAL(10, 2) DEFAULT 0.00,
        totalGeralEntradas DECIMAL(10, 2) DEFAULT 0.00,
        totalGeralSaidas DECIMAL(10, 2) DEFAULT 0.00,
        saldoFinalTotal DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'aberto',
        abertoPor VARCHAR(100) NULL,
        abertoEm VARCHAR(50) NULL,
        fechadoPor VARCHAR(100) NULL,
        fechadoEm VARCHAR(50) NULL,
        observacoesFechamento TEXT NULL,
        createdAt VARCHAR(50) NOT NULL,
        INDEX idx_fechamento_data (data)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Caixa da Marina tables ready.");

    // ── UTV (Veículos de Trilha) Tables ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS UtvVeiculos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        modelo VARCHAR(255),
        ano INT,
        placa_chassi VARCHAR(100),
        kmAtual DECIMAL(10, 2) DEFAULT 0.00,
        horimetroAtual DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'disponivel',
        imagemUrl TEXT,
        observacoes TEXT,
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS UtvCotistas (
        id VARCHAR(50) PRIMARY KEY,
        clienteId VARCHAR(50) NULL,
        nome VARCHAR(255) NOT NULL,
        cotaNumero VARCHAR(50) NOT NULL,
        telefone VARCHAR(50),
        email VARCHAR(100),
        cpf VARCHAR(50),
        limiteDiasAnual INT DEFAULT 30,
        anoExercicio INT DEFAULT 2026,
        status VARCHAR(20) DEFAULT 'ativo',
        createdAt VARCHAR(50) NOT NULL,
        INDEX idx_utv_cotistas_ano (anoExercicio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS UtvUsos (
        id VARCHAR(50) PRIMARY KEY,
        veiculoId VARCHAR(50) NOT NULL,
        cotistaId VARCHAR(50) NOT NULL,
        dataUso VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'reservado',
        horaSaida VARCHAR(20),
        kmInicial DECIMAL(10, 2),
        horimetroInicial DECIMAL(10, 2),
        limpezaSaida VARCHAR(50),
        tanqueSaida VARCHAR(50) DEFAULT 'cheio',
        fotosSaida TEXT,
        observacoesSaida TEXT,
        operadorSaida VARCHAR(100),
        horaChegada VARCHAR(20),
        kmFinal DECIMAL(10, 2),
        horimetroFinal DECIMAL(10, 2),
        kmRodado DECIMAL(10, 2) DEFAULT 0.00,
        horasUtilizadas DECIMAL(10, 2) DEFAULT 0.00,
        limpezaChegada VARCHAR(50),
        tanqueChegada VARCHAR(50) DEFAULT 'cheio',
        tanqueCheioDevolvido TINYINT(1) DEFAULT 1,
        comprovanteAbastecimentoUrl TEXT,
        avarias TEXT,
        fotosChegada TEXT,
        observacoesChegada TEXT,
        operadorChegada VARCHAR(100),
        fechadoEm VARCHAR(50),
        fechadoPor VARCHAR(100),
        canceladoEm VARCHAR(50),
        canceladoPor VARCHAR(100),
        motivoCancelamento TEXT,
        createdAt VARCHAR(50) NOT NULL,
        INDEX idx_utv_usos_data (dataUso),
        INDEX idx_utv_usos_cotista (cotistaId),
        INDEX idx_utv_usos_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS UtvManutencoes (
        id VARCHAR(50) PRIMARY KEY,
        veiculoId VARCHAR(50) NOT NULL,
        data VARCHAR(20) NOT NULL,
        descricao TEXT NOT NULL,
        valorTotal DECIMAL(10, 2) NOT NULL,
        criterioRateio VARCHAR(20) DEFAULT 'horas',
        detalhesRateio TEXT,
        registradoPor VARCHAR(100),
        createdAt VARCHAR(50) NOT NULL,
        INDEX idx_utv_manut_data (data)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ UTV tables ready.");

    // ── Comercial Vendas Table ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Vendas (
        id VARCHAR(50) PRIMARY KEY,
        codigoVenda VARCHAR(50) NOT NULL,
        dataVenda VARCHAR(20) NOT NULL,
        vendedorNome VARCHAR(150),
        clienteId VARCHAR(50) NOT NULL,
        embarcacaoId VARCHAR(50) NOT NULL,
        cota VARCHAR(50) NOT NULL,
        valorTotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        valorEntrada DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        dataVencimentoEntrada VARCHAR(20),
        formaPagamentoEntrada VARCHAR(100),
        entradaPaga TINYINT(1) DEFAULT 0,
        comprovanteEntrada VARCHAR(500),
        valorRemanescente DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        numParcelas INT NOT NULL DEFAULT 1,
        valorParcela DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        diaVencimento INT NOT NULL DEFAULT 10,
        dataPrimeiraParcela VARCHAR(20),
        formaPagamentoParcelas VARCHAR(100),
        gerouTaxaAdm TINYINT(1) DEFAULT 0,
        valorTaxaAdm DECIMAL(10, 2) DEFAULT 0.00,
        mesesTaxaAdm INT DEFAULT 12,
        diaVencimentoTaxaAdm INT DEFAULT 10,
        dataPrimeiraTaxaAdm VARCHAR(20),
        grupoParcelamentoId VARCHAR(80),
        grupoTaxaAdmId VARCHAR(80),
        transacaoEntradaId VARCHAR(80),
        empresa VARCHAR(50) DEFAULT 'Mexicano',
        planoContasId VARCHAR(50),
        centroCustoId VARCHAR(50),
        contaBancariaId VARCHAR(50),
        observacoes TEXT,
        status VARCHAR(30) DEFAULT 'ativa',
        comissaoLiberadaManual TINYINT(1) DEFAULT 0,
        dataConclusaoProcesso VARCHAR(20),
        createdAt VARCHAR(50) NOT NULL,
        INDEX idx_vendas_data (dataVenda),
        INDEX idx_vendas_cliente (clienteId),
        INDEX idx_vendas_embarcacao (embarcacaoId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    try { await connection.query(`ALTER TABLE Vendas ADD COLUMN comissaoLiberadaManual TINYINT(1) DEFAULT 0;`); } catch (e) {}
    try { await connection.query(`ALTER TABLE Vendas ADD COLUMN dataConclusaoProcesso VARCHAR(20);`); } catch (e) {}
    console.log("✅ Vendas table ready.");

    // ── Comercial Comissões — Fechamentos Quinzenais ──
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ComissoesFechamentos (
        id VARCHAR(80) PRIMARY KEY,
        competencia VARCHAR(20) NOT NULL,
        quinzena INT NOT NULL,
        status VARCHAR(30) DEFAULT 'aberto',
        cotasTotalPeriodo INT DEFAULT 0,
        cotasNovasQuinzena INT DEFAULT 0,
        valorUnitarioFaixa DECIMAL(12, 2) DEFAULT 0.00,
        comissaoBasePorVendedor DECIMAL(12, 2) DEFAULT 0.00,
        ajusteRetroativoPorVendedor DECIMAL(12, 2) DEFAULT 0.00,
        bonusSemanalPorVendedor DECIMAL(12, 2) DEFAULT 0.00,
        bonusMensalPorVendedor DECIMAL(12, 2) DEFAULT 0.00,
        totalVariavelPorVendedor DECIMAL(12, 2) DEFAULT 0.00,
        salarioFixoReferencia DECIMAL(12, 2) DEFAULT 1621.00,
        valeRefeicaoReferencia DECIMAL(12, 2) DEFAULT 250.00,
        qtdVendedoresAtivos INT DEFAULT 1,
        totalFolhaVariavelEquipe DECIMAL(12, 2) DEFAULT 0.00,
        dataFechamento VARCHAR(30),
        fechadoPor VARCHAR(150),
        observacoes TEXT,
        updatedAt VARCHAR(50) NOT NULL,
        UNIQUE KEY uk_comp_quinzena (competencia, quinzena)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ ComissoesFechamentos table ready.");

    connection.release();
    isInitialized = true;
    console.log("VPS Database tables validated/initialized successfully.");
    return true;
  } catch (err: any) {
    console.error("Failed to initialize database tables: ", err.message || err);
    connectionError = `Table initialization failure: ${err.message || err}`;
    return false;
  }
}

// ---------------- DB Operations ----------------

let dbCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds cache

export function invalidateDbCache() {
  dbCache = null;
}

// Fetch entire database records
export async function pullDatabase(forceFresh = false) {
  if (!forceFresh && dbCache && (Date.now() - dbCache.timestamp < CACHE_TTL_MS)) {
    return dbCache.data;
  }

  const currentPool = getDbPool();
  if (!currentPool) {
    throw new Error("MySQL Connection pool is offline.");
  }

  const [clients] = await currentPool.query("SELECT * FROM Clientes");
  const [boats] = await currentPool.query("SELECT * FROM Embarcacoes");
  const [clienteEmpresas] = await currentPool.query("SELECT * FROM ClienteEmpresas");
  const [embarcacaoEmpresas] = await currentPool.query("SELECT * FROM EmbarcacaoEmpresas");

  const clienteEmpresasMap = new Map<string, string[]>();
  (clienteEmpresas as any[]).forEach(row => {
    if (!clienteEmpresasMap.has(row.clienteId)) clienteEmpresasMap.set(row.clienteId, []);
    clienteEmpresasMap.get(row.clienteId)!.push(row.empresa);
  });

  const embarcacaoEmpresasMap = new Map<string, string[]>();
  (embarcacaoEmpresas as any[]).forEach(row => {
    if (!embarcacaoEmpresasMap.has(row.embarcacaoId)) embarcacaoEmpresasMap.set(row.embarcacaoId, []);
    embarcacaoEmpresasMap.get(row.embarcacaoId)!.push(row.empresa);
  });
  const [reservations] = await currentPool.query("SELECT * FROM Reservas");
  const [controlesSom] = await currentPool.query("SELECT * FROM ControlesSom ORDER BY createdAt DESC");
  const [manutencoes] = await currentPool.query("SELECT * FROM Manutencoes ORDER BY createdAt DESC");
  const [mecanicos] = await currentPool.query("SELECT * FROM Mecanicos ORDER BY createdAt DESC");
  const [tiposManutencao] = await currentPool.query("SELECT * FROM TiposManutencao ORDER BY nome ASC");
  const [chamados] = await currentPool.query("SELECT * FROM Chamados ORDER BY createdAt DESC");
  
  // Auto-update overdue transactions before fetching
  const todayStr = new Date().toISOString().split('T')[0];
  await currentPool.query(`
    UPDATE TransacoesFinanceiras 
    SET status = 'vencido' 
    WHERE status = 'lancado' 
      AND dataVencimento < ? 
      AND dataVencimento != '' 
      AND dataVencimento IS NOT NULL
  `, [todayStr]);

  const [transacoes] = await currentPool.query("SELECT * FROM TransacoesFinanceiras ORDER BY dataVencimento DESC");
  const [funcionarios] = await currentPool.query("SELECT * FROM Funcionarios ORDER BY createdAt DESC");
  const [folgas] = await currentPool.query("SELECT * FROM Folgas ORDER BY data DESC");
  const [catalogoEPIs] = await currentPool.query("SELECT * FROM CatalogoEPIs ORDER BY nome ASC");
  const [registrosAtividades] = await currentPool.query("SELECT * FROM RegistrosAtividades ORDER BY createdAt DESC LIMIT 500");


  const [finCounts] = await currentPool.query(`
    SELECT clienteId, 
           COUNT(*) as totalCnt,
           SUM(CASE WHEN status NOT IN ('pago', 'cancelado') THEN 1 ELSE 0 END) as openCnt,
           SUM(CASE WHEN status IN ('vencido', 'atrasado') OR (status NOT IN ('pago', 'cancelado') AND dataVencimento < ?) THEN 1 ELSE 0 END) as overdueCnt
    FROM TransacoesFinanceiras 
    WHERE tipo = 'receita'
    GROUP BY clienteId
  `, [todayStr]);

  const finMap = new Map<string, { totalCnt: number; openCnt: number; overdueCnt: number }>();
  (finCounts as any[]).forEach(row => {
    if (row.clienteId) {
      finMap.set(row.clienteId, {
        totalCnt: Number(row.totalCnt) || 0,
        openCnt: Number(row.openCnt) || 0,
        overdueCnt: Number(row.overdueCnt) || 0
      });
    }
  });

  // Helper para padronizar códigos de cota (C1, C2, C3...) e migrar legados ('1/4', 'Cota', etc.)
  const parseExplicitCota = (raw: any): string | null => {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim().toUpperCase();
    if (!s || s.includes('/') || s.includes('%') || s === 'COTA' || s === 'N/A') return null;
    const m = s.match(/^(?:COTA|C)[\s\-_]*0*(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n <= 64) return `C${n}`;
    }
    if (/^0*\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (n > 0 && n <= 64) return `C${n}`;
    }
    return null;
  };

  // Parse JSON serializations back to rich arrays/objects
  const parsedClients = (clients as any[]).map(c => {
    let list = undefined;
    if (c.embarcacoes) {
      try {
        list = JSON.parse(c.embarcacoes);
      } catch (err) {
        list = undefined;
      }
    }
    const fin = finMap.get(c.id) || { totalCnt: 0, openCnt: 0, overdueCnt: 0 };
    let contratoValoresParsed = undefined;
    if (c.contratoValores) {
      try {
        contratoValoresParsed = typeof c.contratoValores === 'string' ? JSON.parse(c.contratoValores) : c.contratoValores;
      } catch (e) {}
    }
    let contratosParsed = undefined;
    if (c.contratos) {
      try {
        contratosParsed = typeof c.contratos === 'string' ? JSON.parse(c.contratos) : c.contratos;
      } catch (e) {}
    }

    return {
      ...c,
      status: c.status || 'ativo',
      empresas: clienteEmpresasMap.get(c.id) || ['VALE'],
      embarcacoes: list,
      temLancamentos: fin.totalCnt > 0,
      temValoresEmAberto: fin.openCnt > 0,
      statusFinanceiro: fin.overdueCnt > 0 ? 'inadimplente' : (fin.openCnt > 0 ? 'pendente' : 'em_dia'),
      observacoesFinanceiras: c.observacoesFinanceiras || '',
      acessorios: c.acessorios ? (typeof c.acessorios === 'string' ? JSON.parse(c.acessorios) : c.acessorios) : undefined,
      contratoValores: contratoValoresParsed,
      contratos: contratosParsed,
    };
  });

  // Padronizar cotas em todos os clientes carregados (convertendo '1/4', 'Cota', etc. para C1, C2...)
  const occupiedByBoat = new Map<string, Set<string>>();
  const getOccupiedSet = (boatId: string) => {
    if (!occupiedByBoat.has(boatId)) occupiedByBoat.set(boatId, new Set());
    return occupiedByBoat.get(boatId)!;
  };

  parsedClients.forEach((c: any) => {
    if (c.status === 'inativo') return;
    if (Array.isArray(c.embarcacoes) && c.embarcacoes.length > 0) {
      c.embarcacoes.forEach((eb: any) => {
        if (!eb?.embarcacaoId) return;
        const exp = parseExplicitCota(eb.cota);
        if (exp) {
          eb.cota = exp;
          getOccupiedSet(eb.embarcacaoId).add(exp);
        }
      });
    } else if (c.embarcacaoId) {
      const exp = parseExplicitCota(c.cota);
      if (exp) {
        c.cota = exp;
        getOccupiedSet(c.embarcacaoId).add(exp);
      }
    }
  });

  const allocateNextFreeSlot = (boatId: string): string => {
    if (!boatId) return 'C1';
    const set = getOccupiedSet(boatId);
    let slot = 1;
    while (set.has(`C${slot}`)) slot++;
    const code = `C${slot}`;
    set.add(code);
    return code;
  };

  parsedClients.forEach((c: any) => {
    if (Array.isArray(c.embarcacoes) && c.embarcacoes.length > 0) {
      c.embarcacoes.forEach((eb: any) => {
        if (!eb?.embarcacaoId) {
          eb.cota = parseExplicitCota(eb?.cota) || 'C1';
          eb.plano = eb.plano || (c.plano === 'completo' ? 'completo' : 'normal');
          return;
        }
        eb.cota = parseExplicitCota(eb.cota) || allocateNextFreeSlot(eb.embarcacaoId);
        eb.plano = eb.plano || (c.plano === 'completo' ? 'completo' : 'normal');
      });
      c.embarcacaoId = c.embarcacoes[0].embarcacaoId;
      c.cota = c.embarcacoes[0].cota;
    } else if (c.embarcacaoId) {
      c.cota = parseExplicitCota(c.cota) || allocateNextFreeSlot(c.embarcacaoId);
      c.embarcacoes = [{ embarcacaoId: c.embarcacaoId, cota: c.cota, plano: c.plano === 'completo' ? 'completo' : 'normal' }];
    } else if (c.cota) {
      c.cota = parseExplicitCota(c.cota) || 'C1';
    }
  });

  const parsedBoats = (boats as any[]).map(b => {
    let donosList: string[] = [];
    if (b.donos) {
      try {
        donosList = JSON.parse(b.donos);
      } catch (err) {
        donosList = [];
      }
    }
    return {
      ...b,
      empresas: embarcacaoEmpresasMap.get(b.id) || ['VALE'],
      vaga: b.vaga || '',
      tamanho: b.tamanho || '',
      chassi: b.chassi || '',
      inscricao: b.inscricao || '',
      tipo_propulsao: b.tipo_propulsao || '',
      potencia: b.potencia || '',
      donos: donosList,
      emManutencao: b.emManutencao === 1 || b.emManutencao === true,
      whatsappGroupId: b.whatsappGroupId || undefined,
      temSom: b.temSom === 1 || b.temSom === true,
      acessorios: b.acessorios ? JSON.parse(b.acessorios) : undefined,
      capacidadePassageiros: b.capacidadePassageiros !== null && b.capacidadePassageiros !== undefined ? Number(b.capacidadePassageiros) : undefined,
      totalCotas: b.totalCotas !== null && b.totalCotas !== undefined && Number(b.totalCotas) > 0 ? Number(b.totalCotas) : (b.nome === 'M55' || b.id === 'boat_M55' ? 8 : 4),
      valorCota: b.valorCota !== null && b.valorCota !== undefined ? Number(b.valorCota) : 0,
      taxaAdmMensal: b.taxaAdmMensal !== null && b.taxaAdmMensal !== undefined ? Number(b.taxaAdmMensal) : 0,
      horasMotor: b.horasMotor ? Number(b.horasMotor) : 0,
      ultimaAtualizacaoHoras: b.ultimaAtualizacaoHoras || undefined,
      horasUltimaManutencao: b.horasUltimaManutencao ? Number(b.horasUltimaManutencao) : 0,
      historicoHoras: b.historicoHoras ? (typeof b.historicoHoras === 'string' ? JSON.parse(b.historicoHoras) : b.historicoHoras) : undefined,
    };
  });

  const parsedReservations = (reservations as any[]).map(r => {
    let fotosChecklistSaida = [];
    let fotosChecklistChegada = [];
    let fotosChecklistDescida = [];
    let fotosChecklistSubida = [];
    try { if (r.fotosChecklistSaida) fotosChecklistSaida = JSON.parse(r.fotosChecklistSaida); } catch(e){}
    try { if (r.fotosChecklistChegada) fotosChecklistChegada = JSON.parse(r.fotosChecklistChegada); } catch(e){}
    try { if (r.fotosChecklistDescida) fotosChecklistDescida = JSON.parse(r.fotosChecklistDescida); } catch(e){}
    try { if (r.fotosChecklistSubida) fotosChecklistSubida = JSON.parse(r.fotosChecklistSubida); } catch(e){}
    
    return {
      ...r,
      observações: r.observacoes || "", // map back to portuguese character key in FE type if needed
      somRetirado: r.somRetirado === 1 || r.somRetirado === true,
      somTesteSaida: r.somTesteSaida || "",
      somTesteRetorno: r.somTesteRetorno || "",
      confirmacaoEnviada: r.confirmacaoEnviada === 1 || r.confirmacaoEnviada === true,
      fotosChecklistSaida,
      fotosChecklistChegada,
      fotosChecklistDescida,
      fotosChecklistSubida,
      acessoriosSolicitados: r.acessoriosSolicitados ? (typeof r.acessoriosSolicitados === "string" ? JSON.parse(r.acessoriosSolicitados) : r.acessoriosSolicitados) : undefined,
    };
  });

  const parsedControlesSom = (controlesSom as any[]).map(r => ({
    ...r,
    somRetirado: r.somRetirado === 1 || r.somRetirado === true,
  }));

  
  const [planosContas] = await currentPool.query("SELECT * FROM PlanosDeContas");
  const [centrosCusto] = await currentPool.query("SELECT * FROM CentrosDeCusto");
  const [fornecedores] = await currentPool.query("SELECT * FROM Fornecedores");
  const [contasBancarias] = await currentPool.query("SELECT * FROM ContasBancarias");

  const [funcionariosEPIs] = await currentPool.query("SELECT * FROM FuncionariosEPIs ORDER BY geradoEm DESC");
  const [historicoEPIMensal] = await currentPool.query("SELECT * FROM HistoricoEPIMensal ORDER BY mesAno DESC");

  const result = {
    clients: parsedClients,
    boats: parsedBoats,
    reservations: parsedReservations,
    controlesSom: parsedControlesSom,
    manutencoes: (manutencoes as any[]).map(m => ({
      ...m,
      orcamentoAprovado: m.orcamentoAprovado === 1 || m.orcamentoAprovado === true,
      acessorios: m.acessorios ? JSON.parse(m.acessorios) : undefined,
      pecas: m.pecas ? JSON.parse(m.pecas) : undefined,
      cotistasSelecionados: m.cotistasSelecionados ? JSON.parse(m.cotistasSelecionados) : undefined
    })),
    mecanicos: mecanicos as any[],
    tiposManutencao: tiposManutencao as any[],
    transacoes: (transacoes as any[]).map(t => ({
      ...t,
      metadata: typeof t.metadata === "string" && t.metadata.trim() ? (() => { try { return JSON.parse(t.metadata); } catch(e){ return null; } })() : (t.metadata || null)
    })),
    funcionarios: (funcionarios as any[]).map(f => ({...f, turnos: f.turnos ? JSON.parse(f.turnos) : [], primeiroEmprego: f.primeiroEmprego === 1})),
    folgas: folgas as any[],
    catalogoEPIs: catalogoEPIs as any[],
    registrosAtividades: registrosAtividades as any[],
    epis: (funcionariosEPIs as any[]).map(e => ({
      ...e,
      historicoTrocas: e.historicoTrocas ? (typeof e.historicoTrocas === 'string' ? JSON.parse(e.historicoTrocas) : e.historicoTrocas) : []
    })),
    historicoEpis: historicoEPIMensal as any[],
    chamados: chamados as any[],
    planosContas: planosContas as any[],
    centrosCusto: centrosCusto as any[],
    fornecedores: fornecedores as any[],
    contasBancarias: contasBancarias as any[]
  };

  dbCache = {
    data: result,
    timestamp: Date.now()
  };

  return result;
}

// Upsert a single client record
export async function upsertClient(client: any) {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  if (!client || !client.id) throw new Error("Invalid client object: id is required.");

  const embarcacoesJson = client.embarcacoes
    ? (typeof client.embarcacoes === 'string' ? client.embarcacoes : JSON.stringify(client.embarcacoes))
    : null;

  const acessoriosJson = client.acessorios
    ? (typeof client.acessorios === 'string' ? client.acessorios : JSON.stringify(client.acessorios))
    : null;

  const contratoValoresJson = client.contratoValores
    ? (typeof client.contratoValores === 'string' ? client.contratoValores : JSON.stringify(client.contratoValores))
    : null;

  const contratosJson = client.contratos
    ? (typeof client.contratos === 'string' ? client.contratos : JSON.stringify(client.contratos))
    : null;

  const query = `
    INSERT INTO Clientes (
      id, nome, embarcacaoId, cota, telefone, email, cpf, dataNascimento, dataCadastro,
      cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras, plano, asaasCustomerId, cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao, status, acessorios,
      nacionalidade, statusContrato, tipoContrato, contratoDataEmissao, contratoDataAssinatura,
      contratoArquivoUrl, contratoArquivoNome, contratoArquivoTamanho, contratoObservacoes,
      contratoAquisicaoStatus, contratoAquisicaoArquivoUrl, contratoAquisicaoArquivoNome, contratoAquisicaoArquivoTamanho, contratoAquisicaoDataAssinatura, contratoAquisicaoArquivoKey, contratoAquisicaoArquivoStorage,
      contratoAdmStatus, contratoAdmArquivoUrl, contratoAdmArquivoNome, contratoAdmArquivoTamanho, contratoAdmDataAssinatura, contratoAdmArquivoKey, contratoAdmArquivoStorage,
      contratoValores, contratos
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?
    )
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      embarcacaoId = VALUES(embarcacaoId),
      cota = VALUES(cota),
      telefone = VALUES(telefone),
      email = VALUES(email),
      cpf = VALUES(cpf),
      dataNascimento = VALUES(dataNascimento),
      cep = VALUES(cep),
      logradouro = VALUES(logradouro),
      numeroEnd = VALUES(numeroEnd),
      complemento = VALUES(complemento),
      bairro = VALUES(bairro),
      cidade = VALUES(cidade),
      estado = VALUES(estado),
      embarcacoes = VALUES(embarcacoes),
      statusFinanceiro = VALUES(statusFinanceiro),
      observacoesFinanceiras = VALUES(observacoesFinanceiras),
      plano = VALUES(plano),
      asaasCustomerId = VALUES(asaasCustomerId),
      cnh_cha = VALUES(cnh_cha),
      profissao = VALUES(profissao),
      estadoCivil = VALUES(estadoCivil),
      rg = VALUES(rg),
      orgaoEmissor = VALUES(orgaoEmissor),
      numeroHabilitacao = VALUES(numeroHabilitacao),
      validadeHabilitacao = VALUES(validadeHabilitacao),
      orgaoEmissorHabilitacao = VALUES(orgaoEmissorHabilitacao),
      categoriaHabilitacao = VALUES(categoriaHabilitacao),
      status = VALUES(status),
      acessorios = VALUES(acessorios),
      nacionalidade = VALUES(nacionalidade),
      statusContrato = VALUES(statusContrato),
      tipoContrato = VALUES(tipoContrato),
      contratoDataEmissao = VALUES(contratoDataEmissao),
      contratoDataAssinatura = VALUES(contratoDataAssinatura),
      contratoArquivoUrl = VALUES(contratoArquivoUrl),
      contratoArquivoNome = VALUES(contratoArquivoNome),
      contratoArquivoTamanho = VALUES(contratoArquivoTamanho),
      contratoObservacoes = VALUES(contratoObservacoes),
      contratoAquisicaoStatus = VALUES(contratoAquisicaoStatus),
      contratoAquisicaoArquivoUrl = VALUES(contratoAquisicaoArquivoUrl),
      contratoAquisicaoArquivoNome = VALUES(contratoAquisicaoArquivoNome),
      contratoAquisicaoArquivoTamanho = VALUES(contratoAquisicaoArquivoTamanho),
      contratoAquisicaoDataAssinatura = VALUES(contratoAquisicaoDataAssinatura),
      contratoAquisicaoArquivoKey = VALUES(contratoAquisicaoArquivoKey),
      contratoAquisicaoArquivoStorage = VALUES(contratoAquisicaoArquivoStorage),
      contratoAdmStatus = VALUES(contratoAdmStatus),
      contratoAdmArquivoUrl = VALUES(contratoAdmArquivoUrl),
      contratoAdmArquivoNome = VALUES(contratoAdmArquivoNome),
      contratoAdmArquivoTamanho = VALUES(contratoAdmArquivoTamanho),
      contratoAdmDataAssinatura = VALUES(contratoAdmDataAssinatura),
      contratoAdmArquivoKey = VALUES(contratoAdmArquivoKey),
      contratoAdmArquivoStorage = VALUES(contratoAdmArquivoStorage),
      contratoValores = VALUES(contratoValores),
      contratos = VALUES(contratos)
  `;

  const effectivePlano = (Array.isArray(client.embarcacoes) && client.embarcacoes.some((eb: any) => eb?.plano === 'completo'))
    ? 'completo'
    : (client.plano || 'normal');

  await currentPool.query(query, [
    client.id,
    client.nome || '',
    client.embarcacaoId || null,
    client.cota || null,
    client.telefone || null,
    client.email || null,
    client.cpf || null,
    client.dataNascimento || null,
    client.dataCadastro || new Date().toISOString(),
    client.cep || null,
    client.logradouro || null,
    client.numeroEnd || null,
    client.complemento || null,
    client.bairro || null,
    client.cidade || null,
    client.estado || null,
    embarcacoesJson,
    client.statusFinanceiro || 'em_dia',
    client.observacoesFinanceiras || null,
    effectivePlano,
    client.asaasCustomerId || null,
    client.cnh_cha || null,
    client.profissao || null,
    client.estadoCivil || null,
    client.rg || null,
    client.orgaoEmissor || null,
    client.numeroHabilitacao || null,
    client.validadeHabilitacao || null,
    client.orgaoEmissorHabilitacao || null,
    client.categoriaHabilitacao || null,
    client.status || 'ativo',
    acessoriosJson,
    client.nacionalidade || null,
    client.statusContrato || 'sem_contrato',
    client.tipoContrato || 'aquisicao',
    client.contratoDataEmissao || null,
    client.contratoDataAssinatura || null,
    client.contratoArquivoUrl || null,
    client.contratoArquivoNome || null,
    client.contratoArquivoTamanho ? Number(client.contratoArquivoTamanho) : null,
    client.contratoObservacoes || null,
    client.contratoAquisicaoStatus || null,
    client.contratoAquisicaoArquivoUrl || null,
    client.contratoAquisicaoArquivoNome || null,
    client.contratoAquisicaoArquivoTamanho ? Number(client.contratoAquisicaoArquivoTamanho) : null,
    client.contratoAquisicaoDataAssinatura || null,
    client.contratoAquisicaoArquivoKey || null,
    client.contratoAquisicaoArquivoStorage || null,
    client.contratoAdmStatus || null,
    client.contratoAdmArquivoUrl || null,
    client.contratoAdmArquivoNome || null,
    client.contratoAdmArquivoTamanho ? Number(client.contratoAdmArquivoTamanho) : null,
    client.contratoAdmDataAssinatura || null,
    client.contratoAdmArquivoKey || null,
    client.contratoAdmArquivoStorage || null,
    contratoValoresJson,
    contratosJson
  ]);

  if (client.empresas && Array.isArray(client.empresas)) {
    await currentPool.query("DELETE FROM ClienteEmpresas WHERE clienteId = ?", [client.id]);
    if (client.empresas.length > 0) {
      const values = client.empresas.map((e: string) => [client.id, e]);
      await currentPool.query("INSERT INTO ClienteEmpresas (clienteId, empresa) VALUES ?", [values]);
    }
  }
}

// Soft-deactivate a single client record (prevent data loss)
export async function deleteClient(id: string) {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("UPDATE Clientes SET status = 'inativo' WHERE id = ?", [id]);
}

export async function deleteControleSom(id: string) {
  const currentPool = getDbPool();
  if (currentPool) {
    await currentPool.query("DELETE FROM ControlesSom WHERE id = ?", [id]);
    invalidateDbCache();
  }
}

export async function upsertRegistroAtividade(data: any) {
  const currentPool = getDbPool();
  if (!currentPool) return;
  
  const id = data.id || `log_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const operadorNome = data.operadorNome || 'Sistema';
  const acao = data.acao || '';
  const detalhes = data.detalhes || '';
  const embarcacaoId = data.embarcacaoId || null;
  const createdAt = data.createdAt || new Date().toISOString();

  await currentPool.query(
    `INSERT INTO RegistrosAtividades (id, operadorNome, acao, detalhes, embarcacaoId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, operadorNome, acao, detalhes, embarcacaoId, createdAt]
  );
  
  invalidateDbCache();
}

// Upsert a single boat record

// ============================================================================
// LÓGICA DE TITULARIDADE & ESTOQUE COMERCIAL (ENTIDADE INTERNA EL MEXICANO)
// ============================================================================
export const MEXICANO_INTERNAL_CLIENT_ID = 'cli_112';
export const MEXICANO_INTERNAL_CLIENT_NAME = 'MEXICANO LANCHAS LTDA';

export function isInternalMexicanoEntity(idOrName?: string | null): boolean {
  if (!idOrName) return false;
  const s = String(idOrName).trim().toLowerCase();
  return (
    s === 'cli_112' ||
    s === 'cli_mexicano_internal' ||
    s === 'mexicano lanchas ltda' ||
    s === 'mexicano lanchas' ||
    s === 'el mexicano' ||
    s === 'mexicano' ||
    s.includes('mexicano lanchas')
  );
}

export async function ensureInternalMexicanoClient(connectionOrPool: any) {
  const [rows] = await connectionOrPool.query(
    "SELECT id, nome, embarcacoes FROM Clientes WHERE id = ?",
    [MEXICANO_INTERNAL_CLIENT_ID]
  );
  if ((rows as any[]).length === 0) {
    const now = new Date().toISOString();
    await connectionOrPool.query(
      `INSERT INTO Clientes (id, nome, telefone, dataCadastro, status, embarcacoes)
       VALUES (?, ?, ?, ?, 'ativo', '[]')`,
      [MEXICANO_INTERNAL_CLIENT_ID, MEXICANO_INTERNAL_CLIENT_NAME, '558796552883', now]
    );
    await connectionOrPool.query(
      "INSERT IGNORE INTO ClienteEmpresas (clienteId, empresa) VALUES (?, 'VALE'), (?, 'MEXICANO')",
      [MEXICANO_INTERNAL_CLIENT_ID, MEXICANO_INTERNAL_CLIENT_ID]
    );
  }
}

export async function reconcileBoatCotasWithMexicano(connectionOrPool: any, specificBoatId?: string) {
  try {
    await ensureInternalMexicanoClient(connectionOrPool);

    const boatQuery = specificBoatId
      ? "SELECT id, totalCotas, donos FROM Embarcacoes WHERE id = ?"
      : "SELECT id, totalCotas, donos FROM Embarcacoes";
    const [boatRows] = await connectionOrPool.query(boatQuery, specificBoatId ? [specificBoatId] : []);

    const [clientRows] = await connectionOrPool.query(
      "SELECT id, nome, embarcacaoId, cota, embarcacoes FROM Clientes WHERE (status IS NULL OR status != 'inativo') AND id != ?",
      [MEXICANO_INTERNAL_CLIENT_ID]
    );

    const [mexRows] = await connectionOrPool.query(
      "SELECT id, embarcacoes FROM Clientes WHERE id = ?",
      [MEXICANO_INTERNAL_CLIENT_ID]
    );
    let mexEmbarcacoes: Array<{ embarcacaoId: string; cota: string; [key: string]: any }> = [];
    if (mexRows && (mexRows as any[])[0]?.embarcacoes) {
      try {
        const raw = (mexRows as any[])[0].embarcacoes;
        mexEmbarcacoes = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(mexEmbarcacoes)) mexEmbarcacoes = [];
      } catch {
        mexEmbarcacoes = [];
      }
    }

    for (const b of boatRows as any[]) {
      const bId = b.id;
      const totalCotas = Number(b.totalCotas) > 0 ? Number(b.totalCotas) : (b.nome === 'M55' || b.id === 'boat_M55' ? 8 : 4);

      const occupiedByRealClients = new Set<string>();

      for (const cli of clientRows as any[]) {
        let cliEbs: any[] = [];
        if (cli.embarcacoes) {
          try {
            cliEbs = typeof cli.embarcacoes === 'string' ? JSON.parse(cli.embarcacoes) : cli.embarcacoes;
            if (!Array.isArray(cliEbs)) cliEbs = [];
          } catch {
            cliEbs = [];
          }
        }
        if (cliEbs.length > 0) {
          cliEbs.forEach(eb => {
            if (eb && eb.embarcacaoId === bId && eb.cota) {
              const m = String(eb.cota).trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
              if (m) occupiedByRealClients.add(`C${parseInt(m[1], 10)}`);
            }
          });
        } else if (cli.embarcacaoId === bId && cli.cota) {
          const m = String(cli.cota).trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
          if (m) occupiedByRealClients.add(`C${parseInt(m[1], 10)}`);
        }
      }

      const stockCotas: string[] = [];
      for (let i = 1; i <= totalCotas; i++) {
        const code = `C${i}`;
        if (!occupiedByRealClients.has(code)) {
          stockCotas.push(code);
        }
      }

      mexEmbarcacoes = mexEmbarcacoes.filter(eb => eb.embarcacaoId !== bId);
      stockCotas.forEach(cCode => {
        mexEmbarcacoes.push({
          embarcacaoId: bId,
          cota: cCode
        });
      });

      let currentDonos: string[] = [];
      if (b.donos) {
        try {
          currentDonos = typeof b.donos === 'string' ? JSON.parse(b.donos) : b.donos;
          if (!Array.isArray(currentDonos)) currentDonos = [];
        } catch {
          currentDonos = [];
        }
      }

      const hasStock = stockCotas.length > 0;
      let donosChanged = false;

      if (hasStock && !currentDonos.includes(MEXICANO_INTERNAL_CLIENT_ID)) {
        currentDonos.push(MEXICANO_INTERNAL_CLIENT_ID);
        donosChanged = true;
      } else if (!hasStock && currentDonos.includes(MEXICANO_INTERNAL_CLIENT_ID)) {
        currentDonos = currentDonos.filter(id => id !== MEXICANO_INTERNAL_CLIENT_ID);
        donosChanged = true;
      }

      if (donosChanged) {
        await connectionOrPool.query(
          "UPDATE Embarcacoes SET donos = ? WHERE id = ?",
          [JSON.stringify(currentDonos), bId]
        );
      }
    }

    await connectionOrPool.query(
      "UPDATE Clientes SET embarcacoes = ? WHERE id = ?",
      [JSON.stringify(mexEmbarcacoes), MEXICANO_INTERNAL_CLIENT_ID]
    );

    invalidateDbCache();
  } catch (err) {
    console.warn("[reconcileBoatCotasWithMexicano] Warning:", err);
  }
}

export async function upsertBoat(boat: any) {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  if (!boat || !boat.id) throw new Error("Invalid boat object: id is required.");

  const donosJson = Array.isArray(boat.donos)
    ? JSON.stringify(boat.donos)
    : (typeof boat.donos === 'string' ? boat.donos : JSON.stringify([]));

  const anoNum = boat.ano && !isNaN(Number(boat.ano)) ? Number(boat.ano) : null;
  const emManutencaoVal = boat.emManutencao ? 1 : 0;
  const temSomVal = boat.temSom ? 1 : 0;
  const acessoriosJson = boat.acessorios 
    ? (typeof boat.acessorios === 'string' ? boat.acessorios : JSON.stringify(boat.acessorios))
    : null;
  const historicoHorasJson = boat.historicoHoras
    ? (typeof boat.historicoHoras === 'string' ? boat.historicoHoras : JSON.stringify(boat.historicoHoras))
    : null;

  const query = `
    INSERT INTO Embarcacoes (
      id, tipo, nome, numero, modelo, fabricante, ano, chassi, inscricao, tipo_propulsao, potencia, donos, googleCalendarId, whatsappGroupId, emManutencao, imagemUrl, temSom, documentoUrl, seguroUrl, acessorios, horasMotor, ultimaAtualizacaoHoras, horasUltimaManutencao, historicoHoras, capacidadePassageiros, totalCotas, vaga, tamanho, valorCota, taxaAdmMensal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tipo = VALUES(tipo),
      nome = VALUES(nome),
      numero = VALUES(numero),
      modelo = VALUES(modelo),
      fabricante = VALUES(fabricante),
      ano = VALUES(ano),
      chassi = VALUES(chassi),
      inscricao = VALUES(inscricao),
      tipo_propulsao = VALUES(tipo_propulsao),
      potencia = VALUES(potencia),
      donos = VALUES(donos),
      googleCalendarId = VALUES(googleCalendarId),
      whatsappGroupId = VALUES(whatsappGroupId),
      emManutencao = VALUES(emManutencao),
      imagemUrl = VALUES(imagemUrl),
      temSom = VALUES(temSom),
      documentoUrl = VALUES(documentoUrl),
      seguroUrl = VALUES(seguroUrl),
      acessorios = VALUES(acessorios),
      horasMotor = VALUES(horasMotor),
      ultimaAtualizacaoHoras = VALUES(ultimaAtualizacaoHoras),
      horasUltimaManutencao = VALUES(horasUltimaManutencao),
      historicoHoras = VALUES(historicoHoras),
      capacidadePassageiros = VALUES(capacidadePassageiros),
      totalCotas = VALUES(totalCotas),
      vaga = VALUES(vaga),
      tamanho = VALUES(tamanho),
      valorCota = VALUES(valorCota),
      taxaAdmMensal = VALUES(taxaAdmMensal)
  `;

  const valorCotaNum = boat.valorCota !== undefined && !isNaN(Number(boat.valorCota)) ? Number(boat.valorCota) : 0;
  const taxaAdmMensalNum = boat.taxaAdmMensal !== undefined && !isNaN(Number(boat.taxaAdmMensal)) ? Number(boat.taxaAdmMensal) : 0;

  await currentPool.query(query, [
    boat.id,
    boat.tipo || 'lancha',
    boat.nome || '',
    boat.numero || null,
    boat.modelo || null,
    boat.fabricante || null,
    anoNum,
    boat.chassi || null,
    boat.inscricao || null,
    boat.tipo_propulsao || null,
    boat.potencia || null,
    donosJson,
    boat.googleCalendarId || null,
    boat.whatsappGroupId || null,
    emManutencaoVal,
    boat.imagemUrl || null,
    temSomVal,
    boat.documentoUrl || null,
    boat.seguroUrl || null,
    acessoriosJson,
    boat.horasMotor !== undefined ? Number(boat.horasMotor) : 0,
    boat.ultimaAtualizacaoHoras || null,
    boat.horasUltimaManutencao !== undefined ? Number(boat.horasUltimaManutencao) : 0,
    historicoHorasJson,
    boat.capacidadePassageiros !== undefined && boat.capacidadePassageiros !== null ? Number(boat.capacidadePassageiros) : null,
    boat.totalCotas !== undefined && boat.totalCotas !== null && Number(boat.totalCotas) > 0 ? Number(boat.totalCotas) : (boat.nome === 'M55' || boat.id === 'boat_M55' ? 8 : 4),
    boat.vaga || null,
    boat.tamanho !== undefined && boat.tamanho !== null && boat.tamanho !== '' ? String(boat.tamanho) : null,
    valorCotaNum,
    taxaAdmMensalNum
  ]);

  if (boat.empresas && Array.isArray(boat.empresas)) {
    await currentPool.query("DELETE FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [boat.id]);
    if (boat.empresas.length > 0) {
      const values = boat.empresas.map((e: string) => [boat.id, e]);
      await currentPool.query("INSERT INTO EmbarcacaoEmpresas (embarcacaoId, empresa) VALUES ?", [values]);
    }
  }

  // Reconciliar cotas societárias com a entidade interna El Mexicano para refletir totalCotas
  try {
    await reconcileBoatCotasWithMexicano(currentPool, boat.id);
  } catch (errReconcile) {
    console.warn(`[upsertBoat] Falha ao reconciliar cotas com Mexicano para ${boat.id}:`, errReconcile);
  }

  invalidateDbCache();
}

// Delete a single boat record
export async function deleteBoat(id: string) {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [id]);
  await currentPool.query("DELETE FROM Embarcacoes WHERE id = ?", [id]);
}

// Upsert a single reservation record
export async function upsertReservation(reserva: any) {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const obs = reserva.observações || reserva.observacoes || null;

  const fotosChecklistDescidaStr = reserva.fotosChecklistDescida ? JSON.stringify(reserva.fotosChecklistDescida) : null;
  const fotosChecklistSaidaStr = reserva.fotosChecklistSaida ? JSON.stringify(reserva.fotosChecklistSaida) : null;
  const fotosChecklistChegadaStr = reserva.fotosChecklistChegada ? JSON.stringify(reserva.fotosChecklistChegada) : null;
  const fotosChecklistSubidaStr = reserva.fotosChecklistSubida ? JSON.stringify(reserva.fotosChecklistSubida) : null;
  const acessoriosSolicitadosStr = reserva.acessoriosSolicitados ? JSON.stringify(reserva.acessoriosSolicitados) : null;

  const query = `
    INSERT INTO Reservas (
      id, embarcacaoId, clienteId, data, periodo, observacoes, googleEventId, status, createdAt,
      somRetirado, somTesteSaida, somTesteRetorno, horaSaida, horaChegada, fotosChecklistSaida, fotosChecklistChegada,
      previsaoSaida, previsaoChegada, statusMarina, horaDescida, fotosChecklistDescida, operadorDescida, operadorSaida, operadorChegada, destino, pessoasABordo, confirmacaoEnviada, litrosAbastecidos, horaSubida, operadorSubida, fotosChecklistSubida,
      acessoriosSolicitados,
      abastecimentoLitros, abastecimentoStatusCobranca, abastecimentoFormaPagamento, abastecimentoValorTotal, abastecimentoComprovanteUrl, abastecimentoOperador,
      tipoReserva, contestadaPor, contestadaEm,
      origem, nomeAvulso, telefoneAvulso, modeloAvulso, tipoAvulso, posicaoFila, combustivelInicial, litrosAbastecerPrevio, marinheiroPiloto, observacoesDescida
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      embarcacaoId = VALUES(embarcacaoId),
      clienteId = VALUES(clienteId),
      data = VALUES(data),
      periodo = VALUES(periodo),
      observacoes = VALUES(observacoes),
      googleEventId = VALUES(googleEventId),
      status = VALUES(status),
      somRetirado = VALUES(somRetirado),
      somTesteSaida = VALUES(somTesteSaida),
      somTesteRetorno = VALUES(somTesteRetorno),
      horaSaida = VALUES(horaSaida),
      horaChegada = VALUES(horaChegada),
      fotosChecklistSaida = VALUES(fotosChecklistSaida),
      fotosChecklistChegada = VALUES(fotosChecklistChegada),
      previsaoSaida = VALUES(previsaoSaida),
      previsaoChegada = VALUES(previsaoChegada),
      statusMarina = VALUES(statusMarina),
      horaDescida = VALUES(horaDescida),
      fotosChecklistDescida = VALUES(fotosChecklistDescida),
      operadorDescida = VALUES(operadorDescida),
      operadorSaida = VALUES(operadorSaida),
      operadorChegada = VALUES(operadorChegada),
      destino = VALUES(destino),
      pessoasABordo = VALUES(pessoasABordo),
      confirmacaoEnviada = VALUES(confirmacaoEnviada),
      litrosAbastecidos = VALUES(litrosAbastecidos),
      horaSubida = VALUES(horaSubida),
      operadorSubida = VALUES(operadorSubida),
      fotosChecklistSubida = VALUES(fotosChecklistSubida),
      acessoriosSolicitados = VALUES(acessoriosSolicitados),
      abastecimentoLitros = VALUES(abastecimentoLitros),
      abastecimentoStatusCobranca = VALUES(abastecimentoStatusCobranca),
      abastecimentoFormaPagamento = VALUES(abastecimentoFormaPagamento),
      abastecimentoValorTotal = VALUES(abastecimentoValorTotal),
      abastecimentoComprovanteUrl = VALUES(abastecimentoComprovanteUrl),
      abastecimentoOperador = VALUES(abastecimentoOperador),
      tipoReserva = VALUES(tipoReserva),
      contestadaPor = VALUES(contestadaPor),
      contestadaEm = VALUES(contestadaEm),
      origem = VALUES(origem),
      nomeAvulso = VALUES(nomeAvulso),
      telefoneAvulso = VALUES(telefoneAvulso),
      modeloAvulso = VALUES(modeloAvulso),
      tipoAvulso = VALUES(tipoAvulso),
      posicaoFila = VALUES(posicaoFila),
      combustivelInicial = VALUES(combustivelInicial),
      litrosAbastecerPrevio = VALUES(litrosAbastecerPrevio),
      marinheiroPiloto = VALUES(marinheiroPiloto),
      observacoesDescida = VALUES(observacoesDescida)
  `;

  const values = [
    reserva.id,
    reserva.embarcacaoId,
    reserva.clienteId,
    reserva.data,
    reserva.periodo,
    obs,
    reserva.googleEventId || null,
    reserva.status || 'agendado',
    reserva.createdAt || new Date().toISOString(),
    reserva.somRetirado || null,
    reserva.somTesteSaida || null,
    reserva.somTesteRetorno || null,
    reserva.horaSaida || null,
    reserva.horaChegada || null,
    fotosChecklistSaidaStr,
    fotosChecklistChegadaStr,
    reserva.previsaoSaida || null,
    reserva.previsaoChegada || null,
    reserva.statusMarina || null,
    reserva.horaDescida || null,
    fotosChecklistDescidaStr,
    reserva.operadorDescida || null,
    reserva.operadorSaida || null,
    reserva.operadorChegada || null,
    reserva.destino || null,
    reserva.pessoasABordo || null,
    reserva.confirmacaoEnviada ? 1 : 0,
    reserva.litrosAbastecidos || null,
    reserva.horaSubida || null,
    reserva.operadorSubida || null,
    fotosChecklistSubidaStr,
    acessoriosSolicitadosStr,
    reserva.abastecimentoLitros || null,
    reserva.abastecimentoStatusCobranca || null,
    reserva.abastecimentoFormaPagamento || null,
    reserva.abastecimentoValorTotal || null,
    reserva.abastecimentoComprovanteUrl || null,
    reserva.abastecimentoOperador || reserva.operadorChegada || null,
    reserva.tipoReserva || 'garantida',
    reserva.contestadaPor || null,
    reserva.contestadaEm || null,
    reserva.origem || 'cota',
    reserva.nomeAvulso || null,
    reserva.telefoneAvulso || null,
    reserva.modeloAvulso || null,
    reserva.tipoAvulso || null,
    reserva.posicaoFila || 0,
    reserva.combustivelInicial || null,
    reserva.litrosAbastecerPrevio || null,
    reserva.marinheiroPiloto || null,
    reserva.observacoesDescida || null
  ];

  await currentPool.query(query, values);
}

// Cancel (or update status) of reservation
export async function cancelReservation(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("UPDATE Reservas SET status = 'cancelado' WHERE id = ?", [id]);
}

// Clean delete a reservation record
export async function deleteReservation(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Reservas WHERE id = ?", [id]);
}

// Bulk sync upsert of all client records (highly optimized)
export async function bulkSyncDatabase(payload: { clients: any[]; boats: any[]; reservations: any[]; manutencoes?: any[] }) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const connection = await currentPool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Sync boats
    for (const boat of payload.boats) {
      const donosJson = boat.donos ? JSON.stringify(boat.donos) : JSON.stringify([]);
      await connection.query(`
        INSERT INTO Embarcacoes (id, tipo, nome, numero, modelo, fabricante, ano, chassi, inscricao, tipo_propulsao, potencia, donos, googleCalendarId, whatsappGroupId, emManutencao, temSom, imagemUrl, documentoUrl, seguroUrl, capacidadePassageiros)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tipo = VALUES(tipo), nome = VALUES(nome), numero = VALUES(numero),
          modelo = VALUES(modelo), fabricante = VALUES(fabricante), ano = VALUES(ano),
          chassi = VALUES(chassi), inscricao = VALUES(inscricao), tipo_propulsao = VALUES(tipo_propulsao), potencia = VALUES(potencia),
          donos = VALUES(donos), googleCalendarId = VALUES(googleCalendarId),
          whatsappGroupId = VALUES(whatsappGroupId), emManutencao = VALUES(emManutencao), temSom = VALUES(temSom),
          imagemUrl = VALUES(imagemUrl), documentoUrl = VALUES(documentoUrl), seguroUrl = VALUES(seguroUrl), capacidadePassageiros = VALUES(capacidadePassageiros)
      `, [
        boat.id, boat.tipo, boat.nome, boat.numero, boat.modelo, boat.fabricante, boat.ano,
        boat.chassi || null, boat.inscricao || null, boat.tipo_propulsao || null, boat.potencia || null,
        donosJson, boat.googleCalendarId || null, boat.whatsappGroupId || null, boat.emManutencao ? 1 : 0, boat.temSom ? 1 : 0, boat.imagemUrl || null, boat.documentoUrl || null, boat.seguroUrl || null,
        boat.capacidadePassageiros !== undefined && boat.capacidadePassageiros !== null ? Number(boat.capacidadePassageiros) : null
      ]);
    }

    // 2. Sync clients
    for (const client of payload.clients) {
      const embarcacoesJson = client.embarcacoes ? JSON.stringify(client.embarcacoes) : null;
      const acessoriosJson = client.acessorios ? (typeof client.acessorios === 'string' ? client.acessorios : JSON.stringify(client.acessorios)) : null;
      const contratoValoresJson = client.contratoValores ? (typeof client.contratoValores === 'string' ? client.contratoValores : JSON.stringify(client.contratoValores)) : null;
      const contratosJson = client.contratos ? (typeof client.contratos === 'string' ? client.contratos : JSON.stringify(client.contratos)) : null;

      await connection.query(`
        INSERT INTO Clientes (
          id, nome, embarcacaoId, cota, telefone, email, cpf, dataNascimento, dataCadastro, 
          cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras,
          cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao,
          acessorios, nacionalidade, statusContrato, tipoContrato, contratoDataEmissao, contratoDataAssinatura,
          contratoArquivoUrl, contratoArquivoNome, contratoArquivoTamanho, contratoObservacoes,
          contratoAquisicaoStatus, contratoAquisicaoArquivoUrl, contratoAquisicaoArquivoNome, contratoAquisicaoArquivoTamanho, contratoAquisicaoDataAssinatura, contratoAquisicaoArquivoKey, contratoAquisicaoArquivoStorage,
          contratoAdmStatus, contratoAdmArquivoUrl, contratoAdmArquivoNome, contratoAdmArquivoTamanho, contratoAdmDataAssinatura, contratoAdmArquivoKey, contratoAdmArquivoStorage,
          contratoValores, contratos
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?
        )
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome), embarcacaoId = VALUES(embarcacaoId), cota = VALUES(cota),
          telefone = VALUES(telefone), email = VALUES(email), cpf = VALUES(cpf), dataNascimento = VALUES(dataNascimento),
          cep = VALUES(cep), logradouro = VALUES(logradouro), numeroEnd = VALUES(numeroEnd),
          complemento = VALUES(complemento), bairro = VALUES(bairro), cidade = VALUES(cidade),
          estado = VALUES(estado), embarcacoes = VALUES(embarcacoes),
          statusFinanceiro = VALUES(statusFinanceiro), observacoesFinanceiras = VALUES(observacoesFinanceiras),
          cnh_cha = VALUES(cnh_cha), profissao = VALUES(profissao), estadoCivil = VALUES(estadoCivil),
          rg = VALUES(rg), orgaoEmissor = VALUES(orgaoEmissor), numeroHabilitacao = VALUES(numeroHabilitacao),
          validadeHabilitacao = VALUES(validadeHabilitacao), orgaoEmissorHabilitacao = VALUES(orgaoEmissorHabilitacao),
          categoriaHabilitacao = VALUES(categoriaHabilitacao),
          acessorios = VALUES(acessorios),
          nacionalidade = VALUES(nacionalidade),
          statusContrato = VALUES(statusContrato),
          tipoContrato = VALUES(tipoContrato),
          contratoDataEmissao = VALUES(contratoDataEmissao),
          contratoDataAssinatura = VALUES(contratoDataAssinatura),
          contratoArquivoUrl = VALUES(contratoArquivoUrl),
          contratoArquivoNome = VALUES(contratoArquivoNome),
          contratoArquivoTamanho = VALUES(contratoArquivoTamanho),
          contratoObservacoes = VALUES(contratoObservacoes),
          contratoAquisicaoStatus = VALUES(contratoAquisicaoStatus),
          contratoAquisicaoArquivoUrl = VALUES(contratoAquisicaoArquivoUrl),
          contratoAquisicaoArquivoNome = VALUES(contratoAquisicaoArquivoNome),
          contratoAquisicaoArquivoTamanho = VALUES(contratoAquisicaoArquivoTamanho),
          contratoAquisicaoDataAssinatura = VALUES(contratoAquisicaoDataAssinatura),
          contratoAquisicaoArquivoKey = VALUES(contratoAquisicaoArquivoKey),
          contratoAquisicaoArquivoStorage = VALUES(contratoAquisicaoArquivoStorage),
          contratoAdmStatus = VALUES(contratoAdmStatus),
          contratoAdmArquivoUrl = VALUES(contratoAdmArquivoUrl),
          contratoAdmArquivoNome = VALUES(contratoAdmArquivoNome),
          contratoAdmArquivoTamanho = VALUES(contratoAdmArquivoTamanho),
          contratoAdmDataAssinatura = VALUES(contratoAdmDataAssinatura),
          contratoAdmArquivoKey = VALUES(contratoAdmArquivoKey),
          contratoAdmArquivoStorage = VALUES(contratoAdmArquivoStorage),
          contratoValores = VALUES(contratoValores),
          contratos = VALUES(contratos)
      `, [
        client.id, client.nome, client.embarcacaoId || null, client.cota || null,
        client.telefone || null, client.email || null, client.cpf || null, client.dataNascimento || null,
        client.dataCadastro || null, client.cep || null, client.logradouro || null,
        client.numeroEnd || null, client.complemento || null, client.bairro || null,
        client.cidade || null, client.estado || null, embarcacoesJson,
        client.statusFinanceiro || 'em_dia', client.observacoesFinanceiras || null,
        client.cnh_cha || null, client.profissao || null, client.estadoCivil || null,
        client.rg || null, client.orgaoEmissor || null, client.numeroHabilitacao || null,
        client.validadeHabilitacao || null, client.orgaoEmissorHabilitacao || null,
        client.categoriaHabilitacao || null,
        acessoriosJson,
        client.nacionalidade || null,
        client.statusContrato || 'sem_contrato',
        client.tipoContrato || 'aquisicao',
        client.contratoDataEmissao || null,
        client.contratoDataAssinatura || null,
        client.contratoArquivoUrl || null,
        client.contratoArquivoNome || null,
        client.contratoArquivoTamanho ? Number(client.contratoArquivoTamanho) : null,
        client.contratoObservacoes || null,
        client.contratoAquisicaoStatus || null,
        client.contratoAquisicaoArquivoUrl || null,
        client.contratoAquisicaoArquivoNome || null,
        client.contratoAquisicaoArquivoTamanho ? Number(client.contratoAquisicaoArquivoTamanho) : null,
        client.contratoAquisicaoDataAssinatura || null,
        client.contratoAquisicaoArquivoKey || null,
        client.contratoAquisicaoArquivoStorage || null,
        client.contratoAdmStatus || null,
        client.contratoAdmArquivoUrl || null,
        client.contratoAdmArquivoNome || null,
        client.contratoAdmArquivoTamanho ? Number(client.contratoAdmArquivoTamanho) : null,
        client.contratoAdmDataAssinatura || null,
        client.contratoAdmArquivoKey || null,
        client.contratoAdmArquivoStorage || null,
        contratoValoresJson,
        contratosJson
      ]);
    }

    // 3. Sync reservations
    for (const res of payload.reservations) {
      const obs = res.observações || res.observacoes || null;
      const fotosChecklistDescidaStr = res.fotosChecklistDescida ? JSON.stringify(res.fotosChecklistDescida) : null;
      const fotosChecklistSaidaStr = res.fotosChecklistSaida ? JSON.stringify(res.fotosChecklistSaida) : null;
      const fotosChecklistChegadaStr = res.fotosChecklistChegada ? JSON.stringify(res.fotosChecklistChegada) : null;
      
      await connection.query(`
        INSERT INTO Reservas (id, embarcacaoId, clienteId, data, periodo, observacoes, googleEventId, status, createdAt,
          somRetirado, somTesteSaida, somTesteRetorno, horaSaida, horaChegada, fotosChecklistSaida, fotosChecklistChegada,
          previsaoSaida, previsaoChegada, destino, pessoasABordo, statusMarina, horaDescida, fotosChecklistDescida,
          operadorDescida, operadorSaida, operadorChegada, confirmacaoEnviada, litrosAbastecidos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          embarcacaoId = VALUES(embarcacaoId), clienteId = VALUES(clienteId),
          data = VALUES(data), periodo = VALUES(periodo), observacoes = VALUES(observacoes),
          googleEventId = VALUES(googleEventId), status = VALUES(status),
          somRetirado = VALUES(somRetirado), somTesteSaida = VALUES(somTesteSaida), somTesteRetorno = VALUES(somTesteRetorno),
          horaSaida = VALUES(horaSaida), horaChegada = VALUES(horaChegada),
          fotosChecklistSaida = VALUES(fotosChecklistSaida), fotosChecklistChegada = VALUES(fotosChecklistChegada),
          previsaoSaida = VALUES(previsaoSaida), previsaoChegada = VALUES(previsaoChegada),
          destino = VALUES(destino), pessoasABordo = VALUES(pessoasABordo),
          statusMarina = VALUES(statusMarina), horaDescida = VALUES(horaDescida),
          fotosChecklistDescida = VALUES(fotosChecklistDescida),
          operadorDescida = VALUES(operadorDescida), operadorSaida = VALUES(operadorSaida),
          operadorChegada = VALUES(operadorChegada), confirmacaoEnviada = VALUES(confirmacaoEnviada),
          litrosAbastecidos = VALUES(litrosAbastecidos)
      `, [
        res.id, res.embarcacaoId, res.clienteId, res.data, res.periodo,
        obs, res.googleEventId || null, res.status || "confirmado",
        res.createdAt || new Date().toISOString(),
        res.somRetirado ? 1 : 0, res.somTesteSaida || null, res.somTesteRetorno || null,
        res.horaSaida || null, res.horaChegada || null,
        fotosChecklistSaidaStr, fotosChecklistChegadaStr,
        res.previsaoSaida || null, res.previsaoChegada || null,
        res.destino || null, res.pessoasABordo || null,
        res.statusMarina || null, res.horaDescida || null, fotosChecklistDescidaStr,
        res.operadorDescida || null, res.operadorSaida || null, res.operadorChegada || null,
        res.confirmacaoEnviada ? 1 : 0, res.litrosAbastecidos || null
      ]);
    }

    // 4. Sync Manutencoes
    if (payload.manutencoes) {
      for (const man of payload.manutencoes) {
        await connection.query(`
          INSERT INTO Manutencoes (id, embarcacaoId, dataSaida, mecanico, orcamento, custo, valorRepassado, status, createdAt, descricaoServico)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            embarcacaoId = VALUES(embarcacaoId), dataSaida = VALUES(dataSaida), mecanico = VALUES(mecanico),
            orcamento = VALUES(orcamento), custo = VALUES(custo), valorRepassado = VALUES(valorRepassado),
            status = VALUES(status), descricaoServico = VALUES(descricaoServico)
        `, [
          man.id, man.embarcacaoId, man.dataSaida, man.mecanico || null, man.orcamento || null,
          man.custo || null, man.valorRepassado || null, man.status || 'em_andamento', man.createdAt, man.descricaoServico || null
        ]);
      }
    }

    // Sincronizar cotas em estoque do El Mexicano para todas as embarcações
    await reconcileBoatCotasWithMexicano(connection);

    await connection.commit();
    return true;
  } catch (err: any) {
    await connection.rollback();
    console.error("Bulk sync operation failed, rollback executed:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// Read configuration from Config table
export async function getConfigValue(chave: string): Promise<string | null> {
  const currentPool = getDbPool();
  if (!currentPool) return null;

  try {
    const [rows] = await currentPool.query("SELECT valor FROM Config WHERE chave = ?", [chave]);
    const results = rows as any[];
    if (results.length > 0) {
      return results[0].valor;
    }
  } catch (err) {
    console.warn(`[CONFIG READ ERROR] Could not read config key="${chave}":`, err);
  }
  return null;
}

// Write/Upsert configuration to Config table
export async function setConfigValue(chave: string, valor: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const query = `
    INSERT INTO Config (chave, valor)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  `;
  await currentPool.query(query, [chave, valor]);
}

// ---------------- ControlesSom Operations ----------------

export async function getControlesSom() {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query("SELECT * FROM ControlesSom ORDER BY createdAt DESC");
  const results = rows as any[];
  return results.map(r => ({
    ...r,
    somRetirado: r.somRetirado === 1 || r.somRetirado === true,
  }));
}

export async function upsertControleSom(controle: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const query = `
    INSERT INTO ControlesSom (
      id, reservaId, embarcacaoId, clienteId, data, somRetirado,
      somTesteSaida, somTesteRetorno, observacoes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      reservaId = VALUES(reservaId),
      embarcacaoId = VALUES(embarcacaoId),
      clienteId = VALUES(clienteId),
      data = VALUES(data),
      somRetirado = VALUES(somRetirado),
      somTesteSaida = VALUES(somTesteSaida),
      somTesteRetorno = VALUES(somTesteRetorno),
      observacoes = VALUES(observacoes)
  `;

  await currentPool.query(query, [
    controle.id,
    controle.reservaId || null,
    controle.embarcacaoId,
    controle.clienteId,
    controle.data,
    controle.somRetirado ? 1 : 0,
    controle.somTesteSaida || null,
    controle.somTesteRetorno || null,
    controle.observacoes || null,
    controle.createdAt || new Date().toISOString()
  ]);
}

// Fetch a single client by CPF
export async function getClientByCpf(cpf: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const cleanCpf = cpf.replace(/\D/g, "");

  const [rows] = await currentPool.query(
    "SELECT * FROM Clientes WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), '/', '') = ? OR cpf = ?",
    [cleanCpf, cpf]
  );

  const results = rows as any[];
  if (results.length === 0) return null;

  const c = results[0];
  let list = undefined;
  if (c.embarcacoes) {
    try {
      list = JSON.parse(c.embarcacoes);
    } catch (err) {
      list = undefined;
    }
  }

  return {
    ...c,
    embarcacoes: list,
    statusFinanceiro: c.statusFinanceiro || 'em_dia',
    observacoesFinanceiras: c.observacoesFinanceiras || '',
  };
}

// ---------------- Auth Operations (Security Phase 1) ----------------

// Get admin user by username
export async function getAdminByUsername(username: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query(
    "SELECT a.*, f.nome as funcionarioNome, f.cargo as funcionarioCargo FROM AdminUsers a LEFT JOIN Funcionarios f ON a.funcionarioId = f.id WHERE a.username = ?",
    [username]
  );

  const results = rows as any[];
  return results.length > 0 ? results[0] : null;
}

// Create a new admin user
export async function createAdmin(username: string, passwordHash: string, role: string = 'admin', funcionarioId?: string | null) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    "INSERT INTO AdminUsers (username, passwordHash, role, funcionarioId) VALUES (?, ?, ?, ?)",
    [username, passwordHash, role, funcionarioId || null]
  );
}

// Fetch all administrative users
export async function getAllAdmins() {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query(
    `SELECT a.id, a.username, a.role, a.funcionarioId, f.nome as funcionarioNome, f.cargo as funcionarioCargo, f.setor as funcionarioSetor, a.createdAt 
     FROM AdminUsers a 
     LEFT JOIN Funcionarios f ON a.funcionarioId = f.id 
     ORDER BY a.createdAt DESC`
  );
  return rows as any[];
}

// Delete an administrative user
export async function deleteAdmin(id: number) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query("DELETE FROM AdminUsers WHERE id = ?", [id]);
}

// Update an administrative user
export async function updateAdmin(id: number, username: string, passwordHash?: string, role?: string, funcionarioId?: string | null) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const fId = funcionarioId !== undefined ? funcionarioId : null;

  if (passwordHash && role) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, passwordHash = ?, role = ?, funcionarioId = ? WHERE id = ?",
      [username, passwordHash, role, fId, id]
    );
  } else if (passwordHash) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, passwordHash = ?, funcionarioId = ? WHERE id = ?",
      [username, passwordHash, fId, id]
    );
  } else if (role) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, role = ?, funcionarioId = ? WHERE id = ?",
      [username, role, fId, id]
    );
  } else {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, funcionarioId = ? WHERE id = ?",
      [username, fId, id]
    );
  }
}

// Get client auth credentials by clienteId
export async function getClientAuth(clienteId: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query(
    "SELECT * FROM ClienteAuth WHERE clienteId = ?",
    [clienteId]
  );

  const results = rows as any[];
  return results.length > 0 ? results[0] : null;
}

// Create or update client auth password
export async function upsertClientAuth(clienteId: string, passwordHash: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
     `INSERT INTO ClienteAuth (clienteId, passwordHash) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)`,
    [clienteId, passwordHash]
  );
}

// ---------------- Transacoes Financeiras ----------------

export async function getAllTransacoes(empresa?: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  // Auto-update overdue transactions before fetching
  const todayStr = new Date().toISOString().split('T')[0];
  let updateQuery = `
    UPDATE TransacoesFinanceiras
    SET status = 'vencido'
    WHERE status = 'lancado'
      AND dataVencimento < ?
      AND dataVencimento != ''
      AND dataVencimento IS NOT NULL
  `;
  const updateParams: any[] = [todayStr];
  if (empresa) {
    updateQuery += ` AND empresa = ?`;
    updateParams.push(empresa);
  }
  await currentPool.query(updateQuery, updateParams);

  let selectQuery = "SELECT * FROM TransacoesFinanceiras ORDER BY dataVencimento DESC";
  let selectParams: any[] = [];
  if (empresa) {
    selectQuery = "SELECT * FROM TransacoesFinanceiras WHERE (empresa = ? OR ? IS NULL) ORDER BY dataVencimento DESC";
    selectParams = [empresa, empresa];
  }

  const [rows] = await currentPool.query(selectQuery, selectParams);
  return rows;
}

export async function upsertTransacao(t: any, connection?: any) {
  const currentPool = getDbPool();
  if (!currentPool && !connection) throw new Error("MySQL Connection pool is offline.");
  const dbConfig = connection || currentPool;

  const idToUse = t.id || `trans_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
  const createdAtToUse = t.createdAt || new Date().toISOString();

  // Clean description: remove "[IMPORTADO]" or "[IMPORTADO] " prefix case-insensitively
  let cleanedDesc = t.descricao || '';
  if (typeof cleanedDesc === 'string') {
    cleanedDesc = cleanedDesc.replace(/^\[IMPORTADO\]\s*/i, '');
  }

  await dbConfig.query(
    `INSERT INTO TransacoesFinanceiras (
      id, tipo, categoria, valor, dataVencimento, dataPagamento, status, descricao,
      clienteId, embarcacaoId, comprovante, createdAt, asaasPaymentId, asaasPaymentUrl,
      reservaId, metodoPagamento, operador, metadata, empresa, contaBancariaId,
      planoContasId, centroCustoId, fornecedorId, grupoParcelamentoId, numeroParcela, totalParcelas
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tipo=VALUES(tipo), categoria=VALUES(categoria), valor=VALUES(valor),
       dataVencimento=VALUES(dataVencimento), dataPagamento=VALUES(dataPagamento),
       status=VALUES(status), descricao=VALUES(descricao),
       clienteId=VALUES(clienteId), embarcacaoId=VALUES(embarcacaoId),
       comprovante=VALUES(comprovante),
       asaasPaymentId=VALUES(asaasPaymentId), asaasPaymentUrl=VALUES(asaasPaymentUrl),
       reservaId=VALUES(reservaId), metodoPagamento=VALUES(metodoPagamento),
       operador=VALUES(operador), metadata=VALUES(metadata),
       empresa=VALUES(empresa), contaBancariaId=VALUES(contaBancariaId),
       planoContasId=VALUES(planoContasId), centroCustoId=VALUES(centroCustoId), fornecedorId=VALUES(fornecedorId),
       grupoParcelamentoId=VALUES(grupoParcelamentoId), numeroParcela=VALUES(numeroParcela),
       totalParcelas=VALUES(totalParcelas)`,
    [
      idToUse, t.tipo, t.categoria, t.valor, t.dataVencimento, t.dataPagamento || null,
      t.status, cleanedDesc, t.clienteId || null, t.embarcacaoId || null, t.comprovante || t.comprovanteUrl || null, createdAtToUse,
      t.asaasPaymentId || null, t.asaasPaymentUrl || null, t.reservaId || null, t.metodoPagamento || null,
      t.operador || null, t.metadata ? JSON.stringify(t.metadata) : null,
      t.empresa || 'Marina', t.contaBancariaId || null, t.planoContasId || null, t.centroCustoId || null, t.fornecedorId || null,
      t.grupoParcelamentoId || null, t.numeroParcela || null, t.totalParcelas || null
    ]
  );

  if (t.clienteId) {
    await syncClientFinancialStatus(t.clienteId);
  }
}

export async function deleteTransacao(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query(
    "SELECT clienteId FROM TransacoesFinanceiras WHERE id = ?",
    [id]
  );
  const clienteId = (rows as any[])[0]?.clienteId;

  await currentPool.query("DELETE FROM TransacoesFinanceiras WHERE id = ?", [id]);

  if (clienteId) {
    await syncClientFinancialStatus(clienteId);
  }
}

export async function deleteAllTransacoes() {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query("DELETE FROM TransacoesFinanceiras");

  const [clients] = await currentPool.query("SELECT id FROM Clientes");
  for (const c of clients as any[]) {
    await syncClientFinancialStatus(c.id);
  }
}

export async function deleteTransacoesByClientIds(clientIds: string[]) {
  if (!clientIds || clientIds.length === 0) return;
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query("DELETE FROM TransacoesFinanceiras WHERE clienteId IN (?)", [clientIds]);

  for (const cId of clientIds) {
    await syncClientFinancialStatus(cId);
  }
}

export async function syncMultipleClientsFinancialStatus(clientIds: string[]) {
  if (!clientIds || clientIds.length === 0) return;
  for (const id of clientIds) {
    if (id) await syncClientFinancialStatus(id);
  }
}

export async function syncClientFinancialStatus(clienteId: string) {
  const currentPool = getDbPool();
  if (!currentPool) return;

  const todayStr = new Date().toISOString().split('T')[0];

  const [rows] = await currentPool.query(
    `SELECT COUNT(*) as cnt FROM TransacoesFinanceiras 
     WHERE clienteId = ? AND tipo = 'receita' 
       AND status NOT IN ('pago', 'cancelado') 
       AND (status IN ('vencido', 'atrasado') OR dataVencimento < ?)`,
    [clienteId, todayStr]
  );
  
  const hasOverdue = ((rows as any[])[0]?.cnt || 0) > 0;
  const newStatus = hasOverdue ? 'inadimplente' : 'em_dia';

  await currentPool.query(
    "UPDATE Clientes SET statusFinanceiro = ? WHERE id = ?",
    [newStatus, clienteId]
  );
}

// ---------------- Atividades Financeiras (Kanban) ----------------

export async function getAllAtividades(setor?: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  
  let query = "SELECT * FROM AtividadesFinanceiras";
  const params: any[] = [];
  
  if (setor) {
    query += " WHERE setor = ?";
    params.push(setor);
  }
  
  query += " ORDER BY createdAt DESC";
  
  const [rows] = await currentPool.query(query, params);
  return rows;
}

export async function upsertAtividade(a: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO AtividadesFinanceiras (id, titulo, descricao, status, setor, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       titulo=VALUES(titulo), descricao=VALUES(descricao),
       status=VALUES(status), setor=VALUES(setor), updatedAt=VALUES(updatedAt)`,
    [
      a.id, a.titulo, a.descricao || '', a.status, a.setor || 'financeiro', a.createdAt, a.updatedAt
    ]
  );
}

export async function deleteAtividade(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM AtividadesFinanceiras WHERE id = ?", [id]);
}

// ---------------- Feedbacks (Central de Reclamações & Melhorias) ----------------

export async function getAllFeedbacks() {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const [rows] = await currentPool.query("SELECT * FROM Feedbacks ORDER BY createdAt DESC");
  return rows as any[];
}

export async function upsertFeedback(f: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO Feedbacks (id, clienteId, nomeCliente, telefoneCliente, categoria, nota, comentario, status, respostaAdmin, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       clienteId=VALUES(clienteId), nomeCliente=VALUES(nomeCliente), telefoneCliente=VALUES(telefoneCliente),
       categoria=VALUES(categoria), nota=VALUES(nota), comentario=VALUES(comentario),
       status=VALUES(status), respostaAdmin=VALUES(respostaAdmin)`,
    [
      f.id, f.clienteId || null, f.nomeCliente || null, f.telefoneCliente || null,
      f.categoria, f.nota, f.comentario, f.status || 'pendente', f.respostaAdmin || null, f.createdAt
    ]
  );
}

export async function deleteFeedback(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Feedbacks WHERE id = ?", [id]);
}

// ---------------- Manutencoes de Embarcacoes ----------------

export async function updateBoatMaintenanceStatus(pool: any, boatId: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as activeCount
     FROM Manutencoes
     WHERE embarcacaoId = ?
       AND status NOT IN ('concluido', 'cancelado', 'reprovado')
       `,
    [boatId]
  );
  const activeCount = (rows as any[])[0]?.activeCount || 0;
  const emManutencao = activeCount > 0 ? 1 : 0;
  await pool.query("UPDATE Embarcacoes SET emManutencao = ? WHERE id = ?", [emManutencao, boatId]);
}

export async function upsertManutencao(m: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  if (!m || !m.id) throw new Error("ID da manutenção é obrigatório.");

  const dataSaida = m.dataSaida || m.dataChamado || new Date().toISOString().split('T')[0];
  const createdAt = m.createdAt || new Date().toISOString();

  await currentPool.query(
    `INSERT INTO Manutencoes (
      id, codigoOS, chamadoId, embarcacaoId, clienteId, titulo, tituloChamado,
      tipoManutencaoId, tipoManutencaoNome, categoria, mecanico, mecanicoResponsavelId,
      mecanicoNome, dataSaida, dataChamado, dataEntradaOficina, prazoEntrega,
      previsaoTermino, dataTermino, concluidoEm, urgencia, custoTotal, orcamento,
      custo, valorRepassado, orcamentoAprovado, status, localizacao,
      descricaoServico, gerarFinanceiro, horasMotorAtual, proximaRevisaoHoras,
      acessorios, pecas, whatsappStatus, fornecedorId, oficinaNome, custoReal, margemLucro, dataEnvioOrcamento, orcamentoStatus, createdAt
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigoOS=VALUES(codigoOS),
       chamadoId=VALUES(chamadoId),
       embarcacaoId=VALUES(embarcacaoId),
       clienteId=VALUES(clienteId),
       titulo=VALUES(titulo),
       tituloChamado=VALUES(tituloChamado),
       tipoManutencaoId=VALUES(tipoManutencaoId),
       tipoManutencaoNome=VALUES(tipoManutencaoNome),
       categoria=VALUES(categoria),
       mecanico=VALUES(mecanico),
       mecanicoResponsavelId=VALUES(mecanicoResponsavelId),
       mecanicoNome=VALUES(mecanicoNome),
       dataSaida=VALUES(dataSaida),
       dataChamado=VALUES(dataChamado),
       dataEntradaOficina=VALUES(dataEntradaOficina),
       prazoEntrega=VALUES(prazoEntrega),
       previsaoTermino=VALUES(previsaoTermino),
       dataTermino=VALUES(dataTermino),
       concluidoEm=VALUES(concluidoEm),
       urgencia=VALUES(urgencia),
       custoTotal=VALUES(custoTotal),
       orcamento=VALUES(orcamento),
       custo=VALUES(custo),
       valorRepassado=VALUES(valorRepassado),
       orcamentoAprovado=VALUES(orcamentoAprovado),
       status=VALUES(status),
       localizacao=VALUES(localizacao),
       descricaoServico=VALUES(descricaoServico),
       gerarFinanceiro=VALUES(gerarFinanceiro),
       horasMotorAtual=VALUES(horasMotorAtual),
       proximaRevisaoHoras=VALUES(proximaRevisaoHoras),
       acessorios=VALUES(acessorios),
       pecas=VALUES(pecas),
       whatsappStatus=VALUES(whatsappStatus),
       fornecedorId=VALUES(fornecedorId),
       oficinaNome=VALUES(oficinaNome),
       custoReal=VALUES(custoReal),
       margemLucro=VALUES(margemLucro),
       dataEnvioOrcamento=VALUES(dataEnvioOrcamento),
       orcamentoStatus=VALUES(orcamentoStatus),
       cotistasSelecionados=VALUES(cotistasSelecionados)`,
    [
      m.id,
      m.codigoOS || null,
      m.chamadoId || null,
      m.embarcacaoId,
      m.clienteId || null,
      m.titulo || null,
      m.tituloChamado || null,
      m.tipoManutencaoId || null,
      m.tipoManutencaoNome || null,
      m.categoria || null,
      m.mecanico || null,
      m.mecanicoResponsavelId || null,
      m.mecanicoNome || null,
      dataSaida,
      m.dataChamado || null,
      m.dataEntradaOficina || null,
      m.prazoEntrega || null,
      m.previsaoTermino || null,
      m.dataTermino || null,
      m.concluidoEm || null,
      m.urgencia || null,
      m.custoTotal !== undefined ? m.custoTotal : (m.orcamento || null),
      m.orcamento !== undefined ? m.orcamento : null,
      m.custo !== undefined ? m.custo : null,
      m.valorRepassado !== undefined ? m.valorRepassado : null,
      m.orcamentoAprovado ? 1 : 0,
      m.status || 'chamado_aberto',
      m.localizacao || 'marina',
      m.descricaoServico || null,
      m.gerarFinanceiro !== undefined ? (m.gerarFinanceiro ? 1 : 0) : 1,
      m.horasMotorAtual !== undefined ? m.horasMotorAtual : null,
      m.proximaRevisaoHoras !== undefined ? m.proximaRevisaoHoras : null,
      m.acessorios ? (typeof m.acessorios === 'string' ? m.acessorios : JSON.stringify(m.acessorios)) : null,
      m.pecas ? (typeof m.pecas === 'string' ? m.pecas : JSON.stringify(m.pecas)) : null,
      m.whatsappStatus || 'nao_enviado',
      m.fornecedorId || null,
      m.oficinaNome || null,
      m.custoReal !== undefined ? m.custoReal : null,
      m.margemLucro !== undefined ? m.margemLucro : null,
      m.dataEnvioOrcamento || null,
      m.orcamentoStatus || null,
      m.cotistasSelecionados ? (typeof m.cotistasSelecionados === 'string' ? m.cotistasSelecionados : JSON.stringify(m.cotistasSelecionados)) : null,
      createdAt
    ]
  );

  await updateBoatMaintenanceStatus(currentPool, m.embarcacaoId);
}

// ---------------- Mecanicos ----------------

export async function getAllMecanicos() {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  const [rows] = await currentPool.query("SELECT * FROM Mecanicos ORDER BY createdAt DESC");
  return rows;
}

export async function upsertMecanico(m: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO Mecanicos (id, nome, cnpj, createdAt)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), cnpj=VALUES(cnpj)`,
    [m.id, m.nome, m.cnpj || null, m.createdAt]
  );
}

export async function deleteMecanico(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Mecanicos WHERE id = ?", [id]);
}

// ---------------- Tipos de Manutenção / Serviço ----------------

export async function getAllTiposManutencao() {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  const [rows] = await currentPool.query("SELECT * FROM TiposManutencao ORDER BY nome ASC");
  return rows;
}

export async function upsertTipoManutencao(t: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO TiposManutencao (id, nome, descricao, createdAt)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), descricao=VALUES(descricao)`,
    [t.id, t.nome, t.descricao || null, t.createdAt || new Date().toISOString()]
  );
}

export async function deleteTipoManutencao(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM TiposManutencao WHERE id = ?", [id]);
}

export async function deleteManutencao(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  // Get boat ID before deleting the record
  const [rows] = await currentPool.query("SELECT embarcacaoId FROM Manutencoes WHERE id = ?", [id]);
  const boatId = (rows as any[])[0]?.embarcacaoId;

  // Get all clients whose transactions will be deleted to sync their financial status later
  const [transacaoRows] = await currentPool.query(
    "SELECT clienteId FROM TransacoesFinanceiras WHERE id LIKE ?",
    [`fin_manut_${id}%`]
  );
  const clienteIds = (transacaoRows as any[])
    .map((r: any) => r.clienteId)
    .filter((cid: string | null) => cid !== null && cid !== undefined);

  // Delete associated transactions
  await currentPool.query(
    "DELETE FROM TransacoesFinanceiras WHERE id LIKE ?",
    [`fin_manut_${id}%`]
  );

  // Delete the maintenance record
  await currentPool.query("DELETE FROM Manutencoes WHERE id = ?", [id]);

  if (boatId) {
    await updateBoatMaintenanceStatus(currentPool, boatId);
  }

  // Sync client financial status for affected clients
  for (const clienteId of clienteIds) {
    await syncClientFinancialStatus(clienteId);
  }
}

export async function getFuncionarios() {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query("SELECT * FROM Funcionarios ORDER BY createdAt DESC");
  return (rows as any[]).map(f => ({
    ...f,
    turnos: f.turnos ? JSON.parse(f.turnos) : [],
    primeiroEmprego: f.primeiroEmprego === 1
  }));
}

export async function upsertFuncionario(f: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const turnosStr = f.turnos ? JSON.stringify(f.turnos) : null;
  const query = `
    INSERT INTO Funcionarios (id, nome, cargo, setor, cpf, admissao, usuarioId, turnos, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nome = VALUES(nome), cargo = VALUES(cargo), setor = VALUES(setor), cpf = VALUES(cpf), admissao = VALUES(admissao), usuarioId = VALUES(usuarioId), turnos = VALUES(turnos)
  `;
  await currentPool.query(query, [f.id, f.nome, f.cargo || null, f.setor || null, f.cpf || null, f.admissao || null, f.usuarioId || null, turnosStr, f.createdAt || new Date().toISOString()]);
}

export async function deleteFuncionario(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Funcionarios WHERE id = ?", [id]);
}

export async function upsertEPI(funcionarioId: string, e: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const historicoTrocasStr = e.historicoTrocas ? JSON.stringify(e.historicoTrocas) : JSON.stringify([]);

  await currentPool.query(`
    INSERT INTO FuncionariosEPIs (id, funcionarioId, descricao, ca, quantidade, dataEntrega, dataDevolucao, status, geradoEm, historicoTrocas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      descricao = VALUES(descricao),
      ca = VALUES(ca),
      quantidade = VALUES(quantidade),
      dataEntrega = VALUES(dataEntrega),
      dataDevolucao = VALUES(dataDevolucao),
      status = VALUES(status),
      historicoTrocas = VALUES(historicoTrocas)
  `, [e.id, funcionarioId, e.descricao, e.ca, e.quantidade, e.dataEntrega || null, e.dataDevolucao || null, e.status || 'pendente', e.geradoEm || new Date().toISOString(), historicoTrocasStr]);
}

export async function deleteEPI(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM FuncionariosEPIs WHERE id = ?", [id]);
}

export async function saveHistoricoEPI(log: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(`
    INSERT INTO HistoricoEPIMensal (id, funcionarioId, mesAno, dadosSnapshot, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `, [log.id, log.funcionarioId, log.mesAno, log.dadosSnapshot, log.createdAt]);
}

export async function upsertFolga(f: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const query = `
    INSERT INTO Folgas (id, funcionarioId, data, tipo, status, motivo, observacao, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE funcionarioId = VALUES(funcionarioId), data = VALUES(data), tipo = VALUES(tipo), status = VALUES(status), motivo = VALUES(motivo), observacao = VALUES(observacao)
  `;
  await currentPool.query(query, [f.id, f.funcionarioId, f.data, f.tipo, f.status, f.motivo || null, f.observacao || null, f.createdAt || new Date().toISOString()]);
}

export async function deleteFolga(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Folgas WHERE id = ?", [id]);
}

// ---------------- Leads (Quiz Captura) ----------------
export async function getAllLeads() {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  const [rows] = await currentPool.query("SELECT * FROM Leads ORDER BY createdAt DESC");
  return rows as any[];
}

export async function upsertLead(l: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(`
    INSERT INTO Leads (id, nome, telefone, email, pontuacao, detalhes, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      telefone = VALUES(telefone),
      email = VALUES(email),
      pontuacao = VALUES(pontuacao),
      detalhes = VALUES(detalhes),
      status = VALUES(status),
      updatedAt = VALUES(updatedAt)
  `, [
    l.id, l.nome, l.telefone, l.email || '', l.pontuacao || 0,
    l.detalhes || '', l.status || 'novo',
    l.createdAt || new Date().toISOString(),
    l.updatedAt || new Date().toISOString()
  ]);
  return l;
}

export async function deleteLead(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Leads WHERE id = ?", [id]);
}

export async function upsertCatalogoEPI(item: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(`
    INSERT INTO CatalogoEPIs (id, nome, caPadrao, createdAt)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      caPadrao = VALUES(caPadrao)
  `, [item.id, item.nome, item.caPadrao || item.ca || null, item.createdAt || new Date().toISOString()]);
}

export async function deleteCatalogoEPI(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM CatalogoEPIs WHERE id = ?", [id]);
}

// ---------------- User Preferences ----------------

export async function getUserPreferences(userId: number): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) return null;
  const [rows] = await currentPool.query(
    "SELECT * FROM UserPreferences WHERE userId = ?",
    [userId]
  );
  const data = rows as any[];
  return data.length > 0 ? data[0] : null;
}

export async function upsertUserPreferences(userId: number, preferences: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(`
    INSERT INTO UserPreferences (userId, logoUrl, backgroundUrl, greetingText)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      logoUrl = VALUES(logoUrl),
      backgroundUrl = VALUES(backgroundUrl),
      greetingText = VALUES(greetingText)
  `, [
    userId,
    preferences.logoUrl || null,
    preferences.backgroundUrl || null,
    preferences.greetingText || null
  ]);
}

// ---------------- Fuel Inventory & History Database Operations ----------------


export async function getFuelInventoryFromDb(): Promise<any | null> {
  const pool = getDbPool();
  if (!pool) {
    const jsonStr = await getConfigValue("marina_fuel_inventory");
    return jsonStr ? JSON.parse(jsonStr) : null;
  }
  
  const [rows] = await pool.query(`SELECT * FROM CombustivelEstoque WHERE id = 1`) as any;
  if (rows.length > 0) {
    const row = rows[0];
    return {
      tanquePrincipalLitros: Number(row.tanque_principal),
      tanqueCapacidadeMaxima: Number(row.tanque_capacidade),
      alertaMinimoTanque: Number(row.alerta_minimo),
      galoesPierQuantidade: Number(row.galoes_qtd),
      galoesCapacidadeLitros: Number(row.galoes_capacidade),
      galaoParcialLitros: Number(row.galao_parcial),
      ultimaAtualizacao: row.ultima_atualizacao
    };
  }
  return null;
}

export async function saveFuelInventoryInDb(inv: any): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    await setConfigValue("marina_fuel_inventory", JSON.stringify(inv));
    return;
  }

  await pool.query(`
    UPDATE CombustivelEstoque SET 
      tanque_principal = ?, 
      tanque_capacidade = ?, 
      alerta_minimo = ?, 
      galoes_qtd = ?, 
      galoes_capacidade = ?, 
      galao_parcial = ?
    WHERE id = 1
  `, [
    inv.tanquePrincipalLitros || 0,
    inv.tanqueCapacidadeMaxima || 1000,
    inv.alertaMinimoTanque || 200,
    inv.galoesPierQuantidade || 0,
    inv.galoesCapacidadeLitros || 20,
    inv.galaoParcialLitros || 0
  ]);
  
  await setConfigValue("marina_fuel_inventory", JSON.stringify(inv));
}

export async function getFuelHistoryFromDb(): Promise<any[]> {
  const pool = getDbPool();
  if (!pool) {
    const jsonStr = await getConfigValue("marina_fuel_history");
    return jsonStr ? JSON.parse(jsonStr) : [];
  }

  const [rows] = await pool.query(`SELECT * FROM CombustivelMovimentacoes ORDER BY data_hora DESC LIMIT 500`) as any;
  
  return rows.map((r: any) => {
    const dateObj = r.data_hora ? new Date(r.data_hora) : new Date();
    const dateStr = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return {
      id: r.id,
      tipo: r.tipo,
      litros: Number(r.litros),
      galoes: Number(r.galoes),
      fornecedor: r.fornecedor,
      notaFiscal: r.nota_fiscal,
      valorTotal: r.valor_total ? Number(r.valor_total) : undefined,
      barcoNome: r.barco_nome,
      operador: r.operador,
      dataHora: Number.isNaN(dateObj.getTime()) ? String(r.data_hora) : dateStr, 
      detalhes: r.detalhes,
      diferencaLitros: r.diferenca_litros ? Number(r.diferenca_litros) : undefined
    };
  });
}

export async function saveFuelHistoryInDb(history: any[]): Promise<void> {
  const pool = getDbPool();
  if (!pool) {
    await setConfigValue("marina_fuel_history", JSON.stringify(history));
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const parseDate = (dStr) => {
      if (!dStr) return new Date();
      if (typeof dStr === 'string' && dStr.includes('/')) {
        const parts = dStr.split(' ');
        if (!parts[0]) return new Date();
        const dateParts = parts[0].split('/');
        if (dateParts.length !== 3) return new Date();
        const day = dateParts[0];
        const m = dateParts[1];
        const y = dateParts[2];
        const t = parts[1] || '00:00';
        return new Date(`${y}-${m}-${day}T${t}:00`);
      }
      return new Date(dStr);
    };

    for (const h of history) {
      if (!h.id || !h.tipo) continue;
      
      const dbDate = parseDate(h.dataHora);

      await connection.query(`
        INSERT IGNORE INTO CombustivelMovimentacoes 
        (id, tipo, litros, galoes, fornecedor, nota_fiscal, valor_total, barco_nome, operador, data_hora, detalhes, diferenca_litros)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        h.id.toString(), 
        h.tipo,
        h.litros || 0,
        h.galoes || 0,
        h.fornecedor || null,
        h.notaFiscal || null,
        h.valorTotal || null,
        h.barcoNome || null,
        h.operador || 'Sistema',
        isNaN(dbDate.getTime()) ? new Date() : dbDate,
        h.detalhes || null,
        h.diferencaLitros || null
      ]);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function resetFuelDataInDb(): Promise<void> {
  const pool = getDbPool();
  if (pool) {
    await pool.query(`TRUNCATE TABLE CombustivelMovimentacoes`);
    await pool.query(`UPDATE CombustivelEstoque SET tanque_principal = 0, galoes_qtd = 0, galao_parcial = 0 WHERE id = 1`);
  }
  await setConfigValue("marina_fuel_inventory", JSON.stringify({
    tanquePrincipalLitros: 0,
    tanqueCapacidadeMaxima: 1000,
    alertaMinimoTanque: 200,
    galoesPierQuantidade: 0,
    galoesCapacidadeLitros: 20,
    galaoParcialLitros: 0,
    ultimaAtualizacao: new Date().toLocaleDateString('pt-BR')
  }));
  await setConfigValue("marina_fuel_history", "[]");
}


// ──────────── Chamados ────────────

export async function getAllChamados(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  const [rows] = await currentPool.query("SELECT * FROM Chamados ORDER BY createdAt DESC");
  return rows as any[];
}

export async function upsertChamado(c: any): Promise<void> {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    `INSERT INTO Chamados (id, codigoChamado, embarcacaoId, solicitanteTipo, solicitanteNome, clienteId, titulo, descricaoAvaria, urgencia, status, osId, dataAbertura, observacoesAnalise, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigoChamado=VALUES(codigoChamado), embarcacaoId=VALUES(embarcacaoId),
       solicitanteTipo=VALUES(solicitanteTipo), solicitanteNome=VALUES(solicitanteNome),
       clienteId=VALUES(clienteId), titulo=VALUES(titulo), descricaoAvaria=VALUES(descricaoAvaria),
       urgencia=VALUES(urgencia), status=VALUES(status), osId=VALUES(osId),
       dataAbertura=VALUES(dataAbertura), observacoesAnalise=VALUES(observacoesAnalise)`,
    [
      c.id, c.codigoChamado, c.embarcacaoId, c.solicitanteTipo, c.solicitanteNome,
      c.clienteId || null, c.titulo, c.descricaoAvaria, c.urgencia || 'media',
      c.status || 'pendente', c.osId || null, c.dataAbertura, c.observacoesAnalise || null,
      c.createdAt
    ]
  );
}

export async function deleteChamado(id: string): Promise<void> {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Chamados WHERE id = ?", [id]);
}

export async function getNextChamadoCode(): Promise<string> {
  const currentPool = getDbPool();
  if (!currentPool) {
    // Fallback: timestamp-based code
    return `CHM-${new Date().getFullYear()}-${String(Date.now() % 1000).padStart(3, '0')}`;
  }

  const year = new Date().getFullYear();
  const prefix = `CHM-${year}-`;
  const [rows] = await currentPool.query(
    "SELECT codigoChamado FROM Chamados WHERE codigoChamado LIKE ? ORDER BY codigoChamado DESC LIMIT 1",
    [`${prefix}%`]
  );

  const existing = rows as any[];
  if (existing.length === 0) {
    return `${prefix}001`;
  }

  const lastCode = existing[0].codigoChamado; // e.g. "CHM-2026-005"
  const lastNum = parseInt(lastCode.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

export async function getNextCodigoOS(): Promise<string> {
  const currentPool = getDbPool();
  if (!currentPool) {
    return `OS-${new Date().getFullYear()}-${String(Date.now() % 1000).padStart(3, '0')}`;
  }

  const year = new Date().getFullYear();
  const prefix = `OS-${year}-`;
  const [rows] = await currentPool.query(
    "SELECT codigoOS FROM Manutencoes WHERE codigoOS LIKE ? ORDER BY codigoOS DESC LIMIT 1",
    [`${prefix}%`]
  );

  const existing = rows as any[];
  if (existing.length === 0) {
    return `${prefix}001`;
  }

  const lastCode = existing[0].codigoOS; // e.g. "OS-2026-005"
  const lastNum = parseInt(lastCode.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

// ──────────── Controle de Caixa da Marina ────────────

export async function getCaixaMarinaTransacoes(filters: {
  startDate?: string;
  endDate?: string;
  tipo?: string;
  categoria?: string;
  formaPagamento?: string;
  status?: string;
  search?: string;
} = {}): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  let query = "SELECT * FROM CaixaMarinaTransacoes WHERE 1=1";
  const params: any[] = [];

  if (filters.startDate) {
    query += " AND data >= ?";
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += " AND data <= ?";
    params.push(filters.endDate);
  }
  if (filters.tipo && filters.tipo !== 'todos') {
    query += " AND tipo = ?";
    params.push(filters.tipo);
  }
  if (filters.categoria && filters.categoria !== 'todas') {
    query += " AND categoria = ?";
    params.push(filters.categoria);
  }
  if (filters.formaPagamento && filters.formaPagamento !== 'todas') {
    query += " AND formaPagamento = ?";
    params.push(filters.formaPagamento);
  }
  if (filters.status && filters.status !== 'todos') {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    query += " AND (descricao LIKE ? OR clienteNome LIKE ? OR embarcacaoNome LIKE ? OR observacoes LIKE ?)";
    params.push(s, s, s, s);
  }

  query += " ORDER BY data DESC, hora DESC, createdAt DESC";

  const [rows] = await currentPool.query(query, params);
  return (rows as any[]).map(r => ({
    ...r,
    valor: Number(r.valor) || 0,
    combustivelLitros: r.combustivelLitros !== null ? Number(r.combustivelLitros) : null,
    quantidadeColetes: r.quantidadeColetes !== null ? Number(r.quantidadeColetes) : null,
    coletesDevolvidos: r.coletesDevolvidos === 1 || r.coletesDevolvidos === true,
  }));
}

export async function upsertCaixaMarinaTransacao(t: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = t.id || `cx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const tipo = t.tipo || 'entrada';
  const categoria = t.categoria || 'outros';
  const descricao = t.descricao || 'Lançamento de Caixa';
  const valor = Number(t.valor) || 0;
  const formaPagamento = t.formaPagamento || 'dinheiro';
  const data = t.data || new Date().toISOString().split('T')[0];
  const hora = t.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const status = t.status || 'confirmado';
  const clienteTipo = t.clienteTipo || 'avulso';
  const clienteId = t.clienteId || null;
  const clienteNome = t.clienteNome || null;
  const embarcacaoId = t.embarcacaoId || null;
  const embarcacaoNome = t.embarcacaoNome || null;
  const reservaId = t.reservaId || null;
  const combustivelLitros = t.combustivelLitros !== undefined && t.combustivelLitros !== null ? Number(t.combustivelLitros) : null;
  const quantidadeColetes = t.quantidadeColetes !== undefined && t.quantidadeColetes !== null ? Number(t.quantidadeColetes) : null;
  const coletesDevolvidos = t.coletesDevolvidos ? 1 : 0;
  const dataDevolucaoColetes = t.dataDevolucaoColetes || null;
  const comprovanteUrl = t.comprovanteUrl || null;
  const observacoes = t.observacoes || null;
  const registradoPor = t.registradoPor || 'Gerente';
  const createdAt = t.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();

  await currentPool.query(
    `INSERT INTO CaixaMarinaTransacoes (
      id, tipo, categoria, descricao, valor, formaPagamento, data, hora, status,
      clienteTipo, clienteId, clienteNome, embarcacaoId, embarcacaoNome, reservaId,
      combustivelLitros, quantidadeColetes, coletesDevolvidos, dataDevolucaoColetes,
      comprovanteUrl, observacoes, registradoPor, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tipo = VALUES(tipo),
      categoria = VALUES(categoria),
      descricao = VALUES(descricao),
      valor = VALUES(valor),
      formaPagamento = VALUES(formaPagamento),
      data = VALUES(data),
      hora = VALUES(hora),
      status = VALUES(status),
      clienteTipo = VALUES(clienteTipo),
      clienteId = VALUES(clienteId),
      clienteNome = VALUES(clienteNome),
      embarcacaoId = VALUES(embarcacaoId),
      embarcacaoNome = VALUES(embarcacaoNome),
      reservaId = VALUES(reservaId),
      combustivelLitros = VALUES(combustivelLitros),
      quantidadeColetes = VALUES(quantidadeColetes),
      coletesDevolvidos = VALUES(coletesDevolvidos),
      dataDevolucaoColetes = VALUES(dataDevolucaoColetes),
      comprovanteUrl = VALUES(comprovanteUrl),
      observacoes = VALUES(observacoes),
      registradoPor = VALUES(registradoPor),
      updatedAt = VALUES(updatedAt)`,
    [
      id, tipo, categoria, descricao, valor, formaPagamento, data, hora, status,
      clienteTipo, clienteId, clienteNome, embarcacaoId, embarcacaoNome, reservaId,
      combustivelLitros, quantidadeColetes, coletesDevolvidos, dataDevolucaoColetes,
      comprovanteUrl, observacoes, registradoPor, createdAt, updatedAt
    ]
  );
}

export async function deleteCaixaMarinaTransacao(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM CaixaMarinaTransacoes WHERE id = ?", [id]);
}

export async function devolverColetesCaixaMarina(id: string, devolvidoPor: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const agora = new Date().toISOString();
  await currentPool.query(
    "UPDATE CaixaMarinaTransacoes SET coletesDevolvidos = 1, dataDevolucaoColetes = ?, updatedAt = ? WHERE id = ?",
    [agora, agora, id]
  );
}

export async function getCaixaMarinaFechamento(dataStr: string): Promise<any | null> {
  const currentPool = getDbPool();
  if (!currentPool) return null;

  const [rows] = await currentPool.query(
    "SELECT * FROM CaixaMarinaFechamentos WHERE data = ?",
    [dataStr]
  );

  const existing = rows as any[];
  if (existing.length === 0) return null;

  const f = existing[0];
  return {
    ...f,
    saldoAberturaDinheiro: Number(f.saldoAberturaDinheiro) || 0,
    totalEntradasDinheiro: Number(f.totalEntradasDinheiro) || 0,
    totalSaidasDinheiro: Number(f.totalSaidasDinheiro) || 0,
    totalSangriasDinheiro: Number(f.totalSangriasDinheiro) || 0,
    saldoEsperadoDinheiro: Number(f.saldoEsperadoDinheiro) || 0,
    saldoContadoDinheiro: Number(f.saldoContadoDinheiro) || 0,
    diferencaDinheiro: Number(f.diferencaDinheiro) || 0,
    totalPix: Number(f.totalPix) || 0,
    totalCartaoDebito: Number(f.totalCartaoDebito) || 0,
    totalCartaoCredito: Number(f.totalCartaoCredito) || 0,
    totalGeralEntradas: Number(f.totalGeralEntradas) || 0,
    totalGeralSaidas: Number(f.totalGeralSaidas) || 0,
    saldoFinalTotal: Number(f.saldoFinalTotal) || 0,
  };
}

export async function salvarCaixaMarinaFechamento(f: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = f.id || `fech_${f.data || Date.now()}`;
  await currentPool.query(
    `INSERT INTO CaixaMarinaFechamentos (
      id, data, saldoAberturaDinheiro, totalEntradasDinheiro, totalSaidasDinheiro,
      totalSangriasDinheiro, saldoEsperadoDinheiro, saldoContadoDinheiro, diferencaDinheiro,
      totalPix, totalCartaoDebito, totalCartaoCredito, totalGeralEntradas, totalGeralSaidas,
      saldoFinalTotal, status, abertoPor, abertoEm, fechadoPor, fechadoEm, observacoesFechamento, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      saldoAberturaDinheiro = VALUES(saldoAberturaDinheiro),
      totalEntradasDinheiro = VALUES(totalEntradasDinheiro),
      totalSaidasDinheiro = VALUES(totalSaidasDinheiro),
      totalSangriasDinheiro = VALUES(totalSangriasDinheiro),
      saldoEsperadoDinheiro = VALUES(saldoEsperadoDinheiro),
      saldoContadoDinheiro = VALUES(saldoContadoDinheiro),
      diferencaDinheiro = VALUES(diferencaDinheiro),
      totalPix = VALUES(totalPix),
      totalCartaoDebito = VALUES(totalCartaoDebito),
      totalCartaoCredito = VALUES(totalCartaoCredito),
      totalGeralEntradas = VALUES(totalGeralEntradas),
      totalGeralSaidas = VALUES(totalGeralSaidas),
      saldoFinalTotal = VALUES(saldoFinalTotal),
      status = VALUES(status),
      abertoPor = VALUES(abertoPor),
      abertoEm = VALUES(abertoEm),
      fechadoPor = VALUES(fechadoPor),
      fechadoEm = VALUES(fechadoEm),
      observacoesFechamento = VALUES(observacoesFechamento)`,
    [
      id, f.data,
      Number(f.saldoAberturaDinheiro) || 0,
      Number(f.totalEntradasDinheiro) || 0,
      Number(f.totalSaidasDinheiro) || 0,
      Number(f.totalSangriasDinheiro) || 0,
      Number(f.saldoEsperadoDinheiro) || 0,
      Number(f.saldoContadoDinheiro) || 0,
      Number(f.diferencaDinheiro) || 0,
      Number(f.totalPix) || 0,
      Number(f.totalCartaoDebito) || 0,
      Number(f.totalCartaoCredito) || 0,
      Number(f.totalGeralEntradas) || 0,
      Number(f.totalGeralSaidas) || 0,
      Number(f.saldoFinalTotal) || 0,
      f.status || 'aberto',
      f.abertoPor || null,
      f.abertoEm || null,
      f.fechadoPor || null,
      f.fechadoEm || null,
      f.observacoesFechamento || null,
      f.createdAt || new Date().toISOString()
    ]
  );
}

export async function getAbastecimentosPendentesCaixa(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  // Busca reservas que possuem abastecimento registrado mas ainda não foram baixadas no caixa
  const [rows] = await currentPool.query(`
    SELECT r.id as reservaId, r.data, r.embarcacaoId, r.clienteId,
           r.abastecimentoLitros, r.abastecimentoValorTotal,
           r.abastecimentoFormaPagamento, r.abastecimentoStatusCobranca,
           r.abastecimentoComprovanteUrl, r.abastecimentoOperador, r.operadorChegada,
           e.nome as embarcacaoNome, e.numero as embarcacaoNumero,
           c.nome as clienteNome, c.telefone as clienteTelefone
    FROM Reservas r
    LEFT JOIN Embarcacoes e ON r.embarcacaoId = e.id
    LEFT JOIN Clientes c ON r.clienteId = c.id
    WHERE (
      CAST(r.abastecimentoLitros AS DECIMAL(10,2)) > 0
      AND (r.abastecimentoStatusCobranca = 'pendente' OR r.abastecimentoStatusCobranca IS NULL OR r.abastecimentoStatusCobranca = '' OR r.abastecimentoFormaPagamento = 'dinheiro')
      AND r.id NOT IN (SELECT reservaId FROM CaixaMarinaTransacoes WHERE reservaId IS NOT NULL AND status = 'confirmado')
    )
    ORDER BY r.data DESC, r.horaChegada DESC
  `);

  return (rows as any[]).map(r => {
    const litros = Number(r.abastecimentoLitros) || 0;
    const formaPagamentoSugerida = r.abastecimentoFormaPagamento || 'pix';
    const valorUnitario = getFuelPrice(formaPagamentoSugerida);
    const valorTotal = Number(r.abastecimentoValorTotal) || (litros * valorUnitario);

    return {
      reservaId: r.reservaId,
      data: r.data,
      embarcacaoId: r.embarcacaoId,
      embarcacaoNome: r.embarcacaoNome ? `${r.embarcacaoNumero ? `M${r.embarcacaoNumero} - ` : ''}${r.embarcacaoNome}` : 'Embarcação',
      clienteId: r.clienteId,
      clienteNome: r.clienteNome || 'Cliente Cotista',
      clienteTelefone: r.clienteTelefone,
      litros,
      valorTotal,
      formaPagamentoSugerida,
      operador: r.abastecimentoOperador || r.operadorChegada || 'Marinheiro',
      comprovanteUrl: r.abastecimentoComprovanteUrl
    };
  });
}



// ──────────── Contas Bancárias ────────────

export async function getAllContasBancarias(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  let rows: any[] = [];
  if (empresa) {
    const [r] = await currentPool.query("SELECT * FROM ContasBancarias WHERE empresa = ? ORDER BY nome ASC", [empresa]);
    rows = r as any[];
  } else {
    const [r] = await currentPool.query("SELECT * FROM ContasBancarias ORDER BY nome ASC");
    rows = r as any[];
  }
  return rows.map((row) => ({
    ...row,
    saldoInicial: Number(row.saldoInicial || 0),
    asaasSplitAtivo: row.asaasSplitAtivo !== undefined && row.asaasSplitAtivo !== null
      ? Boolean(Number(row.asaasSplitAtivo))
      : Boolean(row.asaasWalletId),
    asaasSplitTipo: row.asaasSplitTipo || 'PERCENTAGE',
    asaasSplitValor: row.asaasSplitValor !== undefined && row.asaasSplitValor !== null
      ? Number(row.asaasSplitValor)
      : 100,
    isContaPrincipalAsaas: Boolean(Number(row.isContaPrincipalAsaas || 0))
  }));
}

export async function upsertContaBancaria(c: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const idToUse = c.id || `conta_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
  const splitAtivo = c.asaasSplitAtivo !== undefined && c.asaasSplitAtivo !== null
    ? (c.asaasSplitAtivo ? 1 : 0)
    : (c.asaasWalletId ? 1 : 0);
  const splitTipo = c.asaasSplitTipo === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  const splitValor = c.asaasSplitValor !== undefined && c.asaasSplitValor !== '' && !isNaN(Number(c.asaasSplitValor))
    ? Number(c.asaasSplitValor)
    : 100;
  const isPrincipal = c.isContaPrincipalAsaas ? 1 : 0;

  await currentPool.query(
    `INSERT INTO ContasBancarias (
       id, nome, empresa, banco, agencia, conta, saldoInicial, status,
       asaasWalletId, asaasSplitAtivo, asaasSplitTipo, asaasSplitValor, isContaPrincipalAsaas,
       createdAt, updatedAt
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), empresa=VALUES(empresa), banco=VALUES(banco),
       agencia=VALUES(agencia), conta=VALUES(conta), saldoInicial=VALUES(saldoInicial),
       status=VALUES(status), asaasWalletId=VALUES(asaasWalletId),
       asaasSplitAtivo=VALUES(asaasSplitAtivo), asaasSplitTipo=VALUES(asaasSplitTipo),
       asaasSplitValor=VALUES(asaasSplitValor), isContaPrincipalAsaas=VALUES(isContaPrincipalAsaas),
       updatedAt=VALUES(updatedAt)`,
    [
      idToUse, c.nome, c.empresa || null, c.banco || null, c.agencia || null, c.conta || null,
      c.saldoInicial || 0, c.status || 'ativo',
      c.asaasWalletId ? String(c.asaasWalletId).trim() : null,
      splitAtivo, splitTipo, splitValor, isPrincipal,
      c.createdAt || new Date().toISOString(),
      c.updatedAt || new Date().toISOString()
    ]
  );
}

export async function deleteContaBancaria(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM ContasBancarias WHERE id = ?", [id]);
}

// ──────────── Planos de Contas ────────────

export async function getAllPlanosDeContas(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  if (empresa) {
    const [rows] = await currentPool.query("SELECT * FROM PlanosDeContas WHERE empresa = ? ORDER BY descricao ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM PlanosDeContas ORDER BY descricao ASC");
  return rows as any[];
}

export async function upsertPlanoDeConta(p: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    `INSERT INTO PlanosDeContas (id, codigoContabil, descricao, tipo, empresa, status, parentId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       codigoContabil=VALUES(codigoContabil), descricao=VALUES(descricao), tipo=VALUES(tipo),
       empresa=VALUES(empresa), status=VALUES(status), parentId=VALUES(parentId), updatedAt=VALUES(updatedAt)`,
    [
      p.id || `plano_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, p.codigoContabil || null, p.descricao, p.tipo, p.empresa, p.status || 'ativo', p.parentId || null, p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()
    ]
  );
}

export async function deletePlanoDeConta(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM PlanosDeContas WHERE id = ?", [id]);
}

export async function getAllCentrosDeCusto(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  if (empresa && empresa !== 'Todos') {
    const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto WHERE empresa = ? ORDER BY nome ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM CentrosDeCusto ORDER BY nome ASC");
  return rows as any[];
}

export async function upsertCentroDeCusto(p: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO CentrosDeCusto (id, nome, empresa, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), empresa=VALUES(empresa), status=VALUES(status), updatedAt=VALUES(updatedAt)`,
    [p.id || `centro_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, p.nome, p.empresa, p.status || 'ativo', p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()]
  );
}

export async function deleteCentroDeCusto(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM CentrosDeCusto WHERE id = ?", [id]);
}

// ──────────── Fornecedores ────────────

export async function getAllFornecedores(empresa?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  if (empresa) {
    const [rows] = await currentPool.query("SELECT * FROM Fornecedores WHERE empresaId = ? ORDER BY nomeFantasia ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM Fornecedores ORDER BY nomeFantasia ASC");
  return rows as any[];
}

export async function upsertFornecedor(f: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = f.id || `forn_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
  f.id = id;

  const dadosBancariosStr = typeof f.dadosBancarios === 'string'
    ? f.dadosBancarios
    : (f.dadosBancarios ? JSON.stringify(f.dadosBancarios) : null);

  await currentPool.query(
    `INSERT INTO Fornecedores (id, nomeFantasia, razaoSocial, cnpjCpf, empresaId, dadosBancarios, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nomeFantasia=VALUES(nomeFantasia), razaoSocial=VALUES(razaoSocial), cnpjCpf=VALUES(cnpjCpf),
       empresaId=VALUES(empresaId), dadosBancarios=VALUES(dadosBancarios), status=VALUES(status),
       updatedAt=VALUES(updatedAt)`,
    [
      id,
      f.nomeFantasia,
      f.razaoSocial || null,
      f.cnpjCpf || null,
      f.empresaId || f.empresa || null,
      dadosBancariosStr,
      f.status || 'ativo',
      f.createdAt || new Date().toISOString(),
      f.updatedAt || new Date().toISOString()
    ]
  );
}

export async function deleteFornecedor(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Fornecedores WHERE id = ?", [id]);
}


export async function consumeFuelAtomicDb(litros: number, barcoNome: string, operador: string, detalhes?: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error("No database pool available for atomic operation.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Lock row for update
    const [rows] = await connection.query('SELECT * FROM CombustivelEstoque WHERE id = 1 FOR UPDATE') as any;
    if (!rows || rows.length === 0) {
       throw new Error("Estoque de combustivel nao inicializado.");
    }
    
    const row = rows[0];
    let tanquePrincipal = Number(row.tanque_principal || 0);
    let galoesPierQuantidade = Number(row.galoes_qtd || 0);
    const galoesCapacidade = Number(row.galoes_capacidade || 20);
    let galaoParcialLitros = Number(row.galao_parcial || 0);

    let remainingToDeduct = litros;
  
    if (galaoParcialLitros > 0) {
      if (galaoParcialLitros >= remainingToDeduct) {
        galaoParcialLitros -= remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= galaoParcialLitros;
        galaoParcialLitros = 0;
      }
    }
    
    if (remainingToDeduct > 0) {
      const galoesNecessarios = Math.ceil(remainingToDeduct / galoesCapacidade);
      if (galoesPierQuantidade >= galoesNecessarios) {
        galoesPierQuantidade -= galoesNecessarios;
        const litrosExtraidos = galoesNecessarios * galoesCapacidade;
        galaoParcialLitros = litrosExtraidos - remainingToDeduct;
        remainingToDeduct = 0;
      } else {
        const litrosDisponiveisNosGaloes = galoesPierQuantidade * galoesCapacidade;
        remainingToDeduct -= litrosDisponiveisNosGaloes;
        galoesPierQuantidade = 0;
        galaoParcialLitros = 0;
        tanquePrincipal = Math.max(0, tanquePrincipal - remainingToDeduct);
      }
    }

    await connection.query(`
      UPDATE CombustivelEstoque SET 
        tanque_principal = ?, 
        galoes_qtd = ?, 
        galao_parcial = ?
      WHERE id = 1
    `, [tanquePrincipal, galoesPierQuantidade, galaoParcialLitros]);

    const idHist = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const dataHoraStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const computedDetalhes = detalhes || `Abastecimento de ${litros}L na embarcação ${barcoNome}`;
    
    await connection.query(`
      INSERT INTO CombustivelMovimentacoes (
        id, tipo, litros, barco_nome, operador, data_hora, detalhes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
       idHist,
       'abastecimento_embarcacao',
       litros,
       barcoNome || "",
       operador || "",
       dataHoraStr,
       computedDetalhes
    ]);


    await connection.commit();
    return true;
  } catch(e: any) {
    await connection.rollback();
    console.error("Erro na baixa de combustivel (atomic):", e.message);
    throw e;
  } finally {
    connection.release();
  }
}

export async function restoreFuelAtomicDb(litros: number, motivo: string, operador: string): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) {
    throw new Error("No database pool available for atomic operation.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [rows] = await connection.query('SELECT * FROM CombustivelEstoque WHERE id = 1 FOR UPDATE') as any;
    if (!rows || rows.length === 0) {
       throw new Error("Estoque de combustivel nao inicializado.");
    }
    
    const row = rows[0];
    let tanquePrincipal = Number(row.tanque_principal || 0);

    // Devolve direto para o tanque principal para simplificar
    tanquePrincipal += litros;

    await connection.query(`
      UPDATE CombustivelEstoque SET 
        tanque_principal = ?
      WHERE id = 1
    `, [tanquePrincipal]);

    const idHist = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const dataHoraStr = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    await connection.query(`
      INSERT INTO CombustivelMovimentacoes (
        id, tipo, litros, operador, data_hora, detalhes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
       idHist,
       'ajuste_manual',
       litros,
       operador || "",
       dataHoraStr,
       `Estorno de combustivel: ${motivo} (${litros}L devolvidos ao tanque principal)`
    ]);


    await connection.commit();
    return true;
  } catch(e: any) {
    await connection.rollback();
    console.error("Erro no estorno de combustivel (atomic):", e.message);
    throw e;
  } finally {
    connection.release();
  }
}

// ─────────────────────────────────────────────────────────────
// ──────────── MÓDULO UTV (VEÍCULO DE TRILHA OFF-ROAD) ────────
// ─────────────────────────────────────────────────────────────

// ── Veículos UTV ──

export async function getUtvVeiculos(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query("SELECT * FROM UtvVeiculos ORDER BY nome ASC");
  return (rows as any[]).map(v => ({
    ...v,
    kmAtual: Number(v.kmAtual) || 0,
    horimetroAtual: Number(v.horimetroAtual) || 0,
  }));
}

export async function upsertUtvVeiculo(v: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = v.id || `utv_v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const agora = new Date().toISOString();

  await currentPool.query(
    `INSERT INTO UtvVeiculos (id, nome, modelo, ano, placa_chassi, kmAtual, horimetroAtual, status, imagemUrl, observacoes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome = VALUES(nome),
       modelo = VALUES(modelo),
       ano = VALUES(ano),
       placa_chassi = VALUES(placa_chassi),
       kmAtual = VALUES(kmAtual),
       horimetroAtual = VALUES(horimetroAtual),
       status = VALUES(status),
       imagemUrl = VALUES(imagemUrl),
       observacoes = VALUES(observacoes),
       updatedAt = VALUES(updatedAt)`,
    [
      id,
      v.nome || 'UTV Can-Am Maverick',
      v.modelo || null,
      v.ano ? Number(v.ano) : null,
      v.placa_chassi || null,
      Number(v.kmAtual) || 0,
      Number(v.horimetroAtual) || 0,
      v.status || 'disponivel',
      v.imagemUrl || null,
      v.observacoes || null,
      v.createdAt || agora,
      agora
    ]
  );
}

export async function deleteUtvVeiculo(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM UtvVeiculos WHERE id = ?", [id]);
}

// ── Cotistas UTV ──

export async function getUtvCotistas(ano?: number): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const anoFiltro = ano || new Date().getFullYear();
  const [rows] = await currentPool.query(
    "SELECT * FROM UtvCotistas WHERE anoExercicio = ? ORDER BY cotaNumero ASC, nome ASC",
    [anoFiltro]
  );
  return (rows as any[]).map(c => ({
    ...c,
    limiteDiasAnual: Number(c.limiteDiasAnual) || 30,
    anoExercicio: Number(c.anoExercicio) || anoFiltro,
  }));
}

export async function upsertUtvCotista(c: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = c.id || `utv_c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ano = c.anoExercicio ? Number(c.anoExercicio) : new Date().getFullYear();

  await currentPool.query(
    `INSERT INTO UtvCotistas (id, clienteId, nome, cotaNumero, telefone, email, cpf, limiteDiasAnual, anoExercicio, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       clienteId = VALUES(clienteId),
       nome = VALUES(nome),
       cotaNumero = VALUES(cotaNumero),
       telefone = VALUES(telefone),
       email = VALUES(email),
       cpf = VALUES(cpf),
       limiteDiasAnual = VALUES(limiteDiasAnual),
       anoExercicio = VALUES(anoExercicio),
       status = VALUES(status)`,
    [
      id,
      c.clienteId || null,
      c.nome,
      c.cotaNumero || 'Cota 01',
      c.telefone || null,
      c.email || null,
      c.cpf || null,
      c.limiteDiasAnual !== undefined ? Number(c.limiteDiasAnual) : 30,
      ano,
      c.status || 'ativo',
      c.createdAt || new Date().toISOString()
    ]
  );
}

export async function deleteUtvCotista(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM UtvCotistas WHERE id = ?", [id]);
}

// ── Usos / Checklists / Reservas UTV ──

export async function getUtvUsos(filters: {
  veiculoId?: string;
  cotistaId?: string;
  dataUso?: string;
  status?: string;
  ano?: number;
} = {}): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  let query = `
    SELECT u.*,
           c.nome AS cotistaNome, c.cotaNumero AS cotistaCota, c.telefone AS cotistaTelefone,
           v.nome AS veiculoNome
    FROM UtvUsos u
    LEFT JOIN UtvCotistas c ON u.cotistaId = c.id
    LEFT JOIN UtvVeiculos v ON u.veiculoId = v.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.veiculoId && filters.veiculoId !== 'todos') {
    query += " AND u.veiculoId = ?";
    params.push(filters.veiculoId);
  }
  if (filters.cotistaId && filters.cotistaId !== 'todos') {
    query += " AND u.cotistaId = ?";
    params.push(filters.cotistaId);
  }
  if (filters.dataUso) {
    query += " AND u.dataUso = ?";
    params.push(filters.dataUso);
  }
  if (filters.status && filters.status !== 'todos') {
    query += " AND u.status = ?";
    params.push(filters.status);
  }
  if (filters.ano) {
    query += " AND u.dataUso LIKE ?";
    params.push(`${filters.ano}-%`);
  }

  query += " ORDER BY u.dataUso DESC, u.createdAt DESC";

  const [rows] = await currentPool.query(query, params);
  return (rows as any[]).map(u => ({
    ...u,
    kmInicial: u.kmInicial !== null ? Number(u.kmInicial) : null,
    horimetroInicial: u.horimetroInicial !== null ? Number(u.horimetroInicial) : null,
    kmFinal: u.kmFinal !== null ? Number(u.kmFinal) : null,
    horimetroFinal: u.horimetroFinal !== null ? Number(u.horimetroFinal) : null,
    kmRodado: Number(u.kmRodado) || 0,
    horasUtilizadas: Number(u.horasUtilizadas) || 0,
    tanqueCheioDevolvido: u.tanqueCheioDevolvido === 1 || u.tanqueCheioDevolvido === true,
    fotosSaida: u.fotosSaida ? (typeof u.fotosSaida === 'string' ? JSON.parse(u.fotosSaida) : u.fotosSaida) : [],
    fotosChegada: u.fotosChegada ? (typeof u.fotosChegada === 'string' ? JSON.parse(u.fotosChegada) : u.fotosChegada) : [],
  }));
}

export async function getUtvUsoById(id: string): Promise<any | null> {
  const currentPool = getDbPool();
  if (!currentPool) return null;

  const [rows] = await currentPool.query(
    `SELECT u.*,
            c.nome AS cotistaNome, c.cotaNumero AS cotistaCota, c.telefone AS cotistaTelefone,
            v.nome AS veiculoNome
     FROM UtvUsos u
     LEFT JOIN UtvCotistas c ON u.cotistaId = c.id
     LEFT JOIN UtvVeiculos v ON u.veiculoId = v.id
     WHERE u.id = ?`,
    [id]
  );
  const arr = rows as any[];
  if (arr.length === 0) return null;

  const u = arr[0];
  return {
    ...u,
    kmInicial: u.kmInicial !== null ? Number(u.kmInicial) : null,
    horimetroInicial: u.horimetroInicial !== null ? Number(u.horimetroInicial) : null,
    kmFinal: u.kmFinal !== null ? Number(u.kmFinal) : null,
    horimetroFinal: u.horimetroFinal !== null ? Number(u.horimetroFinal) : null,
    kmRodado: Number(u.kmRodado) || 0,
    horasUtilizadas: Number(u.horasUtilizadas) || 0,
    tanqueCheioDevolvido: u.tanqueCheioDevolvido === 1 || u.tanqueCheioDevolvido === true,
    fotosSaida: u.fotosSaida ? (typeof u.fotosSaida === 'string' ? JSON.parse(u.fotosSaida) : u.fotosSaida) : [],
    fotosChegada: u.fotosChegada ? (typeof u.fotosChegada === 'string' ? JSON.parse(u.fotosChegada) : u.fotosChegada) : [],
  };
}

export async function upsertUtvUso(u: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = u.id || `utv_uso_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const agora = new Date().toISOString();

  // Calcular deltas se houver valores finais e iniciais
  let kmRodado = Number(u.kmRodado) || 0;
  if (u.kmFinal !== undefined && u.kmInicial !== undefined && u.kmFinal !== null && u.kmInicial !== null) {
    kmRodado = Math.max(0, Math.round((Number(u.kmFinal) - Number(u.kmInicial)) * 100) / 100);
  }

  let horasUtilizadas = Number(u.horasUtilizadas) || 0;
  if (u.horimetroFinal !== undefined && u.horimetroInicial !== undefined && u.horimetroFinal !== null && u.horimetroInicial !== null) {
    horasUtilizadas = Math.max(0, Math.round((Number(u.horimetroFinal) - Number(u.horimetroInicial)) * 100) / 100);
  }

  const fotosSaidaStr = Array.isArray(u.fotosSaida) ? JSON.stringify(u.fotosSaida) : (u.fotosSaida || null);
  const fotosChegadaStr = Array.isArray(u.fotosChegada) ? JSON.stringify(u.fotosChegada) : (u.fotosChegada || null);

  await currentPool.query(
    `INSERT INTO UtvUsos (
      id, veiculoId, cotistaId, dataUso, status,
      horaSaida, kmInicial, horimetroInicial, limpezaSaida, tanqueSaida, fotosSaida, observacoesSaida, operadorSaida,
      horaChegada, kmFinal, horimetroFinal, kmRodado, horasUtilizadas, limpezaChegada, tanqueChegada, tanqueCheioDevolvido,
      comprovanteAbastecimentoUrl, avarias, fotosChegada, observacoesChegada, operadorChegada,
      fechadoEm, fechadoPor, canceladoEm, canceladoPor, motivoCancelamento, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      veiculoId = VALUES(veiculoId),
      cotistaId = VALUES(cotistaId),
      dataUso = VALUES(dataUso),
      status = VALUES(status),
      horaSaida = VALUES(horaSaida),
      kmInicial = VALUES(kmInicial),
      horimetroInicial = VALUES(horimetroInicial),
      limpezaSaida = VALUES(limpezaSaida),
      tanqueSaida = VALUES(tanqueSaida),
      fotosSaida = VALUES(fotosSaida),
      observacoesSaida = VALUES(observacoesSaida),
      operadorSaida = VALUES(operadorSaida),
      horaChegada = VALUES(horaChegada),
      kmFinal = VALUES(kmFinal),
      horimetroFinal = VALUES(horimetroFinal),
      kmRodado = VALUES(kmRodado),
      horasUtilizadas = VALUES(horasUtilizadas),
      limpezaChegada = VALUES(limpezaChegada),
      tanqueChegada = VALUES(tanqueChegada),
      tanqueCheioDevolvido = VALUES(tanqueCheioDevolvido),
      comprovanteAbastecimentoUrl = VALUES(comprovanteAbastecimentoUrl),
      avarias = VALUES(avarias),
      fotosChegada = VALUES(fotosChegada),
      observacoesChegada = VALUES(observacoesChegada),
      operadorChegada = VALUES(operadorChegada),
      fechadoEm = VALUES(fechadoEm),
      fechadoPor = VALUES(fechadoPor),
      canceladoEm = VALUES(canceladoEm),
      canceladoPor = VALUES(canceladoPor),
      motivoCancelamento = VALUES(motivoCancelamento)`,
    [
      id,
      u.veiculoId,
      u.cotistaId,
      u.dataUso,
      u.status || 'reservado',
      u.horaSaida || null,
      u.kmInicial !== undefined && u.kmInicial !== null ? Number(u.kmInicial) : null,
      u.horimetroInicial !== undefined && u.horimetroInicial !== null ? Number(u.horimetroInicial) : null,
      u.limpezaSaida || null,
      u.tanqueSaida || 'cheio',
      fotosSaidaStr,
      u.observacoesSaida || null,
      u.operadorSaida || null,
      u.horaChegada || null,
      u.kmFinal !== undefined && u.kmFinal !== null ? Number(u.kmFinal) : null,
      u.horimetroFinal !== undefined && u.horimetroFinal !== null ? Number(u.horimetroFinal) : null,
      kmRodado,
      horasUtilizadas,
      u.limpezaChegada || null,
      u.tanqueChegada || 'cheio',
      u.tanqueCheioDevolvido !== undefined ? (u.tanqueCheioDevolvido ? 1 : 0) : 1,
      u.comprovanteAbastecimentoUrl || null,
      u.avarias || null,
      fotosChegadaStr,
      u.observacoesChegada || null,
      u.operadorChegada || null,
      u.fechadoEm || null,
      u.fechadoPor || null,
      u.canceladoEm || null,
      u.canceladoPor || null,
      u.motivoCancelamento || null,
      u.createdAt || agora
    ]
  );

  // Se o uso foi finalizado como "realizado", atualiza o horímetro e km atuais do veículo
  if (u.status === 'realizado' && u.veiculoId) {
    if (u.kmFinal || u.horimetroFinal) {
      await currentPool.query(
        `UPDATE UtvVeiculos
         SET kmAtual = GREATEST(kmAtual, ?),
             horimetroAtual = GREATEST(horimetroAtual, ?),
             status = 'disponivel',
             updatedAt = ?
         WHERE id = ?`,
        [Number(u.kmFinal) || 0, Number(u.horimetroFinal) || 0, agora, u.veiculoId]
      );
    }
  } else if (u.status === 'em_uso' && u.veiculoId) {
    await currentPool.query(
      `UPDATE UtvVeiculos SET status = 'em_uso', updatedAt = ? WHERE id = ?`,
      [agora, u.veiculoId]
    );
  }
}

/**
 * Exclusão de uso do UTV.
 * REGRA RIGOROSA DE INTEGRIDADE (utv.md):
 * "É terminantemente proibido apagar um uso já realizado.
 * Qualquer correção deve ser feita de forma a preservar o histórico do sistema."
 */
export async function deleteUtvUso(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query("SELECT status FROM UtvUsos WHERE id = ?", [id]);
  const arr = rows as any[];
  if (arr.length === 0) return;

  const status = arr[0].status;
  if (status === 'realizado') {
    throw new Error("É terminantemente proibido apagar um uso já realizado. Regra de integridade do UTV.");
  }

  await currentPool.query("DELETE FROM UtvUsos WHERE id = ?", [id]);
}

// ── Controle Anual (Franquia de 30 Dias & Métricas Acumuladas) ──

export async function getUtvControleAnual(ano?: number): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const anoExercicio = ano || new Date().getFullYear();

  // Buscar todos os cotistas do ano
  const [cotistasRows] = await currentPool.query(
    "SELECT * FROM UtvCotistas WHERE anoExercicio = ? ORDER BY cotaNumero ASC, nome ASC",
    [anoExercicio]
  );
  const cotistas = cotistasRows as any[];

  // Buscar todos os usos do ano
  const [usosRows] = await currentPool.query(
    "SELECT * FROM UtvUsos WHERE dataUso LIKE ?",
    [`${anoExercicio}-%`]
  );
  const usos = usosRows as any[];

  return cotistas.map(cot => {
    const cotistaUsos = usos.filter(u => u.cotistaId === cot.id);

    // Contagem de dias conforme utv.md:
    // Reservas ativas bloqueiam saldo provisoriamente ('reservado', 'em_uso')
    const diasReservados = cotistaUsos.filter(u => u.status === 'reservado' || u.status === 'em_uso').length;
    // Realizado efetiva baixa ('realizado')
    const diasRealizados = cotistaUsos.filter(u => u.status === 'realizado').length;
    // Cancelados não debitam dia da cota anual
    const limiteDias = Number(cot.limiteDiasAnual) || 30;
    const saldoDisponivel = Math.max(0, limiteDias - (diasReservados + diasRealizados));

    // Acúmulo perpétuo de KM e Horas
    let kmTotalAcumulado = 0;
    let horasMotorAcumuladas = 0;
    cotistaUsos.forEach(u => {
      if (u.status === 'realizado') {
        kmTotalAcumulado += Number(u.kmRodado) || 0;
        horasMotorAcumuladas += Number(u.horasUtilizadas) || 0;
      }
    });

    return {
      cotistaId: cot.id,
      clienteId: cot.clienteId,
      nome: cot.nome,
      cotaNumero: cot.cotaNumero,
      telefone: cot.telefone,
      limiteDiasAnual: limiteDias,
      diasReservados,
      diasRealizados,
      saldoDisponivel,
      kmTotalAcumulado: Math.round(kmTotalAcumulado * 100) / 100,
      horasMotorAcumuladas: Math.round(horasMotorAcumuladas * 100) / 100,
      anoExercicio
    };
  });
}

// ── Rateio de Manutenção UTV ──

export async function getUtvManutencoes(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query(
    `SELECT m.*, v.nome AS veiculoNome
     FROM UtvManutencoes m
     LEFT JOIN UtvVeiculos v ON m.veiculoId = v.id
     ORDER BY m.data DESC, m.createdAt DESC`
  );
  return (rows as any[]).map(m => ({
    ...m,
    valorTotal: Number(m.valorTotal) || 0,
    detalhesRateio: m.detalhesRateio ? (typeof m.detalhesRateio === 'string' ? JSON.parse(m.detalhesRateio) : m.detalhesRateio) : []
  }));
}

export async function upsertUtvManutencao(m: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const id = m.id || `utv_manut_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const detalhesStr = Array.isArray(m.detalhesRateio) ? JSON.stringify(m.detalhesRateio) : (m.detalhesRateio || null);

  await currentPool.query(
    `INSERT INTO UtvManutencoes (id, veiculoId, data, descricao, valorTotal, criterioRateio, detalhesRateio, registradoPor, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       veiculoId = VALUES(veiculoId),
       data = VALUES(data),
       descricao = VALUES(descricao),
       valorTotal = VALUES(valorTotal),
       criterioRateio = VALUES(criterioRateio),
       detalhesRateio = VALUES(detalhesRateio),
       registradoPor = VALUES(registradoPor)`,
    [
      id,
      m.veiculoId,
      m.data || new Date().toISOString().split('T')[0],
      m.descricao,
      Number(m.valorTotal) || 0,
      m.criterioRateio || 'horas',
      detalhesStr,
      m.registradoPor || null,
      m.createdAt || new Date().toISOString()
    ]
  );
}

export async function deleteUtvManutencao(id: string): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM UtvManutencoes WHERE id = ?", [id]);
}

/**
 * Calcula o rateio proporcional de uma despesa de manutenção entre os cotistas
 * Baseado no uso real acumulado (KM ou Horas Decimais)
 */
export async function calcularRateioUtv(params: {
  veiculoId: string;
  valorTotal: number;
  criterioRateio: 'horas' | 'km';
  ano?: number;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const anoExercicio = params.ano || new Date().getFullYear();
  const controle = await getUtvControleAnual(anoExercicio);

  const valorTotal = Number(params.valorTotal) || 0;
  const criterio = params.criterioRateio || 'horas';

  // Obter total geral de uso do critério escolhido
  let totalUsoGeral = 0;
  controle.forEach(c => {
    const uso = criterio === 'km' ? c.kmTotalAcumulado : c.horasMotorAcumuladas;
    totalUsoGeral += uso;
  });

  const totalCotistas = controle.length;

  const detalhes = controle.map(cot => {
    const usoIndividual = criterio === 'km' ? cot.kmTotalAcumulado : cot.horasMotorAcumuladas;
    let percentual = 0;
    let valorRateado = 0;

    if (totalUsoGeral > 0) {
      percentual = (usoIndividual / totalUsoGeral) * 100;
      valorRateado = (valorTotal * percentual) / 100;
    } else if (totalCotistas > 0) {
      // Se ninguém rodou ainda, rateia igualmente
      percentual = 100 / totalCotistas;
      valorRateado = valorTotal / totalCotistas;
    }

    return {
      cotistaId: cot.cotistaId,
      cotistaNome: cot.nome,
      cotaNumero: cot.cotaNumero,
      usoAcumulado: Math.round(usoIndividual * 100) / 100,
      percentual: Math.round(percentual * 100) / 100,
      valorRateado: Math.round(valorRateado * 100) / 100
    };
  });

  return {
    veiculoId: params.veiculoId,
    valorTotal,
    criterioRateio: criterio,
    totalUsoGeral: Math.round(totalUsoGeral * 100) / 100,
    detalhes
  };
}

// ─────────────────────────────────────────────────────────────
// ──────────── MÓDULO COMERCIAL — LANÇAMENTO DE VENDAS ─────────
// ─────────────────────────────────────────────────────────────

function buildDueDateWithFixedDay(baseDateStr: string, monthOffset: number, fixedDay: number): string {
  const parts = baseDateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || (new Date().getMonth() + 1)) - 1;
  const target = new Date(year, month + monthOffset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(Math.max(1, fixedDay || 10), lastDay);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatNumberToBRLString(val: number): string {
  const fixed = (Number(val) || 0).toFixed(2).replace('.', ',');
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function getMonthNameFromDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length >= 2) {
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12) return MONTH_NAMES_PT[m - 1];
  }
  return '';
}

export async function getNextCodigoVenda(): Promise<string> {
  const currentPool = getDbPool();
  const year = new Date().getFullYear();
  const prefix = `VND-${year}-`;
  if (!currentPool) {
    return `${prefix}${String(Date.now() % 1000).padStart(3, '0')}`;
  }

  const [rows] = await currentPool.query(
    "SELECT codigoVenda FROM Vendas WHERE codigoVenda LIKE ? ORDER BY codigoVenda DESC LIMIT 1",
    [`${prefix}%`]
  );
  const existing = rows as any[];
  if (existing.length === 0) {
    return `${prefix}001`;
  }
  const lastCode = existing[0].codigoVenda || '';
  const lastNum = parseInt(lastCode.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

export async function getAllVendas(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query(`
    SELECT v.*,
           c.nome AS clienteNome, c.cpf AS clienteCpf, c.telefone AS clienteTelefone,
           c.statusContrato AS clienteStatusContrato,
           c.tipoContrato AS clienteTipoContrato,
           c.contratoAquisicaoStatus AS clienteContratoAquisicaoStatus,
           c.contratoAquisicaoArquivoUrl AS clienteContratoAquisicaoArquivoUrl,
           c.contratoAdmStatus AS clienteContratoAdmStatus,
           c.contratoAdmArquivoUrl AS clienteContratoAdmArquivoUrl,
           c.contratos AS clienteContratosRaw,
           e.nome AS embarcacaoNome, e.numero AS embarcacaoNumero, e.modelo AS embarcacaoModelo
    FROM Vendas v
    LEFT JOIN Clientes c ON v.clienteId = c.id
    LEFT JOIN Embarcacoes e ON v.embarcacaoId = e.id
    ORDER BY v.dataVenda DESC, v.createdAt DESC
  `);

  const vendas = rows as any[];
  if (vendas.length === 0) return [];

  // Buscar resumo das transações financeiras vinculadas às vendas
  const [txRows] = await currentPool.query(`
    SELECT id, grupoParcelamentoId, status, valor, dataVencimento, dataPagamento, comprovante
    FROM TransacoesFinanceiras
    WHERE grupoParcelamentoId LIKE 'GRP-VND-%' OR id LIKE 'fin_vnd_%'
  `);
  const txs = txRows as any[];

  const txByGroup = new Map<string, any[]>();
  const txById = new Map<string, any>();
  txs.forEach(t => {
    txById.set(t.id, t);
    if (t.grupoParcelamentoId) {
      if (!txByGroup.has(t.grupoParcelamentoId)) txByGroup.set(t.grupoParcelamentoId, []);
      txByGroup.get(t.grupoParcelamentoId)!.push(t);
    }
  });

  return vendas.map(v => {
    const groupTxs = v.grupoParcelamentoId ? (txByGroup.get(v.grupoParcelamentoId) || []) : [];
    const entradaTx = v.transacaoEntradaId ? txById.get(v.transacaoEntradaId) : null;

    const parcelasPagas = groupTxs.filter(t => t.status === 'pago').length;
    const parcelasVencidas = groupTxs.filter(t => t.status === 'vencido').length;
    let totalRecebidoCota = groupTxs
      .filter(t => t.status === 'pago')
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    const statusEntradaFinanceiro = entradaTx ? entradaTx.status : (v.entradaPaga ? 'pago' : 'lancado');
    if (statusEntradaFinanceiro === 'pago') {
      totalRecebidoCota += Number(v.valorEntrada) || 0;
    }

    // Avaliar status dos contratos de Aquisição e Administração (incluindo fallback no array JSON contratos)
    let parsedContratos: any[] = [];
    if (v.clienteContratosRaw) {
      try {
        parsedContratos = typeof v.clienteContratosRaw === 'string'
          ? JSON.parse(v.clienteContratosRaw)
          : v.clienteContratosRaw;
      } catch {
        parsedContratos = [];
      }
    }

    let aquisicaoStatus = v.clienteContratoAquisicaoStatus || 'sem_contrato';
    let admStatus = v.clienteContratoAdmStatus || 'sem_contrato';

    if (Array.isArray(parsedContratos) && parsedContratos.length > 0) {
      const hasAqAssinado = parsedContratos.some(ct => ct.tipo === 'aquisicao' && ct.status === 'assinado');
      const hasAdmAssinado = parsedContratos.some(ct => ct.tipo === 'adm' && ct.status === 'assinado');
      if (hasAqAssinado) aquisicaoStatus = 'assinado';
      if (hasAdmAssinado) admStatus = 'assinado';
    }

    if (v.clienteStatusContrato === 'assinado') {
      if (v.clienteTipoContrato === 'ambos') {
        aquisicaoStatus = 'assinado';
        admStatus = 'assinado';
      } else if (v.clienteTipoContrato === 'aquisicao' && aquisicaoStatus === 'sem_contrato') {
        aquisicaoStatus = 'assinado';
      } else if (v.clienteTipoContrato === 'adm' && admStatus === 'sem_contrato') {
        admStatus = 'assinado';
      }
    }

    const { clienteContratosRaw, ...restVenda } = v;

    return {
      ...restVenda,
      embarcacaoNome: v.embarcacaoNome
        ? `${v.embarcacaoNumero ? `M${String(v.embarcacaoNumero).replace(/^M/i, '')} - ` : ''}${v.embarcacaoNome}`
        : 'Embarcação',
      valorTotal: Number(v.valorTotal) || 0,
      valorEntrada: Number(v.valorEntrada) || 0,
      entradaPaga: v.entradaPaga === 1 || v.entradaPaga === true || statusEntradaFinanceiro === 'pago',
      comprovanteEntrada: (entradaTx && entradaTx.comprovante) ? entradaTx.comprovante : (v.comprovanteEntrada || null),
      valorRemanescente: Number(v.valorRemanescente) || 0,
      numParcelas: Number(v.numParcelas) || 0,
      valorParcela: Number(v.valorParcela) || 0,
      diaVencimento: Number(v.diaVencimento) || 10,
      gerouTaxaAdm: v.gerouTaxaAdm === 1 || v.gerouTaxaAdm === true,
      valorTaxaAdm: Number(v.valorTaxaAdm) || 0,
      mesesTaxaAdm: Number(v.mesesTaxaAdm) || 0,
      diaVencimentoTaxaAdm: Number(v.diaVencimentoTaxaAdm) || 10,
      parcelasPagas,
      parcelasVencidas,
      totalRecebidoCota: Math.round(totalRecebidoCota * 100) / 100,
      statusEntradaFinanceiro,
      clienteStatusContrato: v.clienteStatusContrato || 'sem_contrato',
      clienteTipoContrato: v.clienteTipoContrato || 'aquisicao',
      clienteContratoAquisicaoStatus: aquisicaoStatus,
      clienteContratoAquisicaoArquivoUrl: v.clienteContratoAquisicaoArquivoUrl || null,
      clienteContratoAdmStatus: admStatus,
      clienteContratoAdmArquivoUrl: v.clienteContratoAdmArquivoUrl || null,
      comissaoLiberadaManual: v.comissaoLiberadaManual === 1 || v.comissaoLiberadaManual === true,
      dataConclusaoProcesso: v.dataConclusaoProcesso || null
    };
  });
}

export async function createVendaCompleta(payload: any): Promise<any> {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  // Ler configurações padrão definidas pelo Administrador
  const vendaPadraoEmpresa = (await getConfigValue('venda_padrao_empresa')) || 'Mexicano';
  const vendaPadraoPlanoContasId = (await getConfigValue('venda_padrao_plano_contas_id')) || null;
  const vendaPadraoCentroCustoId = (await getConfigValue('venda_padrao_centro_custo_id')) || null;
  const vendaPadraoContaBancariaId = (await getConfigValue('venda_padrao_conta_bancaria_id')) || null;
  const vendaPadraoCategoria = (await getConfigValue('venda_padrao_categoria')) || 'Venda de Cota';

  const taxaAdmPadraoEmpresa = (await getConfigValue('taxa_adm_padrao_empresa')) || 'Vale Administradora';
  const taxaAdmPadraoPlanoContasId = (await getConfigValue('taxa_adm_padrao_plano_contas_id')) || null;
  const taxaAdmPadraoCentroCustoId = (await getConfigValue('taxa_adm_padrao_centro_custo_id')) || null;
  const taxaAdmPadraoContaBancariaId = (await getConfigValue('taxa_adm_padrao_conta_bancaria_id')) || null;
  const taxaAdmPadraoCategoria = (await getConfigValue('taxa_adm_padrao_categoria')) || 'Taxa de Administração';

  const codigoVenda = payload.codigoVenda || (await getNextCodigoVenda());
  const connection = await currentPool.getConnection();

  try {
    await connection.beginTransaction();

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];
    const ts = Date.now();
    const vendaId = payload.id || `vnd_${ts}_${Math.random().toString(36).substring(2, 6)}`;
    const dataVenda = payload.dataVenda || todayStr;
    const clienteId = payload.clienteId;
    const embarcacaoId = payload.embarcacaoId;
    const rawCotaMatch = String(payload.cota || 'C1').trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
    const cota = rawCotaMatch ? `C${parseInt(rawCotaMatch[1], 10)}` : 'C1';

    if (!clienteId || !embarcacaoId) {
      throw new Error("Cliente e Embarcação são obrigatórios para lançar uma venda.");
    }

    // Buscar dados atuais do Cliente e da Embarcação
    const [cliRows] = await connection.query("SELECT * FROM Clientes WHERE id = ?", [clienteId]);
    const clientRow = (cliRows as any[])[0];
    if (!clientRow) throw new Error("Cliente não encontrado no banco de dados.");

    const [boatRows] = await connection.query("SELECT * FROM Embarcacoes WHERE id = ?", [embarcacaoId]);
    const boatRow = (boatRows as any[])[0];
    if (!boatRow) throw new Error("Embarcação não encontrada no banco de dados.");

    // Validar exclusividade da cota nesta embarcação (outro cliente ativo não pode ocupar a mesma cota)
    const [activeCliRows] = await connection.query(
      "SELECT id, nome, embarcacaoId, cota, embarcacoes FROM Clientes WHERE (status IS NULL OR status != 'inativo') AND id != ?",
      [clienteId]
    );
    for (const other of activeCliRows as any[]) {
      let otherEbs: any[] = [];
      if (other.embarcacoes) {
        try {
          otherEbs = typeof other.embarcacoes === 'string' ? JSON.parse(other.embarcacoes) : other.embarcacoes;
          if (!Array.isArray(otherEbs)) otherEbs = [];
        } catch {
          otherEbs = [];
        }
      }
      const hasSameCotaInList = otherEbs.some((eb: any) => {
        if (!eb || eb.embarcacaoId !== embarcacaoId) return false;
        const m = String(eb.cota || '').trim().toUpperCase().match(/^(?:COTA|C)[\s\-_]*0*(\d+)$/i);
        return m ? `C${parseInt(m[1], 10)}` === cota : false;
      });
      const hasSamePrimary =
        otherEbs.length === 0 &&
        other.embarcacaoId === embarcacaoId &&
        (() => {
          const m = String(other.cota || '').trim().toUpperCase().match(/^(?:COTA|C)[\s\-_]*0*(\d+)$/i);
          return m ? `C${parseInt(m[1], 10)}` === cota : false;
        })();

      if (hasSameCotaInList || hasSamePrimary) {
        throw new Error(`A cota ${cota} já pertence ao titular ${other.nome} nesta embarcação.`);
      }
    }

    const boatLabel = boatRow.numero
      ? `M${String(boatRow.numero).replace(/^M/i, '')} - ${boatRow.nome}`
      : boatRow.nome;

    const valorTotal = Number(payload.valorTotal) || 0;
    const valorEntrada = Number(payload.valorEntrada) || 0;
    const dataVencimentoEntrada = payload.dataVencimentoEntrada || payload.dataEntrada || dataVenda;
    const formaPagamentoEntrada = payload.formaPagamentoEntrada || payload.formaPagamento || 'PIX / Transferência';
    const entradaPaga = Boolean(payload.entradaPaga);
    const comprovanteEntrada = payload.comprovanteEntrada || null;

    const numParcelas = Math.max(0, Number(payload.numParcelas) || 0);
    const valorRemanescente = payload.valorRemanescente !== undefined
      ? Number(payload.valorRemanescente)
      : Math.max(0, Math.round((valorTotal - valorEntrada) * 100) / 100);
    const valorParcela = payload.valorParcela !== undefined && Number(payload.valorParcela) > 0
      ? Number(payload.valorParcela)
      : (numParcelas > 0 ? Math.round((valorRemanescente / numParcelas) * 100) / 100 : 0);
    const diaVencimento = Number(payload.diaVencimento) || 10;
    const dataPrimeiraParcela = payload.dataPrimeiraParcela || payload.primeiroVencimento || buildDueDateWithFixedDay(dataVenda, 1, diaVencimento);
    const formaPagamentoParcelas = payload.formaPagamentoParcelas || payload.formaPagamento || 'Boleto / PIX';

    const gerouTaxaAdm = Boolean(payload.gerouTaxaAdm !== undefined ? payload.gerouTaxaAdm : payload.gerarTaxaAdm);
    const valorTaxaAdm = Number(payload.valorTaxaAdm) || 0;
    const mesesTaxaAdm = Math.max(0, Number(payload.mesesTaxaAdm) || 12);
    const diaVencimentoTaxaAdm = Number(payload.diaVencimentoTaxaAdm) || diaVencimento;
    const dataPrimeiraTaxaAdm = payload.dataPrimeiraTaxaAdm || payload.primeiroVencimentoTaxaAdm || dataPrimeiraParcela;

    const empresaVenda = payload.empresa || vendaPadraoEmpresa;
    const planoContasIdVenda = payload.planoContasId || vendaPadraoPlanoContasId;
    const centroCustoIdVenda = payload.centroCustoId || vendaPadraoCentroCustoId;
    const contaBancariaIdVenda = payload.contaBancariaId || vendaPadraoContaBancariaId;
    const categoriaVenda = payload.categoria || vendaPadraoCategoria;

    const grupoParcelamentoId = `GRP-VND-${ts}`;
    const grupoTaxaAdmId = gerouTaxaAdm && valorTaxaAdm > 0 && mesesTaxaAdm > 0 ? `GRP-ADM-${ts}` : null;
    const transacaoEntradaId = valorEntrada > 0 ? `fin_vnd_ent_${ts}` : null;

    // 1. Inserir registro na tabela Vendas
    await connection.query(
      `INSERT INTO Vendas (
        id, codigoVenda, dataVenda, vendedorNome, clienteId, embarcacaoId, cota,
        valorTotal, valorEntrada, dataVencimentoEntrada, formaPagamentoEntrada, entradaPaga, comprovanteEntrada,
        valorRemanescente, numParcelas, valorParcela, diaVencimento, dataPrimeiraParcela, formaPagamentoParcelas,
        gerouTaxaAdm, valorTaxaAdm, mesesTaxaAdm, diaVencimentoTaxaAdm, dataPrimeiraTaxaAdm,
        grupoParcelamentoId, grupoTaxaAdmId, transacaoEntradaId,
        empresa, planoContasId, centroCustoId, contaBancariaId, observacoes, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vendaId, codigoVenda, dataVenda, payload.vendedorNome || 'Comercial',
        clienteId, embarcacaoId, cota,
        valorTotal, valorEntrada, dataVencimentoEntrada, formaPagamentoEntrada, entradaPaga ? 1 : 0, comprovanteEntrada,
        valorRemanescente, numParcelas, valorParcela, diaVencimento, dataPrimeiraParcela, formaPagamentoParcelas,
        gerouTaxaAdm ? 1 : 0, valorTaxaAdm, mesesTaxaAdm, diaVencimentoTaxaAdm, dataPrimeiraTaxaAdm,
        grupoParcelamentoId, grupoTaxaAdmId, transacaoEntradaId,
        empresaVenda, planoContasIdVenda, centroCustoIdVenda, contaBancariaIdVenda,
        payload.observacoes || null, 'ativa', nowIso
      ]
    );

    // 2. Criar transação financeira da ENTRADA (se houver valor de entrada > 0)
    if (valorEntrada > 0 && transacaoEntradaId) {
      const statusEntrada = entradaPaga
        ? 'pago'
        : (dataVencimentoEntrada < todayStr ? 'vencido' : 'lancado');
      const dataPagtoEntrada = entradaPaga ? (dataVencimentoEntrada || todayStr) : null;

      await upsertTransacao({
        id: transacaoEntradaId,
        tipo: 'receita',
        categoria: categoriaVenda,
        valor: valorEntrada,
        dataVencimento: dataVencimentoEntrada,
        dataPagamento: dataPagtoEntrada,
        status: statusEntrada,
        descricao: getMonthNameFromDateStr(dataVencimentoEntrada)
          ? `Entrada - ${getMonthNameFromDateStr(dataVencimentoEntrada)}`
          : 'Entrada',
        clienteId,
        embarcacaoId,
        comprovante: comprovanteEntrada,
        createdAt: nowIso,
        metodoPagamento: formaPagamentoEntrada,
        operador: payload.vendedorNome || 'Comercial',
        metadata: {
          vendaId,
          codigoVenda,
          tipoLancamentoVenda: 'entrada_cota',
          cota
        },
        empresa: empresaVenda,
        contaBancariaId: contaBancariaIdVenda,
        planoContasId: planoContasIdVenda,
        centroCustoId: centroCustoIdVenda,
        grupoParcelamentoId: null,
        numeroParcela: 1,
        totalParcelas: 1
      }, connection);
    }

    // 3. Criar transações financeiras das PARCELAS DA COTA
    if (numParcelas > 0 && valorParcela > 0) {
      for (let i = 0; i < numParcelas; i++) {
        const venc = i === 0
          ? dataPrimeiraParcela
          : buildDueDateWithFixedDay(dataPrimeiraParcela, i, diaVencimento);
        const statusParc = venc < todayStr ? 'vencido' : 'lancado';
        const mesParc = getMonthNameFromDateStr(venc);
        const descParc = mesParc ? `Parcela de Cota - ${mesParc}` : `Parcela de Cota`;

        await upsertTransacao({
          id: `fin_vnd_parc_${ts}_${i + 1}`,
          tipo: 'receita',
          categoria: categoriaVenda,
          valor: valorParcela,
          dataVencimento: venc,
          dataPagamento: null,
          status: statusParc,
          descricao: descParc,
          clienteId,
          embarcacaoId,
          comprovante: null,
          createdAt: nowIso,
          metodoPagamento: formaPagamentoParcelas,
          operador: payload.vendedorNome || 'Comercial',
          metadata: {
            vendaId,
            codigoVenda,
            tipoLancamentoVenda: 'parcela_cota',
            cota,
            numeroParcela: i + 1,
            totalParcelas: numParcelas
          },
          empresa: empresaVenda,
          contaBancariaId: contaBancariaIdVenda,
          planoContasId: planoContasIdVenda,
          centroCustoId: centroCustoIdVenda,
          grupoParcelamentoId,
          numeroParcela: i + 1,
          totalParcelas: numParcelas
        }, connection);
      }
    }

    // 4. Criar transações financeiras da TAXA DE ADMINISTRAÇÃO (se selecionada)
    if (gerouTaxaAdm && valorTaxaAdm > 0 && mesesTaxaAdm > 0 && grupoTaxaAdmId) {
      for (let i = 0; i < mesesTaxaAdm; i++) {
        const vencAdm = i === 0
          ? dataPrimeiraTaxaAdm
          : buildDueDateWithFixedDay(dataPrimeiraTaxaAdm, i, diaVencimentoTaxaAdm);
        const statusAdm = vencAdm < todayStr ? 'vencido' : 'lancado';
        const mesAdm = getMonthNameFromDateStr(vencAdm);
        const descAdm = mesAdm ? `Taxa de Administração - ${mesAdm}` : `Taxa de Administração`;

        await upsertTransacao({
          id: `fin_vnd_adm_${ts}_${i + 1}`,
          tipo: 'receita',
          categoria: taxaAdmPadraoCategoria,
          valor: valorTaxaAdm,
          dataVencimento: vencAdm,
          dataPagamento: null,
          status: statusAdm,
          descricao: descAdm,
          clienteId,
          embarcacaoId,
          comprovante: null,
          createdAt: nowIso,
          metodoPagamento: 'Boleto / PIX',
          operador: payload.vendedorNome || 'Comercial',
          metadata: {
            vendaId,
            codigoVenda,
            tipoLancamentoVenda: 'taxa_administracao',
            cota,
            numeroParcela: i + 1,
            totalParcelas: mesesTaxaAdm
          },
          empresa: taxaAdmPadraoEmpresa,
          contaBancariaId: taxaAdmPadraoContaBancariaId,
          planoContasId: taxaAdmPadraoPlanoContasId,
          centroCustoId: taxaAdmPadraoCentroCustoId,
          grupoParcelamentoId: grupoTaxaAdmId,
          numeroParcela: i + 1,
          totalParcelas: mesesTaxaAdm
        }, connection);
      }
    }

    // 5. Vincular automaticamente o Cliente à Embarcação e Cota + Atualizar contratoValores
    let clientEmbarcacoes: any[] = [];
    if (clientRow.embarcacoes) {
      try {
        clientEmbarcacoes = typeof clientRow.embarcacoes === 'string'
          ? JSON.parse(clientRow.embarcacoes)
          : clientRow.embarcacoes;
        if (!Array.isArray(clientEmbarcacoes)) clientEmbarcacoes = [];
      } catch {
        clientEmbarcacoes = [];
      }
    } else if (clientRow.embarcacaoId) {
      const m = String(clientRow.cota || 'C1').trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
      clientEmbarcacoes = [{ embarcacaoId: clientRow.embarcacaoId, cota: m ? `C${parseInt(m[1], 10)}` : 'C1' }];
    }

    // Normalizar cotas já existentes no array do cliente e permitir múltiplas cotas no mesmo barco (ex: C1 e C2)
    clientEmbarcacoes = clientEmbarcacoes.map((eb: any, idx: number) => {
      const m = String(eb?.cota || '').trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
      return {
        ...eb,
        cota: m && !String(eb?.cota || '').includes('/') ? `C${parseInt(m[1], 10)}` : `C${idx + 1}`
      };
    });

    const alreadyHasBoatCota = clientEmbarcacoes.some(
      (eb: any) => eb.embarcacaoId === embarcacaoId && eb.cota === cota
    );
    if (!alreadyHasBoatCota) {
      clientEmbarcacoes.push({ embarcacaoId, cota });
    }

    let currentContratoValores: any = {};
    if (clientRow.contratoValores) {
      try {
        currentContratoValores = typeof clientRow.contratoValores === 'string'
          ? JSON.parse(clientRow.contratoValores)
          : clientRow.contratoValores;
      } catch {
        currentContratoValores = {};
      }
    }

    const updatedContratoValores = {
      ...currentContratoValores,
      valorTotal: formatNumberToBRLString(valorTotal),
      valorEntrada: formatNumberToBRLString(valorEntrada),
      valorRemanescente: formatNumberToBRLString(valorRemanescente),
      numParcelas: String(numParcelas),
      valorParcela: formatNumberToBRLString(valorParcela),
      formaPagamento: formaPagamentoParcelas,
      diaVencimento: String(diaVencimento),
      ...(gerouTaxaAdm && valorTaxaAdm > 0 ? { taxaMensalAdm: formatNumberToBRLString(valorTaxaAdm) } : {})
    };

    const nextStatusContrato = (!clientRow.statusContrato || clientRow.statusContrato === 'sem_contrato')
      ? 'pendente'
      : clientRow.statusContrato;
    const nextAquisicaoStatus = (!clientRow.contratoAquisicaoStatus || clientRow.contratoAquisicaoStatus === 'sem_contrato')
      ? 'pendente'
      : clientRow.contratoAquisicaoStatus;

    await connection.query(
      `UPDATE Clientes
       SET embarcacaoId = ?,
           cota = ?,
           embarcacoes = ?,
           contratoValores = ?,
           statusContrato = ?,
           contratoAquisicaoStatus = ?,
           contratoDataEmissao = COALESCE(contratoDataEmissao, ?)
       WHERE id = ?`,
      [
        embarcacaoId,
        cota,
        JSON.stringify(clientEmbarcacoes),
        JSON.stringify(updatedContratoValores),
        nextStatusContrato,
        nextAquisicaoStatus,
        dataVenda,
        clienteId
      ]
    );

    // Garantir associação multi-empresa do cliente
    await connection.query(
      "INSERT IGNORE INTO ClienteEmpresas (clienteId, empresa) VALUES (?, 'VALE'), (?, 'MEXICANO')",
      [clienteId, clienteId]
    );

    // 6. Adicionar Cliente aos donos da Embarcação
    let boatDonos: string[] = [];
    if (boatRow.donos) {
      try {
        boatDonos = typeof boatRow.donos === 'string' ? JSON.parse(boatRow.donos) : boatRow.donos;
        if (!Array.isArray(boatDonos)) boatDonos = [];
      } catch {
        boatDonos = [];
      }
    }
    if (!boatDonos.includes(clienteId)) {
      boatDonos.push(clienteId);
      await connection.query(
        "UPDATE Embarcacoes SET donos = ? WHERE id = ?",
        [JSON.stringify(boatDonos), embarcacaoId]
      );
    }

    // Sincronizar cotas em estoque do El Mexicano (subtraindo a cota adquirida)
    await reconcileBoatCotasWithMexicano(connection, embarcacaoId);

    await connection.commit();

    // Atualizar statusFinanceiro do cliente após commit
    await syncClientFinancialStatus(clienteId);
    invalidateDbCache();

    return {
      success: true,
      vendaId,
      codigoVenda,
      grupoParcelamentoId,
      grupoTaxaAdmId,
      transacaoEntradaId,
      totalLancamentosGerados: (valorEntrada > 0 ? 1 : 0) + numParcelas + (gerouTaxaAdm ? mesesTaxaAdm : 0)
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function cancelarVenda(id: string): Promise<void> {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query("SELECT * FROM Vendas WHERE id = ?", [id]);
  const venda = (rows as any[])[0];
  if (!venda) throw new Error("Venda não encontrada.");

  // Excluir lançamentos financeiros que ainda não foram pagos (ou todos vinculados caso solicitado)
  if (venda.grupoParcelamentoId) {
    await currentPool.query(
      "DELETE FROM TransacoesFinanceiras WHERE grupoParcelamentoId = ? AND status != 'pago'",
      [venda.grupoParcelamentoId]
    );
  }
  if (venda.grupoTaxaAdmId) {
    await currentPool.query(
      "DELETE FROM TransacoesFinanceiras WHERE grupoParcelamentoId = ? AND status != 'pago'",
      [venda.grupoTaxaAdmId]
    );
  }
  if (venda.transacaoEntradaId) {
    await currentPool.query(
      "DELETE FROM TransacoesFinanceiras WHERE id = ? AND status != 'pago'",
      [venda.transacaoEntradaId]
    );
  }

  await currentPool.query("UPDATE Vendas SET status = 'cancelada' WHERE id = ?", [id]);

  if (venda.clienteId) {
    await syncClientFinancialStatus(venda.clienteId);
  }
  invalidateDbCache();
}

// ─────────────────────────────────────────────────────────────
// ────── MÓDULO COMERCIAL — MOTOR DE COMISSÕES E BÔNUS ─────────
// ─────────────────────────────────────────────────────────────

const COMISSOES_CONFIG_KEY = 'comercial_motor_comissoes_config';

export function getDefaultMotorComissoesConfig() {
  return {
    salarioBase: 1621.00,
    valeRefeicao: 250.00,
    diaCorteQuinzena1: 15,
    metaSemanalCotas: 4,
    semanasNoMesModo: 'auto' as 'auto' | '4' | '5',
    regraSuperavitSemanal: true,
    faixasComissao: [
      { id: 'fx_1', minCotas: 0, maxCotas: 4, valorPorCota: 0, descricao: 'Faixa Inicial (0 a 4 cotas)' },
      { id: 'fx_2', minCotas: 5, maxCotas: 8, valorPorCota: 100, descricao: 'Faixa Bronze (5 a 8 cotas)' },
      { id: 'fx_3', minCotas: 9, maxCotas: 12, valorPorCota: 150, descricao: 'Faixa Prata (9 a 12 cotas)' },
      { id: 'fx_4', minCotas: 13, maxCotas: null, valorPorCota: 200, descricao: 'Faixa Ouro (13+ cotas)' }
    ],
    bonusSemanalProgressivo: [100, 200, 300, 400, 500],
    faixasBonusMensal: [
      { id: 'bm_1', minCotas: 16, maxCotas: 20, valorBonus: 300, descricao: 'Volume 16 a 20 cotas' },
      { id: 'bm_2', minCotas: 21, maxCotas: 24, valorBonus: 1000, descricao: 'Volume 21 a 24 cotas' },
      { id: 'bm_3', minCotas: 25, maxCotas: null, valorBonus: 2000, descricao: 'Volume 25+ cotas' }
    ],
    requisitosVendaConcluida: {
      exigirEntradaPaga: true,
      exigirComprovanteEntrada: true,
      exigirContratoAquisicaoAssinado: true,
      exigirContratoAdmAssinado: true
    },
    equipeComercial: [
      { id: 'vend_1', nome: 'Consultor Comercial 01', cargo: 'Vendedor Comercial', ativo: true, salarioBaseCustom: null, vrCustom: null },
      { id: 'vend_2', nome: 'Consultor Comercial 02', cargo: 'Vendedor Comercial', ativo: true, salarioBaseCustom: null, vrCustom: null }
    ]
  };
}

export async function getMotorComissoesConfig(): Promise<any> {
  const defaults = getDefaultMotorComissoesConfig();
  try {
    const raw = await getConfigValue(COMISSOES_CONFIG_KEY);
    if (!raw) {
      // Se ainda não existir configuração salva, tentar popular equipe comercial a partir de Funcionarios do setor comercial
      const currentPool = getDbPool();
      if (currentPool) {
        const [funcRows] = await currentPool.query(
          "SELECT id, nome, cargo, setor FROM Funcionarios WHERE LOWER(setor) LIKE '%comercial%' OR LOWER(cargo) LIKE '%vendedor%' OR LOWER(cargo) LIKE '%comercial%'"
        );
        const funcs = funcRows as any[];
        if (funcs.length > 0) {
          defaults.equipeComercial = funcs.map(f => ({
            id: f.id,
            nome: f.nome,
            cargo: f.cargo || 'Vendedor Comercial',
            ativo: true,
            salarioBaseCustom: null,
            vrCustom: null
          }));
        }
      }
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      requisitosVendaConcluida: {
        ...defaults.requisitosVendaConcluida,
        ...(parsed.requisitosVendaConcluida || {})
      },
      faixasComissao: Array.isArray(parsed.faixasComissao) && parsed.faixasComissao.length > 0
        ? parsed.faixasComissao
        : defaults.faixasComissao,
      bonusSemanalProgressivo: Array.isArray(parsed.bonusSemanalProgressivo) && parsed.bonusSemanalProgressivo.length > 0
        ? parsed.bonusSemanalProgressivo
        : defaults.bonusSemanalProgressivo,
      faixasBonusMensal: Array.isArray(parsed.faixasBonusMensal)
        ? parsed.faixasBonusMensal
        : defaults.faixasBonusMensal,
      equipeComercial: Array.isArray(parsed.equipeComercial) && parsed.equipeComercial.length > 0
        ? parsed.equipeComercial
        : defaults.equipeComercial
    };
  } catch (err) {
    console.error("[getMotorComissoesConfig Error]:", err);
    return defaults;
  }
}

export async function saveMotorComissoesConfig(config: any): Promise<any> {
  const current = await getMotorComissoesConfig();
  const merged = {
    ...current,
    ...config,
    salarioBase: Number(config.salarioBase ?? current.salarioBase) || 0,
    valeRefeicao: Number(config.valeRefeicao ?? current.valeRefeicao) || 0,
    diaCorteQuinzena1: Math.min(28, Math.max(1, Number(config.diaCorteQuinzena1 ?? current.diaCorteQuinzena1) || 15)),
    metaSemanalCotas: Math.max(1, Number(config.metaSemanalCotas ?? current.metaSemanalCotas) || 4),
    semanasNoMesModo: config.semanasNoMesModo || current.semanasNoMesModo || 'auto',
    regraSuperavitSemanal: config.regraSuperavitSemanal !== undefined ? Boolean(config.regraSuperavitSemanal) : current.regraSuperavitSemanal,
    requisitosVendaConcluida: {
      ...current.requisitosVendaConcluida,
      ...(config.requisitosVendaConcluida || {})
    },
    faixasComissao: Array.isArray(config.faixasComissao) ? config.faixasComissao : current.faixasComissao,
    bonusSemanalProgressivo: Array.isArray(config.bonusSemanalProgressivo) ? config.bonusSemanalProgressivo.map(Number) : current.bonusSemanalProgressivo,
    faixasBonusMensal: Array.isArray(config.faixasBonusMensal) ? config.faixasBonusMensal : current.faixasBonusMensal,
    equipeComercial: Array.isArray(config.equipeComercial) ? config.equipeComercial : current.equipeComercial
  };

  await setConfigValue(COMISSOES_CONFIG_KEY, JSON.stringify(merged));
  return merged;
}

export async function getComissoesFechamentos(competencia?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  let query = "SELECT * FROM ComissoesFechamentos";
  const params: any[] = [];
  if (competencia) {
    query += " WHERE competencia = ?";
    params.push(competencia);
  }
  query += " ORDER BY competencia DESC, quinzena ASC";

  const [rows] = await currentPool.query(query, params);
  return (rows as any[]).map(r => ({
    ...r,
    quinzena: Number(r.quinzena) as 1 | 2,
    cotasTotalPeriodo: Number(r.cotasTotalPeriodo) || 0,
    cotasNovasQuinzena: Number(r.cotasNovasQuinzena) || 0,
    valorUnitarioFaixa: Number(r.valorUnitarioFaixa) || 0,
    comissaoBasePorVendedor: Number(r.comissaoBasePorVendedor) || 0,
    ajusteRetroativoPorVendedor: Number(r.ajusteRetroativoPorVendedor) || 0,
    bonusSemanalPorVendedor: Number(r.bonusSemanalPorVendedor) || 0,
    bonusMensalPorVendedor: Number(r.bonusMensalPorVendedor) || 0,
    totalVariavelPorVendedor: Number(r.totalVariavelPorVendedor) || 0,
    salarioFixoReferencia: Number(r.salarioFixoReferencia) || 1621,
    valeRefeicaoReferencia: Number(r.valeRefeicaoReferencia) || 250,
    qtdVendedoresAtivos: Number(r.qtdVendedoresAtivos) || 1,
    totalFolhaVariavelEquipe: Number(r.totalFolhaVariavelEquipe) || 0
  }));
}

export async function upsertComissaoFechamento(payload: any): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const competencia = String(payload.competencia || '').trim();
  const quinzena = Number(payload.quinzena) === 2 ? 2 : 1;
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    throw new Error("Competência inválida. Use o formato YYYY-MM.");
  }

  const nowIso = new Date().toISOString();
  const id = payload.id || `fech_${competencia}_q${quinzena}`;
  const status = payload.status || 'fechado';
  const dataFechamento = status === 'aberto' ? null : (payload.dataFechamento || nowIso.split('T')[0]);

  await currentPool.query(
    `INSERT INTO ComissoesFechamentos (
      id, competencia, quinzena, status,
      cotasTotalPeriodo, cotasNovasQuinzena, valorUnitarioFaixa,
      comissaoBasePorVendedor, ajusteRetroativoPorVendedor,
      bonusSemanalPorVendedor, bonusMensalPorVendedor, totalVariavelPorVendedor,
      salarioFixoReferencia, valeRefeicaoReferencia,
      qtdVendedoresAtivos, totalFolhaVariavelEquipe,
      dataFechamento, fechadoPor, observacoes, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      cotasTotalPeriodo = VALUES(cotasTotalPeriodo),
      cotasNovasQuinzena = VALUES(cotasNovasQuinzena),
      valorUnitarioFaixa = VALUES(valorUnitarioFaixa),
      comissaoBasePorVendedor = VALUES(comissaoBasePorVendedor),
      ajusteRetroativoPorVendedor = VALUES(ajusteRetroativoPorVendedor),
      bonusSemanalPorVendedor = VALUES(bonusSemanalPorVendedor),
      bonusMensalPorVendedor = VALUES(bonusMensalPorVendedor),
      totalVariavelPorVendedor = VALUES(totalVariavelPorVendedor),
      salarioFixoReferencia = VALUES(salarioFixoReferencia),
      valeRefeicaoReferencia = VALUES(valeRefeicaoReferencia),
      qtdVendedoresAtivos = VALUES(qtdVendedoresAtivos),
      totalFolhaVariavelEquipe = VALUES(totalFolhaVariavelEquipe),
      dataFechamento = VALUES(dataFechamento),
      fechadoPor = VALUES(fechadoPor),
      observacoes = VALUES(observacoes),
      updatedAt = VALUES(updatedAt)`,
    [
      id,
      competencia,
      quinzena,
      status,
      Number(payload.cotasTotalPeriodo) || 0,
      Number(payload.cotasNovasQuinzena) || 0,
      Number(payload.valorUnitarioFaixa) || 0,
      Number(payload.comissaoBasePorVendedor) || 0,
      Number(payload.ajusteRetroativoPorVendedor) || 0,
      Number(payload.bonusSemanalPorVendedor) || 0,
      Number(payload.bonusMensalPorVendedor) || 0,
      Number(payload.totalVariavelPorVendedor) || 0,
      Number(payload.salarioFixoReferencia) || 1621,
      Number(payload.valeRefeicaoReferencia) || 250,
      Number(payload.qtdVendedoresAtivos) || 1,
      Number(payload.totalFolhaVariavelEquipe) || 0,
      dataFechamento,
      payload.fechadoPor || 'Administrador',
      payload.observacoes || null,
      nowIso
    ]
  );

  const list = await getComissoesFechamentos(competencia);
  return list.find(item => item.quinzena === quinzena) || null;
}

export async function updateVendaProcessoComissao(vendaId: string, payload: any): Promise<any> {
  invalidateDbCache();
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await currentPool.query("SELECT * FROM Vendas WHERE id = ?", [vendaId]);
  const venda = (rows as any[])[0];
  if (!venda) throw new Error("Venda não encontrada.");

  const todayStr = new Date().toISOString().split('T')[0];

  if (payload.comissaoLiberadaManual !== undefined) {
    const lib = payload.comissaoLiberadaManual ? 1 : 0;
    const dataConc = lib ? (payload.dataConclusaoProcesso || venda.dataVenda || todayStr) : null;
    await currentPool.query(
      "UPDATE Vendas SET comissaoLiberadaManual = ?, dataConclusaoProcesso = ? WHERE id = ?",
      [lib, dataConc, vendaId]
    );
  }

  if (payload.marcarEntradaPaga && venda.transacaoEntradaId) {
    await currentPool.query(
      "UPDATE TransacoesFinanceiras SET status = 'pago', dataPagamento = COALESCE(dataPagamento, ?) WHERE id = ?",
      [todayStr, venda.transacaoEntradaId]
    );
    await currentPool.query("UPDATE Vendas SET entradaPaga = 1 WHERE id = ?", [vendaId]);
  } else if (payload.marcarEntradaPaga) {
    await currentPool.query("UPDATE Vendas SET entradaPaga = 1 WHERE id = ?", [vendaId]);
  }

  if (payload.marcarContratoAquisicaoAssinado && venda.clienteId) {
    await currentPool.query(
      "UPDATE Clientes SET contratoAquisicaoStatus = 'assinado', contratoAquisicaoDataAssinatura = COALESCE(contratoAquisicaoDataAssinatura, ?) WHERE id = ?",
      [todayStr, venda.clienteId]
    );
  }

  if (payload.marcarContratoAdmAssinado && venda.clienteId) {
    await currentPool.query(
      "UPDATE Clientes SET contratoAdmStatus = 'assinado', contratoAdmDataAssinatura = COALESCE(contratoAdmDataAssinatura, ?), statusContrato = 'assinado' WHERE id = ?",
      [todayStr, venda.clienteId]
    );
  }

  invalidateDbCache();
  const todas = await getAllVendas();
  return todas.find(v => v.id === vendaId) || null;
}

// =========================================================================
// MÓDULO COMERCIAL: CRM LEADS, PROPOSTAS, RESERVAS, PERMUTAS & CHECKIN
// =========================================================================

export async function getAllLeadsComercial(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query(`
      SELECT l.*,
             c.nome AS clienteIndicadorNome,
             (SELECT COUNT(*) FROM PropostasComerciais p WHERE p.leadId = l.id AND p.status != 'cancelada') AS propostasCount,
             (SELECT COUNT(*) FROM CotasReservadas cr WHERE cr.leadId = l.id AND cr.status = 'ativa' AND cr.expiraEm > NOW()) AS cotasReservadasCount,
             (SELECT COUNT(*) FROM Permutas pm WHERE pm.leadId = l.id) AS permutasCount,
             (SELECT cr2.cota FROM CotasReservadas cr2 WHERE cr2.leadId = l.id AND cr2.status = 'ativa' AND cr2.expiraEm > NOW() ORDER BY cr2.createdAt DESC LIMIT 1) AS cotaReservadaCodigo
      FROM Leads l
      LEFT JOIN Clientes c ON c.id = l.indicadoPorClienteId
      ORDER BY l.updatedAt DESC, l.createdAt DESC
    `);
    return rows.map((r: any) => {
      let perfilNautico = null;
      let embarcacoesInteresse = [];
      let timeline = [];
      try { if (r.perfilNautico) perfilNautico = JSON.parse(r.perfilNautico); } catch {}
      try {
        if (r.embarcacoesInteresse) {
          if (typeof r.embarcacoesInteresse === 'string') {
            if (r.embarcacoesInteresse.startsWith('[') || r.embarcacoesInteresse.startsWith('{')) {
              embarcacoesInteresse = JSON.parse(r.embarcacoesInteresse);
            } else {
              embarcacoesInteresse = r.embarcacoesInteresse.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else if (Array.isArray(r.embarcacoesInteresse)) {
            embarcacoesInteresse = r.embarcacoesInteresse;
          }
        }
      } catch {
        embarcacoesInteresse = typeof r.embarcacoesInteresse === 'string' && r.embarcacoesInteresse ? [r.embarcacoesInteresse] : [];
      }
      try { if (r.timeline) timeline = JSON.parse(r.timeline); } catch {}

      return {
        ...r,
        origem: r.origem || 'instagram',
        temperatura: r.temperatura || 'morno',
        valorEstimado: Number(r.valorEstimado) || 0,
        possuiPermuta: Boolean(r.possuiPermuta || (r.permutasCount && r.permutasCount > 0)),
        resumoPermuta: r.resumoPermuta || null,
        proximoContatoEm: r.proximoContatoEm || null,
        dataVisitaAgendada: r.dataVisitaAgendada || null,
        indicadoPorClienteNome: r.indicadoPorClienteNome || r.clienteIndicadorNome || null,
        propostasCount: Number(r.propostasCount) || 0,
        cotasReservadasCount: Number(r.cotasReservadasCount) || 0,
        permutasCount: Number(r.permutasCount) || 0,
        cotaReservadaCodigo: r.cotaReservadaCodigo || null,
        perfilNautico,
        embarcacoesInteresse,
        timeline
      };
    });
  } catch (err) {
    console.error("[getAllLeadsComercial Error]:", err);
    return [];
  }
}

export async function upsertLeadComercial(lead: any): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const id = lead.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();
  const createdAt = lead.createdAt || nowIso;
  const updatedAt = nowIso;

  const perfilNauticoStr = lead.perfilNautico
    ? (typeof lead.perfilNautico === 'string' ? lead.perfilNautico : JSON.stringify(lead.perfilNautico))
    : null;

  const embarcacoesInteresseStr = lead.embarcacoesInteresse
    ? (typeof lead.embarcacoesInteresse === 'string' ? lead.embarcacoesInteresse : JSON.stringify(lead.embarcacoesInteresse))
    : null;

  let timelineArr = Array.isArray(lead.timeline) ? lead.timeline : [];
  if (timelineArr.length === 0 && !lead.id) {
    timelineArr.push({
      id: `tl_${Date.now()}`,
      data: nowIso,
      tipo: 'mudanca_etapa',
      titulo: 'Lead Criado',
      descricao: `Lead registrado na etapa: ${lead.etapaFunil || 'novo'}`,
      autorNome: lead.vendedorNome || 'Sistema Comercial'
    });
  }
  const timelineStr = JSON.stringify(timelineArr);

  await currentPool.query(`
    INSERT INTO Leads (
      id, nome, telefone, email, cpf, cidade, detalhes, etapaFunil, perfilNautico,
      embarcacoesInteresse, tipoInteresse, vendedorId, vendedorNome, indicadoPorClienteId, indicadoPorClienteNome,
      origem, temperatura, valorEstimado, proximoContatoEm, dataVisitaAgendada, possuiPermuta, resumoPermuta,
      filaEsperaEmbarcacaoId, timeline, motivoPerda, utmSource, utmMedium, utmCampaign,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      telefone = VALUES(telefone),
      email = VALUES(email),
      cpf = VALUES(cpf),
      cidade = VALUES(cidade),
      detalhes = VALUES(detalhes),
      etapaFunil = VALUES(etapaFunil),
      perfilNautico = VALUES(perfilNautico),
      embarcacoesInteresse = VALUES(embarcacoesInteresse),
      tipoInteresse = VALUES(tipoInteresse),
      vendedorId = VALUES(vendedorId),
      vendedorNome = VALUES(vendedorNome),
      indicadoPorClienteId = VALUES(indicadoPorClienteId),
      indicadoPorClienteNome = VALUES(indicadoPorClienteNome),
      origem = VALUES(origem),
      temperatura = VALUES(temperatura),
      valorEstimado = VALUES(valorEstimado),
      proximoContatoEm = VALUES(proximoContatoEm),
      dataVisitaAgendada = VALUES(dataVisitaAgendada),
      possuiPermuta = VALUES(possuiPermuta),
      resumoPermuta = VALUES(resumoPermuta),
      filaEsperaEmbarcacaoId = VALUES(filaEsperaEmbarcacaoId),
      timeline = VALUES(timeline),
      motivoPerda = VALUES(motivoPerda),
      utmSource = VALUES(utmSource),
      utmMedium = VALUES(utmMedium),
      utmCampaign = VALUES(utmCampaign),
      updatedAt = VALUES(updatedAt)
  `, [
    id,
    lead.nome || 'Lead sem nome',
    lead.telefone || null,
    lead.email || null,
    lead.cpf || null,
    lead.cidade || null,
    lead.detalhes || null,
    lead.etapaFunil || 'novo',
    perfilNauticoStr,
    embarcacoesInteresseStr,
    lead.tipoInteresse || null,
    lead.vendedorId || null,
    lead.vendedorNome || null,
    lead.indicadoPorClienteId || null,
    lead.indicadoPorClienteNome || null,
    lead.origem || 'instagram',
    lead.temperatura || 'morno',
    Number(lead.valorEstimado) || 0,
    lead.proximoContatoEm || null,
    lead.dataVisitaAgendada || null,
    lead.possuiPermuta ? 1 : 0,
    lead.resumoPermuta || null,
    lead.filaEsperaEmbarcacaoId || null,
    timelineStr,
    lead.motivoPerda || null,
    lead.utmSource || null,
    lead.utmMedium || null,
    lead.utmCampaign || null,
    createdAt,
    updatedAt
  ]);

  invalidateDbCache();
  const all = await getAllLeadsComercial();
  return all.find(l => l.id === id);
}

export async function addLeadTimelineEvent(leadId: string, event: {
  tipo: string;
  titulo: string;
  descricao?: string;
  autorNome?: string;
  proximoContatoEm?: string | null;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const [rows]: any = await currentPool.query("SELECT timeline, proximoContatoEm FROM Leads WHERE id = ?", [leadId]);
  if (!rows || rows.length === 0) throw new Error("Lead não encontrado");

  let timeline: any[] = [];
  try {
    if (rows[0].timeline) timeline = JSON.parse(rows[0].timeline);
  } catch {}

  const newEntry = {
    id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    data: new Date().toISOString(),
    tipo: event.tipo || 'nota',
    titulo: event.titulo || 'Nova interação',
    descricao: event.descricao || '',
    autorNome: event.autorNome || 'Equipe Comercial'
  };

  timeline.unshift(newEntry);
  const nowIso = new Date().toISOString();

  if (event.proximoContatoEm !== undefined) {
    await currentPool.query("UPDATE Leads SET timeline = ?, proximoContatoEm = ?, updatedAt = ? WHERE id = ?", [
      JSON.stringify(timeline),
      event.proximoContatoEm || null,
      nowIso,
      leadId
    ]);
  } else {
    await currentPool.query("UPDATE Leads SET timeline = ?, updatedAt = ? WHERE id = ?", [
      JSON.stringify(timeline),
      nowIso,
      leadId
    ]);
  }

  invalidateDbCache();
  return newEntry;
}

export async function updateLeadEtapa(
  leadId: string,
  etapaFunil: string,
  motivoPerda?: string,
  autorNome?: string,
  dataVisitaAgendada?: string | null,
  proximoContatoEm?: string | null
): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  await addLeadTimelineEvent(leadId, {
    tipo: 'mudanca_etapa',
    titulo: `Avanço de Etapa: ${etapaFunil.toUpperCase()}`,
    descricao: motivoPerda ? `Motivo informado: ${motivoPerda}` : `Lead movimentado no funil comercial`,
    autorNome: autorNome || 'Comercial'
  });

  const nowIso = new Date().toISOString();

  let updateQuery = "UPDATE Leads SET etapaFunil = ?, motivoPerda = ?, updatedAt = ?";
  const updateParams: any[] = [etapaFunil, motivoPerda || null, nowIso];

  if (dataVisitaAgendada !== undefined) {
    updateQuery += ", dataVisitaAgendada = ?";
    updateParams.push(dataVisitaAgendada);
  }

  if (proximoContatoEm !== undefined) {
    updateQuery += ", proximoContatoEm = ?";
    updateParams.push(proximoContatoEm);
  }

  updateQuery += " WHERE id = ?";
  updateParams.push(leadId);

  await currentPool.query(updateQuery, updateParams);

  invalidateDbCache();
  const all = await getAllLeadsComercial();
  return all.find(l => l.id === leadId);
}

export async function verificarDisponibilidadeVisita(embarcacaoId: string, data: string): Promise<{
  disponivelNaMarina: boolean;
  conflitos: Array<{ tipo: 'reserva' | 'manutencao'; titulo: string; detalhe: string; status?: string }>;
}> {
  const currentPool = getDbPool();
  if (!currentPool) return { disponivelNaMarina: true, conflitos: [] };

  try {
    const conflitos: Array<{ tipo: 'reserva' | 'manutencao'; titulo: string; detalhe: string; status?: string }> = [];

    // 1. Reservas de cotistas na data
    const [reservas]: any = await currentPool.query(`
      SELECT r.id, r.periodo, r.horaSaida, r.horaChegada, r.observacoes, c.nome as cotistaNome
      FROM Reservas r
      LEFT JOIN Clientes c ON c.id = r.clienteId
      WHERE r.embarcacaoId = ? AND r.data = ? AND r.status NOT IN ('cancelado', 'cancelada')
    `, [embarcacaoId, data]);

    if (Array.isArray(reservas)) {
      for (const res of reservas) {
        const periodoStr = res.periodo === 'manha' ? 'Manhã (09h - 13h)' : res.periodo === 'tarde' ? 'Tarde (13h - 18h)' : res.periodo === 'dia_inteiro' ? 'Dia Inteiro' : (res.periodo || 'Horário agendado');
        conflitos.push({
          tipo: 'reserva',
          titulo: `Saída de Cotista Agendada (${periodoStr})`,
          detalhe: `Cotista: ${res.cotistaNome || 'Cotista'} | Horário: ${res.horaSaida || ''} - ${res.horaChegada || ''} ${res.observacoes ? `(${res.observacoes})` : ''}`,
          status: 'agendado'
        });
      }
    }

    // 2. Manutenções ativas na embarcação
    const [manutencoes]: any = await currentPool.query(`
      SELECT m.id, m.status, m.descricaoServico, m.mecanico, m.codigoOS, m.dataSaida
      FROM Manutencoes m
      WHERE m.embarcacaoId = ? AND m.status NOT IN ('concluido', 'concluida', 'cancelado', 'cancelada')
    `, [embarcacaoId]);

    if (Array.isArray(manutencoes)) {
      for (const man of manutencoes) {
        conflitos.push({
          tipo: 'manutencao',
          titulo: `Ordem de Serviço Aberta (${man.codigoOS || 'OS'})`,
          detalhe: `${man.descricaoServico || 'Em manutenção preventiva/corretiva'} (Mecânico: ${man.mecanico || 'Não informado'})`,
          status: man.status
        });
      }
    }

    return {
      disponivelNaMarina: conflitos.length === 0,
      conflitos
    };
  } catch (err) {
    console.error("[verificarDisponibilidadeVisita Error]:", err);
    return { disponivelNaMarina: true, conflitos: [] };
  }
}

// -------------------------------------------------------------------------
// PROPOSTAS COMERCIAIS
// -------------------------------------------------------------------------

export async function getAllPropostasComerciais(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query(`
      SELECT p.*, b.nome AS barcoNome, b.modelo AS barcoModelo
      FROM PropostasComerciais p
      LEFT JOIN Embarcacoes b ON b.id = p.embarcacaoId
      ORDER BY p.createdAt DESC
    `);
    return rows.map((r: any) => {
      let baloesIntermediarios = [];
      let permutaInfo = null;
      let comparativoCustoInfo = null;
      try { if (r.baloesIntermediarios) baloesIntermediarios = JSON.parse(r.baloesIntermediarios); } catch {}
      try { if (r.permutaInfo) permutaInfo = JSON.parse(r.permutaInfo); } catch {}
      try { if (r.comparativoCustoInfo) comparativoCustoInfo = JSON.parse(r.comparativoCustoInfo); } catch {}
      return {
        ...r,
        embarcacaoNome: r.barcoNome || r.embarcacaoId,
        valorTotal: Number(r.valorTotal) || 0,
        valorEntrada: Number(r.valorEntrada) || 0,
        valorParcela: Number(r.valorParcela) || 0,
        numParcelas: Number(r.numParcelas) || 0,
        taxaAdmEstimada: Number(r.taxaAdmEstimada) || 0,
        baloesIntermediarios,
        permutaInfo,
        comparativoCustoInfo
      };
    });
  } catch (err) {
    console.error("[getAllPropostasComerciais Error]:", err);
    return [];
  }
}

export async function getPropostaByIdOrToken(identifier: string): Promise<any | null> {
  const currentPool = getDbPool();
  if (!currentPool) return null;
  try {
    const [rows]: any = await currentPool.query(`
      SELECT p.*, b.nome AS barcoNome, b.modelo AS barcoModelo, b.imagemUrl AS barcoImagemUrl
      FROM PropostasComerciais p
      LEFT JOIN Embarcacoes b ON b.id = p.embarcacaoId
      WHERE p.id = ? OR p.tokenPublico = ?
      LIMIT 1
    `, [identifier, identifier]);

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    // Se é acesso público e ainda não foi marcado como visualizado
    if (identifier === r.tokenPublico && !r.visualizadaEm) {
      const nowIso = new Date().toISOString();
      await currentPool.query("UPDATE PropostasComerciais SET visualizadaEm = ?, status = CASE WHEN status = 'enviada' THEN 'visualizada' ELSE status END WHERE id = ?", [nowIso, r.id]);
      r.visualizadaEm = nowIso;
      if (r.status === 'enviada') r.status = 'visualizada';
    }

    let baloesIntermediarios = [];
    let permutaInfo = null;
    let comparativoCustoInfo = null;
    try { if (r.baloesIntermediarios) baloesIntermediarios = JSON.parse(r.baloesIntermediarios); } catch {}
    try { if (r.permutaInfo) permutaInfo = JSON.parse(r.permutaInfo); } catch {}
    try { if (r.comparativoCustoInfo) comparativoCustoInfo = JSON.parse(r.comparativoCustoInfo); } catch {}

    return {
      ...r,
      embarcacaoNome: r.barcoNome || r.embarcacaoId,
      valorTotal: Number(r.valorTotal) || 0,
      valorEntrada: Number(r.valorEntrada) || 0,
      valorParcela: Number(r.valorParcela) || 0,
      numParcelas: Number(r.numParcelas) || 0,
      taxaAdmEstimada: Number(r.taxaAdmEstimada) || 0,
      baloesIntermediarios,
      permutaInfo,
      comparativoCustoInfo
    };
  } catch (err) {
    console.error("[getPropostaByIdOrToken Error]:", err);
    return null;
  }
}

export async function upsertPropostaComercial(data: any): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const id = data.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ano = new Date().getFullYear();
  const codigoProposta = data.codigoProposta || `PROP-${ano}-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();
  const createdAt = data.createdAt || nowIso;
  const updatedAt = nowIso;

  const validadeDate = new Date();
  validadeDate.setDate(validadeDate.getDate() + 7);
  const validadeAte = data.validadeAte || validadeDate.toISOString().split('T')[0];

  const tokenPublico = data.tokenPublico || Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

  const baloesStr = data.baloesIntermediarios ? JSON.stringify(data.baloesIntermediarios) : null;
  const permutaStr = data.permutaInfo ? JSON.stringify(data.permutaInfo) : null;
  const comparativoStr = data.comparativoCustoInfo ? JSON.stringify(data.comparativoCustoInfo) : null;

  await currentPool.query(`
    INSERT INTO PropostasComerciais (
      id, codigoProposta, leadId, leadNome, leadTelefone, leadEmail, leadCpf,
      vendedorId, vendedorNome, embarcacaoId, cota, tipoCota, repasseClienteId,
      valorTotal, valorEntrada, dataVencimentoEntrada, formaPagamentoEntrada,
      numParcelas, valorParcela, diaVencimento, dataPrimeiraParcela, formaPagamentoParcelas,
      baloesIntermediarios, permutaInfo, taxaAdmEstimada, comparativoCustoInfo,
      status, validadeAte, tokenPublico, visualizadaEm, aceitaEm, observacoes,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      leadNome = VALUES(leadNome),
      leadTelefone = VALUES(leadTelefone),
      leadEmail = VALUES(leadEmail),
      leadCpf = VALUES(leadCpf),
      vendedorId = VALUES(vendedorId),
      vendedorNome = VALUES(vendedorNome),
      embarcacaoId = VALUES(embarcacaoId),
      cota = VALUES(cota),
      tipoCota = VALUES(tipoCota),
      repasseClienteId = VALUES(repasseClienteId),
      valorTotal = VALUES(valorTotal),
      valorEntrada = VALUES(valorEntrada),
      dataVencimentoEntrada = VALUES(dataVencimentoEntrada),
      formaPagamentoEntrada = VALUES(formaPagamentoEntrada),
      numParcelas = VALUES(numParcelas),
      valorParcela = VALUES(valorParcela),
      diaVencimento = VALUES(diaVencimento),
      dataPrimeiraParcela = VALUES(dataPrimeiraParcela),
      formaPagamentoParcelas = VALUES(formaPagamentoParcelas),
      baloesIntermediarios = VALUES(baloesIntermediarios),
      permutaInfo = VALUES(permutaInfo),
      taxaAdmEstimada = VALUES(taxaAdmEstimada),
      comparativoCustoInfo = VALUES(comparativoCustoInfo),
      status = VALUES(status),
      validadeAte = VALUES(validadeAte),
      observacoes = VALUES(observacoes),
      updatedAt = VALUES(updatedAt)
  `, [
    id,
    codigoProposta,
    data.leadId || null,
    data.leadNome || 'Lead Comercial',
    data.leadTelefone || null,
    data.leadEmail || null,
    data.leadCpf || null,
    data.vendedorId || null,
    data.vendedorNome || null,
    data.embarcacaoId,
    data.cota,
    data.tipoCota || 'estoque_mexicano',
    data.repasseClienteId || null,
    data.valorTotal || 0,
    data.valorEntrada || 0,
    data.dataVencimentoEntrada || null,
    data.formaPagamentoEntrada || 'pix',
    data.numParcelas || 0,
    data.valorParcela || 0,
    data.diaVencimento || 10,
    data.dataPrimeiraParcela || null,
    data.formaPagamentoParcelas || 'boleto',
    baloesStr,
    permutaStr,
    data.taxaAdmEstimada || 0,
    comparativoStr,
    data.status || 'enviada',
    validadeAte,
    tokenPublico,
    data.visualizadaEm || null,
    data.aceitaEm || null,
    data.observacoes || null,
    createdAt,
    updatedAt
  ]);

  // Se solicitado bloqueio temporário (48h) da cota
  if (data.reservarCota48h) {
    try {
      await createCotaReserva({
        embarcacaoId: data.embarcacaoId,
        cota: data.cota,
        propostaId: id,
        leadId: data.leadId,
        leadNome: data.leadNome,
        vendedorId: data.vendedorId,
        vendedorNome: data.vendedorNome,
        motivoReserva: `Proposta gerada ${codigoProposta}`
      });
    } catch (e) {
      console.warn("[upsertPropostaComercial] Reserva automatica falhou:", e);
    }
  }

  // Se tem lead vinculado, adiciona entrada na timeline e avança etapa
  if (data.leadId) {
    try {
      await addLeadTimelineEvent(data.leadId, {
        tipo: 'proposta',
        titulo: `Proposta Gerada: ${codigoProposta}`,
        descricao: `Valor Total: R$ ${Number(data.valorTotal || 0).toLocaleString('pt-BR')} (${data.cota})`,
        autorNome: data.vendedorNome || 'Comercial'
      });
      await updateLeadEtapa(data.leadId, 'proposta_enviada', undefined, data.vendedorNome);
    } catch {}
  }

  return getPropostaByIdOrToken(id);
}

export async function aceitarPropostaPublica(tokenPublico: string): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const proposta = await getPropostaByIdOrToken(tokenPublico);
  if (!proposta) throw new Error("Proposta não encontrada");

  const nowIso = new Date().toISOString();
  await currentPool.query(`
    UPDATE PropostasComerciais
    SET status = 'aceita', aceitaEm = ?, updatedAt = ?
    WHERE tokenPublico = ?
  `, [nowIso, nowIso, tokenPublico]);

  if (proposta.leadId) {
    await addLeadTimelineEvent(proposta.leadId, {
      tipo: 'mudanca_etapa',
      titulo: 'Proposta Aceita pelo Cliente!',
      descricao: `O cliente aceitou a proposta ${proposta.codigoProposta} online. Encaminhado para Análise Jurídica / Contrato.`,
      autorNome: 'Cliente (Online)'
    });
    await updateLeadEtapa(proposta.leadId, 'analise_juridica', undefined, 'Sistema Comercial');
  }

  return getPropostaByIdOrToken(tokenPublico);
}

// -------------------------------------------------------------------------
// COTAS RESERVADAS (BLOQUEIO TEMPORÁRIO 48H) & GESTÃO DE FRAÇÕES NÁUTICAS
// -------------------------------------------------------------------------

export async function getActiveCotasReservadas(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const nowIso = new Date().toISOString();
    // Expirar silenciosamente reservas antigas
    try {
      await currentPool.query(`
        UPDATE CotasReservadas
        SET status = 'expirada'
        WHERE status = 'ativa' AND expiraEm <= ?
      `, [nowIso]);
    } catch (e) {}

    const [rows]: any = await currentPool.query(`
      SELECT r.*, b.nome AS barcoNome, b.numero AS barcoNumero, b.modelo AS barcoModelo
      FROM CotasReservadas r
      LEFT JOIN Embarcacoes b ON b.id = r.embarcacaoId
      WHERE r.status = 'ativa' AND r.expiraEm > ?
      ORDER BY r.createdAt DESC
    `, [nowIso]);

    return rows.map((r: any) => {
      const expDate = new Date(r.expiraEm);
      const diffMs = Math.max(0, expDate.getTime() - Date.now());
      const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        ...r,
        embarcacaoNome: r.barcoNome || r.embarcacaoId,
        horasRestantes: hoursRemaining,
        minutosRestantes: minutesRemaining,
        tempoRestanteFormatado: `${hoursRemaining}h ${minutesRemaining}m`
      };
    });
  } catch (err) {
    console.error("[getActiveCotasReservadas Error]:", err);
    return [];
  }
}

export async function createCotaReserva(data: {
  embarcacaoId: string;
  cota: string;
  propostaId?: string;
  leadId?: string;
  leadNome?: string;
  vendedorId?: string;
  vendedorNome?: string;
  motivoReserva?: string;
  horasExpiracao?: number;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const normalizedCota = String(data.cota).trim().toUpperCase();
  const nowIso = new Date().toISOString();

  // 1. Checar se já há reserva ativa não expirada para a mesma cota
  const [existingReservas]: any = await currentPool.query(`
    SELECT * FROM CotasReservadas
    WHERE embarcacaoId = ? AND UPPER(cota) = ? AND status = 'ativa' AND expiraEm > ?
    LIMIT 1
  `, [data.embarcacaoId, normalizedCota, nowIso]);

  if (existingReservas && existingReservas.length > 0) {
    const res = existingReservas[0];
    const expDate = new Date(res.expiraEm).toLocaleString('pt-BR');
    throw new Error(
      `A cota ${normalizedCota} já está bloqueada até ${expDate} pelo vendedor ${res.vendedorNome || 'Comercial'} para o lead ${res.leadNome || 'Lead'}.`
    );
  }

  // 2. Checar se a cota já está vendida para um cotista real que NÃO esteja em repasse
  const [clientesRows]: any = await currentPool.query(`
    SELECT id, nome, embarcacaoId, cota, embarcacoes FROM Clientes
    WHERE (status IS NULL OR status != 'inativo') AND id != ?
  `, [MEXICANO_INTERNAL_CLIENT_ID]);

  for (const cli of clientesRows) {
    let ebs: any[] = [];
    if (cli.embarcacoes) {
      try {
        ebs = typeof cli.embarcacoes === 'string' ? JSON.parse(cli.embarcacoes) : cli.embarcacoes;
      } catch (e) {
        ebs = [];
      }
    }

    if (Array.isArray(ebs) && ebs.length > 0) {
      const matched = ebs.find((eb: any) => {
        if (!eb || eb.embarcacaoId !== data.embarcacaoId) return false;
        const code = String(eb.cota || '').trim().toUpperCase();
        return code === normalizedCota;
      });

      if (matched) {
        if (!matched.emRepasse) {
          throw new Error(
            `A cota ${normalizedCota} pertence ao cotista titular ${cli.nome} e não está autorizada para repasse/venda.`
          );
        }
      }
    } else if (cli.embarcacaoId === data.embarcacaoId) {
      const code = String(cli.cota || '').trim().toUpperCase();
      if (code === normalizedCota && !cli.emRepasse) {
        throw new Error(
          `A cota ${normalizedCota} pertence ao cotista titular ${cli.nome} e não está autorizada para repasse/venda.`
        );
      }
    }
  }

  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hours = data.horasExpiracao && data.horasExpiracao > 0 ? data.horasExpiracao : 48;
  const expiraDate = new Date(Date.now() + hours * 3600 * 1000);
  const expiraEm = expiraDate.toISOString();
  const createdAt = new Date().toISOString();

  await currentPool.query(`
    INSERT INTO CotasReservadas (
      id, embarcacaoId, cota, propostaId, leadId, leadNome,
      vendedorId, vendedorNome, motivoReserva, expiraEm, status, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa', ?)
  `, [
    id,
    data.embarcacaoId,
    normalizedCota,
    data.propostaId || null,
    data.leadId || null,
    data.leadNome || null,
    data.vendedorId || null,
    data.vendedorNome || null,
    data.motivoReserva || 'Bloqueio Comercial 48h',
    expiraEm,
    createdAt
  ]);

  // Registrar no Histórico de Cotas
  try {
    const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await currentPool.query(`
      INSERT INTO HistoricoCotas (
        id, embarcacaoId, cota, tipoOperacao, clienteDestinoId, clienteDestinoNome,
        valor, dataOperacao, observacoes, criadoPor, createdAt
      ) VALUES (?, ?, ?, 'reserva_48h', ?, ?, 0, ?, ?, ?, ?)
    `, [
      histId,
      data.embarcacaoId,
      normalizedCota,
      data.leadId || null,
      data.leadNome || 'Lead Comercial',
      createdAt.split('T')[0],
      data.motivoReserva || `Bloqueio Comercial de 48h vinculado ao Lead ${data.leadNome || ''}`,
      data.vendedorNome || 'Comercial',
      createdAt
    ]);
  } catch (e) {}

  invalidateDbCache();
  return { id, expiraEm, cota: normalizedCota, ...data };
}

export async function cancelCotaReserva(id: string, operadorNome = 'Comercial'): Promise<boolean> {
  const currentPool = getDbPool();
  if (!currentPool) return false;

  const [resRows]: any = await currentPool.query("SELECT * FROM CotasReservadas WHERE id = ?", [id]);
  const res = resRows && resRows[0];

  await currentPool.query("UPDATE CotasReservadas SET status = 'cancelada' WHERE id = ?", [id]);

  if (res) {
    try {
      const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      await currentPool.query(`
        INSERT INTO HistoricoCotas (
          id, embarcacaoId, cota, tipoOperacao, clienteDestinoId, clienteDestinoNome,
          valor, dataOperacao, observacoes, criadoPor, createdAt
        ) VALUES (?, ?, ?, 'liberacao', ?, ?, 0, ?, ?, ?, ?)
      `, [
        histId,
        res.embarcacaoId,
        res.cota,
        res.leadId || null,
        res.leadNome || 'Lead',
        nowIso.split('T')[0],
        `Bloqueio cancelado manualmente pelo operador ${operadorNome}. Cota devolvida ao estoque.`,
        operadorNome,
        nowIso
      ]);
    } catch (e) {}
  }

  invalidateDbCache();
  return true;
}

export async function marcarCotaRepasse(data: {
  clienteId: string;
  embarcacaoId: string;
  cota: string;
  emRepasse: boolean;
  valorRepasse?: number;
  operadorNome?: string;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const normalizedCota = String(data.cota).trim().toUpperCase();
  const [cliRows]: any = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [data.clienteId]);
  const cliente = cliRows && cliRows[0];
  if (!cliente) throw new Error("Cliente cotista não encontrado");

  let ebs: any[] = [];
  if (cliente.embarcacoes) {
    try {
      ebs = typeof cliente.embarcacoes === 'string' ? JSON.parse(cliente.embarcacoes) : cliente.embarcacoes;
    } catch (e) {
      ebs = [];
    }
  }

  let updated = false;
  if (Array.isArray(ebs) && ebs.length > 0) {
    ebs = ebs.map((eb: any) => {
      if (eb && eb.embarcacaoId === data.embarcacaoId && String(eb.cota || '').trim().toUpperCase() === normalizedCota) {
        updated = true;
        return {
          ...eb,
          emRepasse: data.emRepasse,
          valorRepasse: data.emRepasse ? (Number(data.valorRepasse) || 0) : undefined
        };
      }
      return eb;
    });
  }

  if (!updated && cliente.embarcacaoId === data.embarcacaoId) {
    ebs = [{
      embarcacaoId: data.embarcacaoId,
      cota: normalizedCota,
      plano: cliente.plano || 'normal',
      emRepasse: data.emRepasse,
      valorRepasse: data.emRepasse ? (Number(data.valorRepasse) || 0) : undefined
    }];
  }

  await currentPool.query(
    "UPDATE Clientes SET embarcacoes = ? WHERE id = ?",
    [JSON.stringify(ebs), data.clienteId]
  );

  // Registrar histórico
  try {
    const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    await currentPool.query(`
      INSERT INTO HistoricoCotas (
        id, embarcacaoId, cota, tipoOperacao, clienteOrigemId, clienteOrigemNome,
        valor, dataOperacao, observacoes, criadoPor, createdAt
      ) VALUES (?, ?, ?, 'repasse', ?, ?, ?, ?, ?, ?, ?)
    `, [
      histId,
      data.embarcacaoId,
      normalizedCota,
      data.clienteId,
      cliente.nome,
      data.valorRepasse || 0,
      nowIso.split('T')[0],
      data.emRepasse
        ? `Cota colocada em repasse comercial pelo valor de R$ ${Number(data.valorRepasse || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `Cota retirada do repasse comercial`,
      data.operadorNome || 'Comercial',
      nowIso
    ]);
  } catch (e) {}

  invalidateDbCache();
  return { success: true, clienteId: data.clienteId, embarcacaoId: data.embarcacaoId, cota: normalizedCota, emRepasse: data.emRepasse };
}

export async function transferirOuRecomprarCota(data: {
  embarcacaoId: string;
  cota: string;
  clienteOrigemId: string;
  clienteDestinoId?: string;
  valor?: number;
  dataOperacao?: string;
  observacoes?: string;
  operadorNome?: string;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const normalizedCota = String(data.cota).trim().toUpperCase();
  const isRecompra = !data.clienteDestinoId || isInternalMexicanoEntity(data.clienteDestinoId);
  const targetClientId = isRecompra ? MEXICANO_INTERNAL_CLIENT_ID : data.clienteDestinoId!;

  // 1. Buscar cliente de origem
  const [origemRows]: any = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [data.clienteOrigemId]);
  const clienteOrigem = origemRows && origemRows[0];
  if (!clienteOrigem) throw new Error("Cliente vendedor/origem não encontrado");

  // 2. Buscar cliente de destino
  let clienteDestinoNome = MEXICANO_INTERNAL_CLIENT_NAME;
  if (!isRecompra) {
    const [destRows]: any = await currentPool.query("SELECT * FROM Clientes WHERE id = ?", [targetClientId]);
    const clienteDestino = destRows && destRows[0];
    if (!clienteDestino) throw new Error("Cliente comprador/destino não encontrado");
    clienteDestinoNome = clienteDestino.nome;

    // Adicionar cota no destino
    let destEbs: any[] = [];
    if (clienteDestino.embarcacoes) {
      try {
        destEbs = typeof clienteDestino.embarcacoes === 'string' ? JSON.parse(clienteDestino.embarcacoes) : clienteDestino.embarcacoes;
      } catch (e) {
        destEbs = [];
      }
    }
    destEbs.push({
      embarcacaoId: data.embarcacaoId,
      cota: normalizedCota,
      plano: 'normal',
      dataAquisicao: data.dataOperacao || new Date().toISOString().split('T')[0]
    });
    await currentPool.query(
      "UPDATE Clientes SET embarcacoes = ? WHERE id = ?",
      [JSON.stringify(destEbs), targetClientId]
    );
  }

  // 3. Remover cota do cliente de origem
  let origemEbs: any[] = [];
  if (clienteOrigem.embarcacoes) {
    try {
      origemEbs = typeof clienteOrigem.embarcacoes === 'string' ? JSON.parse(clienteOrigem.embarcacoes) : clienteOrigem.embarcacoes;
    } catch (e) {
      origemEbs = [];
    }
  }
  origemEbs = origemEbs.filter((eb: any) => {
    if (!eb || eb.embarcacaoId !== data.embarcacaoId) return true;
    return String(eb.cota || '').trim().toUpperCase() !== normalizedCota;
  });
  await currentPool.query(
    "UPDATE Clientes SET embarcacoes = ? WHERE id = ?",
    [JSON.stringify(origemEbs), data.clienteOrigemId]
  );

  // 4. Reconciliar cotas com a entidade interna El Mexicano
  await reconcileBoatCotasWithMexicano(currentPool, data.embarcacaoId);

  // 5. Gravar no Histórico
  const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  await currentPool.query(`
    INSERT INTO HistoricoCotas (
      id, embarcacaoId, cota, tipoOperacao, clienteOrigemId, clienteOrigemNome,
      clienteDestinoId, clienteDestinoNome, valor, dataOperacao, observacoes, criadoPor, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    histId,
    data.embarcacaoId,
    normalizedCota,
    isRecompra ? 'recompra' : 'transferencia',
    clienteOrigem.id,
    clienteOrigem.nome,
    targetClientId,
    clienteDestinoNome,
    Number(data.valor) || 0,
    data.dataOperacao || nowIso.split('T')[0],
    data.observacoes || (isRecompra
      ? `Recompra da cota ${normalizedCota} pelo estoque da El Mexicano`
      : `Transferência de titularidade da cota ${normalizedCota} para ${clienteDestinoNome}`),
    data.operadorNome || 'Comercial',
    nowIso
  ]);

  invalidateDbCache();
  return {
    success: true,
    isRecompra,
    cota: normalizedCota,
    embarcacaoId: data.embarcacaoId,
    origem: clienteOrigem.nome,
    destino: clienteDestinoNome
  };
}

export async function getCotasHistorico(embarcacaoId?: string): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const query = embarcacaoId
      ? `SELECT h.*, b.nome AS barcoNome
         FROM HistoricoCotas h
         LEFT JOIN Embarcacoes b ON b.id = h.embarcacaoId
         WHERE h.embarcacaoId = ?
         ORDER BY h.createdAt DESC LIMIT 100`
      : `SELECT h.*, b.nome AS barcoNome
         FROM HistoricoCotas h
         LEFT JOIN Embarcacoes b ON b.id = h.embarcacaoId
         ORDER BY h.createdAt DESC LIMIT 200`;

    const [rows]: any = await currentPool.query(query, embarcacaoId ? [embarcacaoId] : []);
    return rows.map((r: any) => ({
      ...r,
      embarcacaoNome: r.barcoNome || r.embarcacaoId,
      valorNegociado: Number(r.valor) || 0
    }));
  } catch (err) {
    console.error("[getCotasHistorico Error]:", err);
    return [];
  }
}

export async function getFrotaConsolidadaComCotas(): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // Limpar silenciosamente reservas expiradas
  try {
    await currentPool.query(`
      UPDATE CotasReservadas
      SET status = 'expirada'
      WHERE status = 'ativa' AND expiraEm <= ?
    `, [nowIso]);
  } catch (e) {}

  const [boats]: any = await currentPool.query("SELECT * FROM Embarcacoes");
  const [empRows]: any = await currentPool.query("SELECT * FROM EmbarcacaoEmpresas");
  const [clients]: any = await currentPool.query(`
    SELECT id, nome, telefone, cpf, embarcacaoId, cota, embarcacoes, status
    FROM Clientes WHERE status IS NULL OR status != 'inativo'
  `);
  const [cotasReservadas]: any = await currentPool.query(`
    SELECT * FROM CotasReservadas WHERE status = 'ativa' AND expiraEm > ?
  `, [nowIso]);
  const [reservasHoje]: any = await currentPool.query(`
    SELECT * FROM Reservas WHERE data = ? AND status != 'cancelado'
  `, [todayStr]);
  const [manutencoesAbertas]: any = await currentPool.query(`
    SELECT * FROM Manutencoes WHERE status NOT IN ('concluido', 'cancelado')
  `);

  const empMap = new Map<string, string[]>();
  empRows.forEach((r: any) => {
    if (!empMap.has(r.embarcacaoId)) empMap.set(r.embarcacaoId, []);
    empMap.get(r.embarcacaoId)!.push(r.empresa);
  });

  let totalEmbarcacoes = 0;
  let totalCotasFrota = 0;
  let cotasDisponiveisEstoqueTotal = 0;
  let cotasEmRepasseTotal = 0;
  let cotasReservadas48hTotal = 0;
  let cotasVendidasTotal = 0;
  let vgvEstoqueDisponivelTotal = 0;

  const frota = boats.map((b: any) => {
    const empresas = empMap.get(b.id) || ['VALE'];
    const totalCotas = Number(b.totalCotas) > 0 ? Number(b.totalCotas) : (b.nome === 'M55' || b.id === 'boat_M55' ? 8 : 4);
    const valorCota = Number(b.valorCota) || 0;
    const taxaAdmMensal = Number(b.taxaAdmMensal) || 0;

    // Status Operacional na Marina
    const isManutencao = b.emManutencao === 1 || manutencoesAbertas.some((m: any) => m.embarcacaoId === b.id);
    const isNavegandoHoje = reservasHoje.some((r: any) => r.embarcacaoId === b.id);
    const statusMarina = isManutencao ? 'em_manutencao' : (isNavegandoHoje ? 'navegando_hoje' : 'na_marina');

    // Mapear ocupação de clientes reais (não-mexicano)
    const cotistasReaisMap = new Map<string, { clienteId: string; clienteNome: string; emRepasse: boolean; valorRepasse?: number }>();

    clients.forEach((c: any) => {
      if (isInternalMexicanoEntity(c.id) || isInternalMexicanoEntity(c.nome)) return;

      let ebs: any[] = [];
      if (c.embarcacoes) {
        try {
          ebs = typeof c.embarcacoes === 'string' ? JSON.parse(c.embarcacoes) : c.embarcacoes;
        } catch (e) {
          ebs = [];
        }
      }

      if (Array.isArray(ebs) && ebs.length > 0) {
        ebs.forEach((eb: any) => {
          if (eb && eb.embarcacaoId === b.id && eb.cota) {
            const m = String(eb.cota).trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
            const code = m ? `C${parseInt(m[1], 10)}` : String(eb.cota).trim().toUpperCase();
            cotistasReaisMap.set(code, {
              clienteId: c.id,
              clienteNome: c.nome,
              emRepasse: Boolean(eb.emRepasse),
              valorRepasse: eb.valorRepasse ? Number(eb.valorRepasse) : undefined
            });
          }
        });
      } else if (c.embarcacaoId === b.id && c.cota) {
        const m = String(c.cota).trim().toUpperCase().match(/(?:COTA|C)?[\s\-_]*0*(\d+)/i);
        const code = m ? `C${parseInt(m[1], 10)}` : String(c.cota).trim().toUpperCase();
        cotistasReaisMap.set(code, {
          clienteId: c.id,
          clienteNome: c.nome,
          emRepasse: Boolean(c.emRepasse),
          valorRepasse: c.valorRepasse ? Number(c.valorRepasse) : undefined
        });
      }
    });

    // Mapear reservas 48h ativas
    const reservasMap = new Map<string, any>();
    cotasReservadas
      .filter((r: any) => r.embarcacaoId === b.id)
      .forEach((r: any) => {
        const code = String(r.cota).trim().toUpperCase();
        reservasMap.set(code, r);
      });

    // Construir slots C1 até totalCotas
    const slots = [];
    let barcoDisponiveis = 0;
    let barcoRepasse = 0;
    let barcoReservadas = 0;
    let barcoVendidas = 0;

    for (let i = 1; i <= totalCotas; i++) {
      const code = `C${i}`;
      const reserva = reservasMap.get(code);
      const cotista = cotistasReaisMap.get(code);

      if (reserva) {
        barcoReservadas++;
        const expDate = new Date(reserva.expiraEm);
        const diffMs = Math.max(0, expDate.getTime() - Date.now());
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        slots.push({
          cota: code,
          status: 'reservada',
          titularNome: `Bloqueado p/ ${reserva.leadNome || 'Lead'}`,
          titularId: reserva.leadId || 'lead_reservado',
          reservaInfo: {
            id: reserva.id,
            leadId: reserva.leadId,
            leadNome: reserva.leadNome,
            vendedorId: reserva.vendedorId,
            vendedorNome: reserva.vendedorNome,
            motivoReserva: reserva.motivoReserva,
            expiraEm: reserva.expiraEm,
            countdownHours: hours,
            countdownMinutes: minutes,
            tempoRestante: `${hours}h ${minutes}m`
          }
        });
      } else if (cotista) {
        if (cotista.emRepasse) {
          barcoRepasse++;
          slots.push({
            cota: code,
            status: 'em_repasse',
            titularNome: `${cotista.clienteNome} (Repasse)`,
            titularId: cotista.clienteId,
            repasseInfo: {
              clienteId: cotista.clienteId,
              clienteNome: cotista.clienteNome,
              valorRepasse: cotista.valorRepasse || valorCota
            }
          });
        } else {
          barcoVendidas++;
          slots.push({
            cota: code,
            status: 'vendida',
            titularNome: cotista.clienteNome,
            titularId: cotista.clienteId
          });
        }
      } else {
        // Cota em Estoque El Mexicano
        barcoDisponiveis++;
        slots.push({
          cota: code,
          status: 'disponivel_mexicano',
          titularNome: 'El Mexicano (Estoque Próprio)',
          titularId: MEXICANO_INTERNAL_CLIENT_ID
        });
      }
    }

    const taxaOcupacaoPercent = totalCotas > 0
      ? Math.round(((barcoVendidas + barcoReservadas) / totalCotas) * 100)
      : 0;

    totalEmbarcacoes++;
    totalCotasFrota += totalCotas;
    cotasDisponiveisEstoqueTotal += barcoDisponiveis;
    cotasEmRepasseTotal += barcoRepasse;
    cotasReservadas48hTotal += barcoReservadas;
    cotasVendidasTotal += barcoVendidas;
    vgvEstoqueDisponivelTotal += barcoDisponiveis * valorCota;

    let parsedAcessorios = undefined;
    if (b.acessorios) {
      try {
        parsedAcessorios = typeof b.acessorios === 'string' ? JSON.parse(b.acessorios) : b.acessorios;
      } catch (e) {}
    }

    return {
      ...b,
      empresas,
      totalCotas,
      valorCota,
      taxaAdmMensal,
      statusMarina,
      acessorios: parsedAcessorios,
      emManutencao: isManutencao,
      navegandoHoje: isNavegandoHoje,
      cotasDisponiveisEstoque: barcoDisponiveis,
      cotasEmRepasse: barcoRepasse,
      cotasReservadas48h: barcoReservadas,
      cotasVendidas: barcoVendidas,
      taxaOcupacaoPercent,
      slots
    };
  });

  const taxaOcupacaoFrotaPercent = totalCotasFrota > 0
    ? Math.round((cotasVendidasTotal / totalCotasFrota) * 100)
    : 0;

  return {
    kpis: {
      totalEmbarcacoes,
      totalCotasFrota,
      cotasDisponiveisEstoque: cotasDisponiveisEstoqueTotal,
      vgvEstoqueDisponivel: vgvEstoqueDisponivelTotal,
      cotasReservadas48h: cotasReservadas48hTotal,
      cotasEmRepasse: cotasEmRepasseTotal,
      cotasVendidas: cotasVendidasTotal,
      taxaOcupacaoFrotaPercent
    },
    frota
  };
}

// -------------------------------------------------------------------------
// PERMUTAS (TRADE-IN)
// -------------------------------------------------------------------------

export async function getAllPermutas(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query(`
      SELECT * FROM Permutas ORDER BY createdAt DESC
    `);
    return rows.map((r: any) => {
      let fotos = [];
      let documentos = [];
      try { if (r.fotos) fotos = JSON.parse(r.fotos); } catch {}
      try { if (r.documentos) documentos = JSON.parse(r.documentos); } catch {}
      return {
        ...r,
        fotos,
        documentos,
        valorPropostoCliente: Number(r.valorPropostoCliente) || 0,
        valorAprovadoDiretoria: r.valorAprovadoDiretoria !== null ? Number(r.valorAprovadoDiretoria) : null
      };
    });
  } catch (err) {
    console.error("[getAllPermutas Error]:", err);
    return [];
  }
}

export async function upsertPermuta(data: any): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const id = data.id || `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = data.createdAt || new Date().toISOString();
  const fotosStr = data.fotos ? JSON.stringify(data.fotos) : null;
  const docsStr = data.documentos ? JSON.stringify(data.documentos) : null;

  await currentPool.query(`
    INSERT INTO Permutas (
      id, propostaId, leadId, leadNome, tipoBem, marcaModelo, ano,
      valorPropostoCliente, valorAprovadoDiretoria, statusAvaliacao,
      motivoAvaliacao, avaliadoPor, avaliadoEm, fotos, documentos, observacoes, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tipoBem = VALUES(tipoBem),
      marcaModelo = VALUES(marcaModelo),
      ano = VALUES(ano),
      valorPropostoCliente = VALUES(valorPropostoCliente),
      valorAprovadoDiretoria = VALUES(valorAprovadoDiretoria),
      statusAvaliacao = VALUES(statusAvaliacao),
      motivoAvaliacao = VALUES(motivoAvaliacao),
      avaliadoPor = VALUES(avaliadoPor),
      avaliadoEm = VALUES(avaliadoEm),
      fotos = VALUES(fotos),
      documentos = VALUES(documentos),
      observacoes = VALUES(observacoes)
  `, [
    id,
    data.propostaId || null,
    data.leadId || null,
    data.leadNome || null,
    data.tipoBem || 'lancha',
    data.marcaModelo,
    data.ano || null,
    data.valorPropostoCliente || 0,
    data.valorAprovadoDiretoria || null,
    data.statusAvaliacao || 'aguardando_avaliacao',
    data.motivoAvaliacao || null,
    data.avaliadoPor || null,
    data.avaliadoEm || null,
    fotosStr,
    docsStr,
    data.observacoes || null,
    createdAt
  ]);

  const all = await getAllPermutas();
  return all.find(p => p.id === id);
}

export async function avaliarPermutaDiretoria(id: string, payload: {
  valorAprovadoDiretoria?: number;
  statusAvaliacao: 'aprovado' | 'recusado';
  motivoAvaliacao?: string;
  avaliadoPor?: string;
}): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const nowIso = new Date().toISOString();
  await currentPool.query(`
    UPDATE Permutas
    SET valorAprovadoDiretoria = ?,
        statusAvaliacao = ?,
        motivoAvaliacao = ?,
        avaliadoPor = ?,
        avaliadoEm = ?
    WHERE id = ?
  `, [
    payload.valorAprovadoDiretoria || null,
    payload.statusAvaliacao,
    payload.motivoAvaliacao || null,
    payload.avaliadoPor || 'Diretoria El Mexicano',
    nowIso,
    id
  ]);

  const all = await getAllPermutas();
  return all.find(p => p.id === id);
}

// -------------------------------------------------------------------------
// CHECK-IN VISITAS & TEST DRIVES
// -------------------------------------------------------------------------

export async function getAllCheckinsVisita(): Promise<any[]> {
  const currentPool = getDbPool();
  if (!currentPool) return [];
  try {
    const [rows]: any = await currentPool.query(`
      SELECT c.*, b.nome AS barcoNome
      FROM CheckinVisitas c
      LEFT JOIN Embarcacoes b ON b.id = c.embarcacaoId
      ORDER BY c.createdAt DESC
    `);
    return rows.map((r: any) => ({
      ...r,
      embarcacaoNome: r.barcoNome || r.embarcacaoId,
      compareceu: Boolean(r.compareceu)
    }));
  } catch (err) {
    console.error("[getAllCheckinsVisita Error]:", err);
    return [];
  }
}

export async function createCheckinVisita(data: any): Promise<any> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("DB offline");

  const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  await currentPool.query(`
    INSERT INTO CheckinVisitas (
      id, reservaId, leadId, embarcacaoId, vendedorId, dataVisita,
      compareceu, avaliacaoLead, feedbackLead, proximosPassos, temperaturaLead, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.reservaId || null,
    data.leadId || null,
    data.embarcacaoId,
    data.vendedorId || null,
    data.dataVisita || createdAt.split('T')[0],
    data.compareceu ? 1 : 0,
    data.avaliacaoLead || 5,
    data.feedbackLead || null,
    data.proximosPassos || null,
    data.temperaturaLead || 'quente',
    createdAt
  ]);

  // Se vinculado a um lead, adiciona na timeline
  if (data.leadId) {
    try {
      const compStr = data.compareceu ? 'Compareceu ao Test Drive / Visita' : 'Não compareceu ao Test Drive';
      await addLeadTimelineEvent(data.leadId, {
        tipo: 'visita_sea_trial',
        titulo: `Check-in de Test Drive: ${compStr}`,
        descricao: `Temperatura: ${data.temperaturaLead || 'quente'} | Avaliação: ${data.avaliacaoLead || 5}/5. Feedback: ${data.feedbackLead || 'Sem observações'}`,
        autorNome: data.vendedorNome || 'Comercial'
      });
    } catch {}
  }

  const all = await getAllCheckinsVisita();
  return all.find(c => c.id === id);
}


