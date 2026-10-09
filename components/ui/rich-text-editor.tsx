'use client';

import React, { useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  RemoveFormatting, 
  Heading1,
  Heading2,
  Pilcrow,
  FolderPlus
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Tuliskan deskripsi atau petunjuk teknis di sini...' 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const executeCmd = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertHeadingTemplate = () => {
    const template = `<h1>JUDUL SEKSI BARU</h1><p>Tuliskan petunjuk teknis atau uraian untuk bagian ini...</p>`;
    document.execCommand('insertHTML', false, template);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-colors focus-within:ring-2 focus-within:ring-[#DF3B68]/20 focus-within:border-[#DF3B68]">
      {/* Toolbar Format */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-stone-50 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => executeCmd('formatBlock', '<h1>')}
          title="Judul Bab (H1 - Section Notion)"
          className="px-2 py-1.5 rounded-lg text-xs font-bold text-stone-800 dark:text-slate-200 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
        >
          <Heading1 className="w-4 h-4 text-[#DF3B68]" />
          <span>H1</span>
        </button>

        <button
          type="button"
          onClick={() => executeCmd('formatBlock', '<h2>')}
          title="Sub Judul (H2)"
          className="px-2 py-1.5 rounded-lg text-xs font-bold text-stone-800 dark:text-slate-200 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
        >
          <Heading2 className="w-4 h-4 text-stone-600 dark:text-slate-400" />
          <span>H2</span>
        </button>

        <button
          type="button"
          onClick={() => executeCmd('formatBlock', '<p>')}
          title="Paragraf Normal"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Pilcrow className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-stone-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={() => executeCmd('bold')}
          title="Tebal (Ctrl+B)"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCmd('italic')}
          title="Miring (Ctrl+I)"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCmd('underline')}
          title="Garis Bawah (Ctrl+U)"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-stone-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={() => executeCmd('insertUnorderedList')}
          title="Poin Daftar (Bullets)"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCmd('insertOrderedList')}
          title="Penomoran (Numbering)"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-stone-300 dark:bg-slate-600 mx-1" />

        <button
          type="button"
          onClick={insertHeadingTemplate}
          title="Sisipkan Format Judul Bab Baru"
          className="px-2.5 py-1 text-xs font-semibold text-[#DF3B68] bg-[#DF3B68]/10 hover:bg-[#DF3B68]/20 rounded-lg flex items-center gap-1 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>+ Seksi Bab</span>
        </button>

        <button
          type="button"
          onClick={() => executeCmd('removeFormat')}
          title="Hapus Format"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 transition-colors ml-auto"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Lembar Kerja Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="p-4 min-h-[160px] max-h-[380px] overflow-y-auto text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-none leading-relaxed 
        [&_h1]:text-base [&_h1]:font-extrabold [&_h1]:text-stone-900 dark:[&_h1]:text-white [&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:pb-1 [&_h1]:border-b [&_h1]:border-stone-200 dark:[&_h1]:border-slate-700
        [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-stone-800 dark:[&_h2]:text-slate-200 [&_h2]:mt-2.5 [&_h2]:mb-1
        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_b]:font-bold"
      />
    </div>
  );
}
