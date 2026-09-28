import type { Server } from 'node:http';
import { pgPool } from '../../config/prisma.js';
import { Database } from '../../modules/studio-next/database.js';
import { createPresenceServer } from '../../modules/studio-next/presence.js';
export { getPresenceRoomsSummary } from '../../modules/studio-next/presence.js';
export interface PeerUser {userId:string;name:string;email?:string;avatar?:string;color:string}
export interface PeerState {socketId:string;user:PeerUser;websiteId:string;cursor?:{x:number;y:number};selectedElementId?:string|null;lastSeen:number}
export function initPresenceWebSocketServer(server:Server){return createPresenceServer(server,new Database(pgPool));}
