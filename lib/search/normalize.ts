export function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function matchScore(tokens: string[], tags: string[]): number {
  if (!tokens.length || !tags.length) return 0;
  const normalizedTags = tags.map((tag) => normalizeText(tag).join(" "));
  let score = 0;
  for (const token of tokens) {
    if (normalizedTags.some((tag) => tag.includes(token))) score += 1;
  }
  return score;
}

