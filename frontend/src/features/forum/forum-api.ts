export type Category = { id: string; name: string; slug: string; description: string; topicCount: number };
export type Topic = { id: string; topicNumber: string; title: string; excerpt?: string; content?: string; authorId: string; authorName: string; categoryId: string; categoryName: string; categorySlug: string; createdAt: string; replyCount: number; viewCount: number; isSolved: boolean; isLocked?: boolean; status?: string };
export type Forum = { categories: Category[]; stats: { members: number; topics: number; replies: number }; topics: Topic[]; trending: Topic[]; total: number; page: number; pageSize: number; viewerId: string };
export type Discussion = { topic: Topic; posts: { id: string; content: string; authorName: string; createdAt: string }[]; viewerId: string };
export async function forumRequest<T>(path = '', options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/forum${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Please sign in again.' : data?.error?.message || data?.message || 'Unable to load the community. Please try again.');
  return data;
}
export const forumFilters = ['latest', 'popular', 'unanswered', 'solved'] as const;
export function forumQuery(filter: string, categoryId: string, page: number) { return new URLSearchParams({ filter, ...(categoryId ? { categoryId } : {}), page: String(page) }).toString(); }
export function forumDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
