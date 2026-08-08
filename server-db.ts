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
        statusFinanceiro VARCHAR(50) DEFAULT 'em_dia',
        observacoesFinanceiras TEXT,
        plano VARCHAR(20) DEFAULT 'normal',
        asaasCustomerId VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
        asaasPaymentUrl VARCHAR(255)
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

    // 9. AtividadesFinanceiras Table (Kanban)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS AtividadesFinanceiras (
        id VARCHAR(50) PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'a_fazer',
        createdAt VARCHAR(50) NOT NULL,
        updatedAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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

    try {
      await connection.query(`ALTER TABLE Manutencoes ADD COLUMN descricaoServico TEXT;`);
    } catch (e) {}

    // 12. Mecanicos Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Mecanicos (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cnpj VARCHAR(50),
        createdAt VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

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
  const [reservations] = await currentPool.query("SELECT * FROM Reservas");
  const [controlesSom] = await currentPool.query("SELECT * FROM ControlesSom ORDER BY createdAt DESC");
  const [manutencoes] = await currentPool.query("SELECT * FROM Manutencoes ORDER BY createdAt DESC");
  const [mecanicos] = await currentPool.query("SELECT * FROM Mecanicos ORDER BY createdAt DESC");
  
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
      chassi: b.chassi || '',
      inscricao: b.inscricao || '',
      tipo_propulsao: b.tipo_propulsao || '',
      potencia: b.potencia || '',
      donos: donosList,
      emManutencao: b.emManutencao === 1 || b.emManutencao === true,
      whatsappGroupId: b.whatsappGroupId || undefined,
      temSom: b.temSom === 1 || b.temSom === true,
    };
  });

  const parsedReservations = (reservations as any[]).map(r => {
    let fotosChecklistSaida = [];
    let fotosChecklistChegada = [];
    let fotosChecklistDescida = [];
    try { if (r.fotosChecklistSaida) fotosChecklistSaida = JSON.parse(r.fotosChecklistSaida); } catch(e){}
    try { if (r.fotosChecklistChegada) fotosChecklistChegada = JSON.parse(r.fotosChecklistChegada); } catch(e){}
    try { if (r.fotosChecklistDescida) fotosChecklistDescida = JSON.parse(r.fotosChecklistDescida); } catch(e){}
    
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
    };
  });

  const parsedControlesSom = (controlesSom as any[]).map(r => ({
    ...r,
    somRetirado: r.somRetirado === 1 || r.somRetirado === true,
  }));

  const [funcionariosEPIs] = await currentPool.query("SELECT * FROM FuncionariosEPIs ORDER BY geradoEm DESC");
  const [historicoEPIMensal] = await currentPool.query("SELECT * FROM HistoricoEPIMensal ORDER BY mesAno DESC");

  const result = {
    clients: parsedClients,
    boats: parsedBoats,
    reservations: parsedReservations,
    controlesSom: parsedControlesSom,
    manutencoes: manutencoes as any[],
    mecanicos: mecanicos as any[],
    transacoes: transacoes as any[],
    funcionarios: (funcionarios as any[]).map(f => ({...f, turnos: f.turnos ? JSON.parse(f.turnos) : [], primeiroEmprego: f.primeiroEmprego === 1})),
    folgas: folgas as any[],
    catalogoEPIs: catalogoEPIs as any[],
    registrosAtividades: registrosAtividades as any[],
    epis: (funcionariosEPIs as any[]).map(e => ({
      ...e,
      historicoTrocas: e.historicoTrocas ? (typeof e.historicoTrocas === 'string' ? JSON.parse(e.historicoTrocas) : e.historicoTrocas) : []
    })),
    historicoEpis: historicoEPIMensal as any[]
  };

  dbCache = {
    data: result,
    timestamp: Date.now()
  };

  return result;
}

