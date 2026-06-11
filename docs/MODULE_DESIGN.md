# Module Design

Rules:

- App layer does not directly write SQL.
- SQL goes through packages/db repositories.
- React components do not call AI SDKs.
- API keys live only in AI-adm-D1 server environment.
- AI-Stu-R1 must not contain provider keys.
- 1GB student machine only runs Nginx + Node.js + SQLite + systemd.
