import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Mathematics from "@tiptap/extension-mathematics";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Calculator,
  FileText,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import PdfExtractDialog from "./PdfExtractDialog";
import { LatexSymbolPicker } from "./LatexSymbolPicker";
import "katex/dist/katex.min.css";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  insertImageUrl?: string | null; // 外部插入圖片 URL
  onImageInserted?: () => void; // 圖片插入完成回調
  onFocus?: () => void; // 焦點事件回調
}

export default function RichTextEditor({
  content,
  onChange,
  onFocus,
  placeholder = "輸入內容...",
  className = "",
  insertImageUrl,
  onImageInserted,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Subscript,
      Superscript,
      Mathematics,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  // 同步外部內容變化
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);
  
  // 外部插入圖片 URL
  useEffect(() => {
    if (editor && insertImageUrl) {
      editor.chain().focus().setImage({ src: insertImageUrl }).run();
      onImageInserted?.();
    }
  }, [insertImageUrl, editor, onImageInserted]);

  const uploadImageMutation = trpc.storage.uploadImage.useMutation();
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor) return;

      try {
        // 將文件轉換為 base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64WithPrefix = event.target?.result as string;
          // 移除 data:image/xxx;base64, 前綴
          const base64Data = base64WithPrefix.split(',')[1];
          
          // 上傳到 S3
          const result = await uploadImageMutation.mutateAsync({
            filename: file.name,
            contentType: file.type,
            base64Data,
          });

          // 插入圖片
          if (result.url) {
            editor.chain().focus().setImage({ src: result.url }).run();
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('圖片上傳失敗:', error);
        alert('圖片上傳失敗，請稍後再試');
      }
    };
    input.click();
  }, [editor, uploadImageMutation]);

  const addLink = useCallback(() => {
    const url = window.prompt("輸入連結 URL:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addMath = useCallback(() => {
    const latex = window.prompt("輸入 LaTeX 數學公式（例如：x^2 + y^2 = r^2）:");
    if (latex && editor) {
      editor.chain().focus().insertContent(`<span data-type="mathematics">${latex}</span>`).run();
    }
  }, [editor]);

  const handleLatexInsert = useCallback((latex: string, cursorOffset?: number) => {
    if (!editor) return;
    editor.chain().focus().insertContent(latex).run();
  }, [editor]);

  const handlePdfExtract = useCallback(() => {
    setIsPdfDialogOpen(true);
  }, []);

  const handleImageSelected = useCallback(async (imageDataUrl: string) => {
    if (!editor) return;

    try {
      // 將 Data URL 轉換為 Blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // 轉換為 base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64WithPrefix = event.target?.result as string;
        const base64Data = base64WithPrefix.split(',')[1];
        
        // 上傳到 S3
        const result = await uploadImageMutation.mutateAsync({
          filename: `pdf-extract-${Date.now()}.png`,
          contentType: 'image/png',
          base64Data,
        });

        // 插入圖片
        if (result.url) {
          editor.chain().focus().setImage({ src: result.url }).run();
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      alert('圖片上傳失敗，請稍後再試');
    }
  }, [editor, uploadImageMutation]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      {/* 工具列 */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-gray-200" : ""}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-gray-200" : ""}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive("underline") ? "bg-gray-200" : ""}
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "bg-gray-200" : ""}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "bg-gray-200" : ""}
        >
          <Code className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""}
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "bg-gray-200" : ""}
        >
          <Quote className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={editor.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""}
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={editor.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""}
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={editor.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""}
        >
          <AlignRight className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={editor.isActive("subscript") ? "bg-gray-200" : ""}
          title="下標"
        >
          <SubscriptIcon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={editor.isActive("superscript") ? "bg-gray-200" : ""}
          title="上標"
        >
          <SuperscriptIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button size="sm" variant="ghost" onClick={addMath} title="插入數學公式">
          <Calculator className="w-4 h-4" />
        </Button>
        <LatexSymbolPicker onInsert={handleLatexInsert} />
        <Button size="sm" variant="ghost" onClick={addImage} title="插入圖片">
          <ImageIcon className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handlePdfExtract} title="PDF拆圖">
          <FileText className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={addLink} title="插入連結">
          <LinkIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* 編輯區域 */}
      <div onFocus={onFocus}>
        <EditorContent editor={editor} className="rich-text-editor" />
      </div>
      
      {/* PDF 拆圖對話框 */}
      <PdfExtractDialog
        open={isPdfDialogOpen}
        onOpenChange={setIsPdfDialogOpen}
        onImageSelected={handleImageSelected}
      />
    </div>
  );
}
