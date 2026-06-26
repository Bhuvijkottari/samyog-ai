## Setup

### Backend
```bash
cd samyog-backend
npm install
pip install -r ai_service/requirements.txt --break-system-packages
```
Create `.env`:
```
MONGO_URI=your_mongo_uri
AI_SERVICE_URL=http://localhost:8001
```
Train BERT model:
```bash
python train_model.py
```
Train image model (add images to dataset/train/NHAI and dataset/train/Railways first):
```bash
python train_image_model.py
```

### Run (3 terminals)
```bash
# Terminal 1 - AI service
cd samyog-backend/ai_service
python -m uvicorn app:app --host 0.0.0.0 --port 8001

# Terminal 2 - Node backend  
cd samyog-backend
node server.js

# Terminal 3 - Frontend
cd samyog-frontend
npm install --legacy-peer-deps
npm start
```

### Frontend
Create `samyog-frontend/.env` with Firebase keys (get from Firebase Console).

# Terminal 1
cd samyog-backend/ai_service
python -m uvicorn app:app --host 0.0.0.0 --port 8001

# Terminal 2
cd samyog-backend
node server.js

# Terminal 3
cd samyog-frontend
npm start