/**
 * LaTeX 符號選擇器組件
 * 提供常用 LaTeX 符號和公式模板的快捷輸入
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface LatexSymbol {
  label: string;
  latex: string;
  preview: string;
}

interface LatexTemplate {
  label: string;
  latex: string;
  description: string;
  cursorPosition?: number; // 插入後游標位置（相對於 latex 字串開頭）
}

// 基本運算符號
const basicOperators: LatexSymbol[] = [
  { label: '加', latex: '+', preview: '+' },
  { label: '減', latex: '-', preview: '-' },
  { label: '乘', latex: '\\times', preview: '×' },
  { label: '除', latex: '\\div', preview: '÷' },
  { label: '等於', latex: '=', preview: '=' },
  { label: '不等於', latex: '\\neq', preview: '≠' },
  { label: '約等於', latex: '\\approx', preview: '≈' },
  { label: '全等', latex: '\\equiv', preview: '≡' },
  { label: '小於', latex: '<', preview: '<' },
  { label: '大於', latex: '>', preview: '>' },
  { label: '小於等於', latex: '\\leq', preview: '≤' },
  { label: '大於等於', latex: '\\geq', preview: '≥' },
  { label: '正負', latex: '\\pm', preview: '±' },
  { label: '負正', latex: '\\mp', preview: '∓' },
];

// 希臘字母
const greekLetters: LatexSymbol[] = [
  { label: 'α', latex: '\\alpha', preview: 'α' },
  { label: 'β', latex: '\\beta', preview: 'β' },
  { label: 'γ', latex: '\\gamma', preview: 'γ' },
  { label: 'δ', latex: '\\delta', preview: 'δ' },
  { label: 'ε', latex: '\\epsilon', preview: 'ε' },
  { label: 'θ', latex: '\\theta', preview: 'θ' },
  { label: 'λ', latex: '\\lambda', preview: 'λ' },
  { label: 'μ', latex: '\\mu', preview: 'μ' },
  { label: 'π', latex: '\\pi', preview: 'π' },
  { label: 'σ', latex: '\\sigma', preview: 'σ' },
  { label: 'τ', latex: '\\tau', preview: 'τ' },
  { label: 'φ', latex: '\\phi', preview: 'φ' },
  { label: 'ω', latex: '\\omega', preview: 'ω' },
  { label: 'Γ', latex: '\\Gamma', preview: 'Γ' },
  { label: 'Δ', latex: '\\Delta', preview: 'Δ' },
  { label: 'Θ', latex: '\\Theta', preview: 'Θ' },
  { label: 'Λ', latex: '\\Lambda', preview: 'Λ' },
  { label: 'Σ', latex: '\\Sigma', preview: 'Σ' },
  { label: 'Φ', latex: '\\Phi', preview: 'Φ' },
  { label: 'Ω', latex: '\\Omega', preview: 'Ω' },
];

// 數學符號
const mathSymbols: LatexSymbol[] = [
  { label: '無窮大', latex: '\\infty', preview: '∞' },
  { label: '屬於', latex: '\\in', preview: '∈' },
  { label: '不屬於', latex: '\\notin', preview: '∉' },
  { label: '子集', latex: '\\subset', preview: '⊂' },
  { label: '超集', latex: '\\supset', preview: '⊃' },
  { label: '交集', latex: '\\cap', preview: '∩' },
  { label: '聯集', latex: '\\cup', preview: '∪' },
  { label: '空集', latex: '\\emptyset', preview: '∅' },
  { label: '存在', latex: '\\exists', preview: '∃' },
  { label: '任意', latex: '\\forall', preview: '∀' },
  { label: '右箭頭', latex: '\\rightarrow', preview: '→' },
  { label: '左箭頭', latex: '\\leftarrow', preview: '←' },
  { label: '雙向箭頭', latex: '\\leftrightarrow', preview: '↔' },
  { label: '雙右箭頭', latex: '\\Rightarrow', preview: '⇒' },
  { label: '點乘', latex: '\\cdot', preview: '·' },
  { label: '星號', latex: '\\ast', preview: '∗' },
];

// 函數和運算
const functions: LatexTemplate[] = [
  { label: '分數', latex: '\\frac{}{}', description: '分數', cursorPosition: 6 },
  { label: '根號', latex: '\\sqrt{}', description: '平方根', cursorPosition: 6 },
  { label: 'n次根', latex: '\\sqrt[]{}', description: 'n次方根', cursorPosition: 6 },
  { label: '上標', latex: '^{}', description: '上標/次方', cursorPosition: 2 },
  { label: '下標', latex: '_{}', description: '下標', cursorPosition: 2 },
  { label: '求和', latex: '\\sum_{}^{}', description: '求和符號', cursorPosition: 5 },
  { label: '積分', latex: '\\int_{}^{}', description: '積分符號', cursorPosition: 5 },
  { label: '極限', latex: '\\lim_{x \\to }', description: '極限', cursorPosition: 13 },
  { label: '對數', latex: '\\log_{}', description: '對數', cursorPosition: 5 },
  { label: '自然對數', latex: '\\ln', description: '自然對數' },
  { label: '正弦', latex: '\\sin', description: '正弦函數' },
  { label: '餘弦', latex: '\\cos', description: '餘弦函數' },
  { label: '正切', latex: '\\tan', description: '正切函數' },
];

// 進階公式模板
const templates: LatexTemplate[] = [
  { label: '2x2矩陣', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', description: '2×2 矩陣' },
  { label: '3x3矩陣', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', description: '3×3 矩陣' },
  { label: '分段函數', latex: 'f(x) = \\begin{cases} x^2 & x > 0 \\\\ 0 & x = 0 \\\\ -x^2 & x < 0 \\end{cases}', description: '分段函數' },
  { label: '向量', latex: '\\vec{v} = \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', description: '向量表示' },
  { label: '二次公式', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', description: '一元二次方程解' },
  { label: '導數', latex: '\\frac{d}{dx}f(x)', description: '導數符號' },
  { label: '偏導數', latex: '\\frac{\\partial f}{\\partial x}', description: '偏導數符號' },
  { label: '行列式', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', description: '行列式' },
];

interface LatexSymbolPickerProps {
  onInsert: (latex: string, cursorOffset?: number) => void;
}

export const LatexSymbolPicker: React.FC<LatexSymbolPickerProps> = ({ onInsert }) => {
  const [open, setOpen] = useState(false);

  const handleInsert = (latex: string, cursorOffset?: number) => {
    onInsert(`$${latex}$`, cursorOffset ? cursorOffset + 1 : undefined);
    toast.success('已插入 LaTeX 符號');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Calculator className="h-4 w-4 mr-1" />
          LaTeX 符號
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Tabs defaultValue="operators" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
            <TabsTrigger value="operators" className="text-xs">運算符</TabsTrigger>
            <TabsTrigger value="greek" className="text-xs">希臘字母</TabsTrigger>
            <TabsTrigger value="symbols" className="text-xs">數學符號</TabsTrigger>
            <TabsTrigger value="functions" className="text-xs">函數/模板</TabsTrigger>
          </TabsList>

          <TabsContent value="operators" className="p-3 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-7 gap-1">
              {basicOperators.map((symbol) => (
                <Button
                  key={symbol.latex}
                  variant="ghost"
                  size="sm"
                  className="h-10 text-lg font-mono hover:bg-blue-50"
                  onClick={() => handleInsert(symbol.latex)}
                  title={symbol.label}
                >
                  {symbol.preview}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="greek" className="p-3 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-10 gap-1">
              {greekLetters.map((symbol) => (
                <Button
                  key={symbol.latex}
                  variant="ghost"
                  size="sm"
                  className="h-10 text-lg font-mono hover:bg-blue-50"
                  onClick={() => handleInsert(symbol.latex)}
                  title={symbol.latex}
                >
                  {symbol.preview}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="symbols" className="p-3 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-8 gap-1">
              {mathSymbols.map((symbol) => (
                <Button
                  key={symbol.latex}
                  variant="ghost"
                  size="sm"
                  className="h-10 text-lg font-mono hover:bg-blue-50"
                  onClick={() => handleInsert(symbol.latex)}
                  title={symbol.label}
                >
                  {symbol.preview}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="functions" className="p-3 max-h-[300px] overflow-y-auto">
            <div className="space-y-1">
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">常用函數</h4>
                <div className="grid grid-cols-2 gap-1">
                  {functions.map((template) => (
                    <Button
                      key={template.latex}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 text-left flex flex-col items-start hover:bg-blue-50"
                      onClick={() => handleInsert(template.latex, template.cursorPosition)}
                    >
                      <span className="text-xs font-medium">{template.label}</span>
                      <code className="text-[10px] text-gray-500 mt-0.5">{template.latex}</code>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">進階模板</h4>
                <div className="space-y-1">
                  {templates.map((template) => (
                    <Button
                      key={template.latex}
                      variant="outline"
                      size="sm"
                      className="w-full h-auto py-2 px-3 text-left flex flex-col items-start hover:bg-blue-50"
                      onClick={() => handleInsert(template.latex)}
                    >
                      <span className="text-xs font-medium">{template.label}</span>
                      <span className="text-[10px] text-gray-500 mt-0.5">{template.description}</span>
                      <code className="text-[9px] text-gray-400 mt-1 break-all">{template.latex}</code>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
