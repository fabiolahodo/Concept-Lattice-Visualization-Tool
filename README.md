# lattice

A modular JavaScript library and Electron-based desktop application for creating and visualizing concept lattices, powered by D3.js. Designed for academic and research purposes, this tool enables users to generate, render, and interact with concept lattices in an intuitive 2D interface.

> [!TIP]
> Built on **`lattice.js`** — a modular JavaScript renderer. See the repo: <https://github.com/fabiolahodo/lattice>



## 🎥 Demo Preview

![Lattice.js Interactive Demo](./images/latticejsAnimation.gif)

---

## 🚀 Features and Current Status 🚧

### Current Features:
- **Graph Rendering**: Automatically renders nodes, links, and labels based on input data.
- **Dynamic Edge Colors**: Highlights edges connected to a selected node.
- **Interactivity**: Includes drag-and-drop for nodes and zoom/pan functionality for the graph.
- **Constrained Node Movement**: Nodes move freely horizontally but are vertically constrained to preserve hierarchy.
- **Custom Layouts**: Supports customizable layouts, such as hierarchical structures.
- **Scalability**: Modular design makes it easy to extend and maintain.
- **Academic Focus**: Includes tools for dataset handling, graph exporting, and more.

---

## 💻 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or higher recommended)
- [Git](https://git-scm.com/) (to clone the repository)
- [Python](https://www.python.org/downloads/) (3.8 or higher) with [pip](https://pip.pypa.io/en/stable/) .

Once Python is installed, add the FCA `concepts` library:
```bash
pip install concepts
```

### 🧰 Installation Options
You can either **run from source** (recommended for developers/researchers) or **download ready-to-use installers** (recommended for end-users).

---

### Option 1: Run from Source (Repository) 

#### 1. Clone the repository
```bash
git clone https://github.com/fabiolahodo/Concept-Lattice-Visualization-Tool
cd Concept-Lattice-Visualization-Tool
```
#### 2. Install dependencies

```bash
npm install
```

This installs all Node.js and Electron modules defined in the `package.json` file.

---

#### 3. Build the JavaScript bundle (front-end logic for the visualization)

```bash
npm run build
```

This compiles `src/views/explorer.js` into `dist/bundle.js` using Rollup.

---
#### 📝 Notes

📦 Make sure `d3` and `gridjs` are installed by `npm install`.

🔧 Rollup uses `@rollup/plugin-node-resolve` + `@rollup/plugin-commonjs` (already set).

⚠️ Circular dependency warnings from D3 are normal and safe to ignore.

---

#### 4. Start the Electron application

```bash
npm start
```

This launches the Electron desktop app and loads the interface from `src/views/explorer.html`.

### Option 2: Ready to Use (Prebuilt Installers)

If you don’t want to build from source, simply download the **ready-to-use installers** from the [Releases page](https://github.com/fabiolahodo/Concept-Lattice-Visualization-Tool/releases).

After downloading, you’ll find the installers in your **Downloads** folder (or wherever your browser saves files).

Available for:
- **Windows** → `.exe` installer  
- **Linux** → `.AppImage` and `.deb`   

👉 If you build installers yourself using `npm run dist`, they will be created in the local **`dist/`** folder of this project.


---

### 📦 Installed Packages

These packages are installed automatically when you run `npm install`.

#### **Runtime Dependencies** (`"dependencies"`)

| Package      | Version | Purpose                                                                 |
|--------------|---------|-------------------------------------------------------------------------|
| **`d3`**     | ^7.9.0  | Dynamic, interactive data visualizations. Used for rendering lattices. |
| **`gridjs`** | ^6.0.0  | Lightweight table library. Used for rendering the formal context.      |


---

#### **Development Dependencies** (`"devDependencies"`)

| Package | Version | Purpose |
|--------|---------|---------|
| **`electron`** | ^37.2.0 | A framework for creating native desktop applications using web technologies like JavaScript, HTML, and CSS. |
| **`rollup`** | ^4.44.2 | A module bundler for JavaScript. Used to compile your ESModule-based source code into a single browser-ready bundle. |
| **`@rollup/plugin-node-resolve`** | ^16.0.1 | A Rollup plugin that allows Rollup to find and bundle external modules from `node_modules`. Essential for ESModule resolution. |
| **`electron-builder`** | ^24.x | Creates installers for Win/Linux/macOS. |

### 📁 Project Structure

```
.
├── main.js                     # Electron main process (creates browser window)
├── package.json                # Project metadata and scripts
├── rollup.config.mjs           # Rollup config for bundling front-end code
├── dist/
│   └── bundle.js               # Compiled output (from Rollup)
└── src/
    └── views/
        ├── explorer.html       # HTML page rendered inside Electron
        └── explorer.js         # Entry script that initializes the visualization
    └── lattice/                # Core logic for lattice generation, rendering, layout, metrics
    └── features/               # Modular UI/UX features (upload, filters, export, legend, etc.)
    └── context-editor/         # (Modification needed) tools for creating or editing formal contexts
```

---

### 🧠 How to Use the App

1. Launch the app with:

```bash
npm start
```

2. Click the **"Select your JSON file"** button to upload your formal context or lattice data.
   
💡 You can also create a formal context directly in the tool — the lattice will be generated automatically.

3. The graph will render inside the main panel.
    - Interact with nodes (drag, zoom, highlight, etc.).
    - Use sidebar options to explore metrics.
    - Use the options on the page to label concepts, export data, or switch views.

---
### 📄 JSON File Format

The tool accepts **JSON files** that describe either:
- a **formal context** (objects, attributes, and incidence relation), or  
- a **concept lattice** (concepts with their IDs, extents/intents label and links).  

---

#### 1. Formal Context JSON
```bash
json
{
  "objects": ["adult", "female", "juvenile", "male"],
  "properties": ["boy", "girl", "man", "woman"],
  "context": [
    [false, false, true, true],
    [false, true, true, false],
    [true, false, false, true],
    [true, true, false, false],
  ]
}
```
- **`objects`**: list of object names.  
- **`attributes`**: list of attribute names.  
- **`incidence`**: list of `[object, attribute]` pairs where the relation holds.  

💡 When you load this, the tool automatically computes the **concept lattice**.

---

#### 2. Concept Lattice JSON
``` bash
json
{
    "nodes": [
        { "id": "1", "label": "Extent\n{girl, woman, boy, man}\nIntent{}", "level": 1 },
        { "id": "2", "label": "Extent\n{girl, woman}\nIntent{female}", "level": 2 },
        { "id": "3", "label": "Extent\n{boy, man}\nIntent{male}", "level": 2 },
        { "id": "4", "label": "Extent\n{girl, boy}\nIntent{juvenile}", "level": 2 },
        { "id": "5", "label": "Extent\n{woman, man}\nIntent{adult}", "level": 2 },
        { "id": "6", "label": "Extent\n{girl}\nIntent{female, juvenile}", "level": 3 },
        { "id": "7", "label": "Extent\n{woman}\nIntent{female, adult}", "level": 3 },
        { "id": "8", "label": "Extent\n{boy}\nIntent{male, juvenile}", "level": 3 },
        { "id": "9", "label": "Extent\n{man}\nIntent{male, adult}", "level": 3 },
        { "id": "10", "label": "Extent\n{}\nIntent{female, juvenile, adult, male}", "level": 4 }
    ],
    "links": [
        { "source": "1", "target": "2" },
        { "source": "1", "target": "3" },
        { "source": "1", "target": "4" },
        { "source": "1", "target": "5" },
        { "source": "2", "target": "6" },
        { "source": "2", "target": "7" },
        { "source": "3", "target": "8" },
        { "source": "3", "target": "9" },
        { "source": "4", "target": "6" },
        { "source": "4", "target": "8" },
        { "source": "5", "target": "7" },
        { "source": "5", "target": "9" },
        { "source": "6", "target": "10" },
        { "source": "7", "target": "10" },
        { "source": "8", "target": "10" },
        { "source": "9", "target": "10" }
    ]
}

```
- **`concepts`**: each concept has an **extent** (objects) and an **intent** (attributes).  
- **`links`**: edges between concepts (Hasse diagram order).  

💡 If you already computed the lattice with another tool (e.g., Python **`concepts`** library), you can export it into this JSON format and load it directly.

---

### 🛠 Building for Development

To re-bundle the JavaScript automatically during development, run:

```bash
npx rollup -c --watch
```

Or, install Rollup globally and use:

```bash
rollup -c --watch
```

