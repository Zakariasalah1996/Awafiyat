import { describe, it, expect } from "vitest";

const hasDeepSeekApiKey = Boolean(process.env.DEEPSEEK_API_KEY);

describe.skipIf(!hasDeepSeekApiKey)("DeepSeek API Key Validation", () => {
  it("should successfully call DeepSeek API with the provided key", async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "قل مرحبا" }],
        max_tokens: 20,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
  });
});
