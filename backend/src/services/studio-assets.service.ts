import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pgPool } from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

export const ASSET_CATEGORIES = ['images','videos','icons','illustrations','documents','fonts','brand-kit'] as const;
const defaultFolders = ['Hero Images','Product Images','Icons','Banners','Backgrounds','Logos','Documents','Videos'];
let schemaReady: Promise<void> | undefined;
export function ensureStudioAssets() {
  return schemaReady ??= (async () => {
    await pgPool.query(`CREATE TABLE IF NOT EXISTS studio_asset_folders (
      id UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE("userId",name));
      CREATE TABLE IF NOT EXISTS studio_asset_metadata (
      "assetId" UUID PRIMARY KEY REFERENCES media_assets(id) ON DELETE CASCADE,
      "folderId" UUID REFERENCES studio_asset_folders(id) ON DELETE SET NULL,
      category VARCHAR(30), "deletedAt" TIMESTAMPTZ);
      CREATE INDEX IF NOT EXISTS studio_asset_folder_idx ON studio_asset_metadata("folderId");`);
  })().catch(error => {schemaReady = undefined; throw error;});
}
const categorySql = `COALESCE(m.category, CASE WHEN a."mimeType" LIKE 'video/%' THEN 'videos'
  WHEN a."mimeType"='image/svg+xml' THEN 'icons' WHEN a."mimeType" LIKE 'image/%' THEN 'images'
  WHEN a."mimeType" LIKE 'font/%' OR a.filename ~* '\\.(woff2?|ttf|otf)$' THEN 'fonts' ELSE 'documents' END)`;
export async function assetsSummary(userId: string, websiteId?: string) {
  await ensureStudioAssets();
  for (const name of defaultFolders) await pgPool.query('INSERT INTO studio_asset_folders(id,"userId",name) VALUES($1,$2,$3) ON CONFLICT("userId",name) DO NOTHING',[randomUUID(),userId,name]);
  const params = [userId,websiteId || null];
  const [counts, folders, trash] = await Promise.all([
    pgPool.query(`SELECT ${categorySql} category,count(*)::int count FROM media_assets a LEFT JOIN studio_asset_metadata m ON m."assetId"=a.id WHERE a."userId"=$1 AND ($2::uuid IS NULL OR a."websiteId"=$2 OR a."websiteId" IS NULL) AND m."deletedAt" IS NULL GROUP BY 1`,params),
    pgPool.query(`SELECT f.id,f.name,count(a.id)::int count FROM studio_asset_folders f LEFT JOIN studio_asset_metadata m ON m."folderId"=f.id AND m."deletedAt" IS NULL LEFT JOIN media_assets a ON a.id=m."assetId" AND a."userId"=$1 AND ($2::uuid IS NULL OR a."websiteId"=$2 OR a."websiteId" IS NULL) WHERE f."userId"=$1 GROUP BY f.id ORDER BY f."createdAt",f.name`,params),
    pgPool.query(`SELECT count(*)::int count FROM media_assets a JOIN studio_asset_metadata m ON m."assetId"=a.id WHERE a."userId"=$1 AND ($2::uuid IS NULL OR a."websiteId"=$2 OR a."websiteId" IS NULL) AND m."deletedAt" IS NOT NULL`,params),
  ]);
  const categories = Object.fromEntries(ASSET_CATEGORIES.map(category => [category,0]));
  for (const row of counts.rows) categories[row.category] = row.count;
  return {categories,total:counts.rows.reduce((sum,row)=>sum+row.count,0),folders:folders.rows,trash:trash.rows[0].count};
}
export async function listStudioAssets(userId: string, options: {websiteId?: string; category?: string; folderId?: string; trash?: boolean; search?: string; page?: number}) {
  await ensureStudioAssets();
  const page = options.page || 1;
  const params = [userId,options.websiteId || null,options.category || null,options.folderId || null,options.trash || false,options.search || '',(page-1)*40];
  const where = `a."userId"=$1 AND ($2::uuid IS NULL OR a."websiteId"=$2 OR a."websiteId" IS NULL)
    AND ($3::text IS NULL OR ${categorySql}=$3) AND ($4::uuid IS NULL OR m."folderId"=$4)
    AND (m."deletedAt" IS NOT NULL)=$5 AND (a."originalName" ILIKE '%'||$6||'%' OR COALESCE(a."altText",'') ILIKE '%'||$6||'%')`;
  const [assets,total] = await Promise.all([
    pgPool.query(`SELECT a.*,m."folderId",${categorySql} category,m."deletedAt" FROM media_assets a LEFT JOIN studio_asset_metadata m ON m."assetId"=a.id WHERE ${where} ORDER BY a."createdAt" DESC,a.id LIMIT 40 OFFSET $7`,params),
    pgPool.query(`SELECT count(*)::int count FROM media_assets a LEFT JOIN studio_asset_metadata m ON m."assetId"=a.id WHERE ${where}`,params.slice(0,6)),
  ]);
  return {assets:assets.rows,total:total.rows[0].count,page};
}
export async function createAssetFolder(userId: string, name: string) {
  await ensureStudioAssets();
  const result = await pgPool.query('INSERT INTO studio_asset_folders(id,"userId",name) VALUES($1,$2,$3) ON CONFLICT("userId",name) DO UPDATE SET name=EXCLUDED.name RETURNING id,name',[randomUUID(),userId,name]);
  return result.rows[0];
}
export async function updateStudioAsset(userId: string, id: string, input: {folderId?: string|null; category?: string; trashed?: boolean; altText?: string}) {
  await ensureStudioAssets();
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const asset = await client.query('SELECT id FROM media_assets WHERE id=$1 AND "userId"=$2 FOR UPDATE',[id,userId]);
    if (!asset.rowCount) throw new AppError('Asset not found',404,'MEDIA_NOT_FOUND');
    if (input.folderId && !(await client.query('SELECT id FROM studio_asset_folders WHERE id=$1 AND "userId"=$2',[input.folderId,userId])).rowCount) throw new AppError('Folder not found',404,'FOLDER_NOT_FOUND');
    await client.query('INSERT INTO studio_asset_metadata("assetId") VALUES($1) ON CONFLICT DO NOTHING',[id]);
    if (input.folderId !== undefined) await client.query('UPDATE studio_asset_metadata SET "folderId"=$2 WHERE "assetId"=$1',[id,input.folderId]);
    if (input.category !== undefined) await client.query('UPDATE studio_asset_metadata SET category=$2 WHERE "assetId"=$1',[id,input.category]);
    if (input.trashed !== undefined) await client.query('UPDATE studio_asset_metadata SET "deletedAt"=CASE WHEN $2 THEN now() ELSE NULL END WHERE "assetId"=$1',[id,input.trashed]);
    if (input.altText !== undefined) await client.query('UPDATE media_assets SET "altText"=$2,"updatedAt"=now() WHERE id=$1',[id,input.altText]);
    await client.query('COMMIT');
    return {success:true};
  } catch(error) {await client.query('ROLLBACK'); throw error;} finally {client.release();}
}

