// Archive is persistent website metadata, independent of editor/publishing status.
export function partitionDashboardSites<T extends { archivedAt?: string | null }>(sites: T[]) {
  return {
    websites: sites.filter(site => !site.archivedAt),
    archivedWebsites: sites.filter(site => !!site.archivedAt),
  };
}
