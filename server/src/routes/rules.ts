import { readFile, writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";

const RULES_PATH = "/data/rules.json";

export interface Rule {
  id: string;
  type: "override" | "preference";
  category: "product" | "recipe" | "week";
  rule: string;
  createdAt: string;
}

async function loadRules(): Promise<Rule[]> {
  try {
    return JSON.parse(await readFile(RULES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function saveRules(rules: Rule[]): Promise<void> {
  await mkdir("/data", { recursive: true });
  await writeFile(RULES_PATH, JSON.stringify(rules, null, 2));
}

export async function getRules(): Promise<Rule[]> {
  return loadRules();
}

export async function getRulesByCategory(category: Rule["category"]): Promise<Rule[]> {
  const rules = await loadRules();
  return rules.filter(r => r.category === category);
}

/** Format rules as a compact array for embedding in API responses */
export function formatRulesHint(rules: Rule[]): { type: string; rule: string }[] {
  return rules.map(r => ({ type: r.type, rule: r.rule }));
}

export async function handleRules(path: string, req: Request, _url: URL): Promise<Response | null> {
  if (path === "/rules" && req.method === "GET") {
    return Response.json(await loadRules());
  }

  if (path === "/rules" && req.method === "POST") {
    const { type, category, rule } = await req.json() as { type?: string; category?: string; rule?: string };
    if (!rule) return Response.json({ error: "rule text required" }, { status: 400 });
    if (type !== "override" && type !== "preference") {
      return Response.json({ error: "type must be 'override' or 'preference'" }, { status: 400 });
    }
    if (category !== "product" && category !== "recipe" && category !== "week") {
      return Response.json({ error: "category must be 'product', 'recipe', or 'week'" }, { status: 400 });
    }
    const rules = await loadRules();
    const newRule: Rule = {
      id: randomUUID().slice(0, 8),
      type,
      category,
      rule,
      createdAt: new Date().toISOString(),
    };
    rules.push(newRule);
    await saveRules(rules);
    return Response.json(newRule, { status: 201 });
  }

  const deleteMatch = path.match(/^\/rules\/([^/]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const rules = await loadRules();
    const idx = rules.findIndex(r => r.id === deleteMatch[1]);
    if (idx === -1) return Response.json({ error: "Rule not found" }, { status: 404 });
    const removed = rules.splice(idx, 1)[0];
    await saveRules(rules);
    return Response.json(removed);
  }

  return null;
}
