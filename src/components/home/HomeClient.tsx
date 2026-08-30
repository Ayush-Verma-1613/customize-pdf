'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { WORKFLOW_STEPS } from '@/data/templates';
import { layoutDocument } from '@/lib/engine/layout';
import { ensureFontsLoaded } from '@/lib/engine/measure';
import { ACCEPTED_IMPORT_TYPES, ImportError, importFile } from '@/lib/import';
import { rememberImport } from '@/lib/import/handoff';
import type { LaidOutDoc } from '@/lib/engine/types';
import type { NumberingConfig, PageSetup, Theme } from '@/lib/model/types';
import { parseContent, SAMPLE_INPUT } from '@/lib/parse/content';
import { saveDocument } from '@/lib/store/storage';
import { buildFromTemplate, getTemplate, TEMPLATES, templateDefaults } from '@/lib/templates';
import { cx } from '@/lib/utils/cx';
import { useIsBrowser, useMediaQuery } from '@/lib/utils/useMedia';
import type { SettingsSectionId } from '@/types/document';
import { AppShell, Workspace } from '@/components/workspace/layout/AppShell';
import { Header } from '@/components/workspace/layout/Header';
import { SiteFooter } from '@/components/workspace/layout/SiteFooter';
import { WorkflowStepper } from '@/components/workspace/layout/WorkflowStepper';
import { DocumentLibrary } from '@/components/workspace/library/DocumentLibrary';
import { DocumentPreview } from '@/components/workspace/preview/DocumentPreview';
import { SettingsPanel } from '@/components/workspace/settings/SettingsPanel';
import { TemplateSidebar } from '@/components/workspace/templates/TemplateSidebar';

type MobileTab = 'templates' | 'preview' | 'settings';

const ZOOM_STEPS = [0.5, 0.65, 0.8, 0.9, 1, 1.15, 1.35, 1.6, 2];
const FIRST = 'question-paper-classic';

/** Changes the workspace has made on top of whatever the template built. */
interface Overrides {
  page: Partial<PageSetup>;
  theme: Partial<Theme>;
  numbering: Partial<NumberingConfig>;
}

const NO_OVERRIDES: Overrides = { page: {}, theme: {}, numbering: {} };

/** Stands in until the browser can measure the text properly. */
const NOT_YET_LAID: LaidOutDoc = {
  pages: [],
  blockPages: {},
  numbers: {},
  warnings: [],
  exact: false,
  totalMarks: 0,
};

/**
 * The workspace.
 *
 * One document is being composed here and every panel is a view of it: the
 * templates decide what it is, the fields fill it in, the settings shape it,
 * and the middle shows the real thing - laid out by the same engine that writes
 * the PDF, so nothing on screen is a mock-up of the result.
 */