// Upsert a single client record
export async function upsertClient(client: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const embarcacoesJson = client.embarcacoes ? JSON.stringify(client.embarcacoes) : null;

  const query = `
    INSERT INTO Clientes (
      id, nome, embarcacaoId, cota, telefone, email, cpf, dataCadastro, 
      cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras, plano, asaasCustomerId, cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      embarcacaoId = VALUES(embarcacaoId),
      cota = VALUES(cota),
      telefone = VALUES(telefone),
      email = VALUES(email),
      cpf = VALUES(cpf),
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
      categoriaHabilitacao = VALUES(categoriaHabilitacao)
  `;

  await currentPool.query(query, [
    client.id,
    client.nome,
    client.embarcacaoId || null,
    client.cota || null,
    client.telefone || null,
    client.email || null,
    client.cpf || null,
    client.dataCadastro || null,
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
    client.categoriaHabilitacao || null
  ]);
}

// Delete a single client record
export async function deleteClient(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query("DELETE FROM Clientes WHERE id = ?", [id]);
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
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const donosJson = boat.donos ? JSON.stringify(boat.donos) : JSON.stringify([]);

  const query = `
    INSERT INTO Embarcacoes (
      id, tipo, nome, numero, modelo, fabricante, ano, chassi, inscricao, tipo_propulsao, potencia, donos, googleCalendarId, whatsappGroupId, emManutencao, imagemUrl, temSom, documentoUrl, seguroUrl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      seguroUrl = VALUES(seguroUrl)
  `;

  await currentPool.query(query, [
    boat.id,
    boat.tipo,
    boat.nome,
    boat.numero || null,
    boat.modelo || null,
    boat.fabricante || null,
    boat.ano || null,
    boat.chassi || null,
    boat.inscricao || null,
    boat.tipo_propulsao || null,
    boat.potencia || null,
    donosJson,
    boat.googleCalendarId || null,
    boat.whatsappGroupId || null,
    boat.emManutencao ? 1 : 0,
    boat.imagemUrl || null,
    boat.temSom ? 1 : 0,
    boat.documentoUrl || null,
    boat.seguroUrl || null
  ]);
}

// Delete a single boat record
export async function deleteBoat(id: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
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
      previsaoSaida, previsaoChegada, statusMarina, horaDescida, fotosChecklistDescida, operadorDescida, operadorSaida, operadorChegada, destino, pessoasABordo, confirmacaoEnviada, litrosAbastecidos, horaSubida, operadorSubida, fotosChecklistSubida
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      fotosChecklistSubida = VALUES(fotosChecklistSubida)
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
    fotosChecklistSubidaStr
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
          id, nome, embarcacaoId, cota, telefone, email, cpf, dataCadastro, 
          cep, logradouro, numeroEnd, complemento, bairro, cidade, estado, embarcacoes, statusFinanceiro, observacoesFinanceiras,
          cnh_cha, profissao, estadoCivil, rg, orgaoEmissor, numeroHabilitacao, validadeHabilitacao, orgaoEmissorHabilitacao, categoriaHabilitacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome), embarcacaoId = VALUES(embarcacaoId), cota = VALUES(cota),
          telefone = VALUES(telefone), email = VALUES(email), cpf = VALUES(cpf),
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
        client.telefone || null, client.email || null, client.cpf || null,
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
export async function createAdmin(username: string, passwordHash: string, role: string = 'admin') {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  await currentPool.query(
    "INSERT INTO AdminUsers (username, passwordHash, role) VALUES (?, ?, ?)",
    [username, passwordHash, role]
  );
}

