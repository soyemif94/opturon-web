export type InboxChannelKey = "whatsapp" | "instagram";

export type InboxChannelAvailability = Record<InboxChannelKey, boolean>;

export function hasInboxChannel(availability: InboxChannelAvailability) {
  return availability.whatsapp || availability.instagram;
}

export function resolveInitialInboxChannel(
  selected: InboxChannelKey,
  availability: InboxChannelAvailability
): InboxChannelKey {
  if (availability[selected]) return selected;
  if (availability.instagram) return "instagram";
  if (availability.whatsapp) return "whatsapp";
  return selected;
}
