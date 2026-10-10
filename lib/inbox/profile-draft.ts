export const PROFILE_DRAFT_FIELDS = [
  "assignedSeller",
  "commercialStatus",
  "dealStage",
  "followUpAt",
  "nextAction",
  "notes",
  "taskTitle"
] as const;

export type ProfileDraftField = (typeof PROFILE_DRAFT_FIELDS)[number];
export type ProfileDraftValues = Record<ProfileDraftField, string>;

type ProfileDraftEntry = {
  baseline: ProfileDraftValues;
  latestServer: ProfileDraftValues;
  values: ProfileDraftValues;
  dirty: Set<ProfileDraftField>;
  conflicts: Set<ProfileDraftField>;
};

export type ProfileDraftTracker = Map<string, ProfileDraftEntry>;

const CONFLICT_SENSITIVE_FIELDS = new Set<ProfileDraftField>([
  "assignedSeller",
  "commercialStatus",
  "dealStage",
  "followUpAt",
  "nextAction"
]);

function copyValues(values: ProfileDraftValues): ProfileDraftValues {
  return { ...values };
}

function getOrCreateEntry(tracker: ProfileDraftTracker, conversationId: string, serverValues: ProfileDraftValues) {
  let entry = tracker.get(conversationId);
  if (!entry) {
    const initial = copyValues(serverValues);
    entry = {
      baseline: initial,
      latestServer: copyValues(initial),
      values: copyValues(initial),
      dirty: new Set(),
      conflicts: new Set()
    };
    tracker.set(conversationId, entry);
  }
  return entry;
}

export function reconcileProfileDraft(
  tracker: ProfileDraftTracker,
  conversationId: string,
  serverValues: ProfileDraftValues
) {
  const entry = getOrCreateEntry(tracker, conversationId, serverValues);
  for (const field of PROFILE_DRAFT_FIELDS) {
    const serverValue = serverValues[field] || "";
    entry.latestServer[field] = serverValue;
    if (entry.dirty.has(field)) {
      if (CONFLICT_SENSITIVE_FIELDS.has(field) && serverValue !== entry.baseline[field]) {
        entry.conflicts.add(field);
      } else {
        entry.conflicts.delete(field);
      }
      continue;
    }
    entry.baseline[field] = serverValue;
    entry.values[field] = serverValue;
    entry.conflicts.delete(field);
  }

  return {
    values: copyValues(entry.values),
    dirtyFields: new Set(entry.dirty),
    conflictingFields: new Set(entry.conflicts)
  };
}

export function updateProfileDraftField(
  tracker: ProfileDraftTracker,
  conversationId: string,
  field: ProfileDraftField,
  value: string,
  serverValues: ProfileDraftValues
) {
  const entry = getOrCreateEntry(tracker, conversationId, serverValues);
  entry.latestServer = { ...entry.latestServer, ...serverValues };
  entry.values[field] = value;
  if (value === entry.latestServer[field]) {
    entry.baseline[field] = entry.latestServer[field];
    entry.dirty.delete(field);
    entry.conflicts.delete(field);
  } else {
    entry.dirty.add(field);
    if (CONFLICT_SENSITIVE_FIELDS.has(field) && entry.latestServer[field] !== entry.baseline[field]) {
      entry.conflicts.add(field);
    }
  }
  return { dirty: entry.dirty.has(field), conflicting: entry.conflicts.has(field) };
}

export function commitProfileDraftFields(
  tracker: ProfileDraftTracker,
  conversationId: string,
  fields: ProfileDraftField[],
  canonicalValues: Partial<ProfileDraftValues>
) {
  const entry = tracker.get(conversationId);
  if (!entry) return;
  for (const field of fields) {
    if (canonicalValues[field] !== undefined) {
      const canonical = canonicalValues[field] || "";
      entry.baseline[field] = canonical;
      entry.latestServer[field] = canonical;
      entry.values[field] = canonical;
    }
    entry.dirty.delete(field);
    entry.conflicts.delete(field);
  }
}

export function discardProfileDraft(
  tracker: ProfileDraftTracker,
  conversationId: string,
  serverValues: ProfileDraftValues
) {
  const entry = getOrCreateEntry(tracker, conversationId, serverValues);
  entry.baseline = copyValues(serverValues);
  entry.latestServer = copyValues(serverValues);
  entry.values = copyValues(serverValues);
  entry.dirty.clear();
  entry.conflicts.clear();
  return copyValues(entry.values);
}

export function hasDirtyProfileDraft(tracker: ProfileDraftTracker, conversationId?: string | null) {
  if (conversationId) return Boolean(tracker.get(conversationId)?.dirty.size);
  return [...tracker.values()].some((entry) => entry.dirty.size > 0);
}

export function hasDirtyProfileDraftField(
  tracker: ProfileDraftTracker,
  conversationId: string | null | undefined,
  field: ProfileDraftField
) {
  return Boolean(conversationId && tracker.get(conversationId)?.dirty.has(field));
}

export function findOtherDirtyProfileDraft(tracker: ProfileDraftTracker, targetConversationId: string) {
  for (const [conversationId, entry] of tracker) {
    if (conversationId !== targetConversationId && entry.dirty.size > 0) return conversationId;
  }
  return null;
}

export function getProfileDraftConflicts(tracker: ProfileDraftTracker, conversationId: string) {
  return new Set(tracker.get(conversationId)?.conflicts || []);
}
