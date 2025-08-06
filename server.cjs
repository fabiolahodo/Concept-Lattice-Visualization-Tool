//server.js

const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

// Parse incoming JSON payloads (up to 2MB)
app.use(express.json({ limit: '2mb' }));

// === POST /compute-lattice ===
// Receives formal context JSON: {objects, properties, context}
// Sends it to for_concepts.py and returns the computed lattice from concepts python package
app.post("/compute-lattice", (req, res) => {
    // Path to Python script
    const scriptPath = path.join(__dirname, "for_concepts.py");

    //Using python with "py"
    const python = spawn("py", [scriptPath]);
    let output = "";
    let errorOutput = "";

     // Collect standard output from the Python script
    python.stdout.on("data", (data) => {
        output += data.toString();
    });

    // Collect error output (if any) from the Python script
    python.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    // Handle script completion
    python.on("close", (code) => {
        if (code === 0) {
            try {
                // Attempt to parse and return the Python output as JSON
                res.json(JSON.parse(output));
            } catch (err) {
                // If parsing fails, send a server error
                res.status(500).send("Backend error: Failed to parse Python output");
            }
        } else {
            // If script exited with error, send collected stderr as response
            res.status(500).send("Backend error:\n" + errorOutput);
        }
    });

    // Send JSON to Python script via stdin
    python.stdin.write(JSON.stringify(req.body));
    python.stdin.end();
});

// Health check route for basic backend status confirmation
app.get("/", (req, res) => {
    res.send("Backend server is running!");
});

// Start the server and listen on defined port
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