const fileTypes: Record<string,string> = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',txt:'text/plain',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf'};
export async function uploadStudioAsset(userId: string, filename: string, bytes: Buffer, options: {websiteId?:string; folderId?:string; category?:string}) {
  await ensureStudioAssets();
  const ext = path.extname(filename).slice(1).toLowerCase(), mime = fileTypes[ext];
  if (!mime || !bytes.length) throw new AppError('Unsupported or empty file',400,'INVALID_FILE');
  const head=bytes.subarray(0,16), text=head.toString('latin1');
  const signatures:Record<string,boolean>={png:head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg:head[0]===255&&head[1]===216,jpeg:head[0]===255&&head[1]===216,gif:text.startsWith('GIF8'),webp:text.startsWith('RIFF')&&text.slice(8,12)==='WEBP',mp4:text.slice(4,8)==='ftyp',webm:head.subarray(0,4).equals(Buffer.from([26,69,223,163])),pdf:text.startsWith('%PDF-'),woff:text.startsWith('wOFF'),woff2:text.startsWith('wOF2'),ttf:head.subarray(0,4).equals(Buffer.from([0,1,0,0])),otf:text.startsWith('OTTO')};
  if(signatures[ext]===false) throw new AppError('File contents do not match the file type',400,'INVALID_FILE');
  if (ext==='svg' && (!bytes.toString('utf8').includes('<svg') || /<script|<foreignObject|\bon\w+\s*=|javascript:|<!ENTITY|<!DOCTYPE/i.test(bytes.toString('utf8')))) throw new AppError('SVG contains unsupported active content',400,'INVALID_FILE');
  if (options.websiteId && !(await pgPool.query('SELECT id FROM websites WHERE id=$1 AND "userId"=$2',[options.websiteId,userId])).rowCount) throw new AppError('Website not found',404,'WEBSITE_NOT_FOUND');
  if (options.folderId && !(await pgPool.query('SELECT id FROM studio_asset_folders WHERE id=$1 AND "userId"=$2',[options.folderId,userId])).rowCount) throw new AppError('Folder not found',404,'FOLDER_NOT_FOUND');
  const id = randomUUID(), stored = `${id}.${ext}`, directory = path.join(process.cwd(),'uploads','assets');
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,stored),bytes);
  try {
    const {extractImageDimensions}=await import('./media.service.js');
    const dimensions=mime.startsWith('image/')?extractImageDimensions(bytes,mime):{};
    const result = await pgPool.query(`INSERT INTO media_assets(id,"userId","websiteId",filename,"originalName","mimeType","sizeBytes",url,width,height) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[id,userId,options.websiteId||null,stored,filename,mime,bytes.length,`/uploads/assets/${stored}`,dimensions.width||null,dimensions.height||null]);
    await updateStudioAsset(userId,id,{folderId:options.folderId,category:options.category});
    return result.rows[0];
  } catch(error) {await pgPool.query('DELETE FROM media_assets WHERE id=$1 AND "userId"=$2',[id,userId]); await unlink(path.join(directory,stored)).catch(()=>{}); throw error;}
}
