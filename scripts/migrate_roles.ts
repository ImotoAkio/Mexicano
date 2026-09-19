// @ts-nocheck
import { getDbPool } from "../server-db";

const pool = getDbPool();

async function migrateRoles() {
    console.log("Iniciando migração de roles (Tipo de Usuário)...");
    
    // Wait for DB pool to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!pool) {
         console.error("Database pool not available.");
         process.exit(1);
    }

    const [usersRows] = await pool.query('SELECT id, username, role FROM AdminUsers');
    const users = Array.isArray(usersRows) ? usersRows : [usersRows];
    
    let updatedCount = 0;

    for (const user of users) {
        if (!user.role) continue;
        
        let newRole = user.role.toLowerCase().trim();
        const oldRole = newRole;

        // Regras de mapeamento
        if (['marina', 'gerente'].includes(oldRole)) {
            newRole = 'marina_gerente';
        } else if (['marinheiro', 'marinheiros', 'marinheiro_operador', 'operador', 'operador_marina', 'operador_pier', 'pier', 'funcionario', 'colaborador', 'user', 'staff'].includes(oldRole)) {
            newRole = 'marina_operador';
        } else if (oldRole.includes('financ')) {
            newRole = 'financeiro';
        } else if (oldRole.includes('pecas') || oldRole.includes('servico')) {
            newRole = 'pecas_servicos';
        } else if (oldRole.includes('comerc')) {
            newRole = 'comercial';
        }

        if (newRole !== user.role) {
            console.log(`Atualizando usuário '${user.username}': '${user.role}' -> '${newRole}'`);
            await pool.query('UPDATE AdminUsers SET role = ? WHERE id = ?', [newRole, user.id]);
            updatedCount++;
        }
    }

    console.log(`Migração concluída! ${updatedCount} usuários atualizados.`);
    process.exit(0);
}

migrateRoles().catch(err => {
    console.error("Erro na migração:", err);
    process.exit(1);
});
