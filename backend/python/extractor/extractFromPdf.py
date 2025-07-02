import os
import re
import json
import subprocess
import tempfile
import warnings
from collections import defaultdict
from pymongo import MongoClient
import pandas as pd
from PyPDF2 import PdfReader

warnings.filterwarnings('ignore')

def save_to_mongodb(records, year, mongo_uri="mongodb+srv://pickyourcollege-admin:xsVTHOPFiktTloKM@pickmycollege.slpeom5.mongodb.net/?retryWrites=true&w=majority&appName=PickMyCollege"):
    client = MongoClient(mongo_uri)
    db = client["cet"]
    collection_name = f"{year}"
    collection = db[collection_name]

    if records:
        collection.insert_many(records)
        print(f"[✓] Inserted {len(records)} documents into MongoDB → cet.{collection_name}")
    else:
        print("[!] No records to insert into MongoDB.")

def shrink_text_pdf_page(input_pdf, page, temp_dir):
    svg_path = os.path.join(temp_dir, f"page_{page}.svg")
    fixed_svg = os.path.join(temp_dir, f"page_{page}_fixed.svg")
    fixed_pdf = os.path.join(temp_dir, f"page_{page}_fixed.pdf")

    subprocess.run(['pdf2svg', input_pdf, svg_path, str(page)], check=True)

    with open(svg_path, 'r', encoding='utf-8') as f:
        svg = f.read()
    svg = re.sub(r'font-size:(\d+(?:\.\d+)?)', 
                 lambda m: f"font-size:{float(m.group(1)) * 0.8:.1f}", svg)
    with open(fixed_svg, 'w', encoding='utf-8') as f:
        f.write(svg)

    subprocess.run([
        'inkscape', fixed_svg,
        '--export-type=pdf',
        '--export-filename', fixed_pdf
    ], check=True)

    return fixed_pdf

def extract_college_names_page(pdf_path, page):
    cmd = [
        'pdftotext',
        '-f', str(page),
        '-l', str(page),
        '-layout',
        pdf_path,
        '-'
    ]
    proc = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    lines = proc.stdout.splitlines()
    names = []
    for line in lines:
        if re.search(r'E[0-9]+', line):
            norm = ' '.join(line.split())
            parts = norm.split(' ', 2)
            if len(parts) == 3:
                _, code_part, name_part = parts
                code = code_part.strip().lower()
                name = name_part.strip().lower()
                names.append((code, name))
    return names

