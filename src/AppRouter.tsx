import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importando o antigo App para quebrar aos poucos
import LegacyApp from './App'; 
// Uma tela de loading enquanto carrega
const LoadingScreen = () => <div className="min-h-screen flex items-center justify-center bg-mexicano-dark"><div className="w-8 h-8 rounded-full border-4 border-mexicano-red border-t-transparent animate-spin"></div></div>;

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Todas as rotas base cairão no seu App.tsx atual, mas agora ele tem acesso aos hooks do Router */}
          <Route path="/*" element={<LegacyApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
