import fs from 'fs';

let content = fs.readFileSync('src/components/SchedulesPage.tsx', 'utf8');

// 1. Add state
content = content.replace(
  'const [statusModalEvent, setStatusModalEvent] = useState<Reserva | null>(null);',
  `const [statusModalEvent, setStatusModalEvent] = useState<Reserva | null>(null);
  const [editModalEvent, setEditModalEvent] = useState<Reserva | null>(null);
  const [editFormData, setEditFormData] = useState({
    clienteId: '',
    data: '',
    periodo: 'dia_inteiro' as 'dia_inteiro' | 'manha' | 'tarde',
    observacoes: ''
  });`
);

// 2. Add handleEditClick function
content = content.replace(
  'const handleUpdateStatus = async (res: Reserva, newStatus: string) => {',
  `const handleEditClick = (res: Reserva) => {
    setEditFormData({
      clienteId: res.clienteId,
      data: res.data,
      periodo: res.periodo,
      observacoes: res.observações || ''
    });
    setEditModalEvent(res);
  };

  const handleSaveEdit = async () => {
    if (!editModalEvent) return;
    setIsLoading(true);
    try {
      const updatedRes = {
        ...editModalEvent,
        clienteId: editFormData.clienteId,
        data: editFormData.data,
        periodo: editFormData.periodo,
        observações: editFormData.observacoes
      };
      
      reservationDB.update(editModalEvent.id, updatedRes);

      // Try to update Google Calendar if it exists
      if (editModalEvent.googleEventId) {
        const boat = boatDB.getById(editModalEvent.embarcacaoId);
        const client = clientDB.getById(editFormData.clienteId);
        const boatCode = boat ? (boat.numero ? \`M\${boat.numero}\` : boat.nome.split(' ')[0]) : 'M00';
        const ownerName = client ? client.nome : 'Desconhecido';
        
        let baseTitle = \`\${boatCode} - \${ownerName}\`;
        const finalTitle = editModalEvent.status === 'cancelado' ? \`\${baseTitle} (CANCELADO)\` : baseTitle;

        const lines = [
          'Reservado via Reservas Náuticas',
          \`Status: \${editModalEvent.status === 'cancelado' ? 'Cancelado' : editModalEvent.status === 'confirmado' ? 'Confirmado' : 'Agendado'}\`,
          \`Embarcação: \${boat ? boat.nome : 'N/A'}\`,
          \`Proprietário: \${ownerName}\`,
          \`Período: \${editFormData.periodo === 'dia_inteiro' ? 'Dia Inteiro' : editFormData.periodo === 'manha' ? 'Manhã' : 'Tarde'}\`,
          \`Obs: \${editFormData.observacoes || 'Nenhuma'}\`
        ];
        
        // Construct dates
        const { formatEventTimes } = await import('../googleCalendar');
        const times = formatEventTimes(editFormData.data, editFormData.periodo);

        const { updateGoogleCalendarEvent } = await import('../googleCalendar');
        await updateGoogleCalendarEvent(editModalEvent.googleEventId, boatCode, {
          summary: finalTitle,
          description: lines.join('\\n'),
          start: times.start,
          end: times.end
        });
      }

      showToast('Agendamento atualizado com sucesso!', 'success');
      setEditModalEvent(null);
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar agendamento.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (res: Reserva, newStatus: string) => {`
);

// 3. Add Edit Button
content = content.replace(
  '<button onClick={() => setStatusModalEvent(res)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver / Sincronizar Google Agenda">',
  `<button onClick={() => handleEditClick(res)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar Agendamento">
    <Wrench className="w-4 h-4" />
  </button>
  <button onClick={() => setStatusModalEvent(res)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver / Sincronizar Google Agenda">`
);

// 4. Add the Edit Modal UI at the bottom
const editModalUI = `
      {/* Edit Modal */}
      {editModalEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Editar Agendamento
              </h3>
              <button onClick={() => setEditModalEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente / Sócio</label>
                <select
                  value={editFormData.clienteId}
                  onChange={(e) => setEditFormData({ ...editFormData, clienteId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="">Selecione o Cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  value={editFormData.data}
                  onChange={(e) => setEditFormData({ ...editFormData, data: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Período</label>
                <select
                  value={editFormData.periodo}
                  onChange={(e) => setEditFormData({ ...editFormData, periodo: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                >
                  <option value="dia_inteiro">Dia Inteiro</option>
                  <option value="manha">Manhã (até 13h)</option>
                  <option value="tarde">Tarde (após 13h)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                <textarea
                  value={editFormData.observacoes}
                  onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  rows={3}
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t mt-4">
              <button
                onClick={() => setEditModalEvent(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Status Details Modal */}', editModalUI + '\n      {/* Status Details Modal */}');

fs.writeFileSync('src/components/SchedulesPage.tsx', content);
