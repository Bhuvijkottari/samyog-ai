"""
SAMYOG-AI multimodal inference service.

Loads the BERT text model AND the image model ONCE at startup, then serves
predictions over HTTP. This replaces the old approach of spawning a new
python process (and reloading BERT from disk) on every single request,
which was the main cause of slow predictions.

Run with:
    uvicorn app:app --host 0.0.0.0 --port 8001

server.js should call this instead of using exec("python predict.py ...").
"""

import io
import os

import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, UploadFile, Form
from PIL import Image
from torchvision import models, transforms
from transformers import BertTokenizer, BertForSequenceClassification

app = FastAPI(title="SAMYOG-AI Inference Service")

# ---------------------------------------------------------------------------
# TEXT MODEL (BERT) - loaded once
# ---------------------------------------------------------------------------
TEXT_MODEL_DIR = os.environ.get("TEXT_MODEL_DIR", "../model")
TEXT_LABELS = ["NHAI", "Railways", "Airport", "IncomeTax"]

print("Loading BERT text model...")
text_tokenizer = BertTokenizer.from_pretrained(TEXT_MODEL_DIR)
text_model = BertForSequenceClassification.from_pretrained(
    TEXT_MODEL_DIR, low_cpu_mem_usage=True
)
text_model.eval()
print("BERT text model loaded.")

# ---------------------------------------------------------------------------
# IMAGE MODEL (ResNet18 transfer-learned) - loaded once, if it exists
# ---------------------------------------------------------------------------
IMAGE_MODEL_PATH = os.environ.get("IMAGE_MODEL_PATH", "../model/image_model.pth")
IMAGE_LABELS = [ "NHAI", "Railways"]  # no IncomeTax - no physical site photo

image_model = None
image_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

if os.path.exists(IMAGE_MODEL_PATH):
    print("Loading image model...")
    image_model = models.resnet18(weights=None)
    image_model.fc = torch.nn.Linear(image_model.fc.in_features, len(IMAGE_LABELS))
    image_model.load_state_dict(torch.load(IMAGE_MODEL_PATH, map_location="cpu"))
    image_model.eval()
    print("Image model loaded.")
else:
    print(f"⚠️  No image model found at {IMAGE_MODEL_PATH}. "
          f"Run train_image_model.py first. /predict-image will return low confidence.")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "text_model": True,
        "image_model": image_model is not None,
    }


@app.post("/predict-text")
def predict_text(text: str = Form(...)):
    inputs = text_tokenizer(text, return_tensors="pt", truncation=True, padding=True)

    with torch.no_grad():
        outputs = text_model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)[0]
        predicted_id = int(torch.argmax(probs).item())
        confidence = float(probs[predicted_id].item())

    return {
        "label": TEXT_LABELS[predicted_id],
        "confidence": round(confidence, 4),
        "all_scores": {TEXT_LABELS[i]: round(float(p), 4) for i, p in enumerate(probs)},
    }


@app.post("/predict-image")
async def predict_image(image: UploadFile = File(...)):
    if image_model is None:
        return {
            "label": "Unknown",
            "confidence": 0.0,
            "error": "Image model not trained yet. Run train_image_model.py.",
        }

    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    tensor = image_transform(img).unsqueeze(0)

    with torch.no_grad():
        outputs = image_model(tensor)
        probs = F.softmax(outputs, dim=1)[0]
        predicted_id = int(torch.argmax(probs).item())
        confidence = float(probs[predicted_id].item())

    return {
        "label": IMAGE_LABELS[predicted_id],
        "confidence": round(confidence, 4),
        "all_scores": {IMAGE_LABELS[i]: round(float(p), 4) for i, p in enumerate(probs)},
    }