# BFF Playground
>
> A local-first, reactive notebook for building full-stack features in a single view.

![Main Interface](screenshots/main-ui.png)

**BFF Playground** bridges the gap between backend logic and frontend UI. It allows you to write Node.js, Python, or Go backend code in one cell and immediately consume that data in a React frontend cell, all within the same reactive environment.

## Features

### 1. Hybrid Runtime Architecture
* **Local Node.js:** Runs directly on your machine. Full access to your **File System**, **Databases**, and **Local Network**.
* **Cloud Polyglot:** Execute Python, Go, Rust, Java, and PHP via the Piston API in a secure sandbox.

### 2. Reactive Data Graph
Just like a spreadsheet, when your Backend Cell finishes execution, any dependent Frontend Cells automatically re-render with the new data. No manual refresh required.

![Polyglot Example](screenshots/polyglot.png)

### 3. Magic Shell (`!`)
Need a library? You don't need to leave the browser. Just type `!npm install` in a backend cell to install packages on the fly.

![Shell Install](screenshots/shell-install.png)

### 4. Professional Developer Experience
* **Monaco Editor:** The same editor engine as VS Code.
* **Persistence:** Your code is auto-saved to `playground.json`.
* **Export:** One-click export to generate valid `.js`, `.jsx`, and `.py` source files.

### 5. Secure Environment Variables Manager
Manage API keys, database credentials, and secrets through an intuitive UI—no more hardcoding sensitive data!

![Environment Variables](screenshots/env-manager.png)

* **Visual Secret Management:** Add, view, and delete environment variables via the "Secrets" button.
* **Secure Storage:** All secrets stored in .env file (gitignored by default).
* **Instant Access:** Use process.env.YOUR_KEY in any Node.js cell.
* **Masked Display:** Values are hidden for security.
* **No Manual Editing:** Never touch .env files directly.

* **Example Usage**
    ```bash
    // Add API_KEY via Secrets UI, then access it:
    const apiKey = process.env.API_KEY;
    const response = await fetch('https://api.example.com', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    ```

---

## Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/VS251/bff-playground.git]
    cd bff-playground
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the Bridge Server**
    ```bash
    npm start
    ```
    *(Or run `node bridge.js` if you haven't set up the start script)*

4.  **Open the Playground**
    Visit `http://localhost:8080` (or open `index.html` directly in your browser).

---

## Important: Connectivity Rules

The playground uses a hybrid execution model with specific networking rules:

| Runtime | Environment | Internet Access | Use Case |
| :--- | :--- | :--- | :--- |
| **Node.js** | Local Machine | ✅ **Yes** | Fetching APIs, Database queries, File I/O |
| **Python** | Cloud Sandbox | ❌ **No** | Data processing, Algorithms, Logic |
| **Go / Rust** | Cloud Sandbox | ❌ **No** | High-performance logic testing |

*If you need to fetch data from an external API (e.g., Weather, Crypto), you **must** use a Node.js cell.*

---

## License

MIT