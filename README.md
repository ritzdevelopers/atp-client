<div align="center">

<!-- 3D Logo SVG -->
<svg width="420" height="140" viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 3D shadow gradient for letters -->
    <linearGradient id="grad_r" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a78bfa"/>
      <stop offset="50%" style="stop-color:#7c3aed"/>
      <stop offset="100%" style="stop-color:#4c1d95"/>
    </linearGradient>
    <linearGradient id="grad_m" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa"/>
      <stop offset="50%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1e3a8a"/>
    </linearGradient>
    <linearGradient id="grad_w" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#34d399"/>
      <stop offset="50%" style="stop-color:#059669"/>
      <stop offset="100%" style="stop-color:#064e3b"/>
    </linearGradient>
    <linearGradient id="grad_sync" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f9a8d4"/>
      <stop offset="50%" style="stop-color:#ec4899"/>
      <stop offset="100%" style="stop-color:#831843"/>
    </linearGradient>
    <filter id="shadow3d">
      <feDropShadow dx="4" dy="6" stdDeviation="3" flood-color="#00000055"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background glow blobs -->
  <ellipse cx="90" cy="70" rx="80" ry="50" fill="#7c3aed" opacity="0.08"/>
  <ellipse cx="210" cy="70" rx="80" ry="50" fill="#2563eb" opacity="0.08"/>
  <ellipse cx="310" cy="70" rx="70" ry="40" fill="#059669" opacity="0.08"/>

  <!-- 3D SHADOW LAYERS (offset copies for depth) -->
  <!-- R shadow -->
  <text x="12" y="102" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="#2d1564" opacity="0.5" filter="url(#shadow3d)">R</text>
  <!-- M shadow -->
  <text x="83" y="102" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="#0c1e5c" opacity="0.5" filter="url(#shadow3d)">M</text>
  <!-- W shadow -->
  <text x="174" y="102" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="#022b1c" opacity="0.5" filter="url(#shadow3d)">W</text>

  <!-- MAIN 3D LETTERS -->
  <!-- R -->
  <text x="8" y="98" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="url(#grad_r)" filter="url(#glow)">R</text>
  <!-- M -->
  <text x="79" y="98" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="url(#grad_m)" filter="url(#glow)">M</text>
  <!-- W -->
  <text x="170" y="98" font-family="'Georgia', serif" font-size="88" font-weight="900" fill="url(#grad_w)" filter="url(#glow)">W</text>

  <!-- Divider bar -->
  <rect x="275" y="15" width="5" height="100" rx="2.5" fill="#6b7280" opacity="0.35"/>

  <!-- Sync text (smaller, stylized) -->
  <text x="288" y="62" font-family="'Georgia', serif" font-size="42" font-weight="900" fill="url(#grad_sync)" filter="url(#glow)">Sync</text>

  <!-- Tagline under Sync -->
  <text x="289" y="90" font-family="'Arial', sans-serif" font-size="11.5" font-weight="700" fill="#ec4899" letter-spacing="3" opacity="0.85">ATTENDANCE · REDEFINED</text>

  <!-- Subtle underline accent bars -->
  <rect x="8" y="106" width="62" height="4" rx="2" fill="url(#grad_r)" opacity="0.7"/>
  <rect x="79" y="106" width="90" height="4" rx="2" fill="url(#grad_m)" opacity="0.7"/>
  <rect x="170" y="106" width="100" height="4" rx="2" fill="url(#grad_w)" opacity="0.7"/>
</svg>

<br/>

**Enterprise-grade Attendance Management, beautifully simple.**

