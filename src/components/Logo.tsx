import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  editable?: boolean;
  useCustomLogo?: boolean;
  variant?: string;
}

export default function Logo({ className = "h-9 w-auto text-[#B69D74]", editable = false, useCustomLogo = false, variant, ...props }: LogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    return localStorage.getItem('custom_sidebar_logo');
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayLogo = (useCustomLogo || editable) ? customLogo : null;

  useEffect(() => {
    const handleUpdate = () => {
      setCustomLogo(localStorage.getItem('custom_sidebar_logo'));
    };

    // Load logo from backend if not in localStorage
    if (!customLogo) {
      (async () => {
        try {
          const token = localStorage.getItem('admin_token');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('/api/config?chaves=custom_sidebar_logo', { headers });
          if (res.ok) {
            const { configs } = await res.json();
            if (configs.custom_sidebar_logo) {
              localStorage.setItem('custom_sidebar_logo', configs.custom_sidebar_logo);
              setCustomLogo(configs.custom_sidebar_logo);
            }
          }
        } catch (err) {
          // Silently fallback to localStorage
        }
      })();
    }

    window.addEventListener('sidebar_logo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sidebar_logo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selecione uma imagem com menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        localStorage.setItem('custom_sidebar_logo', base64);
        setCustomLogo(base64);
        window.dispatchEvent(new Event('sidebar_logo_updated'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja restaurar a logo padrão da marca?')) {
      localStorage.removeItem('custom_sidebar_logo');
      setCustomLogo(null);
      window.dispatchEvent(new Event('sidebar_logo_updated'));
    }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    if (editable) {
      e.stopPropagation();
      fileInputRef.current?.click();
    }
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 group ${editable ? 'cursor-pointer' : ''}`} 
      onClick={triggerUpload}
      title={editable ? "Clique para alterar a logo da sidebar" : undefined}
      {...props}
    >
      {editable && (
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      )}

      {displayLogo ? (
        <img 
          src={displayLogo} 
          alt="Logo Marina" 
          className={`${className} object-contain max-h-9 max-w-[140px]`} 
        />
      ) : (
        <svg 
          viewBox="0 0 100 100" 
          fill="currentColor" 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${className} h-9 w-auto max-h-9 max-w-[140px]`}
        >
          {/* Bottom Triangle */}
          <polygon points="12,75 80,75 85,55" />
          
          {/* Middle Triangle */}
          <polygon points="23,64 72,50 77,30" />
          
          {/* Top Triangle */}
          <polygon points="37,42 64,25 69,5" />
        </svg>
      )}

      {editable && (
        <div className="absolute -bottom-1 -right-1 bg-slate-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center justify-center gap-1 z-10">
          <Camera className="w-3 h-3" />
          {customLogo && (
            <button 
              type="button" 
              onClick={handleReset} 
              className="hover:text-red-400 p-0.5" 
              title="Restaurar Logo Padrão"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
