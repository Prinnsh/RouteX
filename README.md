<h1 align="center">
  <br>
  <img src="https://lucide.dev/api/icon/satellite?size=64&color=%233b82f6" alt="RouteX BRTS">
  <br>
  RouteX: AI Fleet Intelligence & Utilization Optimizer
  <br>
</h1>

<h4 align="center">A Next-Gen, AI-driven Smart City Digital Twin to eliminate transit route waste and predict passenger mobility.</h4>

<br>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#how-it-works">How To Use</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#demo">Live Demo</a>
</p>

## 🏆 The Problem
Public transit networks globally constantly bleed financial resources due to **"Phantom Buses"** (buses deployed on empty routes) while other corridors suffer severe **overcrowding delays**. Fleet dispatching is traditionally static, relying on intuition and retrospective data rather than real-time dynamic models.

## 💡 The RouteX Solution
**RouteX** is a decentralized Smart City Intelligence Platform that integrates directly into BRTS (Bus Rapid Transit System) ecosystems. By fusing a **Python ML Intelligence Backend** with an asynchronous **Geospatial GIS Digital Twin**, RouteX completely reimagines fleet management.

![App Screenshot](https://raw.githubusercontent.com/Prinnsh/RouteX/master/.github/assets/screenshot.png) *(Note: Replace with your screenshot link)*

### Key Features
*   📍 **Geospatial Digital Twin:** High-fidelity, real-world street topology snapping via OSRM rendering.
*   🧠 **Predictive AI Engine:** Ingests live telemetry (ridership, time slots) and outputs prescriptive fleet redistributions.
*   ⚡ **Live Authority Dispatching:** Natively triggers encrypted remote SMTP email intercepts to depot operators to modify schedules dynamically.
*   📊 **AI Utilization Analytics:** Beautiful edge-rendered interactive metric graphs and automated PDF transit reporting.
*   📱 **Responsive Mobile Control Hub:** Full native execution architecture on any screen layout.

## ⚙️ System Architecture

*   **GUI / Spatial Engine:** Vanilla JavaScript, HTML5/CSS3 (Dynamic Glassmorphic UI), Leaflet.js, Open Source Routing Machine (OSRM).
*   **Intelligence Backend:** Python 3, Flask RestX.
*   **Infrastructure:** Gunicorn orchestrators deployed dynamically over Render Cloud.

## 🚀 How To Deploy Locally

1. Clone this repository to your physical machine:
```bash
git clone https://github.com/Prinnsh/RouteX.git
```
2. Run the isolated python backend environment natively:
```bash
pip install -r requirements.txt
python backend.py
```
3. Open `index.html` natively in any modern Chrome/Edge sandbox!

---
> **Built for Hackathon Submission 2026** - *Scaling global commuting via applied logic.*
