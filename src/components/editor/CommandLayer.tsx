'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CommandHost } from '@/lib/commands/registry';
import { fileToImage } from '@/lib/export/images';
import { useEditor, type SidePanel } from '@/lib/store/editorStore';
import { CommandPalette } from './CommandPalette';
import { ContextMenu } from './ContextMenu';
import { useExportPdf } from './useExportPdf';

/**
 * The layer that lets features come to the user instead of the other way round.
 *
 * It owns the three surfaces that reach the whole feature set from wherever you
 * happen to be - the command palette, the right-click menu and the file picker
 * for images - plus the one export in flight, so every trigger reports the same
 * progress. Both shells mount it, so the phone and the desktop get the same
 * reach.
 */

interface CommandsValue {
  host: CommandHost;
  openPalette: () => void;
  openContextMenu: (x: number, y: number) => void;
  /** The PDF export, shared by the toolbar button and the palette. */
  exporting: { done: number; total: number } | null;
  exportError: string | null;
}

const CommandsContext = createContext<CommandsValue | null>(null);

export function useCommands(): CommandsValue {
  const value = useContext(CommandsContext);
  if (!value) throw new Error('useCommands must be used inside a CommandLayer.');
  return value;
}

export function CommandLayer({
  onOpenPanel,
  children,
}: {
  /** Each shell reveals its panels differently - a sidebar, or a bottom sheet. */
  onOpenPanel: (panel: SidePanel) => void;
  children: ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { progress, error, exportPdf, saveCopy } = useExportPdf();

  const pickImage = useCallback(() => fileRef.current?.click(), []);

  const host = useMemo<CommandHost>(
    () => ({
      pickImage,
      openPanel: onOpenPanel,
      exportPdf: () => void exportPdf(),
      saveCopy,
    }),
    [pickImage, onOpenPanel, exportPdf, saveCopy],
  );

  const value = useMemo<CommandsValue>(
    () => ({
      host,
      openPalette: () => setPaletteOpen(true),
      openContextMenu: (x, y) => setMenuAt({ x, y }),
      exporting: progress,
      exportError: error,
    }),
    [host, progress, error],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onPickedImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const image = await fileToImage(file);
      const width = 240;
      const store = useEditor.getState();
      const id = store.addOverlay('image');
      store.updateOverlay(
        id,
        {
          src: image.src,
          naturalWidth: image.width,
          naturalHeight: image.height,
          width,
          height: (image.height / image.width) * width,
        },
        { label: 'Add picture' },
      );
    } catch {
      // A file the browser cannot decode simply produces no element.
    }
  };

  return (
    <CommandsContext.Provider value={value}>
      {children}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void onPickedImage(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {paletteOpen ? (
        <CommandPalette host={host} onClose={() => setPaletteOpen(false)} />
      ) : null}

      {menuAt ? (
        <ContextMenu
          x={menuAt.x}
          y={menuAt.y}
          host={host}
          onClose={() => setMenuAt(null)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      ) : null}
    </CommandsContext.Provider>
  );
}