// Fetch all administrative users
export async function getAllAdmins() {
  const currentPool = getDbPool();
  if (!currentPool) return [];

  const [rows] = await currentPool.query(
    "SELECT id, username, role, createdAt FROM AdminUsers ORDER BY createdAt DESC"
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
export async function updateAdmin(id: number, username: string, passwordHash?: string, role?: string) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  if (passwordHash && role) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, passwordHash = ?, role = ? WHERE id = ?",
      [username, passwordHash, role, id]
    );
  } else if (passwordHash) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, passwordHash = ? WHERE id = ?",
      [username, passwordHash, id]
    );
  } else if (role) {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ?, role = ? WHERE id = ?",
      [username, role, id]
    );
  } else {
    await currentPool.query(
      "UPDATE AdminUsers SET username = ? WHERE id = ?",
      [username, id]
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

export async function getAllTransacoes() {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  
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

  const [rows] = await currentPool.query("SELECT * FROM TransacoesFinanceiras ORDER BY dataVencimento DESC");
  return rows;
}

export async function upsertTransacao(t: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  // Clean description: remove "[IMPORTADO]" or "[IMPORTADO] " prefix case-insensitively
  let cleanedDesc = t.descricao || '';
  if (typeof cleanedDesc === 'string') {
    cleanedDesc = cleanedDesc.replace(/^\[IMPORTADO\]\s*/i, '');
  }

  await currentPool.query(
    `INSERT INTO TransacoesFinanceiras (id, tipo, categoria, valor, dataVencimento, dataPagamento, status, descricao, clienteId, embarcacaoId, comprovante, createdAt, asaasPaymentId, asaasPaymentUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       tipo=VALUES(tipo), categoria=VALUES(categoria), valor=VALUES(valor),
       dataVencimento=VALUES(dataVencimento), dataPagamento=VALUES(dataPagamento),
       status=VALUES(status), descricao=VALUES(descricao),
       clienteId=VALUES(clienteId), embarcacaoId=VALUES(embarcacaoId),
       comprovante=VALUES(comprovante),
       asaasPaymentId=VALUES(asaasPaymentId), asaasPaymentUrl=VALUES(asaasPaymentUrl)`,
    [
      t.id, t.tipo, t.categoria, t.valor, t.dataVencimento, t.dataPagamento || null,
      t.status, cleanedDesc, t.clienteId || null, t.embarcacaoId || null, t.comprovante || null, t.createdAt,
      t.asaasPaymentId || null, t.asaasPaymentUrl || null
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

export async function getAllAtividades() {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  const [rows] = await currentPool.query("SELECT * FROM AtividadesFinanceiras ORDER BY createdAt DESC");
  return rows;
}

export async function upsertAtividade(a: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");
  await currentPool.query(
    `INSERT INTO AtividadesFinanceiras (id, titulo, descricao, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       titulo=VALUES(titulo), descricao=VALUES(descricao),
       status=VALUES(status), updatedAt=VALUES(updatedAt)`,
    [
      a.id, a.titulo, a.descricao || '', a.status, a.createdAt, a.updatedAt
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
    "SELECT COUNT(*) as activeCount FROM Manutencoes WHERE embarcacaoId = ? AND status = 'em_andamento'",
    [boatId]
  );
  const activeCount = (rows as any[])[0]?.activeCount || 0;
  const emManutencao = activeCount > 0 ? 1 : 0;
  await pool.query("UPDATE Embarcacoes SET emManutencao = ? WHERE id = ?", [emManutencao, boatId]);
}

export async function upsertManutencao(m: any) {
  const currentPool = getDbPool();
  if (!currentPool) throw new Error("MySQL Connection pool is offline.");

  const [existing] = await currentPool.query("SELECT id FROM Manutencoes WHERE id = ?", [m.id]);
  const isNew = (existing as any[]).length === 0;

  await currentPool.query(
    `INSERT INTO Manutencoes (id, embarcacaoId, dataSaida, mecanico, orcamento, custo, valorRepassado, status, createdAt, descricaoServico)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       embarcacaoId=VALUES(embarcacaoId), dataSaida=VALUES(dataSaida), mecanico=VALUES(mecanico),
       orcamento=VALUES(orcamento), custo=VALUES(custo), valorRepassado=VALUES(valorRepassado),
       status=VALUES(status), descricaoServico=VALUES(descricaoServico)`,
    [
      m.id, m.embarcacaoId, m.dataSaida, m.mecanico || null, m.orcamento || null,
      m.custo || null, m.valorRepassado || null, m.status || 'em_andamento', m.createdAt, m.descricaoServico || null
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
