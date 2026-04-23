# ML Service

Python microservice that provides:
- Classification (career prediction)
- Recommendation (job ranking)
- NLP (skill extraction)
- K-means clustering

## Run
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 5001
```

## Endpoints
- `POST /predict-career`
- `POST /recommend-jobs`
- `POST /extract-skills`
- `POST /cluster-students`
- `GET /health`
