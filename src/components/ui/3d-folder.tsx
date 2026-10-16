import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef } from 'react';
import { Sun, Moon, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utilities ---

/**
 * Combines multiple class names and merges Tailwind classes correctly.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Interfaces & Constants ---

export interface Project {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=600";

// --- Internal Components ---

interface ProjectCardProps {
  image: string;
  title: string;
  subtitle?: string;
  delay: number;
  isVisible: boolean;
  index: number;
  totalCount: number;
  onClick: () => void;
  isSelected: boolean;
}

export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ image, title, subtitle, delay, isVisible, index, totalCount, onClick, isSelected }, ref) => {
    const middleIndex = (totalCount - 1) / 2;
    const factor = totalCount > 1 ? (index - middleIndex) / middleIndex : 0;
    
    const rotation = factor * 25; 
    const translationX = factor * 85; 
    const translationY = Math.abs(factor) * 12;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute w-20 h-28 cursor-pointer group/card",
          isSelected && "opacity-0",
        )}
        style={{
          transform: isVisible
            ? `translateY(calc(-100px + ${translationY}px)) translateX(${translationX}px) rotate(${rotation}deg) scale(1)`
            : "translateY(0px) translateX(0px) rotate(0deg) scale(0.4)",
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          transition: `all 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          zIndex: 10 + index,
          left: "-40px",
          top: "-56px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <div className={cn(
          "w-full h-full rounded-lg overflow-hidden shadow-xl bg-slate-900 border border-white/10 relative",
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover/card:-translate-y-6 group-hover/card:shadow-2xl group-hover/card:shadow-sky-500/40 group-hover/card:ring-2 group-hover/card:ring-sky-400 group-hover/card:scale-125"
        )}>
          <img 
            src={image || PLACEHOLDER_IMAGE} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute bottom-1.5 left-1.5 right-1.5">
            <p className="text-[9px] font-black uppercase tracking-tighter text-white truncate drop-shadow-md">
              {title}
            </p>
            {subtitle && (
              <p className="text-[7.5px] font-medium text-slate-300 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);
ProjectCard.displayName = "ProjectCard";

export interface ImageLightboxProps {
  projects: Project[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  sourceRect: DOMRect | null;
  onCloseComplete?: () => void;
  onNavigate: (index: number) => void;
  actionButtonText?: string;
  onActionClick?: (project: Project) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  projects,
  currentIndex,
  isOpen,
  onClose,
  sourceRect,
  onCloseComplete,
  onNavigate,
  actionButtonText = "Ver Detalhes",
  onActionClick
}) => {
  const [animationPhase, setAnimationPhase] = useState<"initial" | "animating" | "complete">("initial");
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [internalIndex, setInternalIndex] = useState(currentIndex);
  const [isSliding, setIsSliding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalProjects = projects.length;
  const hasNext = internalIndex < totalProjects - 1;
  const hasPrev = internalIndex > 0;
  const currentProject = projects[internalIndex];

  useEffect(() => {
    if (isOpen && currentIndex !== internalIndex && !isSliding) {
      setIsSliding(true);
      const timer = setTimeout(() => {
        setInternalIndex(currentIndex);
        setIsSliding(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isOpen, internalIndex, isSliding]);

  useEffect(() => {
    if (isOpen) {
      setInternalIndex(currentIndex);
      setIsSliding(false);
    }
  }, [isOpen, currentIndex]);

  const navigateNext = useCallback(() => {
    if (internalIndex >= totalProjects - 1 || isSliding) return;
    onNavigate(internalIndex + 1);
  }, [internalIndex, totalProjects, isSliding, onNavigate]);

  const navigatePrev = useCallback(() => {
    if (internalIndex <= 0 || isSliding) return;
    onNavigate(internalIndex - 1);
  }, [internalIndex, isSliding, onNavigate]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    onClose();
    setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      setAnimationPhase("initial");
      onCloseComplete?.();
    }, 500);
  }, [onClose, onCloseComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") navigateNext();
      if (e.key === "ArrowLeft") navigatePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleClose, navigateNext, navigatePrev]);

  useLayoutEffect(() => {
    if (isOpen && sourceRect) {
      setShouldRender(true);
      setAnimationPhase("initial");
      setIsClosing(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationPhase("animating");
        });
      });
      const timer = setTimeout(() => {
        setAnimationPhase("complete");
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sourceRect]);

  const handleDotClick = (idx: number) => {
    if (isSliding || idx === internalIndex) return;
    onNavigate(idx);
  };

  if (!shouldRender || !currentProject) return null;

  const getInitialStyles = (): React.CSSProperties => {
    if (!sourceRect) return {};
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const targetWidth = Math.min(800, viewportWidth - 64);
    const targetHeight = Math.min(viewportHeight * 0.85, 600);
    const targetX = (viewportWidth - targetWidth) / 2;
    const targetY = (viewportHeight - targetHeight) / 2;
    const scaleX = sourceRect.width / targetWidth;
    const scaleY = sourceRect.height / targetHeight;
    const scale = Math.max(scaleX, scaleY);
    const translateX = sourceRect.left + sourceRect.width / 2 - (targetX + targetWidth / 2) + window.scrollX;
    const translateY = sourceRect.top + sourceRect.height / 2 - (targetY + targetHeight / 2) + window.scrollY;
    return {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      opacity: 0.5,
      borderRadius: "12px",
    };
  };

  const getFinalStyles = (): React.CSSProperties => ({
    transform: "translate(0, 0) scale(1)",
    opacity: 1,
    borderRadius: "24px",
  });

  const currentStyles = animationPhase === "initial" && !isClosing ? getInitialStyles() : getFinalStyles();

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8")}
      onClick={handleClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: "opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
        style={{
          opacity: (animationPhase === "initial" && !isClosing) ? 0 : 1,
          transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        className={cn(
          "absolute top-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-slate-800/60 backdrop-blur-xl border border-white/10 shadow-2xl text-white hover:bg-slate-700 transition-all duration-300",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing ? 1 : 0,
          transform: animationPhase === "complete" && !isClosing ? "translateY(0)" : "translateY(-30px)",
          transition: "opacity 400ms ease-out 400ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 400ms",
        }}
      >
        <X className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigatePrev(); }}
        disabled={!hasPrev || isSliding}
        className={cn(
          "absolute left-4 md:left-10 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-slate-800/60 backdrop-blur-xl border border-white/10 text-white hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none shadow-2xl",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing && hasPrev ? 1 : 0,
          transform: animationPhase === "complete" && !isClosing ? "translateX(0)" : "translateX(-40px)",
          transition: "opacity 400ms ease-out 600ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 600ms",
        }}
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={3} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigateNext(); }}
        disabled={!hasNext || isSliding}
        className={cn(
          "absolute right-4 md:right-10 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-slate-800/60 backdrop-blur-xl border border-white/10 text-white hover:scale-110 active:scale-95 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none shadow-2xl",
        )}
        style={{
          opacity: animationPhase === "complete" && !isClosing && hasNext ? 1 : 0,
          transform: animationPhase === "complete" && !isClosing ? "translateX(0)" : "translateX(40px)",
          transition: "opacity 400ms ease-out 600ms, transform 500ms cubic-bezier(0.16, 1, 0.3, 1) 600ms",
        }}
      >
        <ChevronRight className="w-6 h-6" strokeWidth={3} />
      </button>
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...currentStyles,
          transform: isClosing ? "translate(0, 0) scale(0.92)" : currentStyles.transform,
          transition: animationPhase === "initial" && !isClosing ? "none" : "transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms ease-out, border-radius 700ms ease",
          transformOrigin: "center center",
        }}
      >
        <div className={cn("relative overflow-hidden rounded-[inherit] bg-slate-900 border border-white/10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7)]")}>
          <div className="relative overflow-hidden aspect-[4/3] md:aspect-[16/10]">
            <div
              className="flex w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(-${internalIndex * 100}%)`,
                transition: isSliding ? "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
              }}
            >
              {projects.map((project) => (
                <div key={project.id} className="min-w-full h-full relative">
                  <img
                    src={project.image || PLACEHOLDER_IMAGE}
                    alt={project.title}
                    className="w-full h-full object-cover select-none"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
          <div
            className={cn("px-8 py-7 bg-slate-950 border-t border-white/10")}
            style={{
              opacity: animationPhase === "complete" && !isClosing ? 1 : 0,
              transform: animationPhase === "complete" && !isClosing ? "translateY(0)" : "translateY(40px)",
              transition: "opacity 500ms ease-out 500ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) 500ms",
            }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white tracking-tight truncate">{currentProject?.title}</h3>
                {currentProject?.subtitle && (
                  <p className="text-sm font-medium text-slate-400 mt-0.5 truncate">{currentProject.subtitle}</p>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full border border-white/10">
                    {projects.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleDotClick(idx)}
                        className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", idx === internalIndex ? "bg-white scale-150" : "bg-slate-500/50 hover:bg-slate-400")}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{internalIndex + 1} / {totalProjects}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (onActionClick && currentProject) {
                    onActionClick(currentProject);
                  } else if (currentProject?.onClick) {
                    currentProject.onClick();
                  }
                }}
                className={cn("flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer")}
              >
                <span>{actionButtonText}</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface AnimatedFolderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'emerald' | 'amber' | 'stone' | 'sky';
  projects: Project[];
  className?: string;
  gradient?: string;
  folderColor?: {
    back?: string;
    tab?: string;
    front?: string;
  };
  onClickFolder?: () => void;
  onProjectClick?: (project: Project, index: number) => void;
  actionButtonText?: string;
  onActionClick?: (project: Project) => void;
}

export const AnimatedFolder: React.FC<AnimatedFolderProps> = ({ 
  title, 
  subtitle,
  badge,
  badgeVariant = 'sky',
  projects, 
  className, 
  gradient,
  folderColor,
  onClickFolder,
  onProjectClick,
  actionButtonText,
  onActionClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const previewProjects = projects.slice(0, 5);

  const handleProjectClick = (project: Project, index: number) => {
    if (onProjectClick) {
      onProjectClick(project, index);
      return;
    }
    const cardEl = cardRefs.current[index];
    if (cardEl) setSourceRect(cardEl.getBoundingClientRect());
    setSelectedIndex(index);
    setHiddenCardId(project.id);
  };

  const handleCloseLightbox = () => { setSelectedIndex(null); setSourceRect(null); };
  const handleCloseComplete = () => { setHiddenCardId(null); };
  const handleNavigate = (newIndex: number) => { setSelectedIndex(newIndex); setHiddenCardId(projects[newIndex]?.id || null); };

  // Fallback defaults for folders
  const defaultBack = folderColor?.back || "var(--folder-back, #1e293b)";
  const defaultTab = folderColor?.tab || "var(--folder-tab, #334155)";
  const defaultFront = folderColor?.front || "var(--folder-front, #273549)";

  const backBg = gradient || `linear-gradient(135deg, ${defaultBack} 0%, ${defaultTab} 100%)`;
  const tabBg = gradient || defaultTab;
  const frontBg = gradient || `linear-gradient(135deg, ${defaultFront} 0%, ${defaultBack} 100%)`;

  const badgeStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    stone: "bg-stone-500/10 text-stone-400 border-stone-500/30",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/30"
  };

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-7 rounded-2xl cursor-pointer bg-slate-900/90 text-white border border-white/10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-2xl hover:shadow-sky-500/20 hover:border-sky-500/40 group select-none",
          className
        )}
        style={{
          minWidth: "260px",
          minHeight: "300px",
          perspective: "1200px",
          transform: isHovered ? "scale(1.03) rotate(-1deg)" : "scale(1) rotate(0deg)"
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (onClickFolder) onClickFolder();
        }}
      >
        {/* Glow de fundo */}
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-700 pointer-events-none"
          style={{
            background: gradient
              ? `radial-gradient(circle at 50% 70%, ${gradient.match(/#[a-fA-F0-9]{3,6}/)?.[0] || '#0284c7'} 0%, transparent 70%)`
              : "radial-gradient(circle at 50% 70%, #0284c7 0%, transparent 70%)",
            opacity: isHovered ? 0.18 : 0
          }}
        />

        {/* Badge superior (opcional) */}
        {badge && (
          <div className="absolute top-3.5 right-3.5 z-40">
            <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs", badgeStyles[badgeVariant])}>
              {badge}
            </span>
          </div>
        )}

        {/* Container 3D das abas e cartas */}
        <div className="relative flex items-center justify-center mb-3" style={{ height: "150px", width: "190px" }}>
          
          {/* Aba traseira do diretório */}
          <div
            className="absolute w-32 h-24 rounded-lg shadow-md border border-white/10"
            style={{
              background: backBg,
              filter: gradient ? "brightness(0.9)" : "none",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(-20deg) scaleY(1.05)" : "rotateX(0deg) scaleY(1)",
              transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 10
            }}
          />

          {/* Orelha superior da pasta */}
          <div
            className="absolute w-12 h-4 rounded-t-md border-t border-x border-white/10"
            style={{
              background: tabBg,
              filter: gradient ? "brightness(0.85)" : "none",
              top: "calc(50% - 48px - 12px)",
              left: "calc(50% - 64px + 16px)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(-30deg) translateY(-3px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 10
            }}
          />

          {/* Cartas de documentos que se abrem no hover */}
          <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 20 }}>
            {previewProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                image={project.image}
                title={project.title}
                subtitle={project.subtitle}
                delay={index * 50}
                isVisible={isHovered}
                index={index}
                totalCount={previewProjects.length}
                onClick={() => handleProjectClick(project, index)}
                isSelected={hiddenCardId === project.id}
              />
            ))}
          </div>

          {/* Aba frontal do diretório que abre para frente */}
          <div
            className="absolute w-32 h-24 rounded-lg shadow-lg border border-white/20"
            style={{
              background: frontBg,
              top: "calc(50% - 48px + 4px)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(38deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 30
            }}
          />

          {/* Brilho da aba frontal */}
          <div
            className="absolute w-32 h-24 rounded-lg overflow-hidden pointer-events-none"
            style={{
              top: "calc(50% - 48px + 4px)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(38deg) translateY(12px)" : "rotateX(0deg) translateY(0)",
              transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 31
            }}
          />
        </div>

        {/* Textos informativos do cliente/diretório */}
        <div className="text-center w-full px-2">
          <h3
            className="text-base font-bold text-white tracking-tight truncate transition-all duration-500"
            style={{
              transform: isHovered ? "translateY(2px)" : "translateY(0)",
              letterSpacing: isHovered ? "-0.01em" : "0"
            }}
            title={title}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium truncate mt-0.5" title={subtitle}>
              {subtitle}
            </p>
          )}
          <p className="text-[11px] font-semibold text-slate-500 transition-all duration-500 mt-1" style={{ opacity: isHovered ? 0.9 : 1 }}>
            {projects.length} {projects.length === 1 ? 'documento' : 'documentos'}
          </p>
        </div>

        {/* Indicador de interação */}
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all duration-500"
          style={{ opacity: isHovered ? 0 : 1, transform: isHovered ? "translateY(8px)" : "translateY(0)" }}
        >
          <span>Passe o mouse</span>
        </div>
      </div>

      <ImageLightbox
        projects={projects}
        currentIndex={selectedIndex ?? 0}
        isOpen={selectedIndex !== null}
        onClose={handleCloseLightbox}
        sourceRect={sourceRect}
        onCloseComplete={handleCloseComplete}
        onNavigate={handleNavigate}
        actionButtonText={actionButtonText}
        onActionClick={onActionClick}
      />
    </>
  );
};

