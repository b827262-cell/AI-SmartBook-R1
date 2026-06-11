import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface RichTextRendererProps {
  content: string;
  className?: string;
}

/**
 * 解碼 HTML 實體
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * 渲染富文本內容，支援：
 * 1. HTML 標籤（<p>, <img>, <strong> 等）
 * 2. LaTeX 數學公式（$...$ 和 $$...$$）
 * 3. 純文字
 */
export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // 解析內容，提取 LaTeX 公式和 HTML
  const renderContent = () => {
    try {
      // 步驟 1：解碼 HTML 實體
      let processedContent = decodeHTMLEntities(content);
      
      // 步驟 2：預處理：自動識別並包裹 LaTeX 語法
      // 匹配常見的 LaTeX 命令（未被 $ 包裹的）
      // 匹配像 \hat{Y}, \hat(Y), \beta_0, \beta_1 等
      const latexPatterns = [
        // 匹配 \command{...} 或 \command(...)
        /\\(hat|bar|tilde|vec|dot|ddot|frac|sqrt|sum|int|prod|lim|log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|max|min|sup|inf|det|dim|ker|deg|gcd|lcm|mod|bmod|pmod)[\{\(][^\}\)]+[\}\)]/g,
        // 匹配希臘字母和其他符號
        /\\(alpha|beta|gamma|delta|epsilon|varepsilon|theta|vartheta|lambda|mu|sigma|varsigma|omega|pi|varpi|tau|phi|varphi|psi|chi|rho|varrho|nu|xi|zeta|eta|kappa|varkappa|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)/g,
        // 匹配數學運算符和關係符號
        /\\(le|ge|ne|approx|equiv|cong|sim|simeq|propto|pm|mp|times|div|cdot|ast|star|circ|bullet|oplus|ominus|otimes|oslash|odot|cap|cup|sqcap|sqcup|vee|wedge|setminus|wr|diamond|bigtriangleup|bigtriangledown|triangleleft|triangleright|lhd|rhd|unlhd|unrhd|infty|partial|nabla|forall|exists|nexists|emptyset|varnothing|in|notin|ni|subset|subseteq|supset|supseteq|subsetneq|supsetneq|nsubseteq|nsupseteq)/g,
        // 匹配箭頭符號
        /\\(leftarrow|rightarrow|leftrightarrow|Leftarrow|Rightarrow|Leftrightarrow|mapsto|longmapsto|hookleftarrow|hookrightarrow|leftharpoonup|rightharpoonup|leftharpoondown|rightharpoondown|rightleftharpoons|uparrow|downarrow|updownarrow|Uparrow|Downarrow|Updownarrow|nearrow|searrow|swarrow|nwarrow)/g,
        // 匹配下標和上標（如 \beta_0, X^2）
        /\\?(beta|alpha|gamma|delta|epsilon|theta|lambda|mu|sigma|omega|pi|tau|phi|psi|chi|rho|nu|xi|zeta|eta|kappa|[A-Z])_\{?[0-9a-zA-Z]+\}?/g,
        /\\?(beta|alpha|gamma|delta|epsilon|theta|lambda|mu|sigma|omega|pi|tau|phi|psi|chi|rho|nu|xi|zeta|eta|kappa|[A-Z])\^\{?[0-9a-zA-Z]+\}?/g,
        // 匹配 \text{...} 命令
        /\\text\{[^\}]+\}/g,
        // 匹配 \mathbb{...}, \mathcal{...}, \mathbf{...} 等字體命令
        /\\(mathbb|mathcal|mathbf|mathrm|mathit|mathsf|mathtt)\{[^\}]+\}/g,
      ];
      
      // 標記已經被 $ 包裹的區域，避免重複處理
      const dollarRegions: Array<[number, number]> = [];
      const dollarRegex = /\$[^\$]+\$|\$\$[\s\S]+?\$\$/g;
      let dollarMatch;
      while ((dollarMatch = dollarRegex.exec(processedContent)) !== null) {
        dollarRegions.push([dollarMatch.index, dollarMatch.index + dollarMatch[0].length]);
      }
      
      // 檢查位置是否在 $ 包裹區域內
      const isInDollarRegion = (index: number): boolean => {
        return dollarRegions.some(([start, end]) => index >= start && index < end);
      };
      
      // 應用所有 LaTeX 模式
      for (const pattern of latexPatterns) {
        const matches: Array<{ match: string; index: number }> = [];
        let match;
        pattern.lastIndex = 0; // 重置正則表達式狀態
        
        while ((match = pattern.exec(processedContent)) !== null) {
          if (!isInDollarRegion(match.index)) {
            matches.push({ match: match[0], index: match.index });
          }
        }
        
        // 從後往前替換，避免索引偏移
        for (let i = matches.length - 1; i >= 0; i--) {
          const { match: matchStr, index } = matches[i];
          // 將圓括號轉換為花括號（LaTeX 標準語法）
          const normalized = matchStr.replace(/\(/g, '{').replace(/\)/g, '}');
          const wrapped = `$${normalized}$`;
          processedContent = 
            processedContent.substring(0, index) + 
            wrapped + 
            processedContent.substring(index + matchStr.length);
        }
      }
      
      // 步驟 3：處理 LaTeX 環境（如 \begin{matrix}...\end{matrix}）
      // 自動包裹 LaTeX 環境為 $$...$$
      const envRegex = /\\begin\{(matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|align|aligned|gather|gathered|split|multline|equation|eqnarray)\}[\s\S]*?\\end\{\1\}/g;
      processedContent = processedContent.replace(envRegex, (match) => {
        // 檢查是否已經被 $ 包裹
        const index = processedContent.indexOf(match);
        if (isInDollarRegion(index)) {
          return match;
        }
        return `$$${match}$$`;
      });
      
      // 步驟 4：處理 LaTeX 公式
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // 匹配 $$ ... $$ (塊級公式) 和 $ ... $ (行內公式)
      const latexRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
      let latexMatch;
      
      while ((latexMatch = latexRegex.exec(processedContent)) !== null) {
        // 添加公式前的內容
        if (latexMatch.index > lastIndex) {
          const beforeText = processedContent.substring(lastIndex, latexMatch.index);
          parts.push(
            <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: beforeText }} />
          );
        }
        
        // 添加 LaTeX 公式
        const latex = latexMatch[0];
        if (latex.startsWith('$$') && latex.endsWith('$$')) {
          // 塊級公式
          const formula = latex.slice(2, -2).trim();
          parts.push(
            <div key={`block-${latexMatch.index}`} className="my-4">
              <BlockMath math={formula} />
            </div>
          );
        } else if (latex.startsWith('$') && latex.endsWith('$')) {
          // 行內公式
          const formula = latex.slice(1, -1).trim();
          parts.push(
            <span key={`inline-${latexMatch.index}`}>
              <InlineMath math={formula} />
            </span>
          );
        }
        
        lastIndex = latexMatch.index + latexMatch[0].length;
      }
      
      // 添加剩餘的內容
      if (lastIndex < processedContent.length) {
        const remainingText = processedContent.substring(lastIndex);
        parts.push(
          <span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: remainingText }} />
        );
      }
      
      return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: content }} />;
    } catch (error) {
      console.error('RichTextRenderer 渲染錯誤:', error);
      // 降級處理：直接渲染 HTML
      return <span dangerouslySetInnerHTML={{ __html: content }} />;
    }
  };

  return (
    <div className={`rich-text-content ${className}`}>
      {renderContent()}
    </div>
  );
};
