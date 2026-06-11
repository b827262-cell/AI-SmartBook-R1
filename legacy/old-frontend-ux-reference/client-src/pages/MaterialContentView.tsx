import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, ChevronRight, ChevronDown, FileText } from "lucide-react";

export default function MaterialContentView() {
  const [, params] = useRoute("/admin/material-content/:id");
  const materialId = params?.id ? parseInt(params.id) : 0;

  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // 獲取講義資訊
  const { data: material, isLoading: materialLoading } = trpc.teacherMaterials.list.useQuery(
    undefined,
    {
      select: (data) => data.find((m) => m.id === materialId),
    }
  );

  // 獲取章節列表
  const { data: chapters, isLoading: chaptersLoading } = trpc.materialContents.getByMaterialId.useQuery(
    { materialId },
    { enabled: materialId > 0 }
  );

  // 構建章節樹狀結構
  const chapterTree = chapters ? buildChapterTree(chapters) : [];

  const toggleChapter = (chapterKey: string) => {
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterKey)) {
        newSet.delete(chapterKey);
      } else {
        newSet.add(chapterKey);
      }
      return newSet;
    });
  };

  const selectedChapter = chapters?.find((c) => c.id === selectedChapterId);

  if (materialLoading || chaptersLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>找不到講義</CardTitle>
            <CardDescription>請確認講義 ID 是否正確</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 頂部標題 */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              {material.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>老師：{material.teacherName}</span>
              <span>類科：{material.subjectName}</span>
              <Badge variant="secondary">{material.totalChunks} 段內容</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>
            關閉
          </Button>
        </div>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側：章節列表 */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              章節目錄
            </h2>
            {chapterTree.length === 0 ? (
              <p className="text-sm text-muted-foreground">暫無章節內容</p>
            ) : (
              <div className="space-y-1">
                {chapterTree.map((node) => (
                  <ChapterNode
                    key={node.key}
                    node={node}
                    selectedChapterId={selectedChapterId}
                    expandedChapters={expandedChapters}
                    onSelect={setSelectedChapterId}
                    onToggle={toggleChapter}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：章節內容 */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedChapter ? (
            <div className="p-8 max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Badge variant="outline">Level {selectedChapter.chapterLevel}</Badge>
                  <span>段落 #{selectedChapter.chunkIndex}</span>
                </div>
                <h2 className="text-2xl font-bold">{selectedChapter.chapterTitle}</h2>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {selectedChapter.content}
                </div>
              </div>
              <div className="mt-8 pt-4 border-t text-sm text-muted-foreground">
                字數：{selectedChapter.wordCount} 字
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>請從左側選擇章節查看內容</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 章節樹節點組件 ====================

interface ChapterTreeNode {
  key: string;
  id: number;
  title: string;
  level: number;
  children: ChapterTreeNode[];
}

interface ChapterNodeProps {
  node: ChapterTreeNode;
  selectedChapterId: number | null;
  expandedChapters: Set<string>;
  onSelect: (id: number) => void;
  onToggle: (key: string) => void;
}

function ChapterNode({ node, selectedChapterId, expandedChapters, onSelect, onToggle }: ChapterNodeProps) {
  const isExpanded = expandedChapters.has(node.key);
  const isSelected = selectedChapterId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-200 transition-colors
          ${isSelected ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-700"}
        `}
        style={{ paddingLeft: `${node.level * 12 + 8}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) {
            onToggle(node.key);
          }
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        <span className="text-sm truncate">{node.title}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <ChapterNode
              key={child.key}
              node={child}
              selectedChapterId={selectedChapterId}
              expandedChapters={expandedChapters}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 輔助函數 ====================

function buildChapterTree(chapters: any[]): ChapterTreeNode[] {
  const tree: ChapterTreeNode[] = [];
  const map = new Map<string, ChapterTreeNode>();

  // 按 chunkIndex 排序
  const sortedChapters = [...chapters].sort((a, b) => a.chunkIndex - b.chunkIndex);

  sortedChapters.forEach((chapter) => {
    const node: ChapterTreeNode = {
      key: `${chapter.id}`,
      id: chapter.id,
      title: chapter.chapterTitle,
      level: chapter.chapterLevel,
      children: [],
    };

    map.set(node.key, node);

    if (chapter.chapterLevel === 1) {
      // 主章節直接加入根節點
      tree.push(node);
    } else {
      // 子章節需要找到父章節
      // 簡單邏輯：找到最近的上一層章節
      const parentLevel = chapter.chapterLevel - 1;
      let parent: ChapterTreeNode | undefined;

      // 從後往前找最近的父章節
      for (let i = sortedChapters.indexOf(chapter) - 1; i >= 0; i--) {
        if (sortedChapters[i].chapterLevel === parentLevel) {
          parent = map.get(`${sortedChapters[i].id}`);
          break;
        }
      }

      if (parent) {
        parent.children.push(node);
      } else {
        // 找不到父章節，直接加入根節點
        tree.push(node);
      }
    }
  });

  return tree;
}
