import { Link } from "react-router-dom";
import { ArrowUpRight, MoreHorizontal, Star, FileText } from "lucide-react";
import { dateLabel } from "./api";
import type { Site } from "./types";

export type SiteAction = "rename" | "copy" | "move" | "archive" | "restore" | "settings" | "access" | "favorite" | "live";
export const SITE_DRAG_TYPE = "application/x-forgestudio-site";
export default function SiteCollection({ sites, view, busy, onAction }: { sites: Site[]; view: "grid" | "list"; busy: boolean; onAction: (site: Site, action: SiteAction) => void }) {
  return <div className={`fs-sites fs-sites-${view}`}>
    {sites.map((site) => <article className="fs-site" key={site.id} draggable={site.canManage && !busy} onDragStart={event => { event.dataTransfer.setData(SITE_DRAG_TYPE, site.id); event.dataTransfer.effectAllowed = "move"; }}>
      <Link className={`fs-site-preview fs-theme-${parseInt(site.id.slice(0, 2), 16) % 4}`} to={`/editor/${site.id}`} aria-label={`Open ${site.name} in Designer`} title="Decorative site cover. Open Designer to see the actual design.">
        <div className="fs-preview-chrome"><i /><i /><i /><span>{site.name}</span></div>
        <div className="fs-preview-layout" aria-hidden="true"><div className="fs-preview-wordmark">{site.name.slice(0, 2).toUpperCase()}</div><div className="fs-preview-line" /><div className="fs-preview-line fs-short" /><div className="fs-preview-button" /><div className="fs-preview-blocks"><i /><i /><i /></div></div>
        <span className="fs-designer-link">Open Designer <ArrowUpRight size={16} /></span>
      </Link>
      <div className="fs-site-info"><div className="fs-site-heading"><Link to={`/editor/${site.id}`} className="fs-site-name">{site.name}</Link><button className={`fs-icon ${site.favorite ? "fs-starred" : ""}`} disabled={busy} title={site.favorite ? "Remove from favorites" : "Add to favorites"} aria-label={`${site.favorite ? "Unfavorite" : "Favorite"} ${site.name}`} aria-pressed={site.favorite} onClick={() => onAction(site, "favorite")}><Star size={17} fill={site.favorite ? "currentColor" : "none"} /></button>
        <details className="fs-site-menu"><summary className="fs-icon" aria-label={`Actions for ${site.name}`}><MoreHorizontal size={19} /></summary><div className="fs-menu" onClick={event => { const details = event.currentTarget.parentElement; if (details instanceof HTMLDetailsElement) details.open = false; }}>
          <Link to={`/editor/${site.id}`}>Open Designer</Link><Link to={`/studio/${site.id}`}>Open Site Studio</Link><Link to={`/dashboard/cpts/${site.id}`}>Manage CMS</Link><button disabled={busy} onClick={() => onAction(site, "settings")}>Site settings & publishing</button>
          {site.status === "PUBLISHED" && <button disabled={busy} onClick={() => onAction(site, "live")}>Copy live-site link</button>}
          {site.canManage && <><hr /><button disabled={busy} onClick={() => onAction(site, "access")}>Manage site access</button><button disabled={busy} onClick={() => onAction(site, "rename")}>Rename</button><button disabled={busy} onClick={() => onAction(site, "copy")}>Duplicate design</button><button disabled={busy} onClick={() => onAction(site, "move")}>Move to folder</button><button disabled={busy} onClick={() => onAction(site, site.archivedAt ? "restore" : "archive")}>{site.archivedAt ? "Restore site" : "Archive site"}</button></>}
        </div></details></div>
        <div className="fs-site-meta"><span className={`fs-status ${site.status === "PUBLISHED" ? "fs-status-live" : ""}`}><i />{site.archivedAt ? "Archived" : site.status === "PUBLISHED" ? "Published" : "Draft"}</span><span><FileText size={12} /> {site.pageCount} {site.pageCount === 1 ? "page" : "pages"}</span></div>
        <p className="fs-site-date">Updated {dateLabel(site.updatedAt)}<span> · {site.canManage ? "Owner" : "Shared access"}</span></p>
        {view === "list" && <p className="fs-site-date">Last published: {dateLabel(site.lastPublishedAt)}</p>}
      </div>
    </article>)}
  </div>;
}
