"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/core';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload-image", { method: "POST", body: formData });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url;
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-full h-auto mt-2 mb-2',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "พิมพ์ข้อความที่นี่...",
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !disabled ? "cursor-text" : ""
        ),
      },
      handlePaste: (view: EditorView, event: ClipboardEvent) => {
         const items = Array.from(event.clipboardData?.items || []);
         for (const item of items) {
           if (item.type.indexOf('image') === 0) {
             const file = item.getAsFile();
             if (file) {
               event.preventDefault();
               uploadImage(file).then(url => {
                 if (url) {
                   const { schema } = view.state;
                   const node = schema.nodes.image.create({ src: url });
                   const transaction = view.state.tr.replaceSelectionWith(node);
                   view.dispatch(transaction);
                 }
               });
               return true;
             }
           }
         }
         return false;
      }
    },
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync value when external component updates it (e.g. quick replies or form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      {!disabled && (
        <div className="flex flex-wrap gap-1 border border-input rounded-md p-1 bg-muted/30">
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("h-8 w-8 p-0", editor.isActive('bold') && 'bg-muted')} title="Bold"><Bold className="h-4 w-4" /></Button>
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("h-8 w-8 p-0", editor.isActive('italic') && 'bg-muted')} title="Italic"><Italic className="h-4 w-4" /></Button>
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("h-8 w-8 p-0", editor.isActive('strike') && 'bg-muted')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
           <div className="w-[1px] h-6 bg-border mx-1 self-center" />
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 2 }) && 'bg-muted')} title="Heading 2"><Heading2 className="h-4 w-4" /></Button>
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-8 w-8 p-0", editor.isActive('bulletList') && 'bg-muted')} title="Bullet List"><List className="h-4 w-4" /></Button>
           <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-8 w-8 p-0", editor.isActive('orderedList') && 'bg-muted')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
        </div>
      )}
      <EditorContent editor={editor} />
      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap {
           outline: none !important;
        }
        .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
        .tiptap h2 { font-size: 1.25em; font-weight: bold; margin-top: 0.5rem; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  )
}
