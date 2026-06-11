import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafeLink } from './SafeLink';

describe('SafeLink Component', () => {
  it('should render link with correct text', () => {
    render(<SafeLink href="https://example.com">測試連結</SafeLink>);
    expect(screen.getByText('測試連結')).toBeInTheDocument();
  });

  it('should render external link icon for external URLs', () => {
    const { container } = render(
      <SafeLink href="https://example.com">外部連結</SafeLink>
    );
    // 檢查是否有 ExternalLink 圖示（lucide-react 的 svg）
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should not render external link icon for internal URLs', () => {
    const { container } = render(
      <SafeLink href="/internal-page">內部連結</SafeLink>
    );
    // 內部連結不應該有 ExternalLink 圖示
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('should open trusted domain directly without warning', () => {
    const { container } = render(
      <SafeLink href="https://www.moex.gov.tw/exam">政府網站</SafeLink>
    );
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should show warning dialog for untrusted external links', () => {
    render(
      <SafeLink href="https://untrusted-site.com">不信任的網站</SafeLink>
    );
    
    const link = screen.getByText('不信任的網站');
    fireEvent.click(link);
    
    // 檢查警告對話框是否顯示
    expect(screen.getByText('⚠️ 外部連結警告')).toBeInTheDocument();
    expect(screen.getByText(/您即將離開 iBrain 智匯/)).toBeInTheDocument();
  });

  it('should apply correct CSS classes for visibility', () => {
    const { container } = render(
      <SafeLink href="https://example.com">連結</SafeLink>
    );
    const link = container.querySelector('a');
    
    // 檢查是否有白色文字和下劃線
    expect(link).toHaveClass('text-white');
    expect(link).toHaveClass('underline');
    expect(link).toHaveClass('font-semibold');
  });

  it('should handle missing href gracefully', () => {
    const { container } = render(
      <SafeLink>無連結文字</SafeLink>
    );
    // 沒有 href 時應該渲染為 span
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent('無連結文字');
  });

  it('should open link in new tab with security attributes', () => {
    const { container } = render(
      <SafeLink href="https://www.youtube.com/watch?v=test">YouTube</SafeLink>
    );
    const link = container.querySelector('a');
    
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should prevent default for untrusted links and show dialog', () => {
    const { container } = render(
      <SafeLink href="https://suspicious-site.com">可疑網站</SafeLink>
    );
    
    const link = container.querySelector('a');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
    
    link?.dispatchEvent(clickEvent);
    
    // 應該阻止預設行為並顯示警告
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
