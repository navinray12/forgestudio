const eventName = "forge:workspace-members-changed";
const channelName = "forge-workspace-members";

export function notifyMembersChanged(workspaceId: string) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: workspaceId }));
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ workspaceId });
    channel.close();
  } catch { /* Focus and periodic refresh also cover browsers without channels. */ }
}

export function subscribeToMembersChanges(listener: (workspaceId: string) => void): () => void {
  const local = (event: Event) => { if (typeof (event as CustomEvent).detail === "string") listener((event as CustomEvent).detail); };
  window.addEventListener(eventName, local);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = event => { if (typeof event.data?.workspaceId === "string") listener(event.data.workspaceId); };
  } catch { /* No invitation secrets are shared through either channel. */ }
  return () => { window.removeEventListener(eventName, local); channel?.close(); };
}
