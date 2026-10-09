'use client';

import React, { useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  RemoveFormatting, 
  Pilcrow
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

  return (
    <div className="border border-stone-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-colors focus-within:ring-2 focus-within:ring-[#DF3B68]/20 focus-within:border-[#DF3B68]">
      {/* Toolbar Format */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-stone-50 dark:bg-slate-800/80 border-b border-stone-200 dark:border-slate-700">
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
          onClick={() => executeCmd('removeFormat')}
          title="Hapus Format"
          className="p-1.5 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-600 transition-colors"
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
        className="p-3.5 min-h-[140px] max-h-[360px] overflow-y-auto text-xs sm:text-sm text-stone-900 dark:text-slate-100 focus:outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_b]:font-bold"
      />
    </div>
  );
}