[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square&labelColor=1e1b4b)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.4.1-059669?style=flat-square&labelColor=064e3b)](CHANGELOG.md)
[![Build](https://img.shields.io/badge/Build-Passing-16a34a?style=flat-square&labelColor=14532d)](https://github.com/rmwsync/rmwsync/actions)
[![Coverage](https://img.shields.io/badge/Coverage-94%25-2563eb?style=flat-square&labelColor=1e3a8a)](https://codecov.io/gh/rmwsync/rmwsync)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-ec4899?style=flat-square&labelColor=831843)](CONTRIBUTING.md)
[![Stars](https://img.shields.io/github/stars/rmwsync/rmwsync?style=flat-square&color=f59e0b&labelColor=451a03)](https://github.com/rmwsync/rmwsync/stargazers)

<br/>

[🚀 Live Demo](https://rmwsync.app) · [📖 Docs](https://docs.rmwsync.app) · [💬 Discord](https://discord.gg/rmwsync) · [🐛 Report Bug](https://github.com/rmwsync/rmwsync/issues) · [✨ Request Feature](https://github.com/rmwsync/rmwsync/discussions)

</div>

---

<br/>

## 🌟 What is RMWSync?

> **RMWSync** is a next-generation, cloud-native SaaS platform for managing employee and student attendance — combining real-time sync, biometric integration, geofencing, and powerful analytics into a single, elegant portal.

Built for **HR teams, schools, enterprises, and remote-first organizations** who need accuracy, speed, and insight — not spreadsheets.

<br/>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🗓️ Smart Attendance Tracking
- Real-time clock-in / clock-out with GPS
- QR Code & Face ID check-in support
- Shift scheduling & overtime detection
- Auto-late / absent marking rules
- Holiday calendar with regional support

</td>
<td width="50%">

### 📊 Powerful Analytics Dashboard
- Live attendance heatmaps
- Department-wise breakdown reports
- Trend analysis with ML predictions
- Export to PDF, Excel, CSV
- Custom KPI dashboards

</td>
</tr>
<tr>
<td>

### 🔔 Smart Notifications
- Instant Slack / Email / SMS alerts
- Absence early-warning triggers
- Manager approval workflows
- Escalation chains & SLA timers
- Digest summaries (daily/weekly)

</td>
<td>

### 🔐 Enterprise Security
- SSO via SAML 2.0 / OAuth 2.0
- Role-based access control (RBAC)
- AES-256 data encryption at rest
- SOC 2 Type II compliant
- Audit logs with tamper detection

</td>
</tr>
<tr>
<td>

### 🌍 Remote & Hybrid Ready
- Geofencing zones with map UI
- VPN-aware check-in validation
- Multi-timezone support
- Work-from-home tagging
- Device fingerprint trust chains

</td>
<td>

### 🔌 100+ Integrations
- HRMS: BambooHR, Workday, SAP
- Payroll: ADP, Gusto, Razorpay
- Comms: Slack, Teams, Google Chat
- Calendar: Google, Outlook, Calendly
- REST API + Webhooks + SDKs

</td>
</tr>
</table>

<br/>

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        RMWSync Platform                      │
├────────────────┬──────────────────┬──────────────────────────┤
│   Web Portal   │   Mobile Apps    │      Admin Console       │
│  (React/Next)  │  (iOS + Android) │     (React + Tailwind)   │
├────────────────┴──────────────────┴──────────────────────────┤
│                      API Gateway (Kong)                      │
│              Rate Limiting · Auth · Load Balancing           │
├──────────────┬─────────────────┬────────────────────────────┤
│   Core API   │  Sync Engine    │   Analytics Engine         │
│  (Node.js)   │  (Go + WebSock) │   (Python + ClickHouse)    │
├──────────────┴─────────────────┴────────────────────────────┤
│  PostgreSQL  │   Redis Cache   │  S3 Object Store           │
└──────────────────────────────────────────────────────────────┘
```

<br/>

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.x |
| PostgreSQL | ≥ 15.x |
| Redis | ≥ 7.x |
| Docker (optional) | ≥ 24.x |

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/rmwsync/rmwsync.git
cd rmwsync

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

### 2. Configure Environment

```env
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/rmwsync
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key
SMTP_HOST=smtp.yourdomain.com
APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed
```

### 4. Launch 🎉

```bash
# Development mode
npm run dev

# Production build
npm run build && npm start
```

> **🐳 Docker Compose**
> ```bash
> docker compose up -d
> ```
> Spins up the full stack (API + DB + Redis + Worker) in under 30 seconds.

<br/>

---

## 📱 Screenshots

<div align="center">

| Dashboard | Attendance Log | Analytics |
|:---:|:---:|:---:|
| ![Dashboard](https://placehold.co/280x160/7c3aed/ffffff?text=Dashboard) | ![Log](https://placehold.co/280x160/2563eb/ffffff?text=Attendance+Log) | ![Analytics](https://placehold.co/280x160/059669/ffffff?text=Analytics) |
| **Live KPIs & heatmap** | **Filterable log view** | **Trend insights** |

</div>

<br/>

---

## 🔌 API Reference

RMWSync exposes a fully-documented REST API.

```http
POST   /api/v1/attendance/checkin
GET    /api/v1/attendance?employeeId=&date=
POST   /api/v1/employees
GET    /api/v1/reports/summary?from=&to=&dept=
GET    /api/v1/analytics/heatmap
```

**Example — Check In:**

```bash
curl -X POST https://api.rmwsync.app/v1/attendance/checkin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-0042",
    "lat": 28.6139,
    "lng": 77.2090,
    "method": "qr_code"
  }'
```

**Response:**
```json
{
  "success": true,
  "checkin_time": "2025-05-29T09:02:14Z",
  "status": "on_time",
  "shift": "Morning · 09:00–18:00",
  "location": "HQ - Block A"
}
```

📖 Full API docs → [docs.rmwsync.app/api](https://docs.rmwsync.app/api)

<br/>

---

## 🗺️ Roadmap

| Quarter | Feature |
|---|---|
| ✅ Q1 2025 | Geofencing 2.0, Multi-org support |
| ✅ Q2 2025 | Face recognition check-in (beta) |
| 🔄 Q3 2025 | AI anomaly detection & alerts |
| 🔄 Q3 2025 | Payroll auto-sync (Gusto, ADP) |
| 📅 Q4 2025 | Mobile offline mode |
| 📅 Q1 2026 | White-label portal builder |

<br/>

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

```bash
# Fork → Clone → Create branch
git checkout -b feat/your-amazing-feature

# Commit with conventional commits
git commit -m "feat: add geofence polygon editor"

# Push and open a PR
git push origin feat/your-amazing-feature
```

All PRs require:
- ✅ Passing CI (lint + tests)
- ✅ ≥ 80% test coverage on new code
- ✅ Review from one maintainer

<br/>

---

## 🧑‍💻 Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

<br/>

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<br/>

---

## 💖 Acknowledgements

- [BullMQ](https://bullmq.io) — job queue engine
- [Recharts](https://recharts.org) — analytics charts
- [MapLibre GL](https://maplibre.org) — geofencing maps
- [Lucia Auth](https://lucia-auth.com) — session management
- All our amazing [contributors](https://github.com/rmwsync/rmwsync/graphs/contributors) 🙏

<br/>

---

<div align="center">

<svg width="360" height="52" viewBox="0 0 360 52" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="footer_grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7c3aed"/>
      <stop offset="50%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
  </defs>
  <rect x="0" y="22" width="360" height="3" rx="1.5" fill="url(#footer_grad)" opacity="0.5"/>
  <text x="180" y="16" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="700" fill="#7c3aed" letter-spacing="2" opacity="0.8">RMWSync</text>
  <text x="180" y="44" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">Made with ♥ · © 2025 RMWSync Team</text>
</svg>

**[⬆ Back to top](#)**

</div>
