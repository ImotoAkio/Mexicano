import React, { useState, useEffect } from 'react';
import { Info, Play, Plus, Bookmark, Home, CheckCircle2, List, LayoutGrid, ArrowLeft } from 'lucide-react';
import { QUESTION_BANK, Question } from '../data/quizQuestions';

import LogoMexicano from '../../logos/logo_mexicano.svg';

const QUIZ_SIZE = 10;

// Função para embaralhar um array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function SimuladoPage() {
  const [step, setStep] = useState('lead');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [answers, setAnswers] = useState<{questionId: string; selected: number; correct: boolean}[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [savedQuestions, setSavedQuestions] = useState<string[]>([]);
  const [leadId, setLeadId] = useState('');

  // Load from local storage effect (on mount only)
  useEffect(() => {
    const saved = localStorage.getItem('@Simulado:progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nome) {
           setNome(parsed.nome || '');
           setTelefone(parsed.telefone || '');
           setQuestions(parsed.questions || []);
           setCurrentIndex(parsed.currentIndex || 0);
           setSelectedOption(parsed.selectedOption !== undefined ? parsed.selectedOption : null);
           setIsAnswerChecked(parsed.isAnswerChecked || false);
           setAnswers(parsed.answers || []);
           setShowExplanation(parsed.showExplanation || false);
           setScore(parsed.score || 0);
           setSavedQuestions(parsed.savedQuestions || []);
           setLeadId(parsed.leadId || '');

           // Definir step inicial: se for lead mas tiver nome, vai pro home.
           if (parsed.step) {
             setStep(parsed.step === 'lead' ? 'home' : parsed.step);
           }
        }
      } catch (e) {
        console.error('Error parsing localStorage', e);
      }
    }
  }, []);

  // Save to local storage effect
  useEffect(() => {
    if (nome) {
      const stateToSave = {
        step,
        nome,
        telefone,
        questions,
        currentIndex,
        selectedOption,
        isAnswerChecked,
        answers,
        showExplanation,
        score,
        savedQuestions,
        leadId
      };
      localStorage.setItem('@Simulado:progress', JSON.stringify(stateToSave));
    }
  }, [step, nome, telefone, questions, currentIndex, selectedOption, isAnswerChecked, answers, showExplanation, score, savedQuestions, leadId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    if (v.length > 9) v = `${v.slice(0, 9)}-${v.slice(9)}`;
    setTelefone(v);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.length < 3 || telefone.length < 14) {
      setFormError('Atenção, marinheiro(a): preencha corretamente seu nome e WhatsApp.');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/leads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) setLeadId(data.id);
        setStep('home');
      } else {
        setFormError('Erro ao acessar plataforma. Tente novamente.');
      }
    } catch(e) {
      setFormError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    const shuffled = shuffleArray(QUESTION_BANK).slice(0, QUIZ_SIZE);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setShowExplanation(false);
    setAnswers([]);
    setScore(0);
    setStep('simulado');
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerChecked(true);
    setShowExplanation(true);
    if (selectedOption === questions[currentIndex].respostaCorreta) {
      setScore(s => s + 1);
    }
    setAnswers(prev => [...prev, {
      questionId: questions[currentIndex].id,
      selected: selectedOption,
      correct: selectedOption === questions[currentIndex].respostaCorreta
    }]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setShowExplanation(false);
    } else {
      setStep('finished');
      const finalScore = score + (selectedOption === questions[currentIndex].respostaCorreta ? 1 : 0);
      if (leadId) {
        fetch(`/api/leads/finish/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pontuacao: finalScore, acertosTotais: questions.length })
        }).catch(console.error);
      }
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setShowExplanation(false);
    setAnswers([]);
    setScore(0);
    setStep('home');
  };

  const toggleBookmark = (qId: string) => {
    if (savedQuestions.includes(qId)) {
      setSavedQuestions(prev => prev.filter(id => id !== qId));
    } else {
      setSavedQuestions(prev => [...prev, qId]);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col items-center">

      {/* HEADER SIMULADO */}
      {step === 'simulado' && (
        <header className="w-full max-w-md bg-transparent px-6 py-6 flex items-center justify-between z-30">
          <img src={LogoMexicano} alt="Logo Mexicano" className="h-12" />

          <button className="text-gray-600 hover:text-gray-900 transition-opacity flex flex-col gap-[3px]" title="Opções">
            <div className="flex gap-[3px]">
              <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-gray-600"></div>
              <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-gray-600"></div>
            </div>
            <div className="flex gap-[3px]">
              <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-gray-600"></div>
              <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-gray-600"></div>
            </div>
          </button>
        </header>
      )}

      <main className={`flex-1 w-full mx-auto flex flex-col ${step === 'simulado' ? 'max-w-md px-5' : 'max-w-md px-5 py-4 sm:py-10'}`}>

        {/* ===================== TELA LEAD ===================== */}
        {step === 'lead' && (
          <div className="flex flex-col flex-1 justify-center animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 backdrop-blur-sm shadow-xl mt-4 sm:mt-0">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <img src={LogoMexicano} alt="Logo Mexicano" className="h-28" />
                </div>
                <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900 leading-tight mb-2">
                  Acessar Plataforma de Estudos
                </h1>
                <p className="text-[14px] text-gray-500 max-w-sm mx-auto">
                   Desenvolvido pela Mexicano Lanchas. Insira seus dados para acessar simulados oficiais e questões para as provas teóricas da Marinha do Brasil.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[13px] font-bold text-red-400 text-center">
                    {formError}
                  </div>
                )}
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:border-[#FFCE33] focus:outline-none transition-colors"
                />
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={handlePhoneChange}
                  placeholder="Seu WhatsApp (00) 00000-0000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-[15px] font-medium text-gray-900 placeholder-gray-400 focus:border-[#FFCE33] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#FFCE33] hover:bg-[#ffbe1a] text-black font-extrabold text-[16px] py-4 rounded-[14px] transition-all active:scale-[0.98]"
                >
                  {loading ? 'Acessando...' : 'Acessar Plataforma'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== TELA HOME ===================== */}
        {step === 'home' && (
          <div className="flex flex-col flex-1 animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl mt-4">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Olá, {nome.split(' ')[0]}!</h1>
                    <p className="text-sm text-gray-500 mt-1">Bem-vindo(a) à central de estudos</p>
                 </div>
                 <img src={LogoMexicano} alt="Logo" className="h-10" />
              </div>

              <div className="space-y-4 mt-8">
                 {/* Se tiver quiz em andamento */}
                 {questions.length > 0 && currentIndex < questions.length && (
                    <button onClick={() => setStep('simulado')} className="w-full bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#FFCE33] text-left transition-colors">
                        <div>
                            <h3 className="font-bold text-gray-900">Continuar Simulado</h3>
                            <p className="text-sm text-gray-500">Questão {currentIndex + 1} de {questions.length}</p>
                        </div>
                        <div className="bg-[#FFCE33] bg-opacity-20 text-[#d4a81a] p-2.5 rounded-full">
                            <Play size={20} fill="currentColor" />
                        </div>
                    </button>
                 )}

                 <button onClick={handleStartExam} className="w-full bg-[#FFCE33] hover:bg-[#ffbe1a] p-5 rounded-2xl border border-[#FFCE33] shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]">
                     <div>
                         <h3 className="font-bold text-black text-left">Novo Simulado</h3>
                         <p className="text-sm text-black/70 text-left">{QUIZ_SIZE} questões aleatórias oficiais</p>
                     </div>
                     <div className="bg-black/10 text-black p-2.5 rounded-full">
                         <Plus size={20} className="stroke-[3]" />
                     </div>
                 </button>

                 <button onClick={() => setStep('saved_questions')} className="w-full bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#FFCE33] transition-colors">
                     <div>
                         <h3 className="font-bold text-gray-900 text-left">Questões Salvas</h3>
                         <p className="text-sm text-gray-500 text-left">{savedQuestions.length} questões favoritadas</p>
                     </div>
                     <div className="bg-blue-50 text-blue-600 p-2.5 rounded-full">
                         <Bookmark size={20} />
                     </div>
                 </button>

                 <button className="w-full bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between opacity-60">
                     <div className="flex-1">
                         <div className="flex items-center gap-2">
                           <h3 className="font-bold text-gray-900 text-left">Meu Histórico</h3>
                           <span className="text-[10px] font-bold text-white bg-gray-400 px-2 rounded-full uppercase tracking-wider">Em breve</span>
                         </div>
                         <p className="text-sm text-gray-500 text-left">Estatísticas de desempenho</p>
                     </div>
                     <div className="bg-gray-100 text-gray-500 p-2.5 rounded-full">
                         <List size={20} />
                     </div>
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TELA QUESTÕES SALVAS ===================== */}
        {step === 'saved_questions' && (
          <div className="flex flex-col flex-1 animate-in fade-in duration-300 py-4">
             <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <button onClick={() => setStep('home')} className="text-gray-500 hover:text-gray-900 p-1">
                   <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-extrabold text-gray-900">Questões Salvas</h1>
             </div>

             <div className="space-y-4 pb-10">
               {savedQuestions.length === 0 ? (
                 <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Bookmark size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold mb-1">Nenhuma questão salva</p>
                    <p className="text-sm text-gray-500 max-w-[250px] mx-auto">Use o ícone de favorito durante o simulado para salvar questões difíceis e revisá-las depois.</p>
                 </div>
               ) : (
                 savedQuestions.map(id => {
                   const q = QUESTION_BANK.find(q => q.id === id);
                   if (!q) return null;
                   return (
                     <div key={id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm transition-all">
                        <div className="flex justify-between items-start gap-4 mb-3">
                           <h3 className="font-bold text-gray-900 text-[15px] leading-snug">{q.pergunta}</h3>
                           <button onClick={() => toggleBookmark(id)} className="text-[#FFCE33] shrink-0 p-1 hover:scale-110 transition-transform">
                              <Bookmark size={22} fill="currentColor" />
                           </button>
                        </div>
                        <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 mt-3">
                           <p className="text-[12px] font-bold text-green-700 mb-1 uppercase tracking-wider">Resposta correta:</p>
                           <p className="text-[14px] font-medium text-gray-800">{q.opcoes[q.respostaCorreta]}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 flex items-start gap-1.5">
                           <Info size={14} className="shrink-0 text-gray-400 mt-0.5" />
                           <span className="leading-relaxed">{q.explicacao}</span>
                        </p>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        )}

        {/* ===================== TELA SIMULADO ===================== */}
        {step === 'simulado' && currentQuestion && (
          <div className="flex flex-col flex-1 relative h-full">

            {/* STACKED CARDS */}
            <div className="relative mt-2 mb-8 mx-1">
              {/* Back Card */}
              <div className="absolute inset-0 bg-white rounded-[16px] transform -rotate-[4deg] -translate-x-[2px] translate-y-[2px] border border-gray-300"></div>

              {/* Front Card */}
              <div className="bg-white rounded-[16px] px-6 py-6 border border-gray-100 flex flex-col shadow-sm relative z-10 min-h-[220px]">
                <div className="flex items-center mb-2">
                  <span className="text-[13px] font-medium text-gray-500 tracking-wide">
                    Questão {currentIndex + 1} de {questions.length}
                  </span>
                </div>
                <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#111] leading-[1.25] tracking-tight mb-8">
                  {currentQuestion.pergunta}
                </h2>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-1.5 border border-blue-100 px-3 py-1.5 rounded-md text-[13px] font-bold text-blue-700 bg-blue-50/50">
                    Questões Oficiais
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                     <Info size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* OPTIONS */}
            <div className="flex-1 pb-24">
              <h3 className="text-[16px] font-bold text-gray-900 mb-3 tracking-wide px-1">Escolha a alternativa correta:</h3>
              <div className="space-y-2">
                {currentQuestion.opcoes.map((opcao, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.respostaCorreta;

                  let baseStyle = 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm';

                  if (isSelected && !isAnswerChecked) {
                    baseStyle = 'bg-[#FFCE33] border-[#FFCE33] text-black font-bold shadow-sm';
                  } else if (isAnswerChecked) {
                    if (isCorrect) {
                      baseStyle = 'bg-[#22c55e] border-[#22c55e] text-white font-bold shadow-sm';
                    } else if (isSelected && !isCorrect) {
                      baseStyle = 'bg-red-500 border-red-500 text-white font-bold shadow-sm';
                    } else {
                      baseStyle = 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left p-4 rounded-[12px] border text-[15px] leading-[1.3] transition-all ${baseStyle} active:scale-[0.99] disabled:Scale-100 cursor-pointer`}
                    >
                      {opcao}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EXPLANATION */}
            {isAnswerChecked && showExplanation && !isCorrectAnswer(selectedOption, currentQuestion) && (
              <div className="fixed inset-x-0 bottom-24 z-40 mx-4 max-w-md lg:mx-auto p-4 bg-white rounded-xl border border-gray-200 shadow-lg animate-in slide-in-from-bottom-2 fade-in">
                 <p className="text-gray-800 text-sm font-medium leading-relaxed flex items-start gap-2">
                   <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                   {currentQuestion.explicacao}
                 </p>
              </div>
            )}

            {/* STICKY BOTTOM BUTTON */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-gray-50 z-50 flex border-t border-gray-200 justify-center w-full">
              <div className="w-full max-w-md relative h-14">

                {/* 5 Icons Header State - visible only when NO option selected and NOT checked */}
                <div
                  className={`absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-200 ${
                    (selectedOption !== null || isAnswerChecked) ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <button onClick={() => setStep('home')} title="Página Inicial" className="text-gray-400 hover:text-gray-900 transition-colors p-2">
                    <Home size={24} strokeWidth={2.5} />
                  </button>

                  <button
                    title="Salvar Questão"
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className={`transition-colors p-2 ${savedQuestions.includes(currentQuestion.id) ? 'text-[#FFCE33] drop-shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
                  >
                    <Bookmark size={24} strokeWidth={2.5} fill={savedQuestions.includes(currentQuestion.id) ? 'currentColor' : 'none'} />
                  </button>

                  <button className="rounded-full bg-gray-200 p-[2px] shadow-sm relative -top-1 opacity-50 cursor-not-allowed">
                    <div className="bg-[#FFCE33] text-black rounded-full p-2.5">
                      <CheckCircle2 size={22} strokeWidth={3} />
                    </div>
                  </button>

                  <button title="Histórico" className="text-gray-400 hover:text-gray-900 transition-colors p-2 cursor-not-allowed opacity-50">
                    <List size={24} strokeWidth={2.5} />
                  </button>

                  <button title="Opções" className="text-gray-400 hover:text-gray-900 transition-colors p-2 cursor-not-allowed opacity-50">
                    <LayoutGrid size={24} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Big Yellow Button - visible when selected or checked */}
                <div
                  className={`absolute inset-0 w-full transition-opacity duration-200 ${
                    (selectedOption !== null || isAnswerChecked) ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <button
                    onClick={isAnswerChecked ? handleNextQuestion : handleCheckAnswer}
                    className="w-full h-full bg-[#FFCE33] hover:bg-[#ffbe1a] text-black font-extrabold text-[16px] rounded-[16px] transition-all flex items-center justify-center active:scale-[0.98]"
                  >
                    {isAnswerChecked
                      ? (currentIndex + 1 === questions.length ? 'Finalizar Teste' : 'Próxima Questão')
                      : 'Verificar Resposta'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ===================== TELA FINAL ===================== */}
        {step === 'finished' && (
          <div className="flex flex-col flex-1 justify-center animate-in fade-in duration-300">
             <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-xl mt-4 sm:mt-0">
               <div className="flex justify-center mb-6">
                 <img src={LogoMexicano} alt="Logo Mexicano" className="h-20 opacity-80" />
               </div>
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#22c55e]/10 text-[#22c55e] mb-4">
                  <CheckCircle2 size={40} strokeWidth={2.5} />
               </div>
               <h2 className="text-[26px] font-extrabold text-gray-900 mb-2 leading-tight">
                 Simulado Finalizado
               </h2>
               <p className="text-[14px] text-gray-500 mb-8 font-medium">
                 Sua avaliação foi registrada com sucesso, {nome}. A Mexicano Lanchas recomenda a resolução constante de simulados para garantir uma excelente performance no exame oficial da Marinha do Brasil.
               </p>

               <div className="flex justify-center mb-8">
                 <div className="text-[64px] font-extrabold text-[#FFCE33] leading-none tracking-tight">
                   {score}
                   <span className="text-[24px] text-gray-300 ml-1">/ {questions.length}</span>
                 </div>
               </div>

               <div className="space-y-3">
                 <button
                    onClick={handleRestart}
                    className="w-full bg-[#FFCE33] hover:bg-[#ffbe1a] text-black font-extrabold text-[16px] py-4 rounded-[14px] transition-all active:scale-[0.98]"
                  >
                    Voltar para a Home
                  </button>
               </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}

function isCorrectAnswer(selectedOption: number | null, currentQuestion: Question | undefined) {
  if (selectedOption === null || !currentQuestion) return false;
  return selectedOption === currentQuestion.respostaCorreta;
}
