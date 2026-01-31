import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // Keep using dotenv for local dev if needed, though Docker handles envs

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY; // Note: Env var name change slightly or mapping required

app.use(cors());
app.use(express.json());

// Persistent Cache File
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour in ms

// Load Cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
        console.error("Failed to load cache", e);
        cache = {};
    }
}

// Helpers
const saveCache = () => {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (e) {
        console.error("Failed to save cache", e);
    }
};

const getTimestamp = () => new Date().getTime();

app.get('/api/quote', async (req, res) => {
    const symbol = req.query.symbol;
    if (!symbol || typeof symbol !== 'string') {
        return res.status(400).json({ error: 'Symbol is required' });
    }

    const upperSymbol = symbol.toUpperCase();
    const now = getTimestamp();

    // Check Cache
    if (cache[upperSymbol]) {
        const entry = cache[upperSymbol];
        if (now - entry.timestamp < CACHE_DURATION) {
            console.log(`Serving ${upperSymbol} from cache`);
            return res.json(entry.data);
        }
        console.log(`Cache expired for ${upperSymbol}`);
    }

    if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'YOUR_API_KEY_HERE') {
         // Mock response if no key configured on server
         console.log("No API Key configured, returning mock data");
         // Reuse the mock logic from frontend roughly? Or just error?
         // User requested "Mock" fallback if key missing in previous prompt, 
         // but here implemented "Server DB".
         // Let's return a specific error or mock.
         // Better to fetch real data if key exists.
         return res.status(503).json({ error: 'API Key not configured on server' });
    }

    // Fetch from API
    try {
        console.log(`Fetching ${upperSymbol} from Alpha Vantage...`);
        const response = await axios.get('https://www.alphavantage.co/query', {
            params: {
                function: 'GLOBAL_QUOTE',
                symbol: upperSymbol,
                apikey: ALPHA_VANTAGE_API_KEY
            }
        });

        const data = response.data;
        if (data['Note'] || data['Information']) {
            console.warn("API Limit or Info:", data);
            // If we have stale cache, maybe return it?
            if (cache[upperSymbol]) {
                console.log(`Rate limit hit, serving stale cache for ${upperSymbol}`);
                return res.json({ ...cache[upperSymbol].data, _stale: true });
            }
            return res.status(429).json({ error: 'Upstream API rate limit or error', details: data });
        }

        const quote = data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
            return res.status(404).json({ error: 'Symbol not found' });
        }

        // Transform to our app format
        const cleanData = {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            previousClose: parseFloat(quote['08. previous close']),
            sector: 'Unknown', // Still need override
            updatedAt: now
        };

        // Update Cache
        cache[upperSymbol] = {
            timestamp: now,
            data: cleanData
        };
        saveCache();

        return res.json(cleanData);

    } catch (error) {
        console.error("Upstream error:", error.message);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
