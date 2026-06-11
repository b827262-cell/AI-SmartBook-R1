import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { RichTextRenderer } from '@/components/RichTextRenderer';

interface LatexPreviewPanelProps {
  content: string;
  title?: string;
  defaultCollapsed?: boolean;
}

/**
 * LaTeX 公式即時預覽面板
 * 顯示富文本內容的渲染效果，特別是 LaTeX 公式
 */
export const LatexPreviewPanel: React.FC<LatexPreviewPanelProps> = ({
  content,
  title = 'LaTeX 預覽',
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showPreview, setShowPreview] = useState(true);

  // 檢測內容中是否包含 LaTeX 語法
  const hasLatex = content.includes('\\') || content.includes('$');

  if (!hasLatex && !content.trim()) {
    return null; // 沒有 LaTeX 內容且內容為空時不顯示
  }

  return (
    <Card className="mt-2 border-blue-200 bg-blue-50/50">
      <div className="flex items-center justify-between p-3 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">{title}</span>
          {hasLatex && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
              包含 LaTeX 公式
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-7 px-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">隱藏</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">顯示</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 px-2"
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && showPreview && (
        <div className="p-4 bg-white">
          <div className="prose prose-sm max-w-none">
            <RichTextRenderer content={content} />
          </div>
        </div>
      )}

      {!isCollapsed && !showPreview && (
        <div className="p-4 bg-gray-50">
          <p className="text-xs text-gray-500 italic">預覽已隱藏</p>
        </div>
      )}
    </Card>
  );
};
