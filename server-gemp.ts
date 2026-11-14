import * as FirebirdNamespace from "node-firebird";
import { getDbPool, getConfigValue, setConfigValue, invalidateDbCache, syncMultipleClientsFinancialStatus } from "./server-db";

const Firebird: any = (FirebirdNamespace as any).default?.attach
  ? (FirebirdNamespace as any).default
  : FirebirdNamespace;

export type GempEmpresaKey = "MEXICANO" | "VALE_ADMINISTRADORA";

export interface GempDbConfig {
  key: GempEmpresaKey;
  label: string;
  empresaSistema: string;
  cnpj: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getGempConfigs(): Record<GempEmpresaKey, GempDbConfig> {
  const host = process.env.GEMP_FB_HOST || "200.150.193.41";
  const port = parseInt(process.env.GEMP_FB_PORT || "3050", 10);
  const user = process.env.GEMP_FB_USER || "SYSDBA";
  const password = process.env.GEMP_FB_PASSWORD || "masterkey";

  return {
    MEXICANO: {
      key: "MEXICANO",
      label: "Mexicano Lanchas Ltda",
      empresaSistema: "Mexicano",
      cnpj: "42.206.594/0001-31",
      host,
      port,
      user,
      password,
      database: process.env.GEMP_FB_PATH_MEXICANO || "/opt/database/MEXICANO/VTDADOS.FDB",
    },
    VALE_ADMINISTRADORA: {
      key: "VALE_ADMINISTRADORA",
      label: "Vale Administradora de Bens",
      empresaSistema: "Vale Administradora",
      cnpj: "62.794.642/0001-67",
      host,
      port,
      user,
      password,
      database: process.env.GEMP_FB_PATH_VALE || "/opt/database/MEXICANO/VTDADOS2.FDB",
    },
  };
}

/**
 * Executa uma query SQL no Firebird 5.0 sempre em transação READ-ONLY
 * para evitar qualquer bloqueio (lock) no ERP GEMP em horário comercial.
 */
export function queryFirebirdReadOnly<T = any>(
  config: GempDbConfig,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const options: any = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      lowercase_keys: false,
      encoding: "latin1", // Equivalente ao WIN1252 para acentuação PT-BR correta no driver node-firebird
      timeout: 15000,
    };

    Firebird.attach(options, (err: any, db: any) => {
      if (err) {
        return reject(new Error(`Falha ao conectar no Firebird (${config.label}): ${err.message || err}`));
      }

      db.transaction(Firebird.ISOLATION_READ_COMMITTED_READ_ONLY, (txErr: any, transaction: any) => {
        if (txErr) {
          try { db.detach(); } catch {}
          return reject(new Error(`Falha ao iniciar transação Read-Only (${config.label}): ${txErr.message || txErr}`));
        }

        transaction.query(sql, params, (qErr: any, result: any[]) => {
          transaction.commit(() => {
            try { db.detach(); } catch {}
            if (qErr) {
              return reject(new Error(`Erro na consulta SQL (${config.label}): ${qErr.message || qErr}`));
            }
            resolve((result || []) as T[]);
          });
        });
      });
    });
  });
}

function formatDateISO(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return null;
}

function onlyDigits(val?: string | null): string {
  if (!val) return "";
  return String(val).replace(/\D/g, "");
}

