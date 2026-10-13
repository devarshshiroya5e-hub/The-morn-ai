import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Monitor,
  Smartphone,
  Code,
  Eye,
  Download,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  ImagePlus,
  RefreshCw,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  FileCode,
  FileText,
  Package,
  Layers,
  Rocket,
  CheckCircle2,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { Startup } from '../types';
import { postMornAI } from '../lib/mornaiAi';
import { composeWebsiteFiles } from '../lib/websiteComposer';
import { composeGeneratedWebsiteFiles, hydrateWebsiteImage, type GeneratedWebsite } from '../lib/websiteCodeGenerator';
import { createZipBlob } from '../lib/zipBuilder';

export interface WebsiteProject {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  imagePreview?: string;
  code: string;
  stylesCss?: string;
  mainJs?: string;
  mainTs?: string;
  packageJson?: string;
  readmeMd?: string;
  createdAt: number;
  updatedAt: number;
}

interface WebsiteStudioProps {
  startup: Startup;
  onClose: () => void;
}

/**
 * Builds a multi-file project bundle:
 * 1. index.html
 * 2. src/styles.css
 * 3. src/main.js
 * 4. src/main.ts (when TypeScript is generated)
 * 5. package.json
 * 6. README.md
 */
function buildProjectFiles(params: {
  startupName: string; tagline: string; prompt: string; industry?: string; sections?: string[];
  visualDirection?: string; imageUrl?: string; heroHeadline?: string; heroSubheadline?: string;
  features?: Array<{ title: string; description: string; icon?: string }>;
  pricingTiers?: Array<{ name: string; priceMonthly: string; priceAnnual: string; description: string; features?: string[] }>;
  faq?: Array<{ question: string; answer: string }>; ctaHeadline?: string;
}) {
  const name = params.startupName || "Your Startup";
  const tagline = params.tagline || "Add a clear description of what your business offers.";
  return composeWebsiteFiles({
    title: name + " Website", tagline,
    theme: { style: "minimal", palette: { background: "#fafafa", surface: "#ffffff", text: "#171717", muted: "#737373", primary: "#242424", accent: "#dedede" }, headingFont: "sans", bodyFont: "sans", spacing: "balanced", corners: "soft" },
    hero: { layout: "split", eyebrow: params.industry || "Welcome", headline: params.heroHeadline || "Discover " + name, subheadline: params.heroSubheadline || tagline, primaryCta: "Get in touch", secondaryCta: "" },
    sections: [
      { type: "services", title: "What we do", subtitle: "Add your real services, products, or capabilities.", layout: "grid",
        items: [{ title: "Add your first offering", body: "Replace this placeholder with details supplied by your team.", label: "", value: "", price: "", quote: "", author: "", imageUrl: "" }] },
      { type: "contact", title: params.ctaHeadline || "Start a conversation", subtitle: "", layout: "banner",
        items: [{ title: "Contact", body: "Add your preferred contact method and next step.", label: "", value: "", price: "", quote: "", author: "", imageUrl: "" }] }
    ]
  }, { startupName: name, imageUrl: params.imageUrl, prompt: params.prompt });
}
export const WebsiteStudio: React.FC<WebsiteStudioProps> = ({ startup, onClose }) => {
  const storageKey = `mornai_websites_${startup.id}`;
  const activeIdKey = `mornai_active_website_id_${startup.id}`;
  const draftPromptKey = `mornai_website_prompt_${startup.id}`;

  // Body scroll lock so background workspace never scrolls or peeks through
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [projects, setProjects] = useState<WebsiteProject[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(activeIdKey);
      if (savedActive) return savedActive;
    } catch {}
    return '';
  });

  // Prompt persistence across page changes
  const [promptText, setPromptText] = useState<string>(() => {
    try {
      return localStorage.getItem(draftPromptKey) || '';
    } catch {
      return '';
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeCodeFile, setActiveCodeFile] = useState<'index.html' | 'styles.css' | 'main.js' | 'main.ts' | 'package.json' | 'readme.md'>('index.html');

  const [productPhoto, setProductPhoto] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStep, setProgressStep] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // New Project Name Modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft prompt text to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(draftPromptKey, promptText);
    } catch {}
  }, [promptText, draftPromptKey]);

  // Sync projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(projects));
    } catch (e) {
      console.warn('Failed to persist website projects:', e);
    }
  }, [projects, storageKey]);

  // Sync active project id
  useEffect(() => {
    try {
      if (activeProjectId) localStorage.setItem(activeIdKey, activeProjectId);
    } catch {}
  }, [activeProjectId, activeIdKey]);

  const activeProject = useMemo(() => {
    if (!projects.length) return null;
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProductPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProductPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenNewProjectModal = () => {
    setNewProjectNameInput('');
    setShowNewProjectModal(true);
  };

  const handleConfirmCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const safeTitle = newProjectNameInput.trim();
    if (!safeTitle) return;

    const files = buildProjectFiles({
      startupName: startup.name,
      tagline: startup.tagline,
      prompt: '',
      industry: startup.industry,
    });

    const newProj: WebsiteProject = {
      id: `proj-${Date.now()}`,
      title: safeTitle,
      tagline: startup.tagline || 'Startup project',
      prompt: '',
      code: files.indexHtml,
      stylesCss: files.stylesCss,
      mainJs: files.mainJs,
      mainTs: files.mainTs,
      packageJson: files.packageJson,
      readmeMd: files.readmeMd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setShowNewProjectModal(false);
    setNewProjectNameInput('');
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setActiveProjectId(filtered[0]?.id || '');
    }
  };

  const handleGenerateWebsite = async (overridePrompt?: string) => {
    const activePrompt = (overridePrompt || promptText).trim() || startup.tagline || startup.pitch || "";
    if (!activePrompt) {
      setGenerationError("Describe the website you want before generating it.");
      return;
    }
    setGenerationError("");
    setIsGenerating(true);
    setProgressPercent(15);
    setProgressStep("Designing a unique page structure and visual system…");

    try {
      setProgressPercent(35);
      setProgressStep("Building custom HTML, CSS, and TypeScript interactions. This can take up to two minutes…");
      const data = await postMornAI<GeneratedWebsite>("website-generate", {
        startup: { name: startup.name, industry: startup.industry, tagline: startup.tagline, pitch: startup.pitch },
        prompt: activePrompt,
        imageProvided: Boolean(productPhoto || activeProject?.imagePreview),
      });
      setProgressPercent(75);
      setProgressStep(data.degraded ? "The AI model is unavailable. Preparing an editable starter design…" : "Rendering the validated HTML, CSS, and TypeScript design…");
      const files = composeGeneratedWebsiteFiles(data, {
        startupName: startup.name,
        imageUrl: productPhoto || activeProject?.imagePreview,
        prompt: activePrompt,
      });
      const newTitle = data.title || (startup.name + " Website");
      const newTagline = data.tagline || activePrompt;
      const now = Date.now();

      if (activeProject) {
        setProjects((prev) => prev.map((p) => p.id === activeProject.id ? {
          ...p, title: newTitle, tagline: newTagline, prompt: activePrompt,
          imagePreview: productPhoto || p.imagePreview,
          code: files.indexHtml, stylesCss: files.stylesCss, mainJs: files.mainJs, mainTs: files.mainTs,
          packageJson: files.packageJson, readmeMd: files.readmeMd, updatedAt: now,
        } : p));
      } else {
        const project: WebsiteProject = {
          id: "proj-" + now, title: newTitle, tagline: newTagline, prompt: activePrompt,
          imagePreview: productPhoto, code: files.indexHtml, stylesCss: files.stylesCss,
          mainJs: files.mainJs, mainTs: files.mainTs, packageJson: files.packageJson, readmeMd: files.readmeMd,
          createdAt: now, updatedAt: now,
        };
        setProjects((prev) => [project, ...prev]);
        setActiveProjectId(project.id);
      }
      setViewMode("preview");
      setProgressPercent(100);
      setProgressStep(data.degraded ? "Starter website created. Review the placeholder details before publishing." : "Website generated successfully.");
      window.setTimeout(() => { setIsGenerating(false); setProgressPercent(0); setProgressStep(""); }, data.degraded ? 2400 : 700);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Website generation failed. Please try again.";
      console.error("Website generation failed:", error);
      setGenerationError(message);
      setProgressPercent(0);
      setProgressStep("Generation failed — your existing project was not replaced.");
      setIsGenerating(false);
    }
  };

  // Download project as true .ZIP archive
  const handleDownloadZip = () => {
    if (!activeProject) return;

    const files = buildProjectFiles({
      startupName: startup.name,
      tagline: activeProject.tagline,
      prompt: activeProject.prompt,
      industry: startup.industry,
      imageUrl: activeProject.imagePreview,
    });

    const zipBlob = createZipBlob([
      { name: 'index.html', content: hydrateWebsiteImage(activeProject.code || files.indexHtml, activeProject.imagePreview || '') },
      { name: 'src/styles.css', content: activeProject.stylesCss || files.stylesCss },
      { name: 'src/main.js', content: activeProject.mainJs || files.mainJs },
      ...(activeProject.mainTs ? [{ name: 'src/main.ts', content: activeProject.mainTs }] : []),
      { name: 'package.json', content: activeProject.packageJson || files.packageJson },
      { name: 'README.md', content: activeProject.readmeMd || files.readmeMd },
    ]);

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    const safeFilename = (activeProject.title || startup.name || 'website')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    link.download = `${safeFilename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCurrentCode = async () => {
    const codeToCopy = getActiveCodeContent();
    if (!codeToCopy) return;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = codeToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getActiveCodeContent = (): string => {
    if (!activeProject) return '';
    switch (activeCodeFile) {
      case 'index.html':
        return activeProject.code;
      case 'styles.css':
        return activeProject.stylesCss || '';
      case 'main.js':
        return activeProject.mainJs || '';
      case 'main.ts':
        return activeProject.mainTs || '';
      case 'package.json':
        return activeProject.packageJson || '';
      case 'readme.md':
        return activeProject.readmeMd || '';
      default:
        return activeProject.code;
    }
  };

  // Preview only executes inside the sandboxed iframe, never in the MornAI app context.
  const livePreviewHtml = useMemo(() => {
    if (!activeProject?.code) return '';
    let html = hydrateWebsiteImage(activeProject.code, activeProject.imagePreview || '');
    if (activeProject.stylesCss) {
      html = html.replace(/<link\b[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/i,
        '<style>\n' + activeProject.stylesCss + '\n</style>');
    }
    if (activeProject.mainJs) {
      html = html.replace(/<script\b[^>]*src=["']\.\/src\/main\.(?:js|ts)["'][^>]*><\/script>/i,
        '<script>\n' + activeProject.mainJs + '\n</script>');
    }
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:; media-src data: blob:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'; frame-src \'none\'">';
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (head) => head + csp);
    else html = '<head>' + csp + '</head>' + html;
    return html;
  }, [activeProject?.code, activeProject?.stylesCss, activeProject?.mainJs, activeProject?.updatedAt]);

  const suggestionPills = [
    '⚡ Add pricing table with monthly & annual toggle',
    '💬 Add customer reviews & interactive FAQ',
    '🚀 SaaS landing page with conversion hero',
    '🛡️ Enterprise security & compliance showcase',
    '📱 Mobile application launch showcase',
  ];

  // Portaled to document.body to completely cover header, footer, and workspace
  return createPortal(
    <div className="fixed inset-0 z-[999999] w-full h-[100dvh] max-h-[100dvh] bg-white text-slate-900 flex flex-col overflow-hidden overscroll-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Bar (White Theme - Fully Mobile Responsive) */}
      <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shadow-xs">
        {/* Left: Sidebar Toggle + Startup Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition shrink-0"
            title={isSidebarOpen ? 'Hide Projects Sidebar' : 'Show Projects Sidebar'}
            aria-label="Toggle projects sidebar"
          >
            {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-violet-600 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-sm">
              {startup.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 hidden md:block">
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate max-w-[130px] lg:max-w-[220px]">
                {activeProject?.title || `${startup.name} Website Studio`}
              </h1>
              <p className="text-[9px] sm:text-[10px] font-semibold text-slate-500 truncate">
                {activeProject ? 'Saved & Live' : 'Build website with Morn AI'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Preview vs Code & Desktop vs Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 sm:p-1 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === 'preview'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs transition ${
                viewMode === 'code'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Code</span>
            </button>
          </div>

          {/* Viewport toggle (when in Preview mode, desktop/tablet only) */}
          {viewMode === 'preview' && activeProject && (
            <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewportMode === 'desktop'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewportMode === 'mobile'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Download ZIP & Prominent RED Cross Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {activeProject && (
            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-xs shrink-0"
              title="Download complete project files as .ZIP"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download ZIP</span>
            </button>
          )}

          {/* Red Cross Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm active:scale-95 shrink-0"
            aria-label="Close Website Page"
            title="Close Website Page"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Progress Bar (when generating) */}
      {isGenerating && (
        <div className="w-full bg-violet-50/70 border-b border-violet-100 px-6 py-2 flex flex-col gap-1 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-violet-900">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-600" />
              {progressStep}
            </span>
            <span className="font-mono text-violet-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-violet-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-slate-50">
        {/* Mobile Backdrop for Sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Saved Projects (Mobile Overlay + Desktop Inline) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 h-full border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out sm:static sm:z-auto ${
            isSidebarOpen
              ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl sm:shadow-none'
              : '-translate-x-full sm:translate-x-0 sm:w-0 sm:overflow-hidden sm:border-r-0'
          }`}
        >
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Your Projects
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {projects.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* New Project Button */}
              <button
                type="button"
                onClick={() => {
                  handleOpenNewProjectModal();
                  if (typeof window !== 'undefined' && window.innerWidth < 640) setIsSidebarOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition shadow-xs"
                title="Create new website project"
              >
                <Plus className="h-3 w-3" />
                <span>New</span>
              </button>

              {/* Close Sidebar Button on Mobile */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2 overscroll-contain">
            {projects.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">
                No saved websites yet. Enter a description below to build one!
              </div>
            ) : (
              projects.map((proj) => {
                const active = proj.id === activeProject?.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 640) setIsSidebarOpen(false);
                    }}
                    className={`group relative p-3 rounded-xl border text-left cursor-pointer transition ${
                      active
                        ? 'border-violet-600 bg-violet-50/70 text-violet-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${active ? 'text-violet-900 font-extrabold' : 'text-slate-800'}`}>
                          {proj.title}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {proj.tagline || 'Startup Landing Page'}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">
                          {new Date(proj.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Central Display & Bottom Prompt Dock */}
        <main className="flex-1 min-h-0 flex flex-col relative bg-slate-100/60 overflow-hidden">
          {/* Top Canvas Viewport */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-5 overflow-auto">
            {viewMode === 'preview' ? (
              activeProject ? (
                /* Active Project Live Preview */
                <div
                  className={`transition-all duration-300 h-full flex flex-col ${
                    viewportMode === 'mobile'
                      ? 'w-full sm:w-[385px] max-w-full h-full sm:h-[760px] max-h-full sm:rounded-[40px] sm:border-[10px] sm:border-slate-900 shadow-2xl overflow-hidden rounded-xl border border-slate-200 bg-white'
                      : 'w-full h-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden'
                  }`}
                >
                  {/* Browser top-bar mockup (Desktop mode) */}
                  {viewportMode === 'desktop' && (
                    <div className="h-9 shrink-0 bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="flex-1 max-w-sm mx-auto rounded-lg bg-white px-3 py-1 text-[11px] font-mono text-slate-600 truncate text-center border border-slate-200 shadow-xs">
                        https://{startup.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.mornai.app
                      </div>
                    </div>
                  )}

                  {/* Sandboxed Iframe */}
                  <iframe
                    title="Live Website Preview"
                    srcDoc={livePreviewHtml}
                    className="w-full flex-1 border-0 bg-white"
                    sandbox="allow-scripts"
                  />
                </div>
              ) : (
                /* Welcome / Empty State: "Build website with Morn AI" */
                <div className="w-full max-w-2xl mx-auto my-auto rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-10 text-center shadow-lg">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3 sm:mb-5">
                    <Rocket className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Build website with Morn AI
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm mt-2 sm:mt-3 max-w-lg mx-auto leading-relaxed">
                    Describe your startup concept, target audience, and key features below. Morn AI will design, write, and bundle a complete multi-file responsive website for <strong className="text-slate-900">{startup.name}</strong>.
                  </p>

                  <div className="mt-4 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-left">
                    <div className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                      <div className="text-violet-600 font-extrabold text-xs uppercase tracking-wider">1. High-Impact Hero</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Dynamic value proposition, conversion CTAs, and product showcases.</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                      <div className="text-indigo-600 font-extrabold text-xs uppercase tracking-wider">2. Interactive Code</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Pricing toggles, mobile drawers, and smooth animations in vanilla JS.</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl border border-slate-100 bg-slate-50/70">
                      <div className="text-emerald-600 font-extrabold text-xs uppercase tracking-wider">3. ZIP Code Export</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Organized project files (HTML, CSS, JS, package.json) ready to deploy.</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Google AI Studio Organized Code Explorer */
              <div className="w-full h-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white shadow-lg flex flex-col sm:flex-row overflow-hidden">
                {/* Mobile Horizontal File Switcher Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-slate-50 border-b border-slate-200 no-scrollbar sm:hidden shrink-0">
                  {[
                    { id: 'index.html', label: 'index.html', icon: <FileCode className="h-3.5 w-3.5 text-orange-500" /> },
                    { id: 'styles.css', label: 'styles.css', icon: <Palette className="h-3.5 w-3.5 text-blue-500" /> },
                    { id: 'main.js', label: 'main.js', icon: <FileCode className="h-3.5 w-3.5 text-amber-500" /> },
                    ...(activeProject?.mainTs ? [{ id: 'main.ts', label: 'main.ts', icon: <FileCode className="h-3.5 w-3.5 text-blue-600" /> }] : []),
                    { id: 'package.json', label: 'package.json', icon: <Package className="h-3.5 w-3.5 text-emerald-500" /> },
                    { id: 'readme.md', label: 'README.md', icon: <FileText className="h-3.5 w-3.5 text-slate-500" /> },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setActiveCodeFile(f.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                        activeCodeFile === f.id
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {f.icon}
                      <span>{f.label}</span>
                    </button>
                  ))}
                </div>

                {/* File Tree Explorer (Left - Desktop Only) */}
                <div className="hidden sm:flex w-56 shrink-0 border-r border-slate-200 bg-slate-50 flex-col">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-violet-600" />
                      Project Files
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{activeProject?.mainTs ? 6 : 5} files</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono">
                    <div className="px-2 py-1 text-[11px] text-slate-400 font-bold">
                      📁 {(activeProject?.title || startup.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}/
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveCodeFile('index.html')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                        activeCodeFile === 'index.html'
                          ? 'bg-violet-100 text-violet-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileCode className="h-4 w-4 text-orange-500" />
                      <span>index.html</span>
                    </button>

                    <div className="pl-3 space-y-1">
                      <div className="px-2 py-0.5 text-[10px] text-slate-400">📁 src/</div>
                      <button
                        type="button"
                        onClick={() => setActiveCodeFile('styles.css')}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition ${
                          activeCodeFile === 'styles.css'
                            ? 'bg-violet-100 text-violet-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Palette className="h-3.5 w-3.5 text-blue-500" />
                        <span>styles.css</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveCodeFile('main.js')}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition ${
                          activeCodeFile === 'main.js'
                            ? 'bg-violet-100 text-violet-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <FileCode className="h-3.5 w-3.5 text-amber-500" />
                        <span>main.js</span>
                      </button>
                      {activeProject?.mainTs && (
                        <button
                          type="button"
                          onClick={() => setActiveCodeFile('main.ts')}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition ${
                            activeCodeFile === 'main.ts'
                              ? 'bg-violet-100 text-violet-900 font-bold'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <FileCode className="h-3.5 w-3.5 text-blue-600" />
                          <span>main.ts</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveCodeFile('package.json')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                        activeCodeFile === 'package.json'
                          ? 'bg-violet-100 text-violet-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Package className="h-4 w-4 text-emerald-500" />
                      <span>package.json</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCodeFile('readme.md')}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                        activeCodeFile === 'readme.md'
                          ? 'bg-violet-100 text-violet-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span>README.md</span>
                    </button>
                  </div>
                </div>

                {/* Code Editor Panel (Right) */}
                <div className="flex-1 min-w-0 flex flex-col bg-white">
                  <div className="h-10 shrink-0 border-b border-slate-200 px-4 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                    <span className="font-mono font-bold text-slate-800 flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-violet-600" />
                      {activeCodeFile}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCurrentCode}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadZip}
                        className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download ZIP</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs text-slate-800 leading-relaxed bg-white selection:bg-violet-200">
                    <pre className="whitespace-pre">{getActiveCodeContent()}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Docked Prompt Input Bar (Permanently Visible & Sticky on Mobile) */}
          <div className="shrink-0 sticky bottom-0 z-40 border-t border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-3 shadow-xl pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            {/* Quick Ideas Chips with Top Padding Fix */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-0.5 pb-1.5 px-0.5 no-scrollbar text-[10px] sm:text-[11px]">
              <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-violet-600" /> Quick ideas:
              </span>
              {suggestionPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => {
                    setPromptText(pill);
                    void handleGenerateWebsite(pill);
                  }}
                  className="shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50 text-slate-700 hover:text-violet-900 transition shadow-xs font-medium"
                >
                  {pill}
                </button>
              ))}
            </div>

            {generationError && (
              <div role="alert" className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                Website generation failed: {generationError} Your existing saved website has been kept.
              </div>
            )}

            {/* Selected Product Picture Thumbnail with Red/Slate Cross Button */}
            {productPhoto && (
              <div className="relative inline-flex items-center gap-2 mb-2 p-1.5 pr-2.5 rounded-xl border border-violet-200 bg-violet-50 max-w-full">
                <img src={productPhoto} alt="Product preview" className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover border border-violet-200 shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-[10px] sm:text-[11px] font-bold text-violet-950 truncate">Picture attached</p>
                  <p className="text-[8px] sm:text-[9px] text-violet-600 truncate">Featured on hero section</p>
                </div>
                {/* Cross Button to remove picture */}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="ml-1.5 p-1 rounded-full bg-rose-100 hover:bg-rose-500 text-rose-600 hover:text-white transition shrink-0"
                  title="Remove selected picture"
                  aria-label="Remove selected picture"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input & Action Row */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Photo Upload Attachment Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="website-photo-upload"
              />
              <label
                htmlFor="website-photo-upload"
                className="cursor-pointer shrink-0 p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-violet-300 text-slate-600 hover:text-violet-600 transition flex items-center justify-center shadow-xs"
                title="Attach product picture"
              >
                <ImagePlus className="h-4 w-4" />
              </label>

              {/* Multiline Prompt Input */}
              <div className="flex-1 min-w-0 relative">
                <input
                  id="website-studio-prompt-input"
                  name="website-prompt"
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleGenerateWebsite();
                    }
                  }}
                  placeholder="Describe your website or ask for changes..."
                  className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100 font-medium shadow-xs select-text"
                />
              </div>

              {/* Generate Website Button */}
              <button
                type="button"
                onClick={() => void handleGenerateWebsite()}
                disabled={isGenerating}
                className="shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold transition shadow-md shadow-violet-600/20 flex items-center gap-1.5 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="hidden xs:inline">Building…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden xs:inline">{projects.length > 0 ? 'Update Website' : 'Generate Website'}</span>
                    <span className="xs:hidden">{projects.length > 0 ? 'Update' : 'Generate'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modal: Ask User for Project Name (No Default Name) */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Name Your Website Project</h3>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. SaaS Launchpad v2, Minimal Storefront"
                  value={newProjectNameInput}
                  onChange={(e) => setNewProjectNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectNameInput.trim()}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-extrabold transition shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