export function HomeClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [templateId, setTemplateId] = useState(FIRST);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<Record<string, string>>(() => templateDefaults(FIRST));
  const [content, setContent] = useState('');
  const [overrides, setOverrides] = useState<Overrides>(NO_OVERRIDES);

  const [step, setStep] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [open, setOpen] = useState<SettingsSectionId[]>(['information']);
  // Opens on the panel the first step is about, so the stepper and what is on
  // screen agree from the very first frame.
  const [tab, setTab] = useState<MobileTab>('templates');
  const [focus, setFocus] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  /* One layout is chosen and mounted, rather than three being rendered and two
     hidden with CSS - each of them would otherwise draw a full page of SVG. */
  const isBrowser = useIsBrowser();
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const medium = useMediaQuery('(min-width: 768px) and (max-width: 1023.98px)');

  /* Measurement is only exact once the real faces are in, so the first pass is
     redone the moment they land. */
  useEffect(() => {
    let live = true;
    void ensureFontsLoaded().then((result) => {
      if (live && result.ok) setFontsReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const template = getTemplate(templateId) ?? TEMPLATES[0];
  const templateName = template.name;

  const doc = useMemo(() => {
    const built = buildFromTemplate(templateId, {
      title: title.trim() || templateName,
      fields,
      body: content.trim() ? parseContent(content).blocks : [],
    });
    return {
      ...built,
      page: { ...built.page, ...overrides.page },
      theme: { ...built.theme, ...overrides.theme },
      numbering: { ...built.numbering, ...overrides.numbering },
    };
  }, [templateId, title, templateName, fields, content, overrides]);

  const laid = useMemo(() => {
    // fontsReady is named as a dependency rather than read: the engine measures
    // against the real faces once they land, so the layout has to be redone
    // then even though nothing about the document itself has changed.
    void fontsReady;
    return isBrowser ? layoutDocument(doc) : NOT_YET_LAID;
  }, [doc, fontsReady, isBrowser]);

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    setFields(templateDefaults(id));
    setOverrides(NO_OVERRIDES);
    setStep((current) => Math.max(current, 2));
  };

  const stepZoom = (direction: 1 | -1) =>
    setZoom((current) =>
      direction > 0
        ? (ZOOM_STEPS.find((z) => z > current + 0.001) ?? 2)
        : ([...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? 0.5),
    );

  const toggleSection = (id: SettingsSectionId) =>
    setOpen((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  /** The stepper is a way of getting somewhere, not a decoration. */
  const goToStep = (id: number) => {
    setStep(id);
    const focusOf = WORKFLOW_STEPS.find((s) => s.id === id)?.focus;
    if (focusOf === 'templates') setTab('templates');
    if (focusOf === 'details') {
      setOpen(['information']);
      setTab('settings');
    }
    if (focusOf === 'customise') {
      setOpen(['layout', 'appearance', 'questions']);
      setTab('settings');
    }
    if (focusOf === 'export') {
      setOpen([]);
      setTab('preview');
    }
    setFocus(false);
  };

  /** "See sample papers" - a real one, dropped straight into the content box. */
  const loadSample = () => {
    setContent(SAMPLE_INPUT);
    setOpen(['information']);
    setTab('settings');
    setStep((current) => Math.max(current, 2));
  };

  const flash = (message: string) => {
    setNote(message);
    setTimeout(() => setNote(null), 3600);
  };

  /** Hands the document to the full editor, where anything can be changed. */
  const openInEditor = async (id?: string) => {
    if (busy) return;
    setBusy('Opening the editor…');
    try {
      if (id) {
        router.push(`/editor/${id}`);
        return;
      }
      await saveDocument(doc, laid.pages.length);
      router.push(`/editor/${doc.id}`);
    } catch (error) {
      flash(error instanceof Error ? error.message : 'That could not be opened.');
      setBusy(null);
    }
  };

  const runImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy('Reading your file…');
    try {
      const result = await importFile(file);
      await saveDocument(result.doc);
      rememberImport({
        docId: result.doc.id,
        fidelity: result.fidelity,
        note: result.note,
        suggestedTemplate: result.suggestedTemplate,
      });
      router.push(`/editor/${result.doc.id}`);
    } catch (error) {
      flash(error instanceof ImportError ? error.message : 'That file could not be opened.');
      setBusy(null);
    }
  };

  const sidebar = (
    <TemplateSidebar
      selectedId={templateId}
      onSelect={chooseTemplate}
      query={query}
      onQueryChange={setQuery}
      onBlank={() => chooseTemplate('blank')}
    />
  );

  const preview = (
    <DocumentPreview
      laid={laid}
      zoom={zoom}
      onZoomIn={() => stepZoom(1)}
      onZoomOut={() => stepZoom(-1)}
      onFit={() => setZoom(1)}
    />
  );

  const settings = (
    <SettingsPanel
      template={template}
      doc={doc}
      title={title}
      onTitleChange={setTitle}
      fields={fields}
      onFieldChange={(key, value) => setFields((current) => ({ ...current, [key]: value }))}
      onPage={(patch) => setOverrides((c) => ({ ...c, page: { ...c.page, ...patch } }))}
      onTheme={(patch) => setOverrides((c) => ({ ...c, theme: { ...c.theme, ...patch } }))}
      onNumbering={(patch) =>
        setOverrides((c) => ({ ...c, numbering: { ...c.numbering, ...patch } }))
      }
      open={open}
      onToggle={toggleSection}
      onCollapseAll={() => setOpen([])}
      step={step}
      onBack={() => goToStep(Math.max(1, step - 1))}
      onCreate={() => void openInEditor()}
      busy={busy !== null}
      content={content}
      onContentChange={setContent}
      onInspiration={loadSample}
    />
  );

  return (
    <AppShell
      navbar={
        <Header
          documentName={title}
          placeholder={templateName}
          onDocumentNameChange={setTitle}
          savedLabel={
            laid.pages.length
              ? `${laid.pages.length} page${laid.pages.length === 1 ? '' : 's'} ready`
              : 'Preparing…'
          }
          onImport={() => fileRef.current?.click()}
          onPreview={() => setFocus((value) => !value)}
          previewActive={focus}
          onLibrary={() => setLibraryOpen(true)}
        />
      }
      steps={<WorkflowStepper current={step} onSelect={goToStep} />}
      footer={<SiteFooter step={step} templateName={templateName} />}
    >
      {wide ? (
        <div className="flex flex-col">
          {focus ? (
            <div className="h-[900px] px-6 pt-5 pb-6">{preview}</div>
          ) : (
            <Workspace left={sidebar} centre={preview} right={settings} />
          )}
        </div>
      ) : medium ? (
        <div className="grid h-[460px] grid-cols-[36fr_64fr] gap-5 px-5 pt-4 pb-5">
          {/* The settings take the side column on a tablet rather than being a
              third one that would leave nothing for the page. */}
          {tab === 'settings' ? settings : sidebar}
          {preview}
        </div>
      ) : (
        /* Every tab gets the same room its desktop column has, rather than the
           part of a screen left between the stepper and the footer - so the
           same templates are on offer and the same fields are in reach on a
           phone as on a laptop.

           That makes the body taller than the screen, which is the point: the
           page scrolls until the panel is fully uncovered, from there the panel
           scrolls inside itself exactly as it does on the desktop, and the
           footer arrives at the end of the page instead of sitting across it. */
        <div className="flex h-[930px] flex-col">
          <div className="flex shrink-0 gap-1.5 px-2.5 pt-2.5 pb-2">
            {(['templates', 'preview', 'settings'] as MobileTab[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cx(
                  'min-h-[44px] flex-1 rounded-[11px] text-[13.5px] font-medium capitalize transition-colors',
                  tab === id
                    ? 'bg-forge-dark text-white shadow-sm'
                    : 'border border-forge-line bg-white text-forge-ink-soft',
                )}
              >
                {id}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 px-2.5 pb-2.5 sm:px-4 sm:pb-4">
            {tab === 'templates' ? sidebar : tab === 'preview' ? preview : settings}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMPORT_TYPES}
        className="hidden"
        onChange={(event) => {
          void runImport(event.target.files?.[0]);
          event.target.value = '';
        }}
      />


      <DocumentLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onOpenDocument={(id) => void openInEditor(id)}
      />

      <AnimatePresence>
        {busy || note ? (
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="forge-float pointer-events-none fixed bottom-24 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] whitespace-nowrap text-forge-ink"
          >
            {busy ? <Loader2 size={15} className="animate-spin text-forge-accent" /> : null}
            {busy ?? note}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