function normalizeName(val?: string | null): string {
  if (!val) return "";
  return String(val)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanGempOperador(raw?: string | null): string {
  if (!raw) return "GEMP ERP";
  const str = String(raw).trim();
  if (!str) return "GEMP ERP";
  // Ex: "02 - DIOGO-05/08/2026-11:13:59" -> "02 - DIOGO (GEMP)"
  const withoutDate = str.replace(/-\d{2}\/\d{2}\/\d{4}.*$/, "").trim();
  return withoutDate ? `${withoutDate} (GEMP)` : str.slice(0, 90);
}

function inferCategoriaReceita(descricaoCobranca: string, servicosItens: string, empresaKey: GempEmpresaKey): string {
  const combined = `${descricaoCobranca} ${servicosItens}`.toUpperCase();
  if (combined.includes("TAXA DE ADMIN") || combined.includes("ADMINI9STRA") || combined.includes("CONDOMINIO") || combined.includes("MENSALIDADE")) {
    return "Taxa de Administração";
  }
  if (combined.includes("COMBUSTIVEL") || combined.includes("GASOLINA") || combined.includes("ABAST") || /\b\d+[,\.]?\d*\s*L(TS|ITROS)?\b/.test(combined)) {
    return "Abastecimento";
  }
  if (combined.includes("REVIS") || combined.includes("OLEO") || combined.includes("ÓLEO") || combined.includes("FILTRO") || combined.includes("MANUTEN") || combined.includes("MAO DE OBRA") || combined.includes("MÃO DE OBRA") || combined.includes("PEÇA") || combined.includes("PECA") || combined.includes("RESGATE")) {
    return "Serviço";
  }
  if (combined.includes("COTA") || combined.includes("VENDA A PRAZO") || combined.includes("AGENCIAMENTO") || combined.includes("LANCHA") || combined.includes("JET")) {
    return empresaKey === "MEXICANO" ? "Venda de Cota" : "Taxa de Administração";
  }
  return empresaKey === "MEXICANO" ? "Venda de Cota" : "Taxa de Administração";
}

function inferCategoriaDespesa(descricaoDespesa: string, fornecedorNome: string): string {
  const combined = `${descricaoDespesa} ${fornecedorNome}`.toUpperCase();
  if (combined.includes("ALIMENTA") || combined.includes("FOLHA") || combined.includes("SALARIO") || combined.includes("SALÁRIO") || combined.includes("FERIAS") || combined.includes("FÉRIAS") || combined.includes("RESCIS") || combined.includes("FGTS") || combined.includes("INSS") || combined.includes("DIARISTA")) {
    return "Salários / RH";
  }
  if (combined.includes("COMBUSTIVEL") || combined.includes("POSTO") || combined.includes("GASOLINA") || combined.includes("DIESEL")) {
    return "Combustível";
  }
  if (combined.includes("ENERGIA") || combined.includes("AGUA") || combined.includes("ÁGUA") || combined.includes("INTERNET") || combined.includes("ALUGUEL") || combined.includes("CONDOMINIO")) {
    return "Despesas Fixas / Utilidades";
  }
  if (combined.includes("IMPOSTO") || combined.includes("DARF") || combined.includes("SIMPLES") || combined.includes("TAXA") || combined.includes("TARIFA") || combined.includes("BANCO") || combined.includes("TRANSFERENCIA ENTRE CONTAS")) {
    return "Impostos e Taxas";
  }
  if (combined.includes("PECA") || combined.includes("PEÇA") || combined.includes("OFICINA") || combined.includes("MANUTEN") || combined.includes("OLEO") || combined.includes("ÓLEO")) {
    return "Peças e Manutenção";
  }
  return "Fornecedores / Despesas Gerais";
}

function parseParcelaInfo(
  refParcela: string,
  descCobranca: string,
  prcFallback: any
): { numeroParcela: number; totalParcelas: number } {
  // 1. Tenta extrair de BL_OBS (ex: "Ref a Parcela 1/12" ou "Parcela 0/1")
  const matchRef = String(refParcela || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (matchRef) {
    const num = parseInt(matchRef[1], 10);
    const tot = parseInt(matchRef[2], 10);
    const safeNum = !isNaN(num) ? num : 1;
    const safeTot = !isNaN(tot) && tot > 0 ? tot : Math.max(1, safeNum);
    return { numeroParcela: safeNum, totalParcelas: Math.max(safeNum, safeTot) };
  }

  // 2. Tenta extrair de DESCRICAO se tiver formato N/M sem ser data (ex: "TAXA DE ADMINISTRAÇÃO - JET 2/12")
  const matchDesc = String(descCobranca || "").match(/(?:PARC(?:ELA)?|JET|LANCHA|COTA|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?!\s*\/\s*\d)/i);
  if (matchDesc) {
    const num = parseInt(matchDesc[1], 10);
    const tot = parseInt(matchDesc[2], 10);
    if (!isNaN(num) && !isNaN(tot) && tot >= num && tot <= 120) {
      return { numeroParcela: num, totalParcelas: tot };
    }
  }

  const p = prcFallback !== null && prcFallback !== undefined && !isNaN(Number(prcFallback)) ? Number(prcFallback) : 1;
  return { numeroParcela: p, totalParcelas: Math.max(1, p) };
}

export interface GempPreviewOptions {
  empresas?: GempEmpresaKey[];
  tipos?: ("receita" | "despesa")[];
  escopo?: "abertos_e_quitados_corte" | "apenas_abertos" | "todo_historico";
  dataCorteQuitados?: string; // YYYY-MM-DD
}

export interface GempPreviewItem {
  id: string;
  gempId: number;
  origemEmpresa: GempEmpresaKey;
  empresa: string;
  tipo: "receita" | "despesa";
  categoria: string;
  valor: number;
  valorOriginal: number;
  valorPago: number;
  dataEmissao: string | null;
  dataVencimento: string;
  dataPagamento: string | null;
  status: "lancado" | "vencido" | "pago" | "cancelado";
  situacaoGemp: string;
  descricao: string;
  documento: number;
  numeroParcela: number;
  totalParcelas: number;
  grupoParcelamentoId: string | null;
  operador: string;
  metodoPagamento: string | null;
  // Classificação contábil auto-mapeada (ou padrão)
  planoContasId: string | null;
  planoContasNomeLocal: string | null;
  contaBancariaId: string | null;
  contaBancariaNomeLocal: string | null;
  centroCustoId: string | null;
  centroCustoNomeLocal: string | null;
  // Vínculos com o sistema local (apenas se já existirem no MySQL)
  clienteId: string | null;
  clienteNomeLocal: string | null;
  embarcacaoId: string | null;
  embarcacaoNomeLocal: string | null;
  fornecedorId: string | null;
  fornecedorNomeLocal: string | null;
  // Dados originais do GEMP
  gempFavorecidoId: number;
  gempFavorecidoNome: string;
  gempFavorecidoDoc: string;
  gempFavorecidoTelefone: string;
  gempServicosItens: string;
  gempEmbarcacaoVaga: string;
  gempReferenciaParcela: string;
  gempDescricaoOriginal: string;
  gempCodPlano: number | null;
  gempNomeBanco: string;
  // Estado de sincronização
  acaoSincronizacao: "novo" | "atualizar" | "inalterado";
  statusAnteriorLocal?: string | null;
  metadata: Record<string, any>;
}

export async function fetchGempPreview(options: GempPreviewOptions) {
  const configs = getGempConfigs();
  const empresasToQuery: GempEmpresaKey[] =
    options.empresas && options.empresas.length > 0
      ? options.empresas
      : ["MEXICANO", "VALE_ADMINISTRADORA"];

  const tiposToQuery: ("receita" | "despesa")[] =
    options.tipos && options.tipos.length > 0
      ? options.tipos
      : ["receita", "despesa"];

  const escopo = options.escopo || "abertos_e_quitados_corte";
  const defaultCutoff = new Date();
  defaultCutoff.setFullYear(defaultCutoff.getFullYear() - 1);
  const dataCorte =
    options.dataCorteQuitados && /^\d{4}-\d{2}-\d{2}$/.test(options.dataCorteQuitados)
      ? options.dataCorteQuitados
      : defaultCutoff.toISOString().split("T")[0];

  // 1. Carregar Clientes, Embarcações, Fornecedores, Planos de Contas, Contas Bancárias, Centros de Custo e Transações do MySQL
  const pool = getDbPool();
  const clientByCpf = new Map<string, any>();
  const clientByName = new Map<string, any>();
  const boatById = new Map<string, any>();
  const boatByCode = new Map<string, any>();
  const boatByName = new Map<string, any>();
  const fornByDoc = new Map<string, any>();
  const fornByName = new Map<string, any>();
  const planoByCodigo = new Map<string, any>();
  const planoByDesc = new Map<string, any>();
  const planosAll = new Map<string, any>();
  const contaByName = new Map<string, any>();
  const contasAll = new Map<string, any>();
  const centroByEmpresa = new Map<string, any>();
  const centrosAll = new Map<string, any>();
  const existingTxMap = new Map<string, any>();

  // Configurações padrão do sistema financeiro
  const vendaPadraoPlanoId = (await getConfigValue("venda_padrao_plano_contas_id")) || "";
  const vendaPadraoCentroId = (await getConfigValue("venda_padrao_centro_custo_id")) || "";
  const vendaPadraoContaId = (await getConfigValue("venda_padrao_conta_bancaria_id")) || "";
  const taxaAdmPadraoPlanoId = (await getConfigValue("taxa_adm_padrao_plano_contas_id")) || "";
  const taxaAdmPadraoCentroId = (await getConfigValue("taxa_adm_padrao_centro_custo_id")) || "";
  const taxaAdmPadraoContaId = (await getConfigValue("taxa_adm_padrao_conta_bancaria_id")) || "";

  let alreadyImportedStats = {
    totalImported: 0,
    mexicanoRec: 0,
    mexicanoPag: 0,
    valeRec: 0,
    valePag: 0,
  };

  if (pool) {
    const [clientRows] = await pool.query("SELECT id, nome, cpf, embarcacaoId, embarcacoes FROM Clientes");
    for (const c of clientRows as any[]) {
      const cleanDoc = onlyDigits(c.cpf);
      if (cleanDoc.length >= 11) clientByCpf.set(cleanDoc, c);
      const normName = normalizeName(c.nome);
      if (normName) clientByName.set(normName, c);
    }

    const [boatRows] = await pool.query("SELECT id, nome, numero, modelo, vaga FROM Embarcacoes");
    for (const b of boatRows as any[]) {
      boatById.set(b.id, b);
      if (b.numero) {
        const numClean = String(b.numero).replace(/\D/g, "");
        if (numClean) {
          boatByCode.set(`M${numClean}`, b);
          boatByCode.set(`M${numClean.padStart(2, "0")}`, b);
        }
      }
      const mMatch = String(b.nome || "").toUpperCase().match(/\b(M\d{1,3})\b/);
      if (mMatch) {
        const rawCode = mMatch[1];
        const numClean = rawCode.slice(1);
        boatByCode.set(rawCode, b);
        boatByCode.set(`M${numClean.padStart(2, "0")}`, b);
      }
      const normBoat = normalizeName(b.nome);
      if (normBoat) boatByName.set(normBoat, b);
    }

    const [fornRows] = await pool.query("SELECT id, nomeFantasia, razaoSocial, cnpjCpf FROM Fornecedores");
    for (const f of fornRows as any[]) {
      const cleanDoc = onlyDigits(f.cnpjCpf);
      if (cleanDoc.length >= 11) fornByDoc.set(cleanDoc, f);
      const normFant = normalizeName(f.nomeFantasia);
      if (normFant) fornByName.set(normFant, f);
      const normRazao = normalizeName(f.razaoSocial);
      if (normRazao) fornByName.set(normRazao, f);
    }

    const [planoRows] = await pool.query("SELECT id, codigoContabil, descricao, tipo, empresa FROM PlanosDeContas WHERE status = 'ativo' OR status IS NULL");
    for (const p of planoRows as any[]) {
      planosAll.set(p.id, p);
      if (p.codigoContabil) {
        planoByCodigo.set(`${p.tipo}_${String(p.codigoContabil).trim()}`, p);
        planoByCodigo.set(String(p.codigoContabil).trim(), p);
      }
      const normDesc = normalizeName(p.descricao);
      if (normDesc) {
        planoByDesc.set(`${p.tipo}_${normDesc}`, p);
        planoByDesc.set(normDesc, p);
      }
    }

    const [contaRows] = await pool.query("SELECT id, nome, empresa, banco FROM ContasBancarias WHERE status = 'ativo' OR status IS NULL");
    for (const cb of contaRows as any[]) {
      contasAll.set(cb.id, cb);
      const normNome = normalizeName(cb.nome);
      if (normNome) contaByName.set(`${cb.empresa}_${normNome}`, cb);
      const normBanco = normalizeName(cb.banco);
      if (normBanco) contaByName.set(`${cb.empresa}_${normBanco}`, cb);
    }

    const [centroRows] = await pool.query("SELECT id, nome, empresa FROM CentrosDeCusto WHERE status = 'ativo' OR status IS NULL");
    for (const cc of centroRows as any[]) {
      centrosAll.set(cc.id, cc);
      if (cc.empresa && !centroByEmpresa.has(cc.empresa)) {
        centroByEmpresa.set(cc.empresa, cc);
      }
    }

    const [txRows] = await pool.query(
      "SELECT id, tipo, empresa, status, valor, dataVencimento, dataPagamento, clienteId, embarcacaoId, fornecedorId, planoContasId, contaBancariaId, centroCustoId, JSON_EXTRACT(metadata, '$.manualOverride') AS manualOverride FROM TransacoesFinanceiras WHERE id LIKE 'gemp_%'"
    );
    for (const tx of txRows as any[]) {
      existingTxMap.set(tx.id, tx);
      alreadyImportedStats.totalImported++;
      if (tx.id.startsWith("gemp_rec_mex_")) alreadyImportedStats.mexicanoRec++;
      else if (tx.id.startsWith("gemp_pag_mex_")) alreadyImportedStats.mexicanoPag++;
      else if (tx.id.startsWith("gemp_rec_vale_")) alreadyImportedStats.valeRec++;
      else if (tx.id.startsWith("gemp_pag_vale_")) alreadyImportedStats.valePag++;
    }
  }

  // Helper para auto-vincular Plano de Contas, Conta Bancária e Centro de Custo
  function resolveAccountingLinks(
    tipo: "receita" | "despesa",
    categoria: string,
    empresaSistema: string,
    empKey: GempEmpresaKey,
    codPlanoGemp: number | null,
    nomeBancoGemp: string,
    existingLocal?: any
  ) {
    let planoObj: any = existingLocal?.planoContasId ? planosAll.get(existingLocal.planoContasId) : null;
    if (!planoObj && codPlanoGemp && codPlanoGemp > 0) {
      planoObj = planoByCodigo.get(`${tipo}_${codPlanoGemp}`) || planoByCodigo.get(String(codPlanoGemp)) || null;
    }
    if (!planoObj) {
      const normCat = normalizeName(categoria);
      planoObj = planoByDesc.get(`${tipo}_${normCat}`) || null;
      if (!planoObj && normCat.includes("ABASTECIMENTO")) {
        planoObj = planoByDesc.get("receita_ABASTECIMENTO") || null;
      } else if (!planoObj && (normCat.includes("SERVICO") || normCat.includes("MANUTENCAO"))) {
        planoObj = planoByDesc.get("receita_SERVICO") || null;
      } else if (!planoObj && normCat.includes("TAXA DE ADMINISTRACAO")) {
        planoObj =
          planoByDesc.get("receita_TAXA DE ADMINISTRACAO") ||
          (taxaAdmPadraoPlanoId ? planosAll.get(taxaAdmPadraoPlanoId) : null) ||
          null;
      } else if (!planoObj && normCat.includes("VENDA DE COTA")) {
        planoObj = vendaPadraoPlanoId ? planosAll.get(vendaPadraoPlanoId) : null;
      }
    }

    let contaObj: any = existingLocal?.contaBancariaId ? contasAll.get(existingLocal.contaBancariaId) : null;
    if (!contaObj && nomeBancoGemp) {
      const normBanco = normalizeName(nomeBancoGemp);
      contaObj = contaByName.get(`${empresaSistema}_${normBanco}`) || null;
    }
    if (!contaObj && tipo === "receita") {
      if (categoria === "Taxa de Administração") {
        contaObj =
          (taxaAdmPadraoContaId ? contasAll.get(taxaAdmPadraoContaId) : null) ||
          contaByName.get(`${empresaSistema}_TAXA ADM`) ||
          null;
      } else if (categoria === "Serviço" || categoria === "Abastecimento") {
        contaObj = contaByName.get(`${empresaSistema}_SERVICOS`) || null;
      } else if (categoria === "Venda de Cota" && vendaPadraoContaId) {
        contaObj = contasAll.get(vendaPadraoContaId) || null;
      }
    }

    let centroObj: any = existingLocal?.centroCustoId ? centrosAll.get(existingLocal.centroCustoId) : null;
    if (!centroObj) {
      if (empKey === "VALE_ADMINISTRADORA" && taxaAdmPadraoCentroId && centrosAll.has(taxaAdmPadraoCentroId)) {
        centroObj = centrosAll.get(taxaAdmPadraoCentroId);
      } else if (empKey === "MEXICANO" && vendaPadraoCentroId && centrosAll.has(vendaPadraoCentroId)) {
        centroObj = centrosAll.get(vendaPadraoCentroId);
      } else {
        centroObj = centroByEmpresa.get(empresaSistema) || null;
      }
    }

    return {
      planoContasId: planoObj ? planoObj.id : null,
      planoContasNomeLocal: planoObj ? planoObj.descricao : null,
      contaBancariaId: contaObj ? contaObj.id : null,
      contaBancariaNomeLocal: contaObj ? contaObj.nome : null,
      centroCustoId: centroObj ? centroObj.id : null,
      centroCustoNomeLocal: centroObj ? centroObj.nome : null,
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const items: GempPreviewItem[] = [];
  const errors: { empresa: string; tipo: string; message: string }[] = [];

  for (const empKey of empresasToQuery) {
    const cfg = configs[empKey];
    if (!cfg) continue;
    const prefixEmp = empKey === "MEXICANO" ? "mex" : "vale";

    // A) CONTAS A RECEBER
    if (tiposToQuery.includes("receita")) {
      let whereClause = "WHERE R.SIT IN ('A', 'Q')";
      const queryParams: any[] = [];

      if (escopo === "apenas_abertos") {
        whereClause = "WHERE R.SIT = 'A'";
      } else if (escopo === "abertos_e_quitados_corte") {
        whereClause = "WHERE (R.SIT = 'A' OR (R.SIT = 'Q' AND (R.DATAEMIS >= ? OR R.DATAVENC >= ? OR R.DTPAG >= ?)))";
        queryParams.push(dataCorte, dataCorte, dataCorte);
      }

      const sqlReceber = `
        SELECT
          R.CODREC AS ID_RECEBER,
          COALESCE(R.DOC, 0) AS DOCUMENTO,
          COALESCE(R.PRC, 1) AS PARCELA,
          R.DATAEMIS AS DATA_EMISSAO,
          R.DATAVENC AS DATA_VENCIMENTO,
          CAST(COALESCE(R.VALOR, 0) AS DOUBLE PRECISION) AS VALOR_ORIGINAL,
          CAST(COALESCE(R.VALORPAG, 0) AS DOUBLE PRECISION) AS VALOR_PAGO,
          R.DTPAG AS DATA_PAGAMENTO,
          TRIM(CASE 
            WHEN R.SIT = 'Q' THEN 'QUITADO'
            WHEN R.SIT = 'A' THEN 'ABERTO'
            ELSE R.SIT
          END) AS SITUACAO,
          COALESCE(C.CODIGO, 0) AS CLIENTE_ID,
          TRIM(COALESCE(C.NOME, '')) AS CLIENTE_NOME,
          TRIM(COALESCE(C.CPFCNPJ, '')) AS CLIENTE_CPF_CNPJ,
          TRIM(COALESCE(C.CELULAR, C.FONE1, '')) AS CLIENTE_TELEFONE,
          TRIM(COALESCE(R.DESCRICAO, '')) AS DESCRICAO_COBRANCA,
          TRIM(COALESCE(R.BL_OBS, '')) AS REFERENCIA_PARCELA,
          COALESCE(R.CODPLANO, 0) AS COD_PLANO,
          TRIM(COALESCE(R.NOMEBANCO, '')) AS NOME_BANCO,
          TRIM(COALESCE(R.OPERADOR, '')) AS OPERADOR_GEMP,
          TRIM(COALESCE(R.TIPOPAG, '')) AS TIPO_PAG,
          CAST(LEFT(COALESCE((
            SELECT FIRST 1 LIST(TRIM(S.DESCRICAO), ' + ')
            FROM MOVVENDA V
            JOIN MOVSAIDA S ON S.CODPED = V.COD_PEDIDO
            WHERE (V.NDOC = R.DOC OR V.COD_PEDIDO = R.DOC) AND V.CODCLI = R.CODCLIENTE
          ), ''), 1000) AS VARCHAR(1000)) AS SERVICOS_ITENS,
          CAST(LEFT(COALESCE((
            SELECT FIRST 1 LIST(TRIM(E.NOME_EMBARCACAO) || CASE WHEN E.MODELO_EMBARCACAO IS NOT NULL THEN ' (' || TRIM(E.MODELO_EMBARCACAO) || ')' ELSE '' END, ', ')
            FROM EMBARCACAO E
            WHERE E.CODCLIENTE_EMBARCACAO = R.CODCLIENTE
          ), ''), 500) AS VARCHAR(500)) AS EMBARCACAO_VAGA
        FROM RECEBER R
        LEFT JOIN CLIENTE C ON C.CODIGO = R.CODCLIENTE
        ${whereClause}
        ORDER BY R.CODREC DESC
      `;

      try {
        const rows = await queryFirebirdReadOnly(cfg, sqlReceber, queryParams);
        for (const r of rows) {
          const idReceber = Number(r.ID_RECEBER);
          const txId = `gemp_rec_${prefixEmp}_${idReceber}`;
          const dataEmissao = formatDateISO(r.DATA_EMISSAO);
          const dataVencimento = formatDateISO(r.DATA_VENCIMENTO) || dataEmissao || todayStr;
          const dataPagamento = formatDateISO(r.DATA_PAGAMENTO);
          const situacao = String(r.SITUACAO || "").trim().toUpperCase();

          let status: "lancado" | "vencido" | "pago" | "cancelado" = "lancado";
          if (situacao === "QUITADO" || situacao === "Q") {
            status = "pago";
          } else if (situacao === "ABERTO" || situacao === "A") {
            status = dataVencimento < todayStr ? "vencido" : "lancado";
          } else {
            status = "cancelado";
          }

          const valorOriginal = Number(r.VALOR_ORIGINAL || 0);
          const valorPago = Number(r.VALOR_PAGO || 0);
          const valorFinal = status === "pago" && valorPago > 0 ? valorPago : valorOriginal;

          // Match cliente existente (por CPF/CNPJ ou Nome exato)
          const cleanCpfCnpj = onlyDigits(r.CLIENTE_CPF_CNPJ);
          const normCliName = normalizeName(r.CLIENTE_NOME);
          const matchedClient =
            (cleanCpfCnpj.length >= 11 ? clientByCpf.get(cleanCpfCnpj) : null) ||
            (normCliName ? clientByName.get(normCliName) : null) ||
            null;

          // REGRA DE EXCEÇÃO / ACORDO INTERNO:
          // Cliente Aurélio possui acordo interno e não deve receber cobranças nem ser importado do GEMP
          const isAurelioReceber =
            cleanCpfCnpj === "06530608400" ||
            normCliName === "AURELIO" ||
            normCliName === "AURELIO ASSIS SILVA" ||
            normCliName.includes("AURELIO") ||
            matchedClient?.id === "cli_1784736364967";

          if (isAurelioReceber) {
            continue;
          }

          // Match embarcação existente (pelo texto EMBARCACAO_VAGA / SERVICOS_ITENS / DESCRICAO ou pelo cliente vinculado)
          const embVagaStr = String(r.EMBARCACAO_VAGA || "").trim();
          const servicosStr = String(r.SERVICOS_ITENS || "").trim();
          const descCobStr = String(r.DESCRICAO_COBRANCA || "").trim();
          const refParcStr = String(r.REFERENCIA_PARCELA || "").trim();

          let matchedBoat: any = null;
          const searchBoatText = `${embVagaStr} ${servicosStr} ${descCobStr}`.toUpperCase();
          const codeMatch = searchBoatText.match(/\b(M\d{1,3})\b/);
          if (codeMatch) {
            const rawCode = codeMatch[1];
            const numPart = rawCode.slice(1);
            matchedBoat =
              boatByCode.get(rawCode) ||
              boatByCode.get(`M${numPart.padStart(2, "0")}`) ||
              null;
          }
          if (!matchedBoat && matchedClient?.embarcacaoId) {
            matchedBoat = boatById.get(matchedClient.embarcacaoId) || null;
          }

          const { numeroParcela, totalParcelas } = parseParcelaInfo(refParcStr, descCobStr, r.PARCELA);
          const docNum = Number(r.DOCUMENTO || 0);
          const cliGempId = Number(r.CLIENTE_ID || 0);
          const grupoParcelamentoId =
            totalParcelas > 1
              ? docNum > 0
                ? `gemp_doc_${prefixEmp}_${cliGempId}_${docNum}`
                : `gemp_parc_${prefixEmp}_${cliGempId}_${normalizeName(descCobStr).replace(/\s*\d+\/\d+.*$/, "").slice(0, 20)}`
              : null;

          // Montar descrição enriquecida mantendo dados do GEMP caso cliente não esteja cadastrado
          const descParts: string[] = [];
          if (descCobStr) descParts.push(descCobStr);
          if (servicosStr && !descCobStr.toUpperCase().includes(servicosStr.toUpperCase())) {
            descParts.push(`Itens: ${servicosStr}`);
          }
          if (refParcStr && !descCobStr.includes(refParcStr)) descParts.push(`(${refParcStr})`);
          if (docNum > 0) descParts.push(`[Doc #${docNum}]`);
          if (!matchedClient && r.CLIENTE_NOME) {
            descParts.push(`• Cliente GEMP: ${r.CLIENTE_NOME}${r.CLIENTE_CPF_CNPJ ? ` (${r.CLIENTE_CPF_CNPJ})` : ""}`);
          }
          if (!matchedBoat && embVagaStr) {
            descParts.push(`• Vaga/Emb: ${embVagaStr}`);
          }

          const descricaoFinal = descParts.join(" ") || `Título a Receber GEMP #${idReceber}`;
          const categoria = inferCategoriaReceita(descCobStr, servicosStr, empKey);
          const codPlano = Number(r.COD_PLANO || 0) || null;
          const nomeBanco = String(r.NOME_BANCO || "").trim();
          const operadorClean = cleanGempOperador(r.OPERADOR_GEMP);
          const metodoPagamento = String(r.TIPO_PAG || nomeBanco || "").trim() || null;

          const existing = existingTxMap.get(txId);
          const accLinks = resolveAccountingLinks(
            "receita",
            categoria,
            cfg.empresaSistema,
            empKey,
            codPlano,
            nomeBanco,
            existing
          );

          const metadata = {
            origemSistema: "GEMP_FIREBIRD",
            origem_empresa: empKey,
            gempTipo: "RECEBER",
            gempId: idReceber,
            gempDocumento: docNum,
            gempParcela: Number(r.PARCELA ?? 1),
            gempReferenciaParcela: refParcStr,
            gempSituacao: situacao,
            gempValorOriginal: valorOriginal,
            gempValorPago: valorPago,
            gempDataEmissao: dataEmissao,
            gempClienteId: cliGempId,
            gempClienteNome: r.CLIENTE_NOME || "",
            gempClienteCpfCnpj: r.CLIENTE_CPF_CNPJ || "",
            gempClienteTelefone: r.CLIENTE_TELEFONE || "",
            gempServicosItens: servicosStr,
            gempEmbarcacaoVaga: embVagaStr,
            gempDescricaoOriginal: descCobStr,
            gempCodPlano: codPlano,
            gempNomeBanco: nomeBanco,
            gempOperadorOriginal: r.OPERADOR_GEMP || "",
          };

          let acaoSincronizacao: "novo" | "atualizar" | "inalterado" = "novo";
          if (existing) {
            const sameStatus = existing.status === status;
            const sameVal = Math.abs(Number(existing.valor || 0) - valorFinal) < 0.01;
            const sameVenc = existing.dataVencimento === dataVencimento;
            const samePagto = (existing.dataPagamento || null) === (status === "pago" ? (dataPagamento || dataVencimento) : null);
            const isManualOverride = existing.manualOverride === true || existing.manualOverride === 'true' || existing.manualOverride === 1 || existing.manualOverride === '1';
            acaoSincronizacao = isManualOverride ? "inalterado" : (sameStatus && sameVal && sameVenc && samePagto ? "inalterado" : "atualizar");
          }

          items.push({
            id: txId,
            gempId: idReceber,
            origemEmpresa: empKey,
            empresa: cfg.empresaSistema,
            tipo: "receita",
            categoria: accLinks.planoContasNomeLocal || categoria,
            valor: Number(valorFinal.toFixed(2)),
            valorOriginal: Number(valorOriginal.toFixed(2)),
            valorPago: Number(valorPago.toFixed(2)),
            dataEmissao,
            dataVencimento,
            dataPagamento: status === "pago" ? (dataPagamento || dataVencimento) : null,
            status,
            situacaoGemp: situacao,
            descricao: descricaoFinal,
            documento: docNum,
            numeroParcela,
            totalParcelas,
            grupoParcelamentoId: grupoParcelamentoId ? grupoParcelamentoId.slice(0, 50) : null,
            operador: operadorClean,
            metodoPagamento: metodoPagamento ? metodoPagamento.slice(0, 50) : null,
            ...accLinks,
            clienteId: matchedClient ? matchedClient.id : null,
            clienteNomeLocal: matchedClient ? matchedClient.nome : null,
            embarcacaoId: matchedBoat ? matchedBoat.id : null,
            embarcacaoNomeLocal: matchedBoat ? matchedBoat.nome : null,
            fornecedorId: null,
            fornecedorNomeLocal: null,
            gempFavorecidoId: cliGempId,
            gempFavorecidoNome: r.CLIENTE_NOME || "Cliente Não Informado",
            gempFavorecidoDoc: r.CLIENTE_CPF_CNPJ || "",
            gempFavorecidoTelefone: r.CLIENTE_TELEFONE || "",
            gempServicosItens: servicosStr,
            gempEmbarcacaoVaga: embVagaStr,
            gempReferenciaParcela: refParcStr,
            gempDescricaoOriginal: descCobStr,
            gempCodPlano: codPlano,
            gempNomeBanco: nomeBanco,
            acaoSincronizacao,
            statusAnteriorLocal: existing ? existing.status : null,
            metadata,
          });
        }
      } catch (err: any) {
        errors.push({ empresa: cfg.label, tipo: "RECEBER", message: err.message || String(err) });
      }
    }

    // B) CONTAS A PAGAR
    if (tiposToQuery.includes("despesa")) {
      let whereClause = "WHERE P.SIT IN ('A', 'Q')";
      const queryParams: any[] = [];

      if (escopo === "apenas_abertos") {
        whereClause = "WHERE P.SIT = 'A'";
      } else if (escopo === "abertos_e_quitados_corte") {
        whereClause = "WHERE (P.SIT = 'A' OR (P.SIT = 'Q' AND (P.DATAEMIS >= ? OR P.DATAVENC >= ? OR P.DTPAG >= ?)))";
        queryParams.push(dataCorte, dataCorte, dataCorte);
      }

      const sqlPagar = `
        SELECT
          P.CODPAG AS ID_PAGAR,
          COALESCE(P.DOC, 0) AS DOCUMENTO,
          COALESCE(P.PRC, 1) AS PARCELA,
          P.DATAEMIS AS DATA_EMISSAO,
          P.DATAVENC AS DATA_VENCIMENTO,
          CAST(COALESCE(P.VALOR, 0) AS DOUBLE PRECISION) AS VALOR_ORIGINAL,
          CAST(COALESCE(P.VALORPAG, 0) AS DOUBLE PRECISION) AS VALOR_PAGO,
          P.DTPAG AS DATA_PAGAMENTO,
          TRIM(CASE 
            WHEN P.SIT = 'Q' THEN 'QUITADO'
            WHEN P.SIT = 'A' THEN 'ABERTO'
            ELSE P.SIT
          END) AS SITUACAO,
          COALESCE(F.CODIGO, 0) AS FORNECEDOR_ID,
          TRIM(COALESCE(F.NOME, '')) AS FORNECEDOR_NOME,
          TRIM(COALESCE(F.CNPJ, '')) AS FORNECEDOR_CNPJ,
          TRIM(COALESCE(P.DESCRICAO, '')) AS DESCRICAO_DESPESA,
          COALESCE(P.CODPLANO, 0) AS COD_PLANO,
          TRIM(COALESCE(P.NOMEBANCO, '')) AS NOME_BANCO,
          TRIM(COALESCE(P.OPERADOR, '')) AS OPERADOR_GEMP,
          TRIM(COALESCE(P.TIPOPAG, '')) AS TIPO_PAG
        FROM PAGAR P
        LEFT JOIN FORNECEDOR F ON F.CODIGO = P.CODFORN
        ${whereClause}
        ORDER BY P.CODPAG DESC
      `;

      try {
        const rows = await queryFirebirdReadOnly(cfg, sqlPagar, queryParams);

        // Descobrir total de parcelas por (FORNECEDOR_ID, DOCUMENTO) quando DOC > 0
        const maxParcelaByFornDoc = new Map<string, number>();
        for (const p of rows) {
          const dNum = Number(p.DOCUMENTO || 0);
          const fId = Number(p.FORNECEDOR_ID || 0);
          const prc = Number(p.PARCELA || 1);
          if (dNum > 0) {
            const key = `${fId}_${dNum}`;
            const cur = maxParcelaByFornDoc.get(key) || 1;
            if (prc > cur) maxParcelaByFornDoc.set(key, prc);
          }
        }

        for (const p of rows) {
          const idPagar = Number(p.ID_PAGAR);
          const txId = `gemp_pag_${prefixEmp}_${idPagar}`;
          const dataEmissao = formatDateISO(p.DATA_EMISSAO);
          const dataVencimento = formatDateISO(p.DATA_VENCIMENTO) || dataEmissao || todayStr;
          const dataPagamento = formatDateISO(p.DATA_PAGAMENTO);
          const situacao = String(p.SITUACAO || "").trim().toUpperCase();

          let status: "lancado" | "vencido" | "pago" | "cancelado" = "lancado";
          if (situacao === "QUITADO" || situacao === "Q") {
            status = "pago";
          } else if (situacao === "ABERTO" || situacao === "A") {
            status = dataVencimento < todayStr ? "vencido" : "lancado";
          } else {
            status = "cancelado";
          }

          const valorOriginal = Number(p.VALOR_ORIGINAL || 0);
          const valorPago = Number(p.VALOR_PAGO || 0);
          const valorFinal = status === "pago" && valorPago > 0 ? valorPago : valorOriginal;

          const cleanFornDoc = onlyDigits(p.FORNECEDOR_CNPJ);
          const normFornName = normalizeName(p.FORNECEDOR_NOME);
          const matchedForn =
            (cleanFornDoc.length >= 11 ? fornByDoc.get(cleanFornDoc) : null) ||
            (normFornName ? fornByName.get(normFornName) : null) ||
            null;

          const descDespStr = String(p.DESCRICAO_DESPESA || "").trim();

          // REGRA DE EXCEÇÃO / ACORDO INTERNO:
          // Aurélio possui acordo interno, não importar despesas/fornecedor vinculado
          const isAurelioPagar =
            cleanFornDoc === "06530608400" ||
            normFornName.includes("AURELIO") ||
            descDespStr.toUpperCase().includes("AURELIO");

          if (isAurelioPagar) {
            continue;
          }
          const docNum = Number(p.DOCUMENTO || 0);
          const fornGempId = Number(p.FORNECEDOR_ID || 0);
          const prcNum = Number(p.PARCELA || 1);
          const totParc = docNum > 0 ? Math.max(prcNum, maxParcelaByFornDoc.get(`${fornGempId}_${docNum}`) || 1) : prcNum;
          const grupoParcelamentoId =
            docNum > 0 && totParc > 1 ? `gemp_pagdoc_${prefixEmp}_${fornGempId}_${docNum}` : null;

          const descParts: string[] = [];
          if (descDespStr) {
            descParts.push(descDespStr);
          } else if (p.FORNECEDOR_NOME) {
            descParts.push(`Despesa / Compra — ${p.FORNECEDOR_NOME}`);
          }
          if (totParc > 1) descParts.push(`(Parcela ${prcNum}/${totParc})`);
          if (docNum > 0) descParts.push(`[Doc #${docNum}]`);
          if (!matchedForn && p.FORNECEDOR_NOME) {
            descParts.push(`• Fornecedor GEMP: ${p.FORNECEDOR_NOME}${p.FORNECEDOR_CNPJ ? ` (${p.FORNECEDOR_CNPJ})` : ""}`);
          }

          const descricaoFinal = descParts.join(" ") || `Despesa GEMP #${idPagar}`;
          const categoria = inferCategoriaDespesa(descDespStr, p.FORNECEDOR_NOME || "");
          const codPlano = Number(p.COD_PLANO || 0) || null;
          const nomeBanco = String(p.NOME_BANCO || "").trim();
          const operadorClean = cleanGempOperador(p.OPERADOR_GEMP);
          const metodoPagamento = String(p.TIPO_PAG || nomeBanco || "").trim() || null;

          const existing = existingTxMap.get(txId);
          const accLinks = resolveAccountingLinks(
            "despesa",
            categoria,
            cfg.empresaSistema,
            empKey,
            codPlano,
            nomeBanco,
            existing
          );

          const metadata = {
            origemSistema: "GEMP_FIREBIRD",
            origem_empresa: empKey,
            gempTipo: "PAGAR",
            gempId: idPagar,
            gempDocumento: docNum,
            gempParcela: prcNum,
            gempTotalParcelas: totParc,
            gempSituacao: situacao,
            gempValorOriginal: valorOriginal,
            gempValorPago: valorPago,
            gempDataEmissao: dataEmissao,
            gempFornecedorId: fornGempId,
            gempFornecedorNome: p.FORNECEDOR_NOME || "",
            gempFornecedorCnpj: p.FORNECEDOR_CNPJ || "",
            gempDescricaoOriginal: descDespStr,
            gempCodPlano: codPlano,
            gempNomeBanco: nomeBanco,
            gempOperadorOriginal: p.OPERADOR_GEMP || "",
          };

          let acaoSincronizacao: "novo" | "atualizar" | "inalterado" = "novo";
          if (existing) {
            const sameStatus = existing.status === status;
            const sameVal = Math.abs(Number(existing.valor || 0) - valorFinal) < 0.01;
            const sameVenc = existing.dataVencimento === dataVencimento;
            const samePagto = (existing.dataPagamento || null) === (status === "pago" ? (dataPagamento || dataVencimento) : null);
            const isManualOverride = existing.manualOverride === true || existing.manualOverride === 'true' || existing.manualOverride === 1 || existing.manualOverride === '1';
            acaoSincronizacao = isManualOverride ? "inalterado" : (sameStatus && sameVal && sameVenc && samePagto ? "inalterado" : "atualizar");
          }

          items.push({
            id: txId,
            gempId: idPagar,
            origemEmpresa: empKey,
            empresa: cfg.empresaSistema,
            tipo: "despesa",
            categoria: accLinks.planoContasNomeLocal || categoria,
            valor: Number(valorFinal.toFixed(2)),
            valorOriginal: Number(valorOriginal.toFixed(2)),
            valorPago: Number(valorPago.toFixed(2)),
            dataEmissao,
            dataVencimento,
            dataPagamento: status === "pago" ? (dataPagamento || dataVencimento) : null,
            status,
            situacaoGemp: situacao,
            descricao: descricaoFinal,
            documento: docNum,
            numeroParcela: prcNum,
            totalParcelas: totParc,
            grupoParcelamentoId: grupoParcelamentoId ? grupoParcelamentoId.slice(0, 50) : null,
            operador: operadorClean,
            metodoPagamento: metodoPagamento ? metodoPagamento.slice(0, 50) : null,
            ...accLinks,
            clienteId: null,
            clienteNomeLocal: null,
            embarcacaoId: null,
            embarcacaoNomeLocal: null,
            fornecedorId: matchedForn ? matchedForn.id : null,
            fornecedorNomeLocal: matchedForn ? (matchedForn.nomeFantasia || matchedForn.razaoSocial) : null,
            gempFavorecidoId: fornGempId,
            gempFavorecidoNome: p.FORNECEDOR_NOME || "Fornecedor Não Informado",
            gempFavorecidoDoc: p.FORNECEDOR_CNPJ || "",
            gempFavorecidoTelefone: "",
            gempServicosItens: "",
            gempEmbarcacaoVaga: "",
            gempReferenciaParcela: totParc > 1 ? `Parcela ${prcNum}/${totParc}` : prcNum > 1 ? `Parcela ${prcNum}` : "",
            gempDescricaoOriginal: descDespStr,
            gempCodPlano: codPlano,
            gempNomeBanco: nomeBanco,
            acaoSincronizacao,
            statusAnteriorLocal: existing ? existing.status : null,
            metadata,
          });
        }
      } catch (err: any) {
        errors.push({ empresa: cfg.label, tipo: "PAGAR", message: err.message || String(err) });
      }
    }
  }

  const summary = {
    total: items.length,
    novos: items.filter((i) => i.acaoSincronizacao === "novo").length,
    atualizacoes: items.filter((i) => i.acaoSincronizacao === "atualizar").length,
    inalterados: items.filter((i) => i.acaoSincronizacao === "inalterado").length,
    receitasCount: items.filter((i) => i.tipo === "receita").length,
    despesasCount: items.filter((i) => i.tipo === "despesa").length,
    valorTotalReceitas: Number(
      items
        .filter((i) => i.tipo === "receita")
        .reduce((acc, i) => acc + i.valor, 0)
        .toFixed(2)
    ),
    valorTotalDespesas: Number(
      items
        .filter((i) => i.tipo === "despesa")
        .reduce((acc, i) => acc + i.valor, 0)
        .toFixed(2)
    ),
    clientesVinculados: items.filter((i) => i.tipo === "receita" && !!i.clienteId).length,
    fornecedoresVinculados: items.filter((i) => i.tipo === "despesa" && !!i.fornecedorId).length,
    embarcacoesVinculadas: items.filter((i) => !!i.embarcacaoId).length,
    planosVinculados: items.filter((i) => !!i.planoContasId).length,
    contasVinculadas: items.filter((i) => !!i.contaBancariaId).length,
    centrosVinculados: items.filter((i) => !!i.centroCustoId).length,
    alreadyImportedStats,
  };

  return {
    success: errors.length === 0 || items.length > 0,
    dataCorteAplicada: dataCorte,
    escopoAplicado: escopo,
    summary,
    errors,
    items,
  };
}

export interface GempImportCommitPayload {
  items: GempPreviewItem[];
  contaBancariaIdPadrao?: string | null;
  planoContasReceitaIdPadrao?: string | null;
  planoContasDespesaIdPadrao?: string | null;
  centroCustoIdPadrao?: string | null;
}

/**
 * Grava em lote (batch upsert) os lançamentos selecionados na pré-visualização,
 * preenchendo rigorosamente todos os campos de TransacoesFinanceiras e preservando
 * vínculos locais (Asaas, comprovantes, classificações manuais já existentes).
 */
export async function importGempItemsToDb(payload: GempImportCommitPayload) {
  const pool = getDbPool();
  if (!pool) throw new Error("Banco de dados MySQL está offline.");

  const items = payload.items || [];
  if (items.length === 0) {
    return { insertedOrUpdated: 0, affectedClients: 0 };
  }

  // Garantir coluna origem_empresa na tabela TransacoesFinanceiras conforme recomendação do Briefing
  try {
    await pool.query("ALTER TABLE TransacoesFinanceiras ADD COLUMN origem_empresa VARCHAR(50) NULL;");
  } catch {}

  const connection = await pool.getConnection();
  const affectedClientIds = new Set<string>();
  let processed = 0;

  try {
    await connection.beginTransaction();

    const nowIso = new Date().toISOString();
    const BATCH_SIZE = 200;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const slice = items.slice(i, i + BATCH_SIZE);
      const values: any[] = [];

      for (const item of slice) {
        // Regra de segurança: ignora qualquer lançamento referente ao Aurélio (acordo interno)
        const descUpper = String(item.descricao || "").toUpperCase();
        if (
          item.clienteId === "cli_1784736364967" ||
          descUpper.includes("AURELIO") ||
          descUpper.includes("AURÉLIO") ||
          descUpper.includes("065.306.084-00")
        ) {
          continue;
        }

        if (item.clienteId) affectedClientIds.add(item.clienteId);

        const resolvedPlanoId =
          item.planoContasId ||
          (item.tipo === "receita"
            ? payload.planoContasReceitaIdPadrao || null
            : payload.planoContasDespesaIdPadrao || null);

        const resolvedContaId = item.contaBancariaId || payload.contaBancariaIdPadrao || null;
        const resolvedCentroId = item.centroCustoId || payload.centroCustoIdPadrao || null;

        // Data de emissão original do GEMP preservada em createdAt quando disponível
        const createdAtToUse = item.dataEmissao ? `${item.dataEmissao}T12:00:00.000Z` : nowIso;
        const enrichedMeta = {
          ...(item.metadata || {}),
          importedAt: nowIso,
        };

        values.push(
          String(item.id).slice(0, 50),
          item.tipo === "despesa" ? "despesa" : "receita",
          String(item.categoria || "Geral").slice(0, 100),
          Number(item.valor || 0),
          String(item.dataVencimento).slice(0, 20),
          item.dataPagamento ? String(item.dataPagamento).slice(0, 20) : null,
          String(item.status || "lancado").slice(0, 20),
          String(item.descricao || ""),
          item.clienteId ? String(item.clienteId).slice(0, 50) : null,
          item.embarcacaoId ? String(item.embarcacaoId).slice(0, 50) : null,
          createdAtToUse,
          item.metodoPagamento ? String(item.metodoPagamento).slice(0, 50) : null,
          String(item.operador || "GEMP ERP").slice(0, 100),
          JSON.stringify(enrichedMeta),
          String(item.empresa || "Mexicano").slice(0, 50),
          String(item.origemEmpresa || "MEXICANO").slice(0, 50),
          resolvedContaId ? String(resolvedContaId).slice(0, 50) : null,
          resolvedPlanoId ? String(resolvedPlanoId).slice(0, 50) : null,
          resolvedCentroId ? String(resolvedCentroId).slice(0, 50) : null,
          item.fornecedorId ? String(item.fornecedorId).slice(0, 50) : null,
          item.grupoParcelamentoId ? String(item.grupoParcelamentoId).slice(0, 50) : null,
          Number(item.numeroParcela ?? 1),
          Number(item.totalParcelas ?? 1)
        );
      }

      if (values.length === 0) continue;
      const rowCount = values.length / 23;
      const rowPlaceholders = Array(rowCount)
        .fill("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");

      await connection.query(
        `INSERT INTO TransacoesFinanceiras (
          id, tipo, categoria, valor, dataVencimento, dataPagamento, status, descricao,
          clienteId, embarcacaoId, createdAt, metodoPagamento, operador, metadata,
          empresa, origem_empresa, contaBancariaId, planoContasId, centroCustoId, fornecedorId,
          grupoParcelamentoId, numeroParcela, totalParcelas
        ) VALUES ${rowPlaceholders}
        ON DUPLICATE KEY UPDATE
          tipo = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.tipo, VALUES(tipo)),
          categoria = COALESCE(NULLIF(TransacoesFinanceiras.categoria, ''), VALUES(categoria)),
          valor = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.valor, VALUES(valor)),
          dataVencimento = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.dataVencimento, VALUES(dataVencimento)),
          dataPagamento = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.dataPagamento, VALUES(dataPagamento)),
          status = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.status, VALUES(status)),
          descricao = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.descricao, VALUES(descricao)),
          metodoPagamento = COALESCE(VALUES(metodoPagamento), TransacoesFinanceiras.metodoPagamento),
          operador = COALESCE(VALUES(operador), TransacoesFinanceiras.operador),
          clienteId = COALESCE(VALUES(clienteId), TransacoesFinanceiras.clienteId),
          embarcacaoId = COALESCE(VALUES(embarcacaoId), TransacoesFinanceiras.embarcacaoId),
          fornecedorId = COALESCE(VALUES(fornecedorId), TransacoesFinanceiras.fornecedorId),
          contaBancariaId = COALESCE(VALUES(contaBancariaId), TransacoesFinanceiras.contaBancariaId),
          planoContasId = COALESCE(VALUES(planoContasId), TransacoesFinanceiras.planoContasId),
          centroCustoId = COALESCE(VALUES(centroCustoId), TransacoesFinanceiras.centroCustoId),
          metadata = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.metadata, VALUES(metadata)),
          empresa = IF(JSON_EXTRACT(TransacoesFinanceiras.metadata, '$.manualOverride') = true, TransacoesFinanceiras.empresa, VALUES(empresa)),
          origem_empresa = VALUES(origem_empresa),
          grupoParcelamentoId = COALESCE(VALUES(grupoParcelamentoId), TransacoesFinanceiras.grupoParcelamentoId),
          numeroParcela = VALUES(numeroParcela),
          totalParcelas = VALUES(totalParcelas)`,
        values
      );

      processed += slice.length;
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  if (affectedClientIds.size > 0) {
    await syncMultipleClientsFinancialStatus(Array.from(affectedClientIds));
  }
  invalidateDbCache();

  return {
    insertedOrUpdated: processed,
    affectedClients: affectedClientIds.size,
  };
}

/**
 * Permite ao Administrador remover os lançamentos migrados do GEMP (por empresa ou todos)
 * caso deseje refazer a migração do zero.
 */
export async function clearGempImportedItems(origemEmpresa?: GempEmpresaKey | "TODOS") {
  const pool = getDbPool();
  if (!pool) throw new Error("Banco de dados MySQL está offline.");

  let whereSql = "WHERE id LIKE 'gemp_%'";
  const params: any[] = [];
  if (origemEmpresa === "MEXICANO") {
    whereSql = "WHERE (id LIKE 'gemp_rec_mex_%' OR id LIKE 'gemp_pag_mex_%' OR origem_empresa = 'MEXICANO')";
  } else if (origemEmpresa === "VALE_ADMINISTRADORA") {
    whereSql = "WHERE (id LIKE 'gemp_rec_vale_%' OR id LIKE 'gemp_pag_vale_%' OR origem_empresa = 'VALE_ADMINISTRADORA')";
  }

  const [clientRows] = await pool.query(
    `SELECT DISTINCT clienteId FROM TransacoesFinanceiras ${whereSql} AND clienteId IS NOT NULL`,
    params
  );
  const clientIds = (clientRows as any[]).map((r) => r.clienteId).filter(Boolean);

  const [delRes]: any = await pool.query(`DELETE FROM TransacoesFinanceiras ${whereSql}`, params);

  if (clientIds.length > 0) {
    await syncMultipleClientsFinancialStatus(clientIds);
  }
  invalidateDbCache();

  return {
    deletedCount: delRes?.affectedRows || 0,
    affectedClients: clientIds.length,
  };
}

/**
 * Executa uma rodada completa de sincronização automática diária/periódica:
 * 1. Consulta títulos em aberto + quitados nos últimos 90 dias no Firebird.
 * 2. Compara com os registros locais no MySQL.
 * 3. Se houver novidades ou alterações (baixa de título, alteração de valor, prorrogação de vencimento),
 *    atualiza TransacoesFinanceiras e recalcula o status financeiro de todos os clientes impactados.
 */
export async function syncGempDailyIncremental(): Promise<{
  executed: boolean;
  insertedOrUpdated: number;
  novos: number;
  atualizados: number;
  affectedClients: number;
  errors: any[];
}> {
  try {
    const d = new Date();
    d.setDate(d.getDate() - 90); // 90 dias de corte para títulos quitados ou baixados recentemente
    const dataCorte = d.toISOString().split("T")[0];

    const preview = await fetchGempPreview({
      empresas: ["MEXICANO", "VALE_ADMINISTRADORA"],
      tipos: ["receita", "despesa"],
      escopo: "abertos_e_quitados_corte",
      dataCorteQuitados: dataCorte,
    });

    const itemsToUpsert = (preview.items || []).filter(
      (item) => item.acaoSincronizacao === "novo" || item.acaoSincronizacao === "atualizar"
    );

    if (itemsToUpsert.length === 0) {
      return {
        executed: true,
        insertedOrUpdated: 0,
        novos: 0,
        atualizados: 0,
        affectedClients: 0,
        errors: preview.errors || [],
      };
    }

    const novos = itemsToUpsert.filter((i) => i.acaoSincronizacao === "novo").length;
    const atualizados = itemsToUpsert.filter((i) => i.acaoSincronizacao === "atualizar").length;

    const result = await importGempItemsToDb({ items: itemsToUpsert });
    const nowIso = new Date().toISOString();
    await setConfigValue("gemp_last_sync_at", nowIso);

    return {
      executed: true,
      insertedOrUpdated: result.insertedOrUpdated,
      novos,
      atualizados,
      affectedClients: result.affectedClients,
      errors: preview.errors || [],
    };
  } catch (err: any) {
    console.error("[GEMP Incremental Sync Error]", err);
    return {
      executed: false,
      insertedOrUpdated: 0,
      novos: 0,
      atualizados: 0,
      affectedClients: 0,
      errors: [err.message || String(err)],
    };
  }
}

