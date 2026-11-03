import { AppError } from "../utils/app-error.js";
// The Forms reference is the global community forum. Never expose PRIVATE/WORKSPACE topics here.
const visible = `t.visibility='PUBLIC' AND t.status IN ('OPEN','LOCKED','SOLVED') AND c."isPublic" AND c."isActive"`;
export function createDashboardForumService(db: any) {
  const query = (client: any, sql: string, ...values: any[]) => client.$queryRawUnsafe(sql, ...values);
  async function actor(client: any, userId: string) {
    const user = await client.user.findUnique({ where: { id: userId }, select: { status: true, role: true } });
    if (!user || user.status !== "ACTIVE") throw new AppError("Your account cannot access the community", 403, "ACCOUNT_INACTIVE");
    return user;
  }
  async function topic(client: any, id: string, lock = false) {
    const [row] = await query(client, `SELECT t.id,t."topicNumber",t.title,t.content,t."authorId",t."categoryId",t.status,t."isSolved",t."isLocked",t."createdAt",t."viewCount",t."replyCount",u."fullName" AS "authorName",c.name AS "categoryName",c.slug AS "categorySlug" FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" JOIN users u ON u.id=t."authorId" WHERE t.id=$1::uuid AND ${visible}${lock ? ' FOR UPDATE OF t' : ''}`, id);
    if (!row) throw new AppError("Discussion not found", 404, "TOPIC_NOT_FOUND");
    return row;
  }
  async function read(userId: string, input: { filter: string; categoryId?: string; page: number }) {
    await actor(db, userId);
    return db.$transaction(async (tx: any) => {
      const categories = await query(tx, `SELECT c.id,c.name,c.slug,c.description,c.color,COUNT(t.id)::int AS "topicCount" FROM forum_categories c LEFT JOIN forum_topics t ON t."categoryId"=c.id AND ${visible} WHERE c."isPublic" AND c."isActive" GROUP BY c.id ORDER BY CASE c.slug WHEN 'announcements' THEN 0 WHEN 'general-discussion' THEN 1 WHEN 'showcase-feedback' THEN 2 WHEN 'tips-tutorials' THEN 3 WHEN 'questions-help' THEN 4 WHEN 'collaboration' THEN 5 ELSE 6 END,c."displayOrder",c.name`);
      const [stats] = await query(tx, `SELECT (SELECT COUNT(*)::int FROM users WHERE status='ACTIVE') AS members,COUNT(*)::int AS topics,COALESCE(SUM((SELECT COUNT(*) FROM forum_posts p WHERE p."topicId"=t.id AND NOT p."isHidden")),0)::int AS replies FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" WHERE ${visible}`);
      const filter = input.filter === 'unanswered' ? ` AND NOT EXISTS(SELECT 1 FROM forum_posts p WHERE p."topicId"=t.id AND NOT p."isHidden")` : input.filter === 'solved' ? ` AND t."isSolved"` : '';
      const where = `${visible} AND ($1::uuid IS NULL OR t."categoryId"=$1::uuid)${filter}`;
      const [{ total }] = await query(tx, `SELECT COUNT(*)::int AS total FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" WHERE ${where}`, input.categoryId || null);
      const topics = await query(tx, `SELECT t.id,t."topicNumber",t.title,LEFT(t.content,180) AS excerpt,t."createdAt",t."isSolved",t."viewCount",t."authorId",u."fullName" AS "authorName",c.id AS "categoryId",c.name AS "categoryName",c.slug AS "categorySlug",(SELECT COUNT(*)::int FROM forum_posts p WHERE p."topicId"=t.id AND NOT p."isHidden") AS "replyCount" FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" JOIN users u ON u.id=t."authorId" WHERE ${where} ORDER BY ${input.filter === 'popular' ? 't."viewCount" DESC,' : ''} t."isPinned" DESC,t."lastActivityAt" DESC,t.id LIMIT 15 OFFSET $2`, input.categoryId || null, (input.page - 1) * 15);
      const trending = await query(tx, `SELECT t.id,t.title,t."viewCount" FROM forum_topics t JOIN forum_categories c ON c.id=t."categoryId" WHERE ${visible} ORDER BY t."viewCount" DESC,t."lastActivityAt" DESC,t.id LIMIT 5`);
      return { categories, stats, topics, trending, total, page: input.page, pageSize: 15, viewerId: userId };
    }, { isolationLevel: "RepeatableRead" });
  }
  async function detail(userId: string, id: string) {
    await actor(db, userId);
    return db.$transaction(async (tx: any) => {
      const row = await topic(tx, id);
      const posts = await query(tx, `SELECT p.id,p.content,p."authorId",u."fullName" AS "authorName",p."createdAt",p."isAcceptedAnswer" FROM forum_posts p JOIN users u ON u.id=p."authorId" WHERE p."topicId"=$1::uuid AND NOT p."isHidden" ORDER BY p."createdAt",p.id LIMIT 200`, id);
      return { topic: row, posts, viewerId: userId };
    }, { isolationLevel: "RepeatableRead" });
  }
  async function create(userId: string, input: { id: string; categoryId: string; title: string; content: string }) {
    return db.$transaction(async (tx: any) => {
      const user = await actor(tx, userId);
      const [category] = await query(tx, `SELECT slug FROM forum_categories WHERE id=$1::uuid AND "isActive" AND "isPublic" FOR SHARE`, input.categoryId);
      if (!category) throw new AppError("Choose an available category", 400, "INVALID_CATEGORY");
      if (category.slug === 'announcements' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') throw new AppError("Only administrators can post announcements", 403, "ANNOUNCEMENT_FORBIDDEN");
      await query(tx, `INSERT INTO forum_topics(id,"topicNumber",slug,title,content,"categoryId","authorId") VALUES($1::uuid,$2,$3,$4,$5,$6::uuid,$7::uuid) ON CONFLICT(id) DO NOTHING`, input.id, `FMT-${input.id}`, input.id, input.title, input.content, input.categoryId, userId);
      const row = await topic(tx, input.id);
      if (row.authorId !== userId || row.title !== input.title || row.content !== input.content || row.categoryId !== input.categoryId) throw new AppError("This request was already used", 409, "REQUEST_CONFLICT");
      return { id: row.id };
    });
  }
  async function reply(userId: string, id: string, input: { id: string; content: string }) {
    return db.$transaction(async (tx: any) => {
      await actor(tx, userId); const row = await topic(tx, id, true);
      if (row.isLocked || row.status === 'LOCKED') throw new AppError("This discussion is locked", 409, "TOPIC_LOCKED");
      const inserted = await query(tx, `INSERT INTO forum_posts(id,"topicId","authorId",content) VALUES($1::uuid,$2::uuid,$3::uuid,$4) ON CONFLICT(id) DO NOTHING RETURNING id`, input.id, id, userId, input.content);
      const [post] = await query(tx, `SELECT "topicId","authorId",content FROM forum_posts WHERE id=$1::uuid`, input.id);
      if (!post || post.topicId !== id || post.authorId !== userId || post.content !== input.content) throw new AppError("This request was already used", 409, "REQUEST_CONFLICT");
      if (inserted.length) await query(tx, `UPDATE forum_topics SET "replyCount"=(SELECT COUNT(*)::int FROM forum_posts WHERE "topicId"=$1::uuid AND NOT "isHidden"),"lastActivityAt"=now(),"updatedAt"=now() WHERE id=$1::uuid RETURNING id`, id);
      return { id: input.id };
    });
  }
  async function solve(userId: string, id: string, solved: boolean) {
    return db.$transaction(async (tx: any) => {
      await actor(tx, userId); const row = await topic(tx, id, true);
      if (row.authorId !== userId) throw new AppError("Only the topic author can change solved status", 403, "TOPIC_FORBIDDEN");
      if (row.isLocked || row.status === 'LOCKED') throw new AppError("This discussion is locked", 409, "TOPIC_LOCKED");
      await query(tx, `UPDATE forum_topics SET "isSolved"=$2,status=CASE WHEN $2 THEN 'SOLVED'::"ForumTopicStatus" ELSE 'OPEN'::"ForumTopicStatus" END,"updatedAt"=now() WHERE id=$1::uuid RETURNING id`, id, solved);
      return { success: true };
    });
  }
  return { read, detail, create, reply, solve };
}
