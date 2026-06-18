import pdfplumber, re, io
def _search_num(text, pat):
    m = re.search(pat, text, flags=re.I)
    if m:
        s = m.group(1).replace(",", "").strip()
        try: return float(s)
        except: return s
    return ""
def _search_text(text, keys):
    for k in keys:
        m = re.search(k, text, flags=re.I)
        if m: return m.group(1).strip()
    return ""
def extract_from_pdf(pdf_bytes: bytes):
    result = {}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        all_text = ""
        for p in pdf.pages:
            t = p.extract_text() or ""
            all_text += "\n" + t
    if not all_text.strip(): return result
    result["المحطة"] = _search_text(all_text, [r"المحطة\s*[:\-]?\s*(.+)", r"Substation\s*[:\-]?\s*(.+)"])
    result["المحول"] = _search_text(all_text, [r"المحول\s*[:\-]?\s*(.+)", r"Transformer\s*[:\-]?\s*(.+)"])
    result["الجهد"] = _search_text(all_text, [r"الجهد\s*[:\-]?\s*([0-9/ ]+k?V)", r"Voltage\s*[:\-]?\s*([0-9/ ]+k?V)"])
    result["تاريخ العينة"] = _search_text(all_text, [r"تاريخ\s*العينة\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", r"Sample\s*Date\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})"])
    result["تاريخ التحليل"] = _search_text(all_text, [r"تاريخ\s*التحليل\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})", r"Analysis\s*Date\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})"])
    result["O2"]  = _search_num(all_text, r"O2\s*[:=]?\s*([0-9,\.]+)")
    result["N2"]  = _search_num(all_text, r"N2\s*[:=]?\s*([0-9,\.]+)")
    result["H2"]  = _search_num(all_text, r"H2\s*[:=]?\s*([0-9,\.]+)")
    result["CO2"] = _search_num(all_text, r"CO2\s*[:=]?\s*([0-9,\.]+)")
    result["C2H4"]= _search_num(all_text, r"C2H4\s*[:=]?\s*([0-9,\.]+)")
    result["C2H6"]= _search_num(all_text, r"C2H6\s*[:=]?\s*([0-9,\.]+)")
    result["C2H2"]= _search_num(all_text, r"C2H2\s*[:=]?\s*([0-9,\.]+)")
    result["CH4"] = _search_num(all_text, r"CH4\s*[:=]?\s*([0-9,\.]+)")
    result["CO"]  = _search_num(all_text, r"(?<!CO2)\bCO\s*[:=]?\s*([0-9,\.]+)")
    result["Result of analysis"] = _search_text(all_text, [r"Result\s*of\s*analysis\s*[:\-]?\s*(.+)", r"النتيجة\s*[:\-]?\s*(.+)"])
    result["DGA"] = _search_text(all_text, [r"\bDGA\s*[:\-]?\s*([A-Z0-9\-]+)"])
    result["C.Recommended"] = _search_text(all_text, [r"Recommended\s*[:\-]?\s*(R[1-9])", r"التوصية\s*[:\-]?\s*(R[1-9])"])
    return result

if __name__ == "__main__":
    import sys, json
    if len(sys.argv) > 1:
        try:
            with open(sys.argv[1], "rb") as f:
                res = extract_from_pdf(f.read())
            print(json.dumps(res, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
