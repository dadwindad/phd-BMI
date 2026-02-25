import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(process.env.DATABASE_URL || "bmi_tracker.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    height REAL,
    age INTEGER,
    gender TEXT,
    activity_level TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bmi_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    weight REAL,
    bmi REAL,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3308;

  app.use(express.json());

  // --- Auth Routes ---
  app.get("/api/auth/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.APP_URL}/auth/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get("/auth/callback", async (req, res) => {
    const code = req.query.code as string;

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${process.env.APP_URL}/auth/callback`,
          grant_type: "authorization_code",
        }),
      });

      const { access_token } = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = await userResponse.json();

      // Upsert user based on Google ID
      const existingUser = db.prepare("SELECT * FROM users WHERE id = ?").get(googleUser.id);
      if (!existingUser) {
        // Check if email already exists to avoid UNIQUE constraint error
        const userWithEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(googleUser.email);
        if (userWithEmail) {
          // Update existing user with new Google ID if needed, or just use existing
          db.prepare("UPDATE users SET id = ?, name = ? WHERE email = ?").run(
            googleUser.id,
            googleUser.name,
            googleUser.email
          );
        } else {
          db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
            googleUser.id,
            googleUser.email,
            googleUser.name
          );
        }
      }

      // In a real app, we'd set a secure cookie here. 
      // For this demo, we'll pass the user ID back to the client via postMessage.
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify({ id: googleUser.id, name: googleUser.name, email: googleUser.email })} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/guest", (req, res) => {
    const { id, email, name } = req.body;
    const existingUser = db.prepare("SELECT * FROM users WHERE id = ? OR email = ?").get(id, email);
    if (!existingUser) {
      db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(id, email, name);
    } else if (existingUser.id !== id) {
      // If email exists but with different ID, update the ID (or just handle error)
      db.prepare("UPDATE users SET id = ?, name = ? WHERE email = ?").run(id, name, email);
    }
    res.json({ success: true });
  });

  // --- API Routes ---

  // Get User Profile
  app.get("/api/user/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Update User Profile
  app.post("/api/user/:id/profile", (req, res) => {
    const { height, age, gender, activity_level } = req.body;

    // Ensure user exists before updating
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    db.prepare(`
      UPDATE users 
      SET height = ?, age = ?, gender = ?, activity_level = ? 
      WHERE id = ?
    `).run(height, age, gender, activity_level, req.params.id);
    res.json({ success: true });
  });

  // Get BMI Logs
  app.get("/api/logs/:userId", (req, res) => {
    const logs = db.prepare("SELECT * FROM bmi_logs WHERE user_id = ? ORDER BY date ASC").all(req.params.userId);
    res.json(logs);
  });

  // Add BMI Log
  app.post("/api/logs/:userId", (req, res) => {
    const { weight, bmi, date } = req.body;

    // Ensure user exists to prevent FOREIGN KEY constraint error
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found. Please log in again." });
    }

    // Check if log for this date already exists
    const existing = db.prepare("SELECT id FROM bmi_logs WHERE user_id = ? AND date = ?").get(req.params.userId, date);

    if (existing) {
      db.prepare("UPDATE bmi_logs SET weight = ?, bmi = ? WHERE id = ?").run(weight, bmi, existing.id);
    } else {
      db.prepare("INSERT INTO bmi_logs (user_id, weight, bmi, date) VALUES (?, ?, ?, ?)").run(
        req.params.userId,
        weight,
        bmi,
        date
      );
    }
    res.json({ success: true });
  });

  // Delete BMI Log
  app.delete("/api/logs/:id", (req, res) => {
    db.prepare("DELETE FROM bmi_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
