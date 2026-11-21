// Mã hội thoại hỏi đáp do backend cấp (UUID). Backend tự kiểm tra chủ sở hữu.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function conversationField(value: unknown) {
  return typeof value === "string" && UUID.test(value)
    ? { conversationId: value }
    : {};
}
