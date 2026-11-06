const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// قائمة بمحركات البحث والشبكات المفتوحة لجمع أفضل الحلول
async function searchDuckDuckGo(query) {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " programming code solution")}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });
        
        // استخراج العناوين والروابط البسيطة من نتائج HTML
        const results = [];
        const regex = /<a class="result__url" href="([^"]+)".*?>\s*([^<]+)\s*<\/a>/g;
        let match;
        while ((match = regex.exec(res.data)) !== null && results.length < 5) {
            results.push({
                source: 'DuckDuckGo',
                title: match[2].trim(),
                url: match[1].trim(),
                snippet: 'حل برلمجي مستخرج من نتائج DuckDuckGo'
            });
        }
        return results;
    } catch (e) {
        return [];
    }
}

async function searchSearXNG(query) {
    // شبكة SearXNG المفتوحة (تجمع تلقائياً من Google, Bing, Yahoo, GitHub, StackOverflow)
    const instances = [
        'https://searx.be/search',
        'https://search.ononoki.org/search',
        'https://searx.priv.at/search'
    ];

    for (const baseUrl of instances) {
        try {
            const res = await axios.get(`${baseUrl}?q=${encodeURIComponent(query + " solution")}&format=json`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 4000
            });
            
            if (res.data && res.data.results) {
                return res.data.results.slice(0, 5).map(item => ({
                    source: item.engine || 'Global Search',
                    title: item.title,
                    url: item.url,
                    snippet: item.content || ''
                }));
            }
        } catch (e) {
            // تجربة السيرفر التالي في حالة التعطل
            continue;
        }
    }
    return [];
}

// Route المجمّع لكل محركات البحث
app.post('/search', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'يرجى إرسال نص السؤال' });
    }

    try {
        // تشغيل البحث في كل المصادر بالتوازي للحصول على أسرع وأعلى استجابة
        const [ddgResults, searxResults] = await Promise.allSettled([
            searchDuckDuckGo(query),
            searchSearXNG(query)
        ]);

        const allResults = [];

        if (ddgResults.status === 'fulfilled') allResults.push(...ddgResults.value);
        if (searxResults.status === 'fulfilled') allResults.push(...searxResults.value);

        // تصفية النتائج المكررة بناءً على الرابط
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

        res.json({
            count: uniqueResults.length,
            results: uniqueResults
        });
    } catch (error) {
        console.error("Search Error:", error.message);
        res.status(500).json({ error: "فشل جلب النتائج من محركات البحث" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 السيرفر الشامل يعمل الآن على البورت ${PORT}`));
