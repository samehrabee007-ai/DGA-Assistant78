
import streamlit as st
import pandas as pd, json, os
from io import BytesIO
from datetime import datetime
from pdf_import import extract_from_pdf
from report_export import generate_sample_pdf
from storage import load_db, append_to_db, ensure_storage

st.set_page_config(page_title="DGA Assistant", layout="wide")
ensure_storage()

st.title("DGA Assistant — إدارة تحاليل زيت المحولات")

@st.cache_data
def load_thresholds():
    with open("thresholds.json","r",encoding="utf-8") as f:
        return json.load(f)
thr = load_thresholds()

template_cols = ["المحطة","المحول","الجهد","تاريخ العينة","تاريخ التحليل","حتى اليوم",
                 "O2","N2","O2/N2","H2","CO2","C2H4","C2H6","C2H2","CH4","CO",
                 "Result of analysis","DGA","C.Recommended","تاريخ إعادة التحليل"]

def compute_o2n2(row):
    try:
        return float(row.get("O2","")) / float(row.get("N2","")) if row.get("N2") not in ["",None,0] else ""
    except:
        return ""

def retest_date(row):
    rec = str(row.get("C.Recommended","")).upper().strip()
    if len(rec)>=2 and rec[0]=="R" and rec[1:].isdigit():
        months = int(rec[1:])
        try:
            base = pd.to_datetime(row.get("تاريخ التحليل",""))
            if pd.isna(base): return ""
            year = base.year + (base.month + months - 1)//12
            month = (base.month + months - 1)%12 + 1
            day = min(base.day, [31,29 if year%4==0 and (year%100!=0 or year%400==0) else 28,31,30,31,30,31,31,30,31,30,31][month-1])
            return pd.Timestamp(year,month,day)
        except:
            return ""
    return ""

st.sidebar.header("Thresholds (Unknown Age)")
edit_thr = st.sidebar.data_editor(pd.DataFrame(thr["unknown_age"]).set_index("Gas"), use_container_width=True, height=240)
if st.sidebar.button("Save thresholds"):
    new_thr = edit_thr.reset_index().rename(columns={"index":"Gas"})
    thr["unknown_age"] = new_thr.to_dict(orient="records")
    with open("thresholds.json","w",encoding="utf-8") as f:
        json.dump(thr, f, ensure_ascii=False, indent=2)
    st.sidebar.success("Saved.")

tab1, tab2, tab3 = st.tabs(["Import & Edit PDF","Table & Export","Database"])

with tab1:
    uploaded = st.file_uploader("Upload PDF report (text layer preferred)", type=["pdf"])
    if uploaded:
        extracted = extract_from_pdf(uploaded.read())
        st.success("Extracted — you can edit fields below.")
    else:
        extracted = {}
    row = {c: extracted.get(c,"") for c in template_cols if c not in ["O2/N2","تاريخ إعادة التحليل"]}
    edited_row = st.data_editor(pd.DataFrame([row]), num_rows="dynamic", use_container_width=True, key="single")
    if len(edited_row):
        r = edited_row.iloc[0].to_dict()
        r["O2/N2"] = compute_o2n2(r)
        r["تاريخ إعادة التحليل"] = retest_date(r)
        st.write({"O2/N2": r["O2/N2"], "تاريخ إعادة التحليل": r["تاريخ إعادة التحليل"]})
        c1,c2 = st.columns(2)
        if c1.button("Save sample"):
            append_to_db(r); st.success("Saved.")
        if c2.button("Generate PDF report"):
            pdf_bytes, fname = generate_sample_pdf(r)
            st.download_button("Download PDF", data=pdf_bytes, file_name=fname, mime="application/pdf")

with tab2:
    uploaded_x = st.file_uploader("Upload Excel (optional)", type=["xlsx"], key="xlsxu")
    if uploaded_x:
        try:
            df = pd.read_excel(uploaded_x)
            for c in template_cols:
                if c not in df.columns: df[c] = ""
            df = df[template_cols]
        except Exception as e:
            st.error(f"Error: {e}"); df = pd.DataFrame(columns=template_cols)
    else:
        df = pd.DataFrame(columns=template_cols)
    edited = st.data_editor(df, num_rows="dynamic", use_container_width=True, height=400)
    if len(edited):
        edited["O2/N2"] = edited.apply(lambda r: compute_o2n2(r), axis=1)
        edited["تاريخ إعادة التحليل"] = edited.apply(lambda r: retest_date(r), axis=1)
    st.dataframe(edited, use_container_width=True)

    def export_with_rules(df):
        out = BytesIO()
        import xlsxwriter
        wb = xlsxwriter.Workbook(out, {'in_memory': True})
        ws = wb.add_worksheet("Data")
        hdr = wb.add_format({"bold":True,"align":"center","bg_color":"#D9E1F2","border":1})
        cell = wb.add_format({"border":1})
        datefmt = wb.add_format({"num_format":"yyyy-mm-dd","border":1})
        pctfmt = wb.add_format({"num_format":"0.00","border":1})
        ws.write_row(0,0,df.columns.tolist(), hdr)
        for r in range(len(df)):
            for c,col in enumerate(df.columns):
                val = df.iloc[r,c]
                if col in ["تاريخ العينة","تاريخ التحليل","تاريخ إعادة التحليل"] and str(val)!="":
                    try: ws.write_datetime(r+1, c, pd.to_datetime(val).to_pydatetime(), datefmt)
                    except: ws.write(r+1, c, val, cell)
                elif col=="O2/N2" and str(val)!="":
                    try: ws.write_number(r+1, c, float(val), pctfmt)
                    except: ws.write(r+1, c, val, cell)
                else:
                    ws.write(r+1, c, val, cell)
        tdf = pd.DataFrame(thr["unknown_age"]).set_index("Gas")
        gas_cols = {"H2":"J","CO2":"K","C2H4":"L","C2H6":"M","C2H2":"N","CH4":"O","CO":"P"}
        for gas, col_letter in gas_cols.items():
            if gas not in tdf.index: continue
            lo90 = tdf.loc[gas, "90th_<=0.2"]; lo95 = tdf.loc[gas, "95th_<=0.2"]
            hi90 = tdf.loc[gas, "90th_>0.2"]; hi95 = tdf.loc[gas, "95th_>0.2"]
            rng = f"{col_letter}2:{col_letter}{len(df)+1}"
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2<=0.2,{col_letter}2<={lo90})', "format": wb.add_format({"bg_color":"#C6EFCE"})})
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2<=0.2,{col_letter}2>{lo90},{col_letter}2<={lo95})', "format": wb.add_format({"bg_color":"#FFEB9C"})})
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2<=0.2,{col_letter}2>{lo95})', "format": wb.add_format({"bg_color":"#F8CBAD"})})
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2>0.2,{col_letter}2<={hi90})', "format": wb.add_format({"bg_color":"#C6EFCE"})})
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2>0.2,{col_letter}2>{hi90},{col_letter}2<={hi95})', "format": wb.add_format({"bg_color":"#FFEB9C"})})
            ws.conditional_format(rng, {"type":"formula","criteria":f'=AND($I2<>"",$I2>0.2,{col_letter}2>{hi95})', "format": wb.add_format({"bg_color":"#F8CBAD"})})
        wb.close(); out.seek(0); return out

    st.download_button("Download Excel with conditional formatting", data=export_with_rules(edited).getvalue(),
                       file_name="DGA_export.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

with tab3:
    st.header("Samples DB")
    db = load_db()
    st.dataframe(db, use_container_width=True, height=400)
