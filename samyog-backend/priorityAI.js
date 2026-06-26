function getPriority(text) {
  const t = text.toLowerCase();

  // 🔴 HIGH
  if (
    t.includes("death") ||
    t.includes("accident") ||
    t.includes("fire") ||
    t.includes("crash") ||
    t.includes("emergency") ||
    t.includes("injury")
  ) {
    return { label: "HIGH", level: 3 };
  }

  // 🟠 MEDIUM
  if (
    t.includes("damage") ||
    t.includes("delay") ||
    t.includes("issue") ||
    t.includes("complaint")
  ) {
    return { label: "MEDIUM", level: 2 };
  }

  // 🟢 LOW
  return { label: "LOW", level: 1 };
}

module.exports = getPriority;