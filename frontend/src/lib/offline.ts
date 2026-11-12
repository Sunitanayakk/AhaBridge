import { openDB } from "idb";
import { api, post } from "./api";
export type Queued = {
  client_mutation_id: string;
  kind: string;
  resource_id: string;
  payload: unknown;
  owner: string;
  error?: string;
};
const database = () =>
  openDB("ahabridge-device-v1", 1, {
    upgrade(db) {
      db.createObjectStore("queue", { keyPath: "client_mutation_id" });
      db.createObjectStore("drafts");
      db.createObjectStore("lessons");
    },
  });
export async function queue(
  owner: string,
  kind: string,
  resource_id: string,
  payload: unknown,
) {
  const db = await database();
  if ((await db.count("queue")) >= 100)
    throw new Error("Device queue is full. Reconnect before adding more work.");
  await db.put("queue", {
    client_mutation_id: crypto.randomUUID(),
    owner,
    kind,
    resource_id,
    payload,
  });
  window.dispatchEvent(new Event("aha-queue"));
}
export async function pending(owner: string): Promise<Queued[]> {
  return (await (await database()).getAll("queue")).filter(
    (x) => x.owner === owner,
  );
}
export async function sync(owner: string) {
  await api("/auth/csrf");
  const items = await pending(owner);
  for (let start = 0; start < items.length; start += 30) {
    const batch = items.slice(start, start + 30);
    const result = await post("/sync/batch", {
      items: batch.map(({ owner: _owner, error: _error, ...rest }) => rest),
    });
    const db = await database();
    for (const r of result.items) {
      if (r.ok) await db.delete("queue", r.client_mutation_id);
      else {
        const item = batch.find(
          (x) => x.client_mutation_id === r.client_mutation_id,
        )!;
        await db.put("queue", { ...item, error: r.error });
      }
    }
  }
  window.dispatchEvent(new Event("aha-queue"));
}
export async function discardQueued(key: string) {
  await (await database()).delete("queue", key);
  window.dispatchEvent(new Event("aha-queue"));
}
export async function saveDraft(owner: string, id: string, value: unknown) {
  await (await database()).put("drafts", value, owner + ":" + id);
}
export async function loadDraft<T>(
  owner: string,
  id: string,
): Promise<T | undefined> {
  return (await database()).get("drafts", owner + ":" + id);
}
export async function saveLesson(owner: string, id: string, value: unknown) {
  const db = await database();
  if ((await db.count("lessons")) >= 30)
    throw new Error("Device lesson limit reached.");
  await db.put("lessons", value, owner + ":" + id);
}
export async function getLesson<T>(
  owner: string,
  id: string,
): Promise<T | undefined> {
  return (await database()).get("lessons", owner + ":" + id);
}
export async function wipe() {
  const db = await database();
  for (const name of ["queue", "drafts", "lessons"]) await db.clear(name);
  window.dispatchEvent(new Event("aha-queue"));
}
