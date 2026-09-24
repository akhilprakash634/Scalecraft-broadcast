/**
 * Prunes conversation history to keep it under a maximum character length,
 * prioritizing the most recent messages.
 */
export function pruneConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxChars = 2500
): string {
  let combined = "";

  // Traverse in reverse — keep most recent messages
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = messages[i].role === 'assistant' ? 'Mia' : 'Customer';
    const msg = `${role}: ${messages[i].content}\n`;

    if ((combined + msg).length > maxChars) break;

    combined = msg + combined;
  }

  return combined.trim() || "No conversation history.";
}
