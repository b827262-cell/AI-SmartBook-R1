/**
 * 前端 Word 轉 PDF 工具函數
 * 呼叫後端 /api/convert/word-to-pdf，回傳轉換後的 PDF URL 和檔名
 */

export interface WordToPdfResult {
  pdfUrl: string;
  pdfFileName: string;
  fileSize: number;
}

/**
 * 判斷是否為 Word 檔案
 */
export function isWordFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.doc') || name.endsWith('.docx');
}

/**
 * 判斷是否為支援的文件格式（PDF 或 Word）
 */
export function isSupportedDocFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
}

/**
 * 將 Word 檔案上傳到後端並轉換為 PDF
 * @param file Word 檔案
 * @param onProgress 進度回呼（可選）
 * @returns 轉換後的 PDF URL 和檔名
 */
export async function convertWordToPdf(
  file: File,
  onProgress?: (msg: string) => void
): Promise<WordToPdfResult> {
  onProgress?.('Word 轉換 PDF 中（LibreOffice）...');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/convert/word-to-pdf', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: '轉換失敗' }));
    throw new Error(errData.error || `Word 轉 PDF 失敗 (${response.status})`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Word 轉 PDF 失敗');
  }

  onProgress?.('Word 轉換完成！');
  return {
    pdfUrl: data.pdfUrl,
    pdfFileName: data.pdfFileName,
    fileSize: data.fileSize,
  };
}

/**
 * 將 File 讀取為 Base64 字串
 */
export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
