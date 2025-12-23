# TabSense 🧠📑

**Semantic Memory for Browser Tabs**

TabSense is a browser-based system that helps users remember **why they opened a tab** and **how different tabs relate to each other**. Instead of treating tabs as isolated pages, TabSense builds semantic summaries and a lightweight knowledge graph over open tabs, enabling users to regain context, reduce cognitive load, and resume tasks more effectively.

---

## 🎯 Motivation

During research, learning, or multi-step workflows, users often open many tabs and later forget:

- The purpose of a tab
- How it connects to other tabs  
- Which tabs belong to the same task

Traditional bookmarks and tab groups do not capture *intent*. TabSense addresses this gap by acting as a **task memory layer** on top of the browser.

---

## ✨ Key Features

### 🔹 Automatic Tab Summaries
Generates concise summaries for open tabs to help users quickly recall the intent behind each tab.

### 🔹 Semantic Knowledge Graph
- Tabs are represented as nodes
- Salient entities (concepts, products, organizations, people) are linked to tabs
- Shared entities naturally connect related tabs

### 🔹 Intent-Focused Design
- Entity extraction is intentionally **pruned**
- Only memory-relevant concepts are retained
- Avoids clutter and information overload

### 🔹 Interactive Visualization
- Hover over nodes to view summaries
- Click a tab node to navigate back to the browser tab
- Drag nodes to explore relationships

---

## 🧠 Design Philosophy

TabSense is not a general-purpose knowledge graph. It is designed as a **Task Memory Graph**.

**Design principles:**
- Fewer but meaningful entities
- Emphasis on *why* a tab exists
- Visual clarity over exhaustive extraction
- Support human memory, not replace it

---

## 🏗️ System Architecture
```
Browser Extension (Frontend)
│
├─ Collects open tabs
├─ Displays summaries
├─ Renders interactive graph (D3.js)
│
Backend (FastAPI)
│
├─ Fetches tab content
├─ Generates summaries
├─ Extracts salient entities
└─ Builds semantic graph
```

---

## 🛠️ Tech Stack

### Frontend
- Chrome Extension (Manifest V3)
- JavaScript (Vanilla)
- D3.js for graph visualization
- HTML / CSS

### Backend
- Python
- FastAPI
- NLP-based summarization and entity extraction

---

## 📊 Data Model

### Nodes

**Tab**
- title
- summary
- url
- tabId
- windowId

**Entity**
- label
- type (concept, product, organization, person, etc.)

### Edges
- `contains` — tab contains an entity
- `semantically_related` — conceptual relationship between entities

---

## 🚀 How to Run

### Backend
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the `frontend/` directory

---

## 📌 Current Status

**Implemented:**
- ✅ Tab summaries
- ✅ Semantic graph visualization
- ✅ Interactive exploration
- ✅ Tab navigation from graph

**Planned Enhancements:**
- Task-level clustering
- Session-based grouping
- User relevance feedback
- Cross-session memory

---

## 📐 Architecture Diagrams

### High-Level Concept
```mermaid
graph LR
    Tabs["Many Open Tabs"] --> Memory["Task Memory Layer"]
    Memory --> Recall["User Recall"]
    Memory --> Context["Context Restoration"]
    Memory --> Clarity["Reduced Cognitive Load"]
```

### System Architecture
```mermaid
flowchart LR
    User((User))
    
    subgraph Browser["Browser (Chrome Extension)"]
        Tabs[Open Browser Tabs]
        PopupUI[Popup UI]
        GraphUI[Knowledge Graph View]
    end

    subgraph Backend["Backend (FastAPI)"]
        Fetcher[Tab Content Fetcher]
        Summarizer[Summary Generator]
        EntityExtractor[Salient Entity Extractor]
        GraphBuilder[Graph Constructor]
    end

    User --> Tabs
    Tabs --> PopupUI

    PopupUI -->|Tab URLs & Metadata| Backend
    Backend --> Fetcher
    Fetcher --> Summarizer
    Summarizer --> EntityExtractor
    EntityExtractor --> GraphBuilder

    GraphBuilder -->|Nodes & Edges JSON| PopupUI
    PopupUI --> GraphUI

    GraphUI -->|Click Tab Node| Tabs
```

### Semantic Graph Example
```mermaid
graph TD
    Tab1["Tab: GitHub Education"]
    Tab2["Tab: D3.js Documentation"]

    E1["GitHub"]
    E2["Student Developer Pack"]
    E3["Copilot Pro"]
    E4["D3.js"]
    E5["Mike Bostock"]

    Tab1 -->|contains| E1
    Tab1 -->|contains| E2
    Tab1 -->|contains| E3

    Tab2 -->|contains| E4
    Tab2 -->|contains| E5

    E1 ---|related| E3
    E4 ---|created by| E5
```

### Problem: Tab Confusion
```mermaid
flowchart LR
    User((User))

    T1["Tab 1"]
    T2["Tab 2"]
    T3["Tab 3"]
    T4["Tab 4"]
    T5["Tab 5"]
    T6["Tab 6"]

    User --> T1
    User --> T2
    User --> T3
    User --> T4
    User --> T5
    User --> T6

    T1 -.->|?| T3
    T2 -.->|?| T5
    T4 -.->|?| T6
```

### Solution: Task Memory Graph
```mermaid
graph TD
    User((User))

    subgraph Task1["Task: GitHub Student Benefits"]
        TabA["Tab: GitHub Education"]
        E1["GitHub"]
        E2["Student Developer Pack"]
        E3["Copilot Pro"]

        TabA --> E1
        TabA --> E2
        TabA --> E3
    end

    subgraph Task2["Task: Learning D3.js"]
        TabB["Tab: D3.js Docs"]
        E4["D3.js"]
        E5["Mike Bostock"]

        TabB --> E4
        TabB --> E5
    end

    User --> Task1
    User --> Task2
```

---

## 📄 License

MIT License

---
