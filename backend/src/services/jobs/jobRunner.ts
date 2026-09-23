export async function enqueueJob(
  jobType: string,
  payload: any,
  options?: { maxAttempts?: number; runAt?: Date }
): Promise<{ id: string; jobType: string }> {
  console.log(`[JobRunner] Enqueued job ${jobType}`, payload, options);
  return { id: `job-${Date.now()}`, jobType };
}
