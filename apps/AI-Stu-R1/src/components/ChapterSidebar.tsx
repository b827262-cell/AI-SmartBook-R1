import { useEffect, useMemo, useState } from "react";
import type { ReaderOutlineNode, ReaderOutlineSource } from "@ai-smartbook/schema";

/**
 * Left textbook-style table-of-contents. The reader prefers normalized JSON
 * outline nodes and falls back to chapter-table nodes when no JSON exists.
 */
export function ChapterSidebar({
  outline,
  activeNodeId,
  outlineSource,
  onSelect,
  width
}: {
  outline: ReaderOutlineNode[];
  activeNodeId: string | null;
  outlineSource: ReaderOutlineSource;
  onSelect: (nodeId: string | null) => void;
  width?: number;
}) {
  const allExpandableIds = useMemo(() => {
    const ids: string[] = [];
    function walk(nodes: ReaderOutlineNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) ids.push(node.id);
        walk(node.children);
      }
    }
    walk(outline);
    return ids;
  }, [outline]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allExpandableIds));

  useEffect(() => {
    setExpanded(new Set(allExpandableIds));
  }, [allExpandableIds]);

  function toggle(nodeId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function renderNodes(nodes: ReaderOutlineNode[]) {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.id);
      const isActive = activeNodeId === node.id;
      return (
        <li key={node.id} className={`toc-node level-${Math.min(node.level, 4)}`}>
          <div className="toc-node-row">
            {hasChildren ? (
              <button
                type="button"
                className="toc-expander"
                onClick={() => toggle(node.id)}
                aria-label={isExpanded ? "收合章節" : "展開章節"}
              >
                {isExpanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="toc-expander placeholder" />
            )}
            <button
              type="button"
              className={`toc-node-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelect(node.id)}
              disabled={node.page == null}
              title={node.page != null ? `Jump to PDF page ${node.page}` : "No PDF page mapping"}
            >
              <span className="toc-node-title">{node.title}</span>
              {node.level <= 1 && node.page != null ? (
                <span className="toc-node-page">p.{node.page}</span>
              ) : null}
            </button>
          </div>
          {hasChildren && isExpanded ? <ul>{renderNodes(node.children)}</ul> : null}
        </li>
      );
    });
  }

  return (
    <aside className="reader-toc" style={width != null ? { width } : undefined}>
      <div className="toc-head">
        <h4>章節目錄</h4>
        <span>{outlineSource === "split_json" ? "JSON" : "Fallback"}</span>
      </div>
      <ul className="chapter-list">
        <li>
          <button
            className={activeNodeId === null ? "active" : ""}
            onClick={() => onSelect(null)}
          >
            全部內容
          </button>
        </li>
        {renderNodes(outline)}
      </ul>
      {outline.length === 0 && <p className="muted toc-empty">尚未建立章節目錄</p>}
    </aside>
  );
}
