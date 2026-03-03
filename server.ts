import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("prices.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    platform TEXT NOT NULL,
    price REAL NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    target_price REAL NOT NULL,
    user_email TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    added_at TEXT NOT NULL,
    UNIQUE(user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Migration: Add image_url to products if it doesn't exist
  -- We use a try-catch or a check in JS because SQLite doesn't have IF NOT EXISTS for ADD COLUMN
`);

try {
  db.exec("ALTER TABLE products ADD COLUMN image_url TEXT");
} catch (e) {
  // Column likely already exists
}

// Seed data if empty or outdated
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
if (productCount < 15) {
  // Clear existing to re-seed with full list
  db.prepare("DELETE FROM prices").run();
  db.prepare("DELETE FROM products").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('products', 'prices')").run();

  const insertProduct = db.prepare("INSERT INTO products (name, category, image_url) VALUES (?, ?, ?)");
  const insertPrice = db.prepare("INSERT INTO prices (product_id, platform, price, date) VALUES (?, ?, ?, ?)");

  const sampleProducts = [
    { name: "iPhone 15 Pro", category: "Electronics", image_url: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=400" },
    { name: "Samsung Galaxy S24", category: "Electronics", image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=400" },
    { name: "Sony WH-1000XM5", category: "Audio", image_url: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400" },
    { name: "Nike Air Max 270", category: "Footwear", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400" },
    { name: "MacBook Air M3", category: "Laptops", image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400" },
    { name: "iPad Pro M4", category: "Electronics", image_url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=400" },
    { name: "Dell XPS 13", category: "Laptops", image_url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=400" },
    { name: "Bose QuietComfort Ultra", category: "Audio", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400" },
    { name: "Adidas Ultraboost 1.0", category: "Footwear", image_url: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?auto=format&fit=crop&q=80&w=400" },
    { name: "Nintendo Switch OLED", category: "Electronics", image_url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=400" },
    { name: "Logitech MX Master 3S", category: "Accessories", image_url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=400" },
    { name: "Kindle Paperwhite", category: "Electronics", image_url: "https://images.unsplash.com/photo-1592434134753-a70baf7979d7?auto=format&fit=crop&q=80&w=400" },
    { name: "GoPro HERO12 Black", category: "Electronics", image_url: "https://images.unsplash.com/photo-1565849906461-0ee440501d6c?auto=format&fit=crop&q=80&w=400" },
    { name: "Marshall Emberton II", category: "Audio", image_url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=400" },
    { name: "Puma RS-X", category: "Footwear", image_url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400" },
    { name: "Apple Watch Ultra 2", category: "Accessories", image_url: "https://images.unsplash.com/photo-1434493907317-a46b53b81882?auto=format&fit=crop&q=80&w=400" },
    { name: "HP Spectre x360", category: "Laptops", image_url: "https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?auto=format&fit=crop&q=80&w=400" },
    { name: "Sony PlayStation 5", category: "Electronics", image_url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=400" },
    { name: "JBL Flip 6", category: "Audio", image_url: "https://images.unsplash.com/photo-1612444530582-fc66183b16f7?auto=format&fit=crop&q=80&w=400" },
    { name: "Reebok Classic Leather", category: "Footwear", image_url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=400" },
    { name: "Asus ROG Zephyrus G14", category: "Laptops", image_url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=400" },
    { name: "Sennheiser Momentum 4", category: "Audio", image_url: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=400" },
    { name: "New Balance 550", category: "Footwear", image_url: "https://images.unsplash.com/photo-1636718282214-0b414068566c?auto=format&fit=crop&q=80&w=400" },
    { name: "Razer DeathAdder V3 Pro", category: "Accessories", image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=400" },
    { name: "Keychron K2 Wireless", category: "Accessories", image_url: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=400" },
    { name: "Canon EOS R6 Mark II", category: "Electronics", image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400" },
    { name: "Microsoft Surface Pro 9", category: "Laptops", image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=400" }
  ];

  const platforms = ["Amazon", "Flipkart", "Myntra", "Meesho"];
  const now = new Date();

  sampleProducts.forEach((p) => {
    const info = insertProduct.run(p.name, p.category, p.image_url);
    const productId = info.lastInsertRowid;

    // Generate price history for last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      platforms.forEach((plat) => {
        // Random price around a base
        let basePrice = 10000;
        if (p.category === "Electronics") basePrice = 50000;
        else if (p.category === "Laptops") basePrice = 90000;
        else if (p.category === "Audio") basePrice = 20000;
        else if (p.category === "Footwear") basePrice = 8000;
        else if (p.category === "Accessories") basePrice = 5000;

        const randomPrice = basePrice + (Math.random() * 5000 - 2500);
        insertPrice.run(productId, plat, Math.round(randomPrice), dateStr);
      });
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(username, email, password);
      res.json({ success: true, user: { id: info.lastInsertRowid, username, email } });
    } catch (err: any) {
      res.status(400).json({ error: err.message.includes("UNIQUE") ? "Username or email already exists" : "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // API Routes
  app.get("/api/products/search", (req, res) => {
    const query = req.query.q || "";
    const products = db.prepare("SELECT * FROM products WHERE name LIKE ?").all(`%${query}%`);
    res.json(products);
  });

  app.get("/api/products/:id/prices", (req, res) => {
    const productId = req.params.id;
    
    // Get latest prices from each platform
    const latestPrices = db.prepare(`
      SELECT p.*, pr.name as product_name
      FROM prices p
      JOIN products pr ON p.product_id = pr.id
      WHERE p.product_id = ? 
      AND p.date = (SELECT MAX(date) FROM prices WHERE product_id = ?)
    `).all(productId, productId);

    // Get historical prices for trend
    const history = db.prepare(`
      SELECT date, AVG(price) as avg_price
      FROM prices
      WHERE product_id = ?
      GROUP BY date
      ORDER BY date ASC
    `).all(productId);

    res.json({ latestPrices, history });
  });

  app.post("/api/alerts", (req, res) => {
    const { productId, targetPrice, email } = req.body;
    if (!productId || !targetPrice || !email) {
      return res.status(400).json({ error: "Missing fields" });
    }
    db.prepare("INSERT INTO alerts (product_id, target_price, user_email) VALUES (?, ?, ?)").run(productId, targetPrice, email);
    res.json({ success: true });
  });

  app.get("/api/alerts", (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    const alerts = db.prepare(`
      SELECT a.*, p.name as product_name,
        (SELECT MIN(price) FROM prices WHERE product_id = p.id AND date = (SELECT MAX(date) FROM prices WHERE product_id = p.id)) as current_price
      FROM alerts a
      JOIN products p ON a.product_id = p.id
      WHERE a.user_email = ?
    `).all(email);
    res.json(alerts);
  });

  app.delete("/api/alerts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Wishlist Routes
  app.get("/api/wishlist", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const wishlistItems = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        p.category,
        p.image_url,
        (SELECT MIN(price) FROM prices WHERE product_id = p.id AND date = (SELECT MAX(date) FROM prices WHERE product_id = p.id)) as current_price,
        (SELECT AVG(price) FROM prices WHERE product_id = p.id) as avg_price,
        (SELECT price FROM prices WHERE product_id = p.id AND date = (SELECT date FROM prices WHERE product_id = p.id ORDER BY date ASC LIMIT 1) LIMIT 1) as initial_price
      FROM products p
      JOIN wishlist w ON p.id = w.product_id
      WHERE w.user_id = ?
    `).all(userId);

    res.json(wishlistItems);
  });

  app.post("/api/wishlist", (req, res) => {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: "Missing fields" });
    try {
      db.prepare("INSERT INTO wishlist (user_id, product_id, added_at) VALUES (?, ?, ?)").run(userId, productId, new Date().toISOString());
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Already in wishlist" });
    }
  });

  app.delete("/api/wishlist/:productId", (req, res) => {
    const { userId } = req.query;
    const { productId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    db.prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?").run(userId, productId);
    res.json({ success: true });
  });

  // Deals Route
  app.get("/api/deals", (req, res) => {
    const deals = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        p.category,
        p.image_url,
        (SELECT MIN(price) FROM prices WHERE product_id = p.id AND date = (SELECT MAX(date) FROM prices WHERE product_id = p.id)) as current_price,
        (SELECT AVG(price) FROM prices WHERE product_id = p.id) as avg_price
      FROM products p
      ORDER BY (avg_price - current_price) DESC
      LIMIT 10
    `).all();
    res.json(deals);
  });

  // Global error handler to return JSON instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
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
