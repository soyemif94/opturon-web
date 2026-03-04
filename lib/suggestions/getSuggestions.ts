import { matchScore, normalizeText } from "@/lib/search/normalize";

export type SuggestionType = "template" | "product" | "action";

export type SuggestionItem = {
  type: SuggestionType;
  id: string;
  label: string;
  score: number;
  text?: string;
  price?: number;
  stock?: number;
};

type SuggestionInput = {
  text: string;
  templates: Array<{ id: string; name: string; text: string; tags: string[] }>;
  products: Array<{ id: string; name: string; price: number; stock: number; tags: string[] }>;
  actions: Array<{ id: string; label: string; tags: string[] }>;
};

export function getSuggestions(input: SuggestionInput): SuggestionItem[] {
  const tokens = normalizeText(input.text || "");
  if (!tokens.length) return [];

  const templates = input.templates
    .map((item) => ({
      type: "template" as const,
      id: item.id,
      label: item.name,
      text: item.text,
      score: matchScore(tokens, item.tags)
    }))
    .filter((item) => item.score > 0);

  const products = input.products
    .map((item) => ({
      type: "product" as const,
      id: item.id,
      label: item.name,
      price: item.price,
      stock: item.stock,
      score: matchScore(tokens, item.tags)
    }))
    .filter((item) => item.score > 0);

  const actions = input.actions
    .map((item) => ({
      type: "action" as const,
      id: item.id,
      label: item.label,
      score: matchScore(tokens, item.tags)
    }))
    .filter((item) => item.score > 0);

  return [...templates, ...products, ...actions].sort((a, b) => b.score - a.score).slice(0, 5);
}

