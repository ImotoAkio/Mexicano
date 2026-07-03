import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Lock, 
  User, 
  Plus, 
  X, 
  Check, 
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Usuario } from '../types';

export default function UsersPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'marina' | 'financeiro'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  
  // Form Fields
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'marina' | 'financeiro'>('admin');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Não foi possível obter a lista de usuários da VPS.');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão com o servidor.');
      
      // Error handled. No localStorage fallback for admin auth.
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole('admin');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: Usuario) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormUsername(user.username || '');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole((user.role as 'admin' | 'marina' | 'financeiro') || 'admin');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validation
    if (!formUsername.trim()) {
      setFormError('O nome de usuário é obrigatório.');
      return;
    }

    if (modalMode === 'create' && !formPassword) {
      setFormError('A senha é obrigatória para novos usuários.');
      return;
    }

    if (formPassword && formPassword !== formConfirmPassword) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setIsFormSubmitting(true);

    const payload = {
      action: 'upsert',
      data: {
        id: selectedUser?.id || undefined,
        username: formUsername.trim(),
        password: formPassword || undefined,
        role: formRole
      }
    };

    try {
      const res = await fetch('/api/admin/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao salvar o usuário.');
      }

      // Refresh list
      await fetchUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar usuário.');
      
      setIsModalOpen(false);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: Usuario) => {
    if (users.length <= 1) {
      alert('Não é possível remover o único usuário do sistema.');
      return;
    }

    if (!confirm(`Deseja realmente remover o usuário "${user.username}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          data: { id: user.id }
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao deletar usuário.');
      }

      await fetchUsers();
    } catch (err: any) {
      // Do nothing on failure, user already sees console error.
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Usuários Administrativos</h2>
          <p className="text-sm text-slate-500">
            Gerencie os administradores com acesso ao painel de controle do sistema.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs hover:shadow-md cursor-pointer transition-all gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Administrador
        </button>
      </div>

      {/* Connection Offline Notice */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-800">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold">Modo de Contingência Local Ativo</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Não foi possível estabelecer contato com a VPS. As modificações feitas serão salvas localmente no navegador, mas podem não refletir na VPS até que a conexão seja reestabelecida.
            </p>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all font-semibold text-slate-700"
          >
            <option value="all">Todos os Tipos</option>
            <option value="admin">Admin</option>
            <option value="marina">Marina</option>
            <option value="financeiro">Financeiro</option>
          </select>
        </div>
      </div>

      {/* Users List Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Buscando lista de usuários...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs font-medium">
            Nenhum usuário administrativo encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      {user.username}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'marina' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : user.role === 'financeiro'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {user.role === 'marina' ? 'Marina' : user.role === 'financeiro' ? 'Financeiro' : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          title="Editar Usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          title="Remover Usuário"
                          disabled={users.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-150 animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-600" />
                {modalMode === 'create' ? 'Novo Administrador' : 'Editar Administrador'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Nome de Usuário</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all"
                    placeholder="ex: admin2"
                  />
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Perfil de Acesso</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'admin' | 'marina' | 'financeiro')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all appearance-none"
                  >
                    <option value="admin">Administrador (Acesso Total)</option>
                    <option value="marina">Marina (Painel de Píer e Abastecimento)</option>
                    <option value="financeiro">Financeiro (Acesso Exclusivo Financeiro)</option>
                  </select>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {modalMode === 'create' ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Confirmar Senha</label>
                  <input
                    type="password"
                    required={!!formPassword}
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-250 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isFormSubmitting}
                  className="inline-flex items-center justify-center px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-xs transition-colors gap-1.5 disabled:opacity-75"
                >
                  {isFormSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
