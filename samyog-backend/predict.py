from transformers import BertTokenizer, BertForSequenceClassification
import torch
import sys

# Load model
model = BertForSequenceClassification.from_pretrained("model")
tokenizer = BertTokenizer.from_pretrained("model")

labels = ["NHAI", "Railways", "Airport", "IncomeTax"]

# Get input text from Node
text = sys.argv[1]

# Tokenize
inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)

# Predict
with torch.no_grad():
    outputs = model(**inputs)
    logits = outputs.logits
    predicted_class_id = torch.argmax(logits, dim=1).item()

print(labels[predicted_class_id])