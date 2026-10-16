import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  Smartphone,
  Anchor,
  Navigation,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Droplets,
  Sparkles,
  Info,
  Clock,
  ChevronRight,
  ShieldAlert,
  Vibrate
} from 'lucide-react';
import {
  MarinaNotificationItem,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotificationHistory,
  deleteStoredNotification,
  isSoundEnabled,
  setSoundEnabled,
  isVibrationEnabled,
  setVibrationEnabled,
  isPushEnabled,
  setPushEnabled,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  testMobileAlert
} from '../../utils/marinaNotifications';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification?: (item: MarinaNotificationItem) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectNotification
}) => {
  const [notifications, setNotifications] = useState<MarinaNotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [soundActive, setSoundActive] = useState(isSoundEnabled());
  const [vibrationActive, setVibrationActive] = useState(isVibrationEnabled());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermissionStatus()
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadData = () => {
    setNotifications(getStoredNotifications());
    setSoundActive(isSoundEnabled());
    setVibrationActive(isVibrationEnabled());
    setPermissionStatus(getNotificationPermissionStatus());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('marina:notifications_updated', handleUpdate);
    window.addEventListener('marina:notification_settings_changed', handleUpdate);

    return () => {
      window.removeEventListener('marina:notifications_updated', handleUpdate);
      window.removeEventListener('marina:notification_settings_changed', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  const handleToggleVibration = () => {
    const next = !vibrationActive;
    setVibrationActive(next);
    setVibrationEnabled(next);
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermissionStatus(res);
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testMobileAlert();
      let msg = 'Alerta disparado!';
      if (res.vibrated && res.soundPlayed) {
        msg = 'Som e vibração ativados no aparelho!';
      } else if (res.vibrated) {
        msg = 'Vibração ativada no celular!';
      } else if (res.soundPlayed) {
        msg = 'Som do alerta reproduzido!';
      }
      setTestResult(msg);
      setTimeout(() => setTestResult(null), 4000);
    } catch {
      setTestResult('Erro ao testar alerta.');
    } finally {
      setIsTesting(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (diff < 60000) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    if (hours < 24) {
      const d = new Date(timestamp);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `Hoje às ${hh}:${mm}`;
    }
    if (days === 1) {
      const d = new Date(timestamp);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `Ontem às ${hh}:${mm}`;
    }
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} às ${hh}:${mm}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'agendamento':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'confirmacao':
      case 'pronta':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'cancelamento':
      case 'cancelado':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'descida':
        return <Anchor className="w-4 h-4 text-cyan-600" />;
      case 'abastecimento':
      case 'combustivel':
        return <Droplets className="w-4 h-4 text-amber-600" />;
      case 'saida':
        return <Navigation className="w-4 h-4 text-indigo-600" />;
      case 'chegada':
        return <ArrowDownCircle className="w-4 h-4 text-purple-600" />;
      case 'subida':
        return <ArrowUpCircle className="w-4 h-4 text-teal-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9500] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between pt-safe">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Histórico de atualizações do píer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Settings & Alert Test Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          {/* Permission Prompt Banner if needed */}
          {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs font-semibold text-blue-900 leading-tight truncate">
                  Ativar notificações no celular
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shrink-0 transition-transform active:scale-95 shadow-sm"
              >
                Permitir
              </button>
            </div>
          )}

          {/* Quick Controls: Test Button + Sound + Vibration Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={isTesting}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Vibrate className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>{isTesting ? 'Testando...' : 'Testar no Celular'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                soundActive
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={soundActive ? 'Som ativado' : 'Som desativado'}
            >
              {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleVibration}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                vibrationActive
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={vibrationActive ? 'Vibração ativada' : 'Vibração desativada'}
            >
              <Smartphone className={`w-4 h-4 ${vibrationActive ? 'text-blue-600' : ''}`} />
            </button>
          </div>

          {testResult && (
            <p className="text-[11px] font-bold text-center text-emerald-600 bg-emerald-50 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
              {testResult}
            </p>
          )}
        </div>

        {/* Filter and Bulk Actions Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Deseja limpar todo o histórico de notificações?')) {
                    clearNotificationHistory();
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                title="Limpar histórico"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
          {displayedNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-600">Nenhuma notificação</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {filter === 'unread'
                  ? 'Todas as notificações foram lidas!'
                  : 'Atualizações em tempo real recebidas via Socket.io serão registradas e salvas aqui.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  markNotificationAsRead(item.id);
                  if (onSelectNotification) onSelectNotification(item);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  item.read
                    ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    : 'bg-white border-blue-200 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      item.read ? 'bg-slate-100' : 'bg-blue-50'
                    }`}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs font-black uppercase tracking-wider truncate ${
                            item.read ? 'text-slate-700' : 'text-blue-900 font-extrabold'
                          }`}
                        >
                          {item.operacao || item.title.split('•')[0].trim()}
                        </span>
                        <span className="bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded shadow-sm shrink-0">
                          {item.boatCode || item.boatName || 'M--'}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs text-slate-600">
                      {item.clientName && (
                        <p className="truncate">
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Cliente:</span>
                          <span className="font-semibold text-slate-800">{item.clientName}</span>
                        </p>
                      )}
                      <p className="truncate">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Previsão:</span>
                        <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono text-[11px]">
                          {item.previsaoSaida || 'Não informada'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse mt-1" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStoredNotification(item.id);
                      }}
                      className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
