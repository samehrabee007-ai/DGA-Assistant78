const fs = require('fs');
const { extractFromPdf } = require('./pdfParser');

async function test() {
    try {
        const buf = fs.readFileSync('C:\\Users\\sameh\\OneDrive\\Desktop\\scan20251028135457.pdf');
        const data = await extractFromPdf(buf);
        console.log("Extracted Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
