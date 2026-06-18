const Excel = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const parseDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string' && d.includes('/')) {
        const p = d.split('/');
        if (p.length === 3 && p[2].length === 4) {
            return new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}T12:00:00Z`);
        }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
};

const parseFloatVal = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
};

async function run() {
    console.log("Loading Excel file...");
    const wb = new Excel.Workbook();
    await wb.xlsx.readFile('D:/dga/DGA-Assistant78/زيوت المنطقة.xlsx');
    const ws = wb.worksheets[0];
    
    let rowsToInsert = [];
    
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        
        const vals = row.values;
        // Values in exceljs are 1-indexed.
        // 1: المحطة, 2: المحول, 3: الجهد, 4: تاريخ العينة, 5: تاريخ التحليل
        
        if (!vals[1] || !vals[2]) return; // Skip if no substation or transformer
        
        rowsToInsert.push({
            substation: String(vals[1] || '').trim(),
            transformer: String(vals[2] || '').trim(),
            voltage: String(vals[3] || '').trim(),
            sampleDate: parseDate(vals[4]),
            analysisDate: parseDate(vals[5]),
            o2: parseFloatVal(vals[7]),
            n2: parseFloatVal(vals[8]),
            o2_n2_ratio: parseFloatVal(vals[9]),
            h2: parseFloatVal(vals[10]),
            co2: parseFloatVal(vals[11]),
            c2h4: parseFloatVal(vals[12]),
            c2h6: parseFloatVal(vals[13]),
            c2h2: parseFloatVal(vals[14]),
            ch4: parseFloatVal(vals[15]),
            co: parseFloatVal(vals[16]),
            resultOfAnalysis: String(vals[17] || '').trim(),
            dga: String(vals[18] || '').trim(),
            recommended: String(vals[19] || '').trim(),
            retestDate: parseDate(vals[20])
        });
    });
    
    console.log(`Found ${rowsToInsert.length} valid rows to insert.`);
    
    // Insert into DB
    let successCount = 0;
    for(let i = 0; i < rowsToInsert.length; i++) {
        try {
            await prisma.sample.create({ data: rowsToInsert[i] });
            successCount++;
            if (successCount % 100 === 0) {
                console.log(`Inserted ${successCount} rows...`);
            }
        } catch(e) {
            console.error(`Error inserting row ${i+2} (${rowsToInsert[i].substation}):`, e.message);
        }
    }
    console.log(`\nSuccessfully inserted ${successCount} rows into Supabase!`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
