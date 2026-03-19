# 🏙️ City Coder — CodeScape：未來程市

A browser-based city builder designed to teach kids coding through play. Users script their own miniature 3D island world using Python-like commands, which are executed in real time via a custom interpreter and rendered with Three.js.

This project acts as a **bridge between block-based coding and text-only scripting**: learners begin with a guided tutorial and visual function library, then write code directly while enjoying immediate visual feedback on a living, animated island map.

---

## 🏆 Competition

This project is submitted to the **全國創意與智慧科技競賽 (National Creative & Intelligent Technology Competition) 2026**, hosted by:

- **主辦單位：** 國立臺北教育大學 課程與教學傳播科技研究所  
- **承辦單位：** 中華資訊與科技教育學會  
- **競賽類別：** 資訊教育組  
- **官方網站：** https://www.cacet.org/web/2026creation/index.html

---

## 👥 Team & Roles

| Member | Role |
|---|---|
| **Cindy** | Website development — AI assistant integration, performance optimization, tutorial system, documentation (README), logo design |
| **Selina** | Website development — UI layout and visual design, lesson plan system, debug challenges |
| **Ivy** | Documentation — required competition reports, poster design (21cm × 29cm, 200 dpi) |

---

## 🎯 What We Hope to Achieve

1. A fun, interactive environment where building a city reinforces programming logic.
2. A gentle transition path from drag-and-drop blocks to writing code by hand.
3. Motivation for students to explore more advanced scripting and game development.

---

## ✨ Features

- **Python interpreter** — full in-browser execution supporting variables, `for`/`while` loops, `if/elif/else`, `def`, lists, dicts, and `print()`
- **3D island map** — animated day/night cycle, ocean waves, elevation-based terrain shading, real-time shadow casting
- **10-lesson curriculum** — progressively unlocks building functions as learners master each Python concept
- **Debug challenge system** — exclamation-mark markers appear on buildings; clicking them opens interactive bug-fixing exercises
- **AI assistant (科科)** — built-in chatbot powered by Gemini to answer Python and game questions in Traditional Chinese
- **Function library** — click-to-insert code snippets with hover tooltips

---

## 🗂️ Project Structure

```
├── index.html          # Welcome / landing page
├── tutorial.html       # 5-slide onboarding tutorial
├── app.html            # Main application (editor + 3D map)
├── README.md           # This file
│
├── style.css           # Global layout and base styles
├── app.css             # App-page specific styles
├── lesson-system.css   # Lesson modal styles
├── debug-system.css    # Debug challenge styles
├── ai-assistant.css    # AI panel styles
├── tutorial-style.css  # Tutorial page styles
├── welcome-style.css   # Landing page styles
├── index.css           # Landing page minor overrides
│
├── map-script.js       # Three.js island map, day/night, instanced terrain
├── city_library.js     # Building functions (build_house, build_road, …)
├── python-runner.js    # Custom Python interpreter (tokeniser → parser → evaluator)
├── lesson-system.js    # 10-lesson unlock curriculum
├── debug-system.js     # Exclamation-mark debug challenges
├── ai-assistant.js     # Floating AI chat panel (Gemini backend)
├── app.js              # Main UI logic (editor, run bar, output log)
├── tutorial.js         # Tutorial slide navigation and quiz logic
│
├── functions/
│   └── api/
│       └── chat.js     # Cloudflare Pages Function — Gemini API proxy
│
└── assets/
    └── images/
        └── logo.png
```

---

## 🐍 Supported Python Syntax

```python
# Variables and arithmetic
score = 95
label = "未來城"

# String operations
print("歡迎來到" + label)
print("分數：" + str(score))

# Conditionals
if score >= 90:
    print("A")
elif score >= 70:
    print("B")
else:
    print("C")

# for loops
for i in range(5):
    build_house(40, 40 + i, name="房子" + str(i + 1))

# while loops
col = 40
while col < 46:
    build_road(40, col, "h")
    col += 1

# Functions
def build_block(r, c):
    build_house(r, c)
    build_park(r + 1, c)

build_block(38, 40)

# Lists and dicts
names = ["市政廳", "圖書館", "醫院"]
for i, name in enumerate(names):
    build_school(42 + i, 40, name=name)
```

---

## 🏗️ Available Building Functions

| Function | Description |
|---|---|
| `build_house(row, col, floors=1, name="")` | Residential house |
| `build_park(row, col, name="")` | Park with trees and bench |
| `build_library(row, col, name="")` | Library with columns |
| `build_school(row, col, name="")` | School with flagpole |
| `build_hospital(row, col, name="")` | Hospital with cross |
| `build_shop(row, col, name="")` | Shop with sign |
| `build_fountain(row, col, name="")` | Fountain |
| `build_road(row, col, direction="h")` | Road with sidewalk — `"h"` horizontal, `"v"` vertical |
| `build_power_tower(row, col)` | Electrical tower |
| `build_streetlight(row, col)` | Street light (glows at night) |
| `clear_all()` | Remove all buildings |

> **Valid coordinates:** land tiles only, roughly `row 25–55, col 25–55`. Hover over the map to see exact coordinates.

---

## ⚡ Performance Notes

The terrain uses `THREE.InstancedMesh` — all ~700 land tiles are rendered in **4 draw calls** total (grass, sand, cliffs, hit-detection planes) rather than one draw call per tile. Per-frame heap allocations are eliminated via pre-allocated scratch `THREE.Color` objects.

---

## 🛠️ Local Development

No build step required. Serve the project root with any static file server:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

The AI assistant requires a `GEMINI_API_KEY` environment variable set in the Cloudflare Pages dashboard (or equivalent) for the `/api/chat` proxy function to work.

---

## 📄 License

MIT License © 2026 clotpoledollophead