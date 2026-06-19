const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Fallback AI Extractor using Gemini
async function extractWithGemini(pdfBuffer) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
        throw new Error("GEMINI_API_KEY is not configured in .env. Cannot process scanned PDF.");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
    ];

    const prompt = `
    Extract the following transformer oil analysis data from this PDF document. 
    It might be in Arabic or English. 
    Return ONLY a valid JSON object matching this schema exactly. 
    If a value is not found, use null. For numbers, return actual numbers, not strings.

    Schema:
    {
        "substation": "string (المحطة / Substation)",
        "transformer": "string (المحول / Transformer)",
        "transformerAge": "string or number (عمر المحول / Transformer Age)",
        "voltage": "string (الجهد / Voltage)",
        "sampleDate": "string (تاريخ العينة / Sample Date, format: YYYY-MM-DD or DD/MM/YYYY)",
        "analysisDate": "string (تاريخ التحليل / Analysis Date, format: YYYY-MM-DD or DD/MM/YYYY)",
        "o2": number (O2 value in ppm),
        "n2": number (N2 value in ppm),
        "h2": number (H2 value in ppm),
        "co2": number (CO2 value in ppm),
        "c2h4": number (C2H4 value in ppm),
        "c2h6": number (C2H6 value in ppm),
        "c2h2": number (C2H2 value in ppm),
        "ch4": number (CH4 value in ppm),
        "co": number (CO value in ppm, careful not to confuse with CO2),
        "resultOfAnalysis": "string (Evaluation / Fault Codes / Result of analysis. Extract the short code like T1, T2, T3, D1, D2, PD, DT, or N)",
        "dga": "string (Detection / DGA codes. Extract the short code like S1, S2, or S3)",
        "recommended": "string (التوصية / Recommended / Action Codes, e.g. R1, R3, R6, R12)"
    }`;

    const pdfPart = {
        inlineData: {
            data: pdfBuffer.toString("base64"),
            mimeType: "application/pdf"
        },
    };

    let lastError = null;
    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying Gemini model: ${modelName}`);
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent([prompt, pdfPart]);
            const responseText = result.response.text();
            return JSON.parse(responseText);
        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
            // If it's a 400 Bad Request or invalid auth, don't retry.
            // But for 503 or 429 or 404, we continue to the next model
            if (error.status === 401 || error.status === 403) {
                throw error;
            }
        }
    }
    
    throw lastError;
}

function extractFromPdf(pdfBuffer) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), `temp_pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);
        
        const scriptPath = path.join(__dirname, '..', 'pdf_import.py');
        
        exec(`python "${scriptPath}" "${tempFilePath}"`, async (error, stdout, stderr) => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            
            try {
                if (error) throw error;
                const jsonStr = stdout.substring(stdout.indexOf('{'), stdout.lastIndexOf('}') + 1);
                let data = JSON.parse(jsonStr);
                
                // If the python script returned empty, or an error, try Gemini
                if (data.error || Object.keys(data).length === 0 || !data.substation) {
                    console.log("Python parser failed or returned empty. Falling back to Gemini OCR...");
                    data = await extractWithGemini(pdfBuffer);
                }
                resolve(data);
            } catch (e) {
                console.log("Standard extraction failed. Trying Gemini OCR...", e.message);
                try {
                    const aiData = await extractWithGemini(pdfBuffer);
                    resolve(aiData);
                } catch (aiError) {
                    console.error("Gemini OCR also failed:", aiError);
                    reject(new Error("Failed to extract data. Is it a scanned PDF? Please configure GEMINI_API_KEY. Details: " + aiError.message));
                }
            }
        });
    });
}

module.exports = { extractFromPdf };
