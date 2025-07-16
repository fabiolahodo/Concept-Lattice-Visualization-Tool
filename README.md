# lattice

A modular JavaScript library and Electron-based desktop application for creating and visualizing concept lattices, powered by D3.js. Designed for academic and research purposes, this tool enables users to generate, render, and interact with concept lattices in an intuitive 2D interface.

---

## 🚀 Features and Current Status 🚧

The library is **not feature-complete** and may have bugs or missing functionalities.

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

### 🧰 Installation Steps

### 🔧 Setup Instructions (Step-by-Step)

#### 1. Install dependencies

```bash
npm install
```

This installs all Node.js and Electron modules defined in the `package.json` file.

---

#### 2. Build the JavaScript bundle (front-end logic for the visualization)

```bash
npm run build
```

This compiles `src/views/explorer.js` into `dist/bundle.js` using Rollup.

---

#### 3. Start the Electron application

```bash
npm start
```

This launches the Electron desktop app and loads the interface from `src/views/explorer.html`.

### 📦 Installed Packages

These packages are installed automatically when you run `npm install`.

#### **Runtime Dependencies** (`"dependencies"`)

| Package | Version | Purpose |
|--------|---------|---------|
| **`d3`** | ^7.9.0 | A JavaScript library for producing dynamic, interactive data visualizations in web browsers. Used for rendering the concept lattice graph. |

---

#### **Development Dependencies** (`"devDependencies"`)

| Package | Version | Purpose |
|--------|---------|---------|
| **`electron`** | ^37.2.0 | A framework for creating native desktop applications using web technologies like JavaScript, HTML, and CSS. |
| **`rollup`** | ^4.44.2 | A module bundler for JavaScript. Used to compile your ESModule-based source code into a single browser-ready bundle. |
| **`@rollup/plugin-node-resolve`** | ^16.0.1 | A Rollup plugin that allows Rollup to find and bundle external modules from `node_modules`. Essential for ESModule resolution. |

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
3. The graph will render inside the main panel.
4. Interact with nodes (drag, zoom, highlight, etc.).
5. Use sidebar options to label, export, or explore metrics.

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

