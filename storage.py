
import os, pandas as pd
DATA_DIR="data"; DB_PATH=os.path.join(DATA_DIR,"samples_db.csv")
def ensure_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DB_PATH):
        pd.DataFrame(columns=[]).to_csv(DB_PATH, index=False)
def load_db():
    ensure_storage(); return pd.read_csv(DB_PATH)
def append_to_db(row): df=load_db(); df=pd.concat([df, pd.DataFrame([row])], ignore_index=True); df.to_csv(DB_PATH, index=False)
