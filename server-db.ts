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
        status VARCHAR(20) DEFAULT 'ativo'
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
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    
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
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
      "ALTER TABLE Manutencoes ADD COLUMN clienteId VARCHAR(50);"
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
    return {
      ...c,
      status: c.status || 'ativo',
      empresas: clienteEmpresasMap.get(c.id) || ['VALE'],
      embarcacoes: list,
      temLancamentos: fin.totalCnt > 0,
      temValoresEmAberto: fin.openCnt > 0,
      statusFinanceiro: fin.overdueCnt > 0 ? 'inadimplente' : (fin.openCnt > 0 ? 'pendente' : 'em_dia'),
      observacoesFinanceiras: c.observacoesFinanceiras || '',
    };
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
      chassi: b.chassi || '',
      inscricao: b.inscricao || '',
      tipo_propulsao: b.tipo_propulsao || '',
      potencia: b.potencia || '',
      donos: donosList,
      emManutencao: b.emManutencao === 1 || b.emManutencao === true,
      whatsappGroupId: b.whatsappGroupId || undefined,
      temSom: b.temSom === 1 || b.temSom === true,
      acessorios: b.acessorios ? JSON.parse(b.acessorios) : undefined,
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
      pecas: m.pecas ? JSON.parse(m.pecas) : undefined
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

  const query = `
    INSERT INTO Clientes (
      id, nome, embarcacaoId, cota, telefone, email, cpf, dataNascimento, dataCadastro, 
      cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras, plano, asaasCustomerId, cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      status = VALUES(status)
  `;

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
    client.plano || 'normal',
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
    client.status || 'ativo'
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
      id, tipo, nome, numero, modelo, fabricante, ano, chassi, inscricao, tipo_propulsao, potencia, donos, googleCalendarId, whatsappGroupId, emManutencao, imagemUrl, temSom, documentoUrl, seguroUrl, acessorios, horasMotor, ultimaAtualizacaoHoras, horasUltimaManutencao, historicoHoras
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      historicoHoras = VALUES(historicoHoras)
  `;

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
    historicoHorasJson
  ]);

  if (boat.empresas && Array.isArray(boat.empresas)) {
    await currentPool.query("DELETE FROM EmbarcacaoEmpresas WHERE embarcacaoId = ?", [boat.id]);
    if (boat.empresas.length > 0) {
      const values = boat.empresas.map((e: string) => [boat.id, e]);
      await currentPool.query("INSERT INTO EmbarcacaoEmpresas (embarcacaoId, empresa) VALUES ?", [values]);
    }
  }
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

  const query = `
    INSERT INTO Reservas (
      id, embarcacaoId, clienteId, data, periodo, observacoes, googleEventId, status, createdAt,
      somRetirado, somTesteSaida, somTesteRetorno, horaSaida, horaChegada, fotosChecklistSaida, fotosChecklistChegada,
      previsaoSaida, previsaoChegada, statusMarina, horaDescida, fotosChecklistDescida, operadorDescida, operadorSaida, operadorChegada, destino, pessoasABordo, confirmacaoEnviada, litrosAbastecidos, horaSubida, operadorSubida, fotosChecklistSubida,
      abastecimentoLitros, abastecimentoStatusCobranca, abastecimentoFormaPagamento, abastecimentoValorTotal, abastecimentoComprovanteUrl, abastecimentoOperador
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      abastecimentoLitros = VALUES(abastecimentoLitros),
      abastecimentoStatusCobranca = VALUES(abastecimentoStatusCobranca),
      abastecimentoFormaPagamento = VALUES(abastecimentoFormaPagamento),
      abastecimentoValorTotal = VALUES(abastecimentoValorTotal),
      abastecimentoComprovanteUrl = VALUES(abastecimentoComprovanteUrl),
      abastecimentoOperador = VALUES(abastecimentoOperador)
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
    reserva.abastecimentoLitros || null,
    reserva.abastecimentoStatusCobranca || null,
    reserva.abastecimentoFormaPagamento || null,
    reserva.abastecimentoValorTotal || null,
    reserva.abastecimentoComprovanteUrl || null,
    reserva.abastecimentoOperador || reserva.operadorChegada || null
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
        INSERT INTO Embarcacoes (id, tipo, nome, numero, modelo, fabricante, ano, chassi, inscricao, tipo_propulsao, potencia, donos, googleCalendarId, whatsappGroupId, emManutencao, temSom, imagemUrl, documentoUrl, seguroUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          tipo = VALUES(tipo), nome = VALUES(nome), numero = VALUES(numero),
          modelo = VALUES(modelo), fabricante = VALUES(fabricante), ano = VALUES(ano),
          chassi = VALUES(chassi), inscricao = VALUES(inscricao), tipo_propulsao = VALUES(tipo_propulsao), potencia = VALUES(potencia),
          donos = VALUES(donos), googleCalendarId = VALUES(googleCalendarId),
          whatsappGroupId = VALUES(whatsappGroupId), emManutencao = VALUES(emManutencao), temSom = VALUES(temSom),
          imagemUrl = VALUES(imagemUrl), documentoUrl = VALUES(documentoUrl), seguroUrl = VALUES(seguroUrl)
      `, [
        boat.id, boat.tipo, boat.nome, boat.numero, boat.modelo, boat.fabricante, boat.ano,
        boat.chassi || null, boat.inscricao || null, boat.tipo_propulsao || null, boat.potencia || null,
        donosJson, boat.googleCalendarId || null, boat.whatsappGroupId || null, boat.emManutencao ? 1 : 0, boat.temSom ? 1 : 0, boat.imagemUrl || null, boat.documentoUrl || null, boat.seguroUrl || null
      ]);
    }

    // 2. Sync clients
    for (const client of payload.clients) {
      const embarcacoesJson = client.embarcacoes ? JSON.stringify(client.embarcacoes) : null;
      await connection.query(`
        INSERT INTO Clientes (
          id, nome, embarcacaoId, cota, telefone, email, cpf, dataNascimento, dataCadastro, 
          cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras,
          cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          categoriaHabilitacao = VALUES(categoriaHabilitacao)
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
        client.categoriaHabilitacao || null
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
    "SELECT * FROM AdminUsers WHERE username = ?",
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
      t.id, t.tipo, t.categoria, t.valor, t.dataVencimento, t.dataPagamento || null,
      t.status, cleanedDesc, t.clienteId || null, t.embarcacaoId || null, t.comprovante || t.comprovanteUrl || null, t.createdAt,
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

async function updateBoatMaintenanceStatus(pool: any, boatId: string) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as activeCount
     FROM Manutencoes
     WHERE embarcacaoId = ?
       AND status NOT IN ('concluido', 'cancelado')
       AND (
         urgencia IN ('alta', 'critica')
         OR status IN ('em_andamento', 'na_oficina', 'aguardando_pecas')
       )`,
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
      acessorios, pecas, whatsappStatus, createdAt
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       whatsappStatus=VALUES(whatsappStatus)`,
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
  if (empresa) {
    const [rows] = await currentPool.query("SELECT * FROM ContasBancarias WHERE empresa = ? ORDER BY nome ASC", [empresa]);
    return rows as any[];
  }
  const [rows] = await currentPool.query("SELECT * FROM ContasBancarias ORDER BY nome ASC");
  return rows as any[];
}

export async function upsertContaBancaria(c: any): Promise<void> {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    `INSERT INTO ContasBancarias (id, nome, empresa, banco, agencia, conta, saldoInicial, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nome=VALUES(nome), empresa=VALUES(empresa), banco=VALUES(banco),
       agencia=VALUES(agencia), conta=VALUES(conta), saldoInicial=VALUES(saldoInicial),
       status=VALUES(status), updatedAt=VALUES(updatedAt)`,
    [
      c.id, c.nome, c.empresa || null, c.banco || null, c.agencia || null, c.conta || null,
      c.saldoInicial || 0, c.status || 'ativo', c.createdAt || new Date().toISOString(),
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
      p.id, p.codigoContabil, p.descricao, p.tipo, p.empresa, p.status, p.parentId || null, p.createdAt, p.updatedAt
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
    [p.id, p.nome, p.empresa, p.status, p.createdAt, p.updatedAt]
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

  await currentPool.query(
    `INSERT INTO Fornecedores (id, nomeFantasia, razaoSocial, cnpjCpf, empresaId, dadosBancarios, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       nomeFantasia=VALUES(nomeFantasia), razaoSocial=VALUES(razaoSocial), cnpjCpf=VALUES(cnpjCpf),
       empresaId=VALUES(empresaId), dadosBancarios=VALUES(dadosBancarios), status=VALUES(status),
       updatedAt=VALUES(updatedAt)`,
    [
      f.id, f.nomeFantasia, f.razaoSocial || null, f.cnpjCpf || null, f.empresaId || null,
      f.dadosBancarios ? JSON.stringify(f.dadosBancarios) : null, f.status || 'ativo',
      f.createdAt || new Date().toISOString(), f.updatedAt || new Date().toISOString()
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
