'use client';

import Image from 'next/image';
import { Eye, FileUp, FolderOpen, Pencil } from 'lucide-react';
import { cx } from '@/lib/utils/cx';
import { Button } from '../ui/Button';

export interface HeaderProps {
  documentName: string;
  /** Shown when no name has been typed - the template's own name. */
  placeholder: string;
  onDocumentNameChange: (value: string) => void;
  savedLabel: string;
  onImport: () => void;
  onPreview: () => void;
  previewActive: boolean;
  onLibrary: () => void;
}

export function Header({
  documentName,
  placeholder,
  onDocumentNameChange,
  savedLabel,
  onImport,
  onPreview,
  previewActive,
  onLibrary,
}: HeaderProps) {
  return (
    <div className="flex h-[64px] shrink-0 items-center gap-2 px-3.5 sm:h-[74px] sm:gap-4 sm:px-5 lg:h-[84px] lg:px-6">
      <span className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {/* Decorative: the wordmark beside it already names the product, so a
            second reading of "Docraft" would only be noise to a screen
            reader. Served at 256px so it stays crisp on a retina screen. */}
        <Image
          src="/logo.png"
          alt=""
          width={256}
          height={256}
          priority
          className="h-[30px] w-[30px] shrink-0 sm:h-[34px] sm:w-[34px] lg:h-[38px] lg:w-[38px]"
        />
        <span className="font-serif text-[20px] leading-none font-semibold text-forge-ink sm:text-[23px] lg:text-[26px]">
          Docraft
        </span>
      </span>

      <span className="mx-2 hidden h-7 w-px bg-forge-line md:block" />

      <span className="hidden min-w-0 items-center gap-2 md:flex">
        <input
          value={documentName}
          placeholder={placeholder}
          onChange={(event) => onDocumentNameChange(event.target.value)}
          aria-label="Document name"
          className="w-[168px] min-w-0 rounded-md bg-transparent px-1 py-0.5 text-[14.5px] font-medium text-forge-ink transition-colors hover:bg-black/[0.035] focus:bg-white focus:ring-2 focus:ring-forge-accent/15 focus:outline-none"
        />
        <Pencil size={14} className="shrink-0 text-forge-muted" />
      </span>

      <span className="ml-3 hidden items-center gap-2 lg:flex">
        <span className="h-[7px] w-[7px] rounded-full bg-forge-green" />
        <span className="text-[13px] whitespace-nowrap text-forge-muted">{savedLabel}</span>
      </span>

      {/* Visibility lives on a wrapper, never on the button itself. Button's
          own class list sets `inline-flex`, and a `hidden` passed in beside it
          is a coin toss decided by stylesheet order - one this codebase loses,
          which is how six buttons ended up in a bar with room for three. */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <span className="hidden xl:contents">
          <Button
            icon={<FolderOpen size={15} />}
            onClick={onLibrary}
            title="Documents you have already made"
          >
            My documents
          </Button>
        </span>
        <span className="contents xl:hidden">
          <Button
            iconOnly
            icon={<FolderOpen size={15} />}
            onClick={onLibrary}
            ariaLabel="My documents"
            title="Documents you have already made"
          />
        </span>

        <span className="hidden sm:contents">
          <Button icon={<FileUp size={15} />} onClick={onImport} title="Import a file">
            Import a file
          </Button>
        </span>
        <span className="contents sm:hidden">
          <Button
            iconOnly
            icon={<FileUp size={15} />}
            onClick={onImport}
            ariaLabel="Import a file"
            title="Import a file"
          />
        </span>

        {/* Preview turns the side panels off, which only means something where
            there are side panels - a phone shows one panel at a time already,
            and has the Preview tab for this. */}
        <span className="hidden sm:contents">
          <Button
            icon={<Eye size={15} />}
            onClick={onPreview}
            title="See the page on its own"
            className={cx(previewActive && 'border-forge-accent text-forge-accent')}
          >
            Preview
          </Button>
        </span>
      </div>
    </div>
  );
}
