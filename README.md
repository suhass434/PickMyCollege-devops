# PickMyCollege

**PickMyCollege** is an AI-powered college recommendation platform that helps students make informed higher education choices. By analyzing historical cutoff data and integrating real-time information on rankings, fees, and placements, the system delivers personalized college and branch recommendations based on exam rank, category, and user preferences.

---

## Features

- **Personalized Recommendations**  
  Suggests colleges and branches tailored to user rank, category, and preferences.

- **Historical Data Analysis**  
  Utilizes multiple years of cutoff data, emphasizing recent trends for accuracy.

- **Real-Time Data Enrichment**  
  Integrates NIRF rankings, fee details, and placement statistics via API.

- **Efficient Caching**  
  Implements MongoDB-based caching with TTL for optimized API usage.

- **Data Extraction Tools**  
  Python scripts for extracting, cleaning, and standardizing cutoff data from PDFs and Excel files.

---

## Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB Atlas account (or local MongoDB instance)
- Docker (for containerized deployment)
- API keys for Perplexity and Groq (for real-time data enrichment)

---

## Setup & Usage

### 1. Clone the repository

```bash
git clone https://github.com/suhass434/PickMyCollege.git
cd pickmycollege
```

### 2. Install Python dependencies

```bash
cd backend/python
pip install -r requirements.txt
```

### 3. Extract and Load Cutoff Data

Place your cutoff PDFs/Excel files in:
```
backend/python/extractor/input/
```

Run the extraction script:

```bash
python extractor/extractFromCsv.py extractor/input/xlsx/engg_cutoff_gen_2024_2nd.xlsx
```

This will output cleaned CSVs and load data into MongoDB.

### 4. Run Recommendation Engine

```bash
python recommender/recommend.py <rank> <category> [location] [branches] [num_colleges] [model] [summary_length]
```

**Example:**

```bash
python recommender/recommend.py 12000 GM Bangalore CS,EC 10 perplexity 5
```

---

## Node.js API (Optional)

### Install dependencies

```bash
cd ../api
npm install
```

### Start the backend

```bash
node app.js
```

---

## Environment Variables

Create a `.env` file in `backend/python/` and `backend/api/` with:

```env
MONGODB_URI=your_mongodb_uri
PERPLEXITY_API_KEY=your_perplexity_key
GROQ_API_KEY=your_groq_key
```

---

## Data Files

- `branch_code.csv`: Maps branch codes to branch names.
- `college_location.csv`: Maps college codes to standardized college names and locations.
- `engg_cutoff_gen_from_csv.csv`: Cleaned, extracted cutoff data for analysis and recommendations.

---

## Contributing

Contributions are welcome!  
Please open an issue or submit a pull request for improvements, bug fixes, or new features.

---

## License

This project is licensed under the **MIT License**.
