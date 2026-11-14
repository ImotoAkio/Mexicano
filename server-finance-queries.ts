import { getDbPool } from "./server-db";

export interface TransacoesPaginatedParams {
  empresa?: string;
  tipo?: string;
  status?: string;
  clienteId?: string;
  fornecedorId?: string;
  categoria?: string;
  origemEmpresa?: string;
  month?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

const LITE_TF_SELECT = `
  tf.id, tf.tipo, tf.categoria, tf.valor, tf.dataVencimento, tf.dataPagamento,
  tf.status, tf.descricao, tf.clienteId, tf.embarcacaoId, tf.comprovante,
  tf.createdAt, tf.asaasPaymentId, tf.asaasPaymentUrl, tf.asaasBatchId,
  tf.reservaId, tf.metodoPagamento, tf.operador, tf.empresa,
  tf.contaBancariaId, tf.planoContasId, tf.centroCustoId, tf.fornecedorId,
  tf.grupoParcelamentoId, tf.numeroParcela, tf.totalParcelas,
  tf.notificacaoEnviada, tf.origem_empresa,
  JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempClienteNome')) AS gempClienteNome,
  JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempFornecedorNome')) AS gempFornecedorNome,
  JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.origemSistema')) AS origemSistema,
  JSON_EXTRACT(tf.metadata, '$.manualOverride') AS manualOverride
`;

function mapLiteRow(r: any) {
  const manualOverride =
    r.manualOverride === true ||
    r.manualOverride === "true" ||
    r.manualOverride === 1 ||
    r.manualOverride === "1";

  const hasLiteMeta = r.gempClienteNome || r.gempFornecedorNome || r.origemSistema || manualOverride;
  const metadata = hasLiteMeta
    ? {
        ...(r.gempClienteNome ? { gempClienteNome: r.gempClienteNome } : {}),
        ...(r.gempFornecedorNome ? { gempFornecedorNome: r.gempFornecedorNome } : {}),
        ...(r.origemSistema ? { origemSistema: r.origemSistema } : {}),
        ...(manualOverride ? { manualOverride: true } : {}),
      }
    : null;

  return {
    ...r,
    metadata,
  };
}

export async function getTransacoesResumo(empresa?: string) {
  const pool = getDbPool();
  if (!pool) throw new Error("MySQL Connection pool is offline.");

  const todayStr = new Date().toISOString().split("T")[0];
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (empresa && empresa !== "Todos") {
    if (empresa === "Mexicano") {
      whereClauses.push("(empresa = 'Mexicano' OR empresa IS NULL OR empresa = '')");
    } else {
      whereClauses.push("empresa = ?");
      params.push(empresa);
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS totalCount,
       SUM(CASE WHEN tipo = 'receita' AND (status = 'vencido' OR (status = 'lancado' AND dataVencimento < ?)) THEN 1 ELSE 0 END) AS vencidosCount,
       SUM(CASE WHEN tipo = 'receita' AND status NOT IN ('pago', 'cancelado') THEN valor ELSE 0 END) AS aReceber,
       SUM(CASE WHEN tipo = 'despesa' AND status NOT IN ('pago', 'cancelado') THEN valor ELSE 0 END) AS aPagar,
       SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END) AS totalRecebido,
       SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END) AS totalPago
     FROM TransacoesFinanceiras
     ${whereSql}`,
    [todayStr, ...params]
  );

  const row = (rows as any[])[0] || {};
  return {
    totalCount: Number(row.totalCount || 0),
    vencidosCount: Number(row.vencidosCount || 0),
    aReceber: Number(row.aReceber || 0),
    aPagar: Number(row.aPagar || 0),
    totalRecebido: Number(row.totalRecebido || 0),
    totalPago: Number(row.totalPago || 0),
  };
}

export async function getTransacaoById(id: string) {
  const pool = getDbPool();
  if (!pool) throw new Error("MySQL Connection pool is offline.");

  const [rows] = await pool.query("SELECT * FROM TransacoesFinanceiras WHERE id = ? LIMIT 1", [id]);
  const r = (rows as any[])[0];
  if (!r) return null;

  let parsedMeta = r.metadata;
  if (typeof parsedMeta === "string") {
    try {
      parsedMeta = JSON.parse(parsedMeta);
    } catch {
      parsedMeta = null;
    }
  }
  return { ...r, metadata: parsedMeta };
}

export async function getTransacoesPaginated(input: TransacoesPaginatedParams) {
  const pool = getDbPool();
  if (!pool) throw new Error("MySQL Connection pool is offline.");

  const todayStr = new Date().toISOString().split("T")[0];
  const where: string[] = [];
  const params: any[] = [];

  if (input.empresa && input.empresa !== "Todos" && input.empresa !== "all") {
    if (input.empresa === "Mexicano") {
      where.push("(tf.empresa = 'Mexicano' OR tf.empresa IS NULL OR tf.empresa = '')");
    } else {
      where.push("tf.empresa = ?");
      params.push(input.empresa);
    }
  }

  if (input.tipo && input.tipo !== "all") {
    where.push("tf.tipo = ?");
    params.push(input.tipo);
  }

  if (input.clienteId) {
    where.push("tf.clienteId = ?");
    params.push(input.clienteId);
  }

  if (input.fornecedorId) {
    where.push("tf.fornecedorId = ?");
    params.push(input.fornecedorId);
  }

  if (input.categoria) {
    where.push("tf.categoria = ?");
    params.push(input.categoria);
  }

  if (input.origemEmpresa && input.origemEmpresa !== "all") {
    if (input.origemEmpresa === "GEMP") {
      where.push("(tf.id LIKE 'gemp_%' OR tf.origem_empresa IN ('MEXICANO', 'VALE_ADMINISTRADORA'))");
    } else if (input.origemEmpresa === "MANUAL") {
      where.push("(tf.id NOT LIKE 'gemp_%' AND (tf.origem_empresa IS NULL OR tf.origem_empresa NOT IN ('MEXICANO', 'VALE_ADMINISTRADORA')))");
    } else {
      where.push("tf.origem_empresa = ?");
      params.push(input.origemEmpresa);
    }
  }

  if (input.status && input.status !== "all") {
    if (input.status === "em_atraso" || input.status === "vencido") {
      where.push("(tf.status = 'vencido' OR (tf.status = 'lancado' AND tf.dataVencimento < ?))");
      params.push(todayStr);
    } else if (input.status === "a_vencer") {
      where.push("(tf.status = 'lancado' AND tf.dataVencimento >= ?)");
      params.push(todayStr);
    } else {
      where.push("tf.status = ?");
      params.push(input.status);
    }
  }

  if (input.month) {
    where.push("tf.dataVencimento LIKE ?");
    params.push(`${input.month}%`);
  }

  if (input.dataInicio) {
    where.push("tf.dataVencimento >= ?");
    params.push(input.dataInicio);
  }

  if (input.dataFim) {
    where.push("tf.dataVencimento <= ?");
    params.push(input.dataFim);
  }

  let needsJoin = false;
  if (input.search && input.search.trim()) {
    needsJoin = true;
    const like = `%${input.search.trim()}%`;
    where.push(`(
      tf.descricao LIKE ?
      OR tf.categoria LIKE ?
      OR tf.operador LIKE ?
      OR c.nome LIKE ?
      OR f.nomeFantasia LIKE ?
      OR JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempClienteNome')) LIKE ?
      OR JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempFornecedorNome')) LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like);
  }

  let orderSql = "tf.dataVencimento DESC, tf.createdAt DESC";
  if (input.sortBy === "vencimento_asc") {
    orderSql = "tf.dataVencimento ASC, tf.createdAt ASC";
  } else if (input.sortBy === "valor_desc") {
    orderSql = "tf.valor DESC, tf.dataVencimento DESC";
  } else if (input.sortBy === "valor_asc") {
    orderSql = "tf.valor ASC, tf.dataVencimento DESC";
  } else if (input.sortBy === "cliente_asc") {
    needsJoin = true;
    orderSql = "COALESCE(c.nome, f.nomeFantasia, JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempClienteNome')), tf.descricao, '') ASC";
  } else if (input.sortBy === "cliente_desc") {
    needsJoin = true;
    orderSql = "COALESCE(c.nome, f.nomeFantasia, JSON_UNQUOTE(JSON_EXTRACT(tf.metadata, '$.gempClienteNome')), tf.descricao, '') DESC";
  }

  const joinSql = needsJoin
    ? "LEFT JOIN Clientes c ON tf.clienteId = c.id LEFT JOIN Fornecedores f ON tf.fornecedorId = f.id"
    : "";

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(input.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  const [summaryRows, itemRows] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN tf.tipo = 'receita' AND tf.status = 'pago' THEN tf.valor ELSE 0 END) AS totalRecebido,
         SUM(CASE WHEN tf.tipo = 'receita' AND tf.status NOT IN ('pago', 'cancelado') THEN tf.valor ELSE 0 END) AS aReceber,
         SUM(CASE WHEN tf.tipo = 'despesa' AND tf.status = 'pago' THEN tf.valor ELSE 0 END) AS totalPago,
         SUM(CASE WHEN tf.tipo = 'despesa' AND tf.status NOT IN ('pago', 'cancelado') THEN tf.valor ELSE 0 END) AS aPagar,
         SUM(CASE WHEN tf.tipo = 'receita' AND (tf.status = 'vencido' OR (tf.status = 'lancado' AND tf.dataVencimento < ?)) THEN tf.valor ELSE 0 END) AS totalVencido,
         SUM(CASE WHEN tf.tipo = 'receita' AND (tf.status = 'vencido' OR (tf.status = 'lancado' AND tf.dataVencimento < ?)) THEN 1 ELSE 0 END) AS countVencido,
         SUM(CASE WHEN tf.tipo = 'receita' THEN 1 ELSE 0 END) AS countReceita,
         SUM(CASE WHEN tf.tipo = 'despesa' THEN 1 ELSE 0 END) AS countDespesa
       FROM TransacoesFinanceiras tf
       ${joinSql}
       ${whereSql}`,
      [todayStr, todayStr, ...params]
    ),
    pool.query(
      `SELECT ${LITE_TF_SELECT}
       FROM TransacoesFinanceiras tf
       ${joinSql}
       ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ),
  ]);

  const s = ((summaryRows as any[])[0] || [])[0] || {};
  const items = ((itemRows as any[])[0] || []).map(mapLiteRow);

  const totalRecebido = Number(s.totalRecebido || 0);
  const totalPago = Number(s.totalPago || 0);

  return {
    items,
    total: Number(s.total || 0),
    page,
    pageSize,
    summary: {
      totalRecebido,
      aReceber: Number(s.aReceber || 0),
      totalPago,
      aPagar: Number(s.aPagar || 0),
      totalVencido: Number(s.totalVencido || 0),
      countVencido: Number(s.countVencido || 0),
      countReceita: Number(s.countReceita || 0),
      countDespesa: Number(s.countDespesa || 0),
      saldoRealizado: totalRecebido - totalPago,
    },
  };
}