def extract_tables_page(pdf_path, page):
    dfs = []
    with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
        out_json = tmp.name
    try:
        cmd = [
            'java', '-jar', 'tabula-java.jar',
            '-l',
            '-p', str(page),
            '-f', 'JSON',
            '-o', out_json,
            pdf_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        with open(out_json, 'r', encoding='utf-8') as f:
            raw_tables = json.load(f)

        for tbl in raw_tables:
            text_rows = []
            for row in tbl.get('data', []):
                text_row = [
                    cell.get('text', '').strip().lower() if isinstance(cell, dict) else str(cell).strip().lower()
                    for cell in row
                ]
                text_rows.append(text_row)

            df = pd.DataFrame(text_rows)
            df = df.dropna(how='all').reset_index(drop=True)
            if df.shape[0] >= 2:
                dfs.append(df)

    except Exception:
        import tabula
        try:
            tables = tabula.read_pdf(
                pdf_path,
                pages=page,
                multiple_tables=True,
                lattice=True,
                pandas_options={'header': None}
            )
            for df in tables:
                df = df.map(lambda x: x.strip().lower() if isinstance(x, str) else x)
                df = df.dropna(how='all').reset_index(drop=True)
                if df.shape[0] >= 2:
                    dfs.append(df)
        except Exception:
            pass
    finally:
        if os.path.exists(out_json):
            os.unlink(out_json)
    return dfs

def main(pdf_path):
    pdf_basename = os.path.basename(pdf_path)
    output_csv = os.path.join("extractor", "output", pdf_basename.lower().replace('.pdf', '.csv'))
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    # Read college locations
    location_csv_path = os.path.join("shared", "college_location.csv")
    if not os.path.exists(location_csv_path):
        raise FileNotFoundError(f"College location CSV not found at {location_csv_path}")
    location_df = pd.read_csv(location_csv_path)
    location_df.columns = location_df.columns.str.lower()
    location_df['college_code'] = location_df['college_code'].str.strip().str.lower()
    location_df['location'] = location_df['location'].str.strip().str.lower()
    college_code_to_location = dict(zip(location_df['college_code'], location_df['location']))

    # Read branch codes
    branch_code_path = os.path.join("shared", "branch_code.csv")
    if not os.path.exists(branch_code_path):
        raise FileNotFoundError(f"Branch code CSV not found at {branch_code_path}")
    branch_code_df = pd.read_csv(branch_code_path)
    branch_code_df.columns = branch_code_df.columns.str.strip().str.lower()
    branch_code_df['code'] = branch_code_df['code'].str.strip().str.lower()
    branch_code_to_name = dict(zip(branch_code_df['code'], branch_code_df['name']))

    reader = PdfReader(pdf_path)
    num_pages = len(reader.pages)

    all_records = []
    total_names = 0
    total_tables = 0

    for page in range(1, num_pages + 1):
        names = extract_college_names_page(pdf_path, page)
        tables = extract_tables_page(pdf_path, page)

        pairs = min(len(names), len(tables))
        total_names += pairs
        total_tables += pairs

        print(f"Page {page}: found {len(names)} college name(s), {len(tables)} table(s)")
        if len(names) > len(tables):
            print(f"  → {len(names) - len(tables)} extra college name(s) ignored")
        elif len(tables) > len(names):
            print(f"  → {len(tables) - len(names)} table(s) without college name ignored")

        for i in range(pairs):
            code, name = names[i]
            df = tables[i]
            if df.empty:
                continue

            categories = [str(c).strip().lower() for c in df.iloc[0].tolist()]
            for row in df.iloc[1:].itertuples(index=False):
                branch_str = str(row[0]).strip().lower()
                # Split branch code and name
                split_result = branch_str.split(' ', 1)
                code_part = split_result[0].strip() if split_result else ''
                name_part = split_result[1].strip() if len(split_result) > 1 else branch_str
                official_branch_name = branch_code_to_name.get(code_part, name_part)

                if not code_part and not name_part:
                    continue

                for col_idx in range(1, min(len(row), len(categories))):
                    cat = categories[col_idx].strip().lower()
                    val = str(row[col_idx]).strip()
                    if not cat or val in ("", "--"):
                        continue
                    try:
                        val_clean = val.replace(',', '').strip()
                        match = re.search(r'\d+', val_clean)
                        if match:
                            cutoff_str = match.group()
                            if len(cutoff_str) <= 4 and col_idx > 1:
                                prev_val = str(row[col_idx - 1]).strip().replace(',', '')
                                if prev_val and prev_val[-1].isdigit():
                                    cutoff_str = prev_val[-1] + cutoff_str
                            cutoff = int(cutoff_str)
                        else:
                            continue
                    except ValueError:
                        continue

                    location = college_code_to_location.get(code, None)
                    all_records.append({
                        "college_code": code,
                        "college_name": name,
                        "location": location,
                        "branch_code": code_part,
                        "branch_name": official_branch_name,
                        "category": cat,
                        "cutoff": cutoff
                    })

    print(f"\nProcessed {num_pages} page(s)")
    print(f"Total college names seen: {total_names}")
    print(f"Total tables seen: {total_tables}")
    print(f"Total cutoff rows extracted: {len(all_records)}")

    year = input("Enter year (e.g., 2024): ").strip().lower()

    #save_to_mongodb(all_records, year)

    df_out = pd.DataFrame(all_records, columns=[
        "college_code",
        "college_name",
        "location",
        "branch_code",
        "branch_name",
        "category",
        "cutoff"
    ])
    df_out.to_csv(output_csv, index=False)
    print(f"Wrote {len(df_out)} rows to {output_csv}")

if __name__ == "__main__":
    pdf_path = "extractor/input/pdf/engg_cutoff_gen.pdf"
    main(pdf_path)