// --- Portfolio Data & Main App (Demo component) ---

export const demoPortfolioData = [
  {
    title: "Branding",
    gradient: "linear-gradient(135deg, #e73827, #f85032)",
    projects: [
      { id: "b1", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800", title: "Lumnia Identity" },
      { id: "b2", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=800", title: "Prism Collective" },
      { id: "b3", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800", title: "Vertex Studio" },
      { id: "b4", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800", title: "Aura Branding" },
      { id: "b5", image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800", title: "Zephyr Lab" },
    ] as Project[]
  },
  {
    title: "Web Design",
    gradient: "linear-gradient(to right, #f7b733, #fc4a1a)",
    projects: [
      { id: "w1", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", title: "Nexus Platform" },
      { id: "w2", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", title: "Echo Analytics" },
      { id: "w3", image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800", title: "Flow Systems" },
    ] as Project[]
  },
  {
    title: "UI/UX Design",
    gradient: "linear-gradient(135deg, #00c6ff, #0072ff)",
    projects: [
      { id: "u1", image: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?auto=format&fit=crop&q=80&w=800", title: "Crypto Wallet" },
      { id: "u2", image: "https://images.unsplash.com/photo-1522542550221-31fd19fe4af0?auto=format&fit=crop&q=80&w=800", title: "Health Tracker" },
      { id: "u3", image: "https://images.unsplash.com/photo-1541462608141-ad4d4f942177?auto=format&fit=crop&q=80&w=800", title: "UX Wireframe" },
    ] as Project[]
  }
];

export default function ThreeDFolderApp() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 transition-colors duration-500">
      <header className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-end">
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-white/10"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto pt-16 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
          Diretório <span className="text-blue-500 italic">3D Folder</span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto">
          Catálogo interativo com visualização 3D de pastas e documentos em leque.
        </p>
      </div>

      <section className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {demoPortfolioData.map((folder) => (
            <div key={folder.title} className="w-full">
              <AnimatedFolder 
                title={folder.title} 
                projects={folder.projects} 
                gradient={folder.gradient}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
