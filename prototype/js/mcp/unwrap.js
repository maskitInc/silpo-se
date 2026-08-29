export function unwrap(payload) {
  if (payload == null) return {};
  if (payload.result?.structuredContent) return payload.result.structuredContent;
  if (payload.result && typeof payload.result === "object" && !payload.result.content) {
    return payload.result;
  }
  const content = payload.result?.content || payload.content;
  if (Array.isArray(content)) {
    const text = content.find((c) => c.type === "text")?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { rawText: text.slice(0, 200) };
      }
    }
  }
  if (payload.result) return payload.result;
  return payload;
}
