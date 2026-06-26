"""
Train an image classifier on dataset/train/ (auto-splits 80/20 into train/val).
No need to manually populate dataset/test/ - this script handles the split.

Run from samyog-backend/:
    python train_image_model.py

Output: model/image_model.pth  (loaded by ai_service/app.py)
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms

DATA_DIR = "dataset/train"   # only train/ needed - auto-split handles the rest
OUTPUT_PATH = "model/image_model.pth"
EPOCHS = 8
BATCH_SIZE = 16
LR = 1e-4
VAL_SPLIT = 0.2  # 20% of images used for validation

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Training transform - includes augmentation to improve generalization
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Validation transform - no augmentation
val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Load full dataset first to get class info and do the split
full_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transform)

print(f"\nClasses found: {full_dataset.classes}")
print(f"Total images: {len(full_dataset)}")
for cls in full_dataset.classes:
    count = sum(1 for _, label in full_dataset.samples if full_dataset.classes[label] == cls)
    print(f"  {cls}: {count} images")

# Auto split 80/20
val_size = int(len(full_dataset) * VAL_SPLIT)
train_size = len(full_dataset) - val_size
train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

# Apply val_transform to validation subset
val_dataset.dataset.transform = val_transform

print(f"\nSplit: {train_size} train / {val_size} validation")

if train_size < BATCH_SIZE:
    BATCH_SIZE = max(1, train_size // 2)
    print(f"⚠️  Small dataset - reduced batch size to {BATCH_SIZE}")

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

# ResNet18 with transfer learning - only retrain final layer
model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
model.fc = nn.Linear(model.fc.in_features, len(full_dataset.classes))
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.fc.parameters(), lr=LR)

print("\nStarting training...\n")

best_val_acc = 0.0

for epoch in range(EPOCHS):
    # ---- Train ----
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

    train_acc = 100 * correct / total

    # ---- Validate ----
    model.eval()
    val_correct = 0
    val_total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs, 1)
            val_total += labels.size(0)
            val_correct += (predicted == labels).sum().item()

    val_acc = 100 * val_correct / val_total if val_total else 0

    print(f"Epoch {epoch+1}/{EPOCHS} | "
          f"loss: {running_loss/len(train_loader):.4f} | "
          f"train acc: {train_acc:.1f}% | "
          f"val acc: {val_acc:.1f}%")

    # Save best model (not just the final one)
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), OUTPUT_PATH)
        print(f"  ✅ Best model saved (val acc: {val_acc:.1f}%)")

print(f"\n✅ Training complete. Best val accuracy: {best_val_acc:.1f}%")
print(f"Model saved to: {OUTPUT_PATH}")
print(f"\nClass order: {full_dataset.classes}")
print("⚠️  Make sure IMAGE_LABELS in ai_service/app.py matches this order exactly.")