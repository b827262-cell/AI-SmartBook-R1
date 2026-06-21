import { Link } from "react-router-dom";

export function AntiGPortalPage() {
  return (
    <div className="antig-portal-bg">
      <div className="antig-portal-container">
        {/* Header */}
        <div className="antig-portal-hero">
          <div className="antig-portal-badge">AntiG 門戶</div>
          <h1 className="antig-portal-title">台指期與台股法人每日報告</h1>
          <p className="antig-portal-subtitle">
            每日 20:00 自動更新 · 深度法人動向解析 · Telegram 即時通知
          </p>
        </div>

        {/* Main Card */}
        <div className="antig-report-card">
          <div className="antig-report-card-header">
            <div className="antig-report-icon">📊</div>
            <div>
              <h2 className="antig-report-card-title">台指期與台股法人每日報告</h2>
              <p className="antig-report-card-desc">每日 20:00 自動更新，Telegram 通知</p>
            </div>
          </div>

          <div className="antig-report-card-body">
            <p className="antig-report-preview-text">
              包含今日重點、尾盤市場概況、DMI 技術面判讀、法人動向觀察、近二週台指期法人資料與台股現貨三大法人統計。
            </p>
          </div>

          <div className="antig-report-card-actions">
            <Link
              id="btn-view-report"
              to="/antiG/institutional-flow"
              className="antig-btn antig-btn-primary"
            >
              <span>📈</span>
              查看最新報告
            </Link>
            <a
              id="btn-github-report"
              href="https://github.com/b827262-cell/Anti-G-C1/blob/codex/tw-legal-flow-dashboard/reports/LATEST_INSTITUTIONAL_FLOW.md"
              target="_blank"
              rel="noopener noreferrer"
              className="antig-btn antig-btn-secondary"
            >
              <span>🔗</span>
              GitHub Markdown 備用連結
            </a>
          </div>
        </div>

        {/* Info Row */}
        <div className="antig-info-row">
          <div className="antig-info-chip">
            <span>🕗</span>
            每日 20:00 自動執行
          </div>
          <div className="antig-info-chip">
            <span>📡</span>
            Telegram 即時推播
          </div>
          <div className="antig-info-chip">
            <span>🏦</span>
            資料來源：TWSE / TAIFEX 官方
          </div>
        </div>
      </div>
    </div>
  );
}
