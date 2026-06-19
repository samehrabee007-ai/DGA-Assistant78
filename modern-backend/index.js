require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { extractFromPdf } = require('./pdfParser');

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// --- Samples Endpoints ---
app.get('/api/samples', async (req, res) => {
    try {
        const samples = await prisma.sample.findMany({ orderBy: { createdAt: 'desc' }});
        res.json(samples);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get unique transformers list
app.get('/api/transformers/list', async (req, res) => {
    try {
        const samples = await prisma.sample.findMany({
            select: { substation: true, transformer: true },
        });
        // Group and unique
        const unique = [];
        const seen = new Set();
        for (const s of samples) {
            if (!s.substation || !s.transformer) continue;
            const key = `${s.substation}::${s.transformer}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push({ substation: s.substation, transformer: s.transformer });
            }
        }
        res.json(unique);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get history for a specific transformer
app.get('/api/transformers/history', async (req, res) => {
    try {
        const { substation, transformer } = req.query;
        if (!substation || !transformer) return res.status(400).json({error: "Missing params"});
        
        const history = await prisma.sample.findMany({
            where: { substation, transformer },
            orderBy: { sampleDate: 'asc' }
        });
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/samples', async (req, res) => {
    try {
        // Date parsing correctly handled by frontend
        const data = { ...req.body };
        if (data.sampleDate) data.sampleDate = new Date(data.sampleDate);
        if (data.analysisDate) data.analysisDate = new Date(data.analysisDate);
        if (data.retestDate) data.retestDate = new Date(data.retestDate);
        if (data.transformerAge !== undefined && data.transformerAge !== null) data.transformerAge = String(data.transformerAge);

        const sample = await prisma.sample.create({ data });
        res.json(sample);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/samples/upload-pdfs', upload.array('pdfs', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No PDF files provided.' });
        
        const results = [];
        for (const file of req.files) {
            try {
                const extractedData = await extractFromPdf(file.buffer);
                
                if (!extractedData || (Array.isArray(extractedData) && extractedData.length === 0) || Object.keys(extractedData).length === 0) {
                    results.push({ fileName: file.originalname, status: 'Failed', reason: 'No readable text found (Might be a scanned image)' });
                    continue;
                }

                const records = Array.isArray(extractedData) ? extractedData : [extractedData];

                for (const record of records) {
                    let payload = { ...record };
                    if (payload.o2 && payload.n2 && payload.n2 !== 0) {
                      payload.o2_n2_ratio = parseFloat((payload.o2 / payload.n2).toFixed(2));
                    }
                    if (payload.recommended && typeof payload.recommended === 'string') {
                      const match = payload.recommended.match(/R(\d+)/i);
                      if (match && payload.analysisDate) {
                        const months = parseInt(match[1], 10);
                        const date = new Date(payload.analysisDate);
                        date.setMonth(date.getMonth() + months);
                        payload.retestDate = date.toISOString();
                      }
                    }
                    
                    if (payload.sampleDate) payload.sampleDate = new Date(payload.sampleDate);
                    if (payload.analysisDate) payload.analysisDate = new Date(payload.analysisDate);
                    if (payload.retestDate) payload.retestDate = new Date(payload.retestDate);
                    if (payload.transformerAge !== undefined && payload.transformerAge !== null) payload.transformerAge = String(payload.transformerAge);

                    const sample = await prisma.sample.create({ data: payload });
                    results.push({ fileName: file.originalname, status: 'Success', id: sample.id, data: record });
                }
            } catch (err) {
                results.push({ fileName: file.originalname, status: 'Error', reason: err.message });
            }
        }
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/samples/:id', async (req, res) => {
    try {
        await prisma.sample.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/samples/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = { ...req.body };
        // Parse dates if present
        if (data.sampleDate) data.sampleDate = new Date(data.sampleDate);
        if (data.analysisDate) data.analysisDate = new Date(data.analysisDate);
        if (data.retestDate) data.retestDate = new Date(data.retestDate);
        if (data.transformerAge !== undefined && data.transformerAge !== null) data.transformerAge = String(data.transformerAge);
        
        // Remove id from payload if present
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;

        const updated = await prisma.sample.update({
            where: { id },
            data
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Thresholds Endpoints ---
app.get('/api/thresholds', async (req, res) => {
    try {
        const thr = await prisma.threshold.findMany();
        res.json(thr);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/thresholds/bulk', async (req, res) => {
    try {
        const { thresholds } = req.body;
        await prisma.threshold.deleteMany();
        const created = await Promise.all(
            thresholds.map(t => prisma.threshold.create({ data: t }))
        );
        res.json(created);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
