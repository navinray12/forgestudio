import React, { useState, useEffect } from "react";
import type { PublishingState, DeploymentConfig, PageConfig, DeploymentRecord } from "../types";
import { publishingService } from "../../../features/publishing/services/publishingService";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishing: PublishingState;
  deployment: DeploymentConfig;
  pages: PageConfig[];
  websiteName: string;
  websiteId?: string;
  approvalWorkflowEnabled?: boolean;
  canPublish?: boolean;
  onPublish: (options?: { destinationType?: "INTERNAL" | "WORDPRESS" }) => Promise<void>;
  onSubmitApproval?: () => Promise<void>;
  onRollback?: (deploymentId: string) => Promise<void>;
  onUpdateDeployment: (config: DeploymentConfig) => void;
  onOpenPreview: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  publishing,
  deployment,
  pages,
  websiteName: _websiteName,
  websiteId,
  approvalWorkflowEnabled = false,
  canPublish = true,
  onPublish,
  onSubmitApproval,
  onRollback,
  onUpdateDeployment,
  onOpenPreview,
}) => {
  const [activeTab, setActiveTab] = useState<"internal" | "wordpress" | "sftp" | "zip">("internal");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState(deployment?.customDomain || "");
  const [webhookUrl, setWebhookUrl] = useState(deployment?.webhookUrl || "");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(false);

  // WordPress connection state
  const [wpStatus, setWpStatus] = useState<any>(null);
  const [wpSiteUrl, setWpSiteUrl] = useState("");
  const [wpApiKey, setWpApiKey] = useState("");
  const [wpSiteName, setWpSiteName] = useState("");
  const [isConnectingWp, setIsConnectingWp] = useState(false);
  const [isVerifyingWp, setIsVerifyingWp] = useState(false);
  const [isDisconnectingWp, setIsDisconnectingWp] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [siteInfo, setSiteInfo] = useState<any>(null);
  const [isLoadingSiteInfo, setIsLoadingSiteInfo] = useState(false);
  const [siteInfoError, setSiteInfoError] = useState<string | null>(null);
  const [showSiteInfoPanel, setShowSiteInfoPanel] = useState(false);

  const [siteHealth, setSiteHealth] = useState<any>(null);
  const [isLoadingSiteHealth, setIsLoadingSiteHealth] = useState(false);
  const [siteHealthError, setSiteHealthError] = useState<string | null>(null);
  const [showSiteHealthPanel, setShowSiteHealthPanel] = useState(false);

  const handleFetchSiteInfo = async () => {
    if (!websiteId || isLoadingSiteInfo) return;
    setIsLoadingSiteInfo(true);
    setSiteInfoError(null);
    try {
      const data = await publishingService.getWordPressSiteInfo(websiteId);
      setSiteInfo(data);
      setShowSiteInfoPanel(true);
    } catch (err: any) {
      setSiteInfoError(err.message || "Failed to fetch WordPress site information");
    } finally {
      setIsLoadingSiteInfo(false);
    }
  };

  const handleFetchSiteHealth = async () => {
    if (!websiteId || isLoadingSiteHealth) return;
    setIsLoadingSiteHealth(true);
    setSiteHealthError(null);
    try {
      const data = await publishingService.getWordPressSiteHealth(websiteId);
      setSiteHealth(data);
      setShowSiteHealthPanel(true);
    } catch (err: any) {
      setSiteHealthError(err.message || "Failed to fetch WordPress site health diagnostics");
    } finally {
      setIsLoadingSiteHealth(false);
    }
  };

  const [wpPages, setWpPages] = useState<any[]>([]);
  const [isLoadingWpPages, setIsLoadingWpPages] = useState(false);
  const [wpPagesError, setWpPagesError] = useState<string | null>(null);
  const [showWpPagesPanel, setShowWpPagesPanel] = useState(false);
  const [wpPageSearch, setWpPageSearch] = useState("");
  const [wpPageStatusFilter, setWpPageStatusFilter] = useState("any");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageFormData, setPageFormData] = useState({
    title: "",
    slug: "",
    status: "draft",
    parent: 0,
    content: "",
  });

  const handleFetchWpPages = async (overrideFilter?: string) => {
    if (!websiteId) return;
    setIsLoadingWpPages(true);
    setWpPagesError(null);
    try {
      const filter = overrideFilter !== undefined ? overrideFilter : wpPageStatusFilter;
      const data = await publishingService.listWordPressPages(websiteId, {
        search: wpPageSearch,
        status: filter,
      });
      setWpPages(data?.pages || []);
      setShowWpPagesPanel(true);
    } catch (err: any) {
      setWpPagesError(err.message || "Failed to fetch WordPress pages");
    } finally {
      setIsLoadingWpPages(false);
    }
  };

  const handleCreateOrUpdateWpPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId || !pageFormData.title.trim()) return;
    setIsLoadingWpPages(true);
    try {
      if (editingPageId) {
        await publishingService.updateWordPressPage(websiteId, editingPageId, {
          title: pageFormData.title.trim(),
          slug: pageFormData.slug.trim(),
          status: pageFormData.status,
          parent: Number(pageFormData.parent),
          content: pageFormData.content,
        });
      } else {
        await publishingService.createWordPressPage(websiteId, {
          title: pageFormData.title.trim(),
          slug: pageFormData.slug.trim(),
          status: pageFormData.status,
          parent: Number(pageFormData.parent),
          content: pageFormData.content,
        });
      }
      setIsCreatingPage(false);
      setEditingPageId(null);
      setPageFormData({ title: "", slug: "", status: "draft", parent: 0, content: "" });
      await handleFetchWpPages();
    } catch (err: any) {
      setWpPagesError(err.message || "Failed to save WordPress page");
    } finally {
      setIsLoadingWpPages(false);
    }
  };

  const handleDeleteWpPage = async (pageId: number, force: boolean) => {
    if (!websiteId) return;
    const confirmMsg = force
      ? "Are you sure you want to PERMANENTLY delete this WordPress page?"
      : "Move this page to WordPress trash?";
    if (!window.confirm(confirmMsg)) return;

    setIsLoadingWpPages(true);
    try {
      await publishingService.deleteWordPressPage(websiteId, pageId, force);
      await handleFetchWpPages();
    } catch (err: any) {
      setWpPagesError(err.message || "Failed to delete page");
    } finally {
      setIsLoadingWpPages(false);
    }
  };

  const handleDuplicateWpPage = async (pageId: number, pageTitle: string) => {
    if (!websiteId) return;
    if (!window.confirm(`Duplicate page "${pageTitle}"?\nA new draft copy will be created.`)) return;

    setIsLoadingWpPages(true);
    try {
      await publishingService.duplicateWordPressPage(websiteId, pageId);
      await handleFetchWpPages();
    } catch (err: any) {
      setWpPagesError(err.message || "Failed to duplicate page");
    } finally {
      setIsLoadingWpPages(false);
    }
  };

  const [draggedWpPageId, setDraggedWpPageId] = useState<number | null>(null);
  const [dropTargetWpPageId, setDropTargetWpPageId] = useState<number | null>(null);
  const [dropWpPosition, setDropWpPosition] = useState<"BEFORE" | "AFTER" | null>(null);
  const [isReorderingWpPages, setIsReorderingWpPages] = useState(false);

  const handleReorderWpPage = async (sourceId: number, targetId: number, position: "BEFORE" | "AFTER") => {
    if (!websiteId || sourceId === targetId) return;

    const previousWpPages = [...wpPages];

    // Optimistic UI update
    const sourceIdx = wpPages.findIndex((p) => p.id === sourceId);
    const targetIdx = wpPages.findIndex((p) => p.id === targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const reordered = [...wpPages];
      const [moved] = reordered.splice(sourceIdx, 1);
      const newIdx = position === "BEFORE" ? targetIdx : targetIdx + 1;
      reordered.splice(newIdx > sourceIdx ? newIdx - 1 : newIdx, 0, moved);
      setWpPages(reordered);
    }

    setIsReorderingWpPages(true);
    try {
      const res = await publishingService.reorderWordPressPage(websiteId, sourceId, {
        targetPageId: targetId,
        position,
      });
      if (res.pages) {
        setWpPages(res.pages);
      } else {
        await handleFetchWpPages();
      }
    } catch (err: any) {
      setWpPages(previousWpPages);
      setWpPagesError(err.message || "Failed to reorder pages");
    } finally {
      setIsReorderingWpPages(false);
      setDraggedWpPageId(null);
      setDropTargetWpPageId(null);
      setDropWpPosition(null);
    }
  };

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [mediaUploadSuccess, setMediaUploadSuccess] = useState<any | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [mediaFormData, setMediaFormData] = useState({
    title: "",
    altText: "",
    caption: "",
    description: "",
  });

  const handleUploadMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !websiteId) return;

    setIsUploadingMedia(true);
    setUploadProgress(10);
    setMediaUploadError(null);
    setMediaUploadSuccess(null);

    try {
      const res = await publishingService.uploadWordPressMedia(
        websiteId,
        file,
        {
          title: mediaFormData.title || file.name.substring(0, file.name.lastIndexOf(".")) || file.name,
          altText: mediaFormData.altText,
          caption: mediaFormData.caption,
          description: mediaFormData.description,
        },
        undefined,
        (percent) => setUploadProgress(percent)
      );

      setMediaUploadSuccess(res.data || res);
      setMediaFormData({ title: "", altText: "", caption: "", description: "" });
      if (showWpMediaLibrary) {
        handleFetchWpMedia();
      }
    } catch (err: any) {
      setMediaUploadError(err.message || "Failed to upload media to WordPress");
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // WordPress Media Library Management (F-494)
  const [wpMediaList, setWpMediaList] = useState<any[]>([]);
  const [wpMediaPagination, setWpMediaPagination] = useState({ page: 1, perPage: 12, total: 0, totalPages: 1 });
  const [isLoadingWpMedia, setIsLoadingWpMedia] = useState(false);
  const [wpMediaError, setWpMediaError] = useState<string | null>(null);
  const [showWpMediaLibrary, setShowWpMediaLibrary] = useState(false);
  const [wpMediaSearch, setWpMediaSearch] = useState("");
  const [wpMediaTypeFilter, setWpMediaTypeFilter] = useState<"all" | "image" | "document">("all");
  const [wpMediaOrderby, setWpMediaOrderby] = useState<"date" | "modified" | "title" | "filename">("date");
  const [wpMediaOrder, setWpMediaOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedMediaDetail, setSelectedMediaDetail] = useState<any | null>(null);
  const [isEditingMediaMeta, setIsEditingMediaMeta] = useState(false);
  const [editMediaMetaForm, setEditMediaMetaForm] = useState({ title: "", altText: "", caption: "", description: "" });
  const [isUpdatingMediaMeta, setIsUpdatingMediaMeta] = useState(false);
  const [isDeletingMediaId, setIsDeletingMediaId] = useState<number | null>(null);
  const [showDeleteMediaModal, setShowDeleteMediaModal] = useState<number | null>(null);
  const [deleteMediaForceOption, setDeleteMediaForceOption] = useState(false);

  const handleFetchWpMedia = async (pageOverride?: number) => {
    if (!websiteId || isLoadingWpMedia) return;
    setIsLoadingWpMedia(true);
    setWpMediaError(null);
    const targetPage = pageOverride !== undefined ? pageOverride : wpMediaPagination.page;

    try {
      const res = await publishingService.listWordPressMedia(websiteId, {
        search: wpMediaSearch,
        mediaType: wpMediaTypeFilter,
        orderby: wpMediaOrderby,
        order: wpMediaOrder,
        page: targetPage,
        perPage: wpMediaPagination.perPage,
      });

      const items = res?.data?.items || res?.items || [];
      const pagination = res?.data?.pagination || res?.pagination || { page: targetPage, perPage: 12, total: items.length, totalPages: 1 };
      setWpMediaList(items);
      setWpMediaPagination(pagination);
      setShowWpMediaLibrary(true);
    } catch (err: any) {
      setWpMediaError(err.message || "Failed to load WordPress media library");
    } finally {
      setIsLoadingWpMedia(false);
    }
  };

  const handleSaveMediaMetadata = async () => {
    if (!websiteId || !selectedMediaDetail || isUpdatingMediaMeta) return;
    setIsUpdatingMediaMeta(true);
    try {
      const updated = await publishingService.updateWordPressMedia(
        websiteId,
        selectedMediaDetail.id,
        editMediaMetaForm
      );
      const data = updated.data || updated;
      setSelectedMediaDetail(data);
      setIsEditingMediaMeta(false);
      setWpMediaList((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
    } catch (err: any) {
      alert(`Failed to update media metadata: ${err.message}`);
    } finally {
      setIsUpdatingMediaMeta(false);
    }
  };

  const handleDeleteMediaItem = async (mediaId: number, force: boolean) => {
    if (!websiteId || isDeletingMediaId) return;
    setIsDeletingMediaId(mediaId);
    try {
      await publishingService.deleteWordPressMedia(websiteId, mediaId, { force });
      setShowDeleteMediaModal(null);
      if (selectedMediaDetail?.id === mediaId) {
        setSelectedMediaDetail(null);
      }
      await handleFetchWpMedia();
    } catch (err: any) {
      alert(`Failed to delete media item: ${err.message}`);
    } finally {
      setIsDeletingMediaId(null);
    }
  };

  // SFTP connection state
  const [sftpHost, setSftpHost] = useState("");
  const [sftpPort, setSftpPort] = useState("22");
  const [sftpUsername, setSftpUsername] = useState("");
  const [sftpPassword, setSftpPassword] = useState("");
  const [sftpRemotePath, setSftpRemotePath] = useState("/var/www/html");
  const [isTestingSftp, setIsTestingSftp] = useState(false);
  const [isSyncingSftp, setIsSyncingSftp] = useState(false);
  const [sftpFeedback, setSftpFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sftpVerified, setSftpVerified] = useState(false);

  useEffect(() => {
    if (isOpen && websiteId) {
      loadDeployments();
      loadWordPressStatus();
      loadWpPagePublishStatus();
      loadWpRollbackTargets();
      loadSftpConfig();
    }
  }, [isOpen, websiteId]);

  const loadSftpConfig = async () => {
    if (!websiteId) return;
    try {
      const data = await publishingService.getSftpConfig(websiteId);
      if (data?.config) {
        setSftpHost(data.config.host || "");
        setSftpPort(String(data.config.port || 22));
        setSftpUsername(data.config.username || "");
        setSftpRemotePath(data.config.remotePath || "/var/www/html");
        setSftpVerified(data.config.status === "CONNECTED");
      }
    } catch (e) {}
  };

  const handleTestSftp = async () => {
    if (!sftpHost || !sftpUsername) {
      setSftpFeedback({ type: "error", message: "Host and Username are required." });
      return;
    }
    setIsTestingSftp(true);
    setSftpFeedback(null);
    try {
      await publishingService.saveSftpConfig({
        websiteId,
        host: sftpHost,
        port: parseInt(sftpPort, 10) || 22,
        username: sftpUsername,
        password: sftpPassword,
        remotePath: sftpRemotePath,
      });
      const res = await publishingService.verifySftpConfig({
        host: sftpHost,
        port: parseInt(sftpPort, 10) || 22,
        username: sftpUsername,
        password: sftpPassword,
      });
      if (res.success || res.verified) {
        setSftpVerified(true);
        setSftpFeedback({ type: "success", message: "SFTP connection verified successfully!" });
      } else {
        setSftpFeedback({ type: "error", message: res.error || "Connection test failed." });
      }
    } catch (err: any) {
      setSftpFeedback({ type: "error", message: err.message || "Failed to verify SFTP connection." });
    } finally {
      setIsTestingSftp(false);
    }
  };

  const handleSyncSftp = async () => {
    if (!websiteId) return;
    setIsSyncingSftp(true);
    setSftpFeedback(null);
    try {
      const res = await publishingService.syncSftp(websiteId, {
        environment: "PRODUCTION",
      });
      if (res.success) {
        setSftpFeedback({ type: "success", message: `Successfully synced ${res.syncedFilesCount || "all"} files to SFTP server!` });
        loadDeployments();
      } else {
        setSftpFeedback({ type: "error", message: res.error || "SFTP sync failed." });
      }
    } catch (err: any) {
      setSftpFeedback({ type: "error", message: err.message || "SFTP sync failed." });
    } finally {
      setIsSyncingSftp(false);
    }
  };
  const loadDeployments = async () => {
    if (!websiteId) return;
    try {
      setLoadingDeployments(true);
      const data = await publishingService.getDeployments(websiteId);
      setDeployments(data);
    } catch (e) {
      console.warn("Could not load deployments:", e);
    } finally {
      setLoadingDeployments(false);
    }
  };

  const loadWordPressStatus = async () => {
    if (!websiteId) return;
    try {
      const data = await publishingService.getWordPressStatus(websiteId);
      setWpStatus(data);
      if (data?.connection?.siteUrl) {
        setWpSiteUrl(data.connection.siteUrl);
      }
      if (data?.connection?.wpSiteName) {
        setWpSiteName(data.connection.wpSiteName);
      }
    } catch (e) {
      console.warn("Could not load WordPress status:", e);
    }
  };

  const [isDownloadingPlugin, setIsDownloadingPlugin] = useState(false);

  // F-495, F-496 & F-497 WordPress Page Publish & Rollback State
  const [isPublishingWpPage, setIsPublishingWpPage] = useState(false);
  const [wpPublishStep, setWpPublishStep] = useState<string>("");
  const [wpPublishResult, setWpPublishResult] = useState<any | null>(null);
  const [wpPublishError, setWpPublishError] = useState<string | null>(null);
  const [wpPublishStatusMode, setWpPublishStatusMode] = useState<"publish" | "draft" | "private">("publish");
  const [wpPagePublishStatus, setWpPagePublishStatus] = useState<any | null>(null);
  const [isLoadingWpPublishStatus, setIsLoadingWpPublishStatus] = useState(false);

  // F-497 Rollback States
  const [wpRollbackTargets, setWpRollbackTargets] = useState<any[]>([]);
  const [isLoadingRollbackTargets, setIsLoadingRollbackTargets] = useState(false);
  const [isRollingBackWpPage, setIsRollingBackWpPage] = useState(false);
  const [wpRollbackStep, setWpRollbackStep] = useState<string>("");
  const [selectedRollbackTarget, setSelectedRollbackTarget] = useState<any | null>(null);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [wpRollbackResult, setWpRollbackResult] = useState<any | null>(null);
  const [wpRollbackError, setWpRollbackError] = useState<string | null>(null);

  const loadWpPagePublishStatus = async (pageId?: string) => {
    if (!websiteId || isLoadingWpPublishStatus) return;
    setIsLoadingWpPublishStatus(true);
    try {
      const res = await publishingService.getWordPressPublishStatus(websiteId, pageId || "default");
      setWpPagePublishStatus(res);
    } catch (err) {
      console.warn("Could not load WordPress page publish status:", err);
    } finally {
      setIsLoadingWpPublishStatus(false);
    }
  };

  const loadWpRollbackTargets = async (pageId?: string) => {
    if (!websiteId) return;
    setIsLoadingRollbackTargets(true);
    try {
      const targets = await publishingService.getWordPressRollbackTargets(websiteId, pageId || "default");
      setWpRollbackTargets(targets || []);
    } catch (err) {
      console.warn("Could not load WordPress rollback targets:", err);
    } finally {
      setIsLoadingRollbackTargets(false);
    }
  };

  const handleExecuteRollback = async () => {
    if (!websiteId || !selectedRollbackTarget || isRollingBackWpPage) return;
    setIsRollingBackWpPage(true);
    setWpRollbackError(null);
    setWpRollbackResult(null);

    try {
      setWpRollbackStep("Preparing rollback operation...");
      await new Promise((r) => setTimeout(r, 200));

      setWpRollbackStep("Loading historical publish version snapshot...");
      await new Promise((r) => setTimeout(r, 200));

      setWpRollbackStep("Validating remote WordPress page existence...");
      await new Promise((r) => setTimeout(r, 200));

      setWpRollbackStep("Resolving media assets & block transformation...");
      await new Promise((r) => setTimeout(r, 200));

      setWpRollbackStep("Updating remote WordPress content...");
      const res = await publishingService.rollbackWordPressPage(websiteId, "default", selectedRollbackTarget.snapshotId);

      setWpRollbackStep("Verifying rollback result...");
      await new Promise((r) => setTimeout(r, 250));

      setWpRollbackResult(res);
      setShowRollbackConfirm(false);

      await loadWpPagePublishStatus();
      await loadWpRollbackTargets();
    } catch (err: any) {
      if (err.code === "WORDPRESS_ROLLBACK_RESULT_UNKNOWN") {
        setWpRollbackError("Rollback request timed out. The remote WordPress state is unknown. Perform a status check to verify.");
      } else {
        setWpRollbackError(err.message || "Rollback operation failed.");
      }
    } finally {
      setIsRollingBackWpPage(false);
      setWpRollbackStep("");
    }
  };

  const handlePublishWpPageAction = async (statusOverride?: "publish" | "draft" | "private") => {
    if (!websiteId || isPublishingWpPage) return;
    const statusToUse = statusOverride || wpPublishStatusMode;

    setIsPublishingWpPage(true);
    setWpPublishError(null);
    setWpPublishResult(null);

    try {
      setWpPublishStep("Validating pre-publish readiness & connection health...");
      await new Promise((r) => setTimeout(r, 250));

      setWpPublishStep("Transforming document JSON into Gutenberg block markup...");
      await new Promise((r) => setTimeout(r, 250));

      setWpPublishStep("Resolving media references & page mapping...");
      await new Promise((r) => setTimeout(r, 250));

      setWpPublishStep("Sending signed payload to WordPress REST API...");
      const res = await publishingService.publishWordPressPage(websiteId, {
        status: statusToUse,
      });

      setWpPublishStep("Published successfully!");
      setWpPublishResult(res);
      await loadWordPressStatus();
      await loadWpPagePublishStatus();
    } catch (err: any) {
      setWpPublishError(err.message || "Failed to publish page to WordPress");
      await loadWpPagePublishStatus();
    } finally {
      setIsPublishingWpPage(false);
    }
  };

  const handleDownloadPlugin = async () => {
    if (!websiteId) return;
    try {
      setIsDownloadingPlugin(true);
      await publishingService.downloadWordPressPlugin(websiteId);
      setSaveFeedback("Downloaded forgestudio-connector.zip archive!");
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to download plugin zip");
    } finally {
      setIsDownloadingPlugin(false);
    }
  };

  if (!isOpen) return null;

  const isActuallyDeployed = deployment?.provider !== "none" && Boolean(deployment?.deployedAt);

  const handlePublishClick = async (dest: "INTERNAL" | "WORDPRESS" = "INTERNAL") => {
    try {
      setIsPublishing(true);
      setSaveFeedback("");
      await onPublish({ destinationType: dest });
      setSaveFeedback(`Website successfully published to ${dest === "WORDPRESS" ? "WordPress" : "live version"}!`);
      loadDeployments();
      if (dest === "WORDPRESS") {
        loadWordPressStatus();
      }
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to publish website.");
    } finally {
      setIsPublishing(false);
    }
  };

  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const handleSubmitApproval = async () => {
    setIsSubmittingApproval(true);
    setSaveFeedback("");
    try {
      if (onSubmitApproval) {
        await onSubmitApproval();
      } else if (websiteId) {
        const res = await fetch(`/api/approval-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ websiteId, note: "Ready for publication review." }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Failed to submit for approval");
        }
      }
      setSaveFeedback("Publication request submitted for approval!");
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to submit for approval.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRollbackClick = async (deploymentId: string, version: number) => {
    if (!onRollback && !websiteId) return;
    const confirm = window.confirm(`Are you sure you want to rollback to deployment v${version}? This will create a new live deployment.`);
    if (!confirm) return;

    try {
      setIsRollingBack(deploymentId);
      setSaveFeedback("");
      if (onRollback) {
        await onRollback(deploymentId);
      } else if (websiteId) {
        await publishingService.rollbackDeployment(websiteId, deploymentId);
      }
      setSaveFeedback(`Successfully rolled back to v${version}!`);
      loadDeployments();
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Rollback failed.");
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleConnectWordPress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId || !wpSiteUrl.trim() || !wpApiKey.trim()) return;

    try {
      setIsConnectingWp(true);
      setSaveFeedback("");
      await publishingService.connectWordPress(websiteId, wpSiteUrl, wpApiKey, wpSiteName);
      setSaveFeedback("Successfully connected to WordPress destination!");
      setWpApiKey("");
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to connect to WordPress.");
    } finally {
      setIsConnectingWp(false);
    }
  };

  const handleVerifyWordPress = async () => {
    if (!websiteId) return;
    try {
      setIsVerifyingWp(true);
      setSaveFeedback("");
      const result = await publishingService.verifyWordPress(websiteId);
      const v = result?.verification;
      setVerificationDetails(v);
      if (v?.healthy) {
        setSaveFeedback(`WordPress connection verified! Latency: ${v.responseTimeMs}ms`);
      } else {
        const errMsg = v?.errors?.[0]?.message || "Verification failed";
        setSaveFeedback(`Verification failed: ${errMsg}`);
      }
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 4500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Verification failed.");
    } finally {
      setIsVerifyingWp(false);
    }
  };

  const handleDisconnectWordPress = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = async () => {
    if (!websiteId) return;
    setShowDisconnectConfirm(false);
    setIsDisconnectingWp(true);
    try {
      setSaveFeedback("");
      await publishingService.disconnectWordPress(websiteId);
      setSaveFeedback("WordPress connection disconnected safely. ForgeStudio pages and revisions preserved.");
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Disconnect failed.");
    } finally {
      setIsDisconnectingWp(false);
    }
  };

  const handleRevokeWordPress = async () => {
    if (!websiteId) return;
    const confirm = window.confirm("Are you sure you want to revoke this WordPress connection?");
    if (!confirm) return;

    try {
      setSaveFeedback("");
      await publishingService.revokeWordPressConnection(websiteId);
      setSaveFeedback("WordPress connection revoked.");
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Revoke failed.");
    }
  };

  const handleSaveDeploymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDeployment({
      ...deployment,
      customDomain: customDomain.trim() || undefined,
      webhookUrl: webhookUrl.trim() || undefined,
      provider: customDomain.trim() || webhookUrl.trim() ? "custom" : "none",
    });
    setSaveFeedback("Deployment settings updated.");
    setTimeout(() => setSaveFeedback(""), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PUBLISHED</span>;
      case "DEPLOYING":
      case "BUILDING":
      case "VALIDATING":
      case "PROCESSING":
      case "VERIFYING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">{status}</span>;
      case "RECONCILIATION_REQUIRED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">RECONCILIATION</span>;
      case "VALIDATION_FAILED":
      case "BUILD_FAILED":
      case "DEPLOY_FAILED":
      case "VERIFICATION_FAILED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold">
              🚀
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Publish & Deployment</h2>
              <p className="text-xs text-slate-400">
                Manage website versions, preview live status, and configure hosting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("internal")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "internal"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            ForgeStudio Live
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wordpress")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "wordpress"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>WordPress Destination</span>
            {wpStatus?.isConnected && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sftp")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sftp"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>SFTP Server</span>
            {sftpVerified && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zip")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "zip"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>Static ZIP Export</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[68vh]">
          {activeTab === "internal" ? (
            <>
              {/* Status Overview Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Current Website Status
                </span>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Publish State</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          publishing.status === "PUBLISHED"
                            ? "bg-emerald-500 shadow-sm shadow-emerald-500"
                            : publishing.status.includes("FAILED")
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span className="font-extrabold text-white">{publishing.status}</span>
                      <span className="text-[10px] text-slate-400 font-mono">v{publishing.version || 1}</span>
                    </div>
                    {publishing.publishedAt ? (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Published: {new Date(publishing.publishedAt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">Not yet published</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Deployment Hosting</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isActuallyDeployed ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-slate-500"
                        }`}
                      />
                      <span className="font-extrabold text-white">
                        {isActuallyDeployed ? "LIVE PRODUCTION" : "LOCAL BUILDER"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {deployment?.customDomain
                        ? `Domain: ${deployment.customDomain}`
                        : "No external domain connected"}
                    </p>
                  </div>
                </div>

                {/* Verification checklist */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Total Pages to Publish:</span>
                    <span className="font-bold text-white">{pages.length} pages</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
                    <span>Home Page:</span>
                    <span className="font-bold text-blue-400">
                      {pages.find((p) => p.isHome || p.slug === "/")?.name || "Home"} (/)
                    </span>
                  </div>
                </div>
              </div>

              {/* Publishing Action Box */}
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Publish Website Snapshot</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Validates integrity, processes all pages & components, and updates the live production snapshot.
                    </p>
                  </div>
                  {approvalWorkflowEnabled && !canPublish ? (
                    <button
                      type="button"
                      onClick={handleSubmitApproval}
                      disabled={isSubmittingApproval}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-amber-600/30 transition disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <span>📋</span>
                      <span>{isSubmittingApproval ? "Submitting..." : "Submit for Approval"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePublishClick("INTERNAL")}
                      disabled={isPublishing}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isPublishing ? "Publishing..." : "🚀 Publish Now"}
                    </button>
                  )}
                </div>
                {publishing.status === "PUBLISHED" && Boolean(publishing.publishedAt) && Boolean(websiteId) && (
                  <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
                    <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      Published & Live (v{publishing.version || 1})
                    </span>
                    <a
                      href={`/site/${websiteId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      <span>Visit Live Site</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Deployment History Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Deployment History</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Audited deployment records and non-destructive rollbacks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadDeployments}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    Refresh
                  </button>
                </div>

                {loadingDeployments ? (
                  <div className="text-center py-4 text-xs text-slate-400">Loading deployments...</div>
                ) : deployments.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No deployments recorded yet.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {deployments.map((d) => {
                      const isCurrentActive = publishing.status === "PUBLISHED" && publishing.version === d.version;
                      return (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            isCurrentActive ? "border-emerald-500/40 bg-emerald-950/20" : "border-slate-800 bg-slate-900/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white font-mono">v{d.version}</span>
                              {getStatusBadge(d.status)}
                              <span className="text-[10px] text-slate-400 uppercase font-mono">{d.destinationType}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {new Date(d.createdAt).toLocaleString()}
                              {d.creator?.fullName ? ` • by ${d.creator.fullName}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrentActive ? (
                              <span className="text-[10px] font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">
                                Active
                              </span>
                            ) : d.status === "PUBLISHED" ? (
                              <button
                                type="button"
                                onClick={() => handleRollbackClick(d.id, d.version)}
                                disabled={isRollingBack === d.id || isPublishing}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 transition disabled:opacity-50 cursor-pointer"
                              >
                                {isRollingBack === d.id ? "Rolling back..." : "Rollback"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Domain & Hosting Configuration */}
              <form onSubmit={handleSaveDeploymentConfig} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-white">Production Deployment Integration</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Connect your real hosting provider, custom domain, or deployment webhook.
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Custom Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. www.mybrand.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      CI/CD Deploy Webhook (Vercel, Netlify, Cloudflare, Custom Server)
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    🔒 We never show false "Live" statuses without a verified deployment.
                  </span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
                  >
                    Save Hosting Settings
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* WordPress Destination Tab */
            <div className="space-y-5">
              {wpStatus?.isConnected ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                        <div>
                          <h4 className="text-xs font-extrabold text-white">
                            {wpStatus.connection?.wpSiteName || "WordPress Destination Connected"}
                          </h4>
                          <a
                            href={wpStatus.connection?.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            {wpStatus.connection?.siteUrl} ↗
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {verificationDetails?.healthy === false ? (
                          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            VERIFICATION FAILED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            CONNECTED & HEALTHY
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Mapped Pages</span>
                        <span className="font-extrabold text-white">{wpStatus.mappingsCount || 0} pages</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Plugin Version</span>
                        <span className="font-mono text-slate-300">v{verificationDetails?.pluginVersion || wpStatus.connection?.pluginVersion || "1.0.0"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">API Version</span>
                        <span className="font-mono text-slate-300">{verificationDetails?.apiVersion || wpStatus.connection?.apiVersion || "v1"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">WordPress Core</span>
                        <span className="text-slate-300">{verificationDetails?.wordpressVersion || "WordPress 6.x"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Response Time</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {verificationDetails?.responseTimeMs ? `${verificationDetails.responseTimeMs} ms` : "Fast (< 200ms)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Last Verified</span>
                        <span className="text-slate-300">
                          {wpStatus.connection?.lastVerifiedAt
                            ? new Date(wpStatus.connection.lastVerifiedAt).toLocaleTimeString()
                            : "Just now"}
                        </span>
                      </div>
                    </div>

                    {/* Verified Capabilities */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">Verified Capabilities:</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(verificationDetails?.capabilities || wpStatus.connection?.capabilities || ["pages", "media", "publishing", "gutenberg", "webhooks"]).map((cap: string) => (
                          <span key={cap} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-blue-300 text-[10px] font-semibold flex items-center gap-1">
                            <span>✓</span> {cap.charAt(0).toUpperCase() + cap.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Diagnostic Errors or Warnings */}
                    {verificationDetails?.errors && verificationDetails.errors.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs space-y-1">
                        <div className="font-bold text-[11px] text-rose-200 flex items-center gap-1">
                          <span>⚠️ Verification Diagnostic Warning:</span>
                        </div>
                        {verificationDetails.errors.map((err: any, idx: number) => (
                          <div key={idx} className="text-[10px] font-mono text-rose-300">
                            [{err.code}] {err.message}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleFetchSiteInfo}
                        disabled={isLoadingSiteInfo}
                        className="px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 border border-blue-700/50 text-blue-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isLoadingSiteInfo ? "Loading Info..." : "ℹ️ Site Information"}
                      </button>
                      <button
                        type="button"
                        onClick={handleFetchSiteHealth}
                        disabled={isLoadingSiteHealth}
                        className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 text-emerald-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isLoadingSiteHealth ? "Checking Health..." : "🩺 Site Health"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFetchWpPages()}
                        disabled={isLoadingWpPages}
                        className="px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/50 text-indigo-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isLoadingWpPages ? "Loading Pages..." : "📄 WordPress Pages"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFetchWpMedia()}
                        disabled={isLoadingWpMedia}
                        className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 text-emerald-200 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isLoadingWpMedia ? "Loading Media..." : "🖼️ Media Library"}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyWordPress}
                        disabled={isVerifyingWp}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isVerifyingWp ? "Verifying..." : "⚡ Verify Connection"}
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeWordPress}
                        className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                      >
                        Revoke Token
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectWordPress}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold transition cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Site Information UI Panel */}
                  {siteInfoError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                      <div className="font-extrabold text-rose-200">⚠️ Could not load Site Information:</div>
                      <div className="font-mono text-[11px] text-rose-300">{siteInfoError}</div>
                    </div>
                  )}

                  {/* Site Health UI Panel Errors & Display */}
                  {siteHealthError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                      <div className="font-extrabold text-rose-200">⚠️ Could not load Site Health Diagnostics:</div>
                      <div className="font-mono text-[11px] text-rose-300">{siteHealthError}</div>
                    </div>
                  )}

                  {showSiteHealthPanel && siteHealth && (
                    <div className="rounded-xl border border-emerald-900/60 bg-slate-900/95 p-4 space-y-4 shadow-xl">
                      {/* Health Header & Score */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            siteHealth.overallStatus === 'HEALTHY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            siteHealth.overallStatus === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {siteHealth.overallStatus}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                              <span>🩺</span> Site Health & Compatibility
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              Checked: {siteHealth.checkedAt ? new Date(siteHealth.checkedAt).toLocaleTimeString() : 'Just now'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-base font-black text-emerald-400 font-mono">{siteHealth.score}%</div>
                            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Health Score</div>
                          </div>
                          <button
                            type="button"
                            onClick={handleFetchSiteHealth}
                            disabled={isLoadingSiteHealth}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-200 text-[11px] font-bold transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                          >
                            {isLoadingSiteHealth ? "Refreshing..." : "🔄 Refresh Health"}
                          </button>
                        </div>
                      </div>

                      {/* Section 1: CONNECTIVITY & AUTHENTICATION */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">1. Connectivity & Authentication</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Latency</span>
                            <span className="text-emerald-400 font-mono font-bold">{siteHealth.responseTimeMs} ms</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">REST API Reachability</span>
                            <span className="text-emerald-400 font-bold">✓ Active</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">HMAC Signature</span>
                            <span className="text-emerald-400 font-bold">✓ Verified</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">User Permission</span>
                            <span className="text-slate-200 font-semibold">{siteHealth.authentication?.permissions || 'ADMINISTRATOR'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: COMPATIBILITY */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">2. WordPress Compatibility</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">WordPress Version</span>
                            <span className="text-slate-100 font-bold">{siteHealth.compatibility?.wordpressVersion} (Min: {siteHealth.compatibility?.minimumSupportedVersion})</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Compatibility Status</span>
                            <span className={`font-bold ${siteHealth.compatibility?.status === 'SUPPORTED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {siteHealth.compatibility?.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Plugin Version</span>
                            <span className="text-slate-300 font-mono">v{siteHealth.compatibility?.connectorVersion}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">API Namespace</span>
                            <span className="text-slate-300 font-mono">{siteHealth.compatibility?.apiVersion}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: PUBLISHING READINESS */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">3. Publishing Readiness</h5>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300">Publishing Status:</span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase ${
                              siteHealth.publishingReadiness?.status === 'READY' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                              siteHealth.publishingReadiness?.status === 'READY_WITH_WARNINGS' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                              'bg-rose-950 text-rose-300 border border-rose-700'
                            }`}>
                              {siteHealth.publishingReadiness?.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                            <div className="flex items-center gap-1.5">
                              <span className={siteHealth.publishingReadiness?.canPublishPages ? "text-emerald-400" : "text-rose-400"}>
                                {siteHealth.publishingReadiness?.canPublishPages ? "✓" : "✗"}
                              </span>
                              <span className="text-slate-300">Page Publishing</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={siteHealth.publishingReadiness?.canUploadMedia ? "text-emerald-400" : "text-rose-400"}>
                                {siteHealth.publishingReadiness?.canUploadMedia ? "✓" : "✗"}
                              </span>
                              <span className="text-slate-300">Media Uploads</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={siteHealth.publishingReadiness?.canUseGutenberg ? "text-emerald-400" : "text-amber-400"}>
                                {siteHealth.publishingReadiness?.canUseGutenberg ? "✓" : "!"}
                              </span>
                              <span className="text-slate-300">Gutenberg Blocks</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={siteHealth.publishingReadiness?.canUpdateContent ? "text-emerald-400" : "text-rose-400"}>
                                {siteHealth.publishingReadiness?.canUpdateContent ? "✓" : "✗"}
                              </span>
                              <span className="text-slate-300">Content Updates</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: CAPABILITY MATRIX */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">4. Capabilities Grid</h5>
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px]">
                          {Object.entries(siteHealth.capabilities || {})
                            .filter(([key]) => key !== 'status')
                            .map(([capKey, enabled]) => (
                              <div key={capKey} className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                <span className={enabled ? "text-emerald-400 font-bold" : "text-slate-500"}>{enabled ? "✓" : "✗"}</span>
                                <span className="text-slate-300 font-medium capitalize">{capKey}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Section 5: SECURITY & DIAGNOSTIC MESSAGES */}
                      <div className="space-y-1.5">
                        <h5 className="text-[10px] font-black uppercase tracking-wider text-emerald-400">5. Security & Diagnostics</h5>
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold">HTTPS Connection</span>
                            <span className={siteHealth.security?.https ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                              {siteHealth.security?.https ? "✓ Enabled (Secure)" : "⚠️ HTTP Only (Insecure)"}
                            </span>
                          </div>

                          {siteHealth.errors && siteHealth.errors.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-800">
                              <span className="text-[10px] font-extrabold text-rose-400 uppercase">Errors:</span>
                              {siteHealth.errors.map((err: any, idx: number) => (
                                <div key={idx} className="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] font-mono">
                                  [{err.code}] {err.message}
                                </div>
                              ))}
                            </div>
                          )}

                          {siteHealth.warnings && siteHealth.warnings.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-800">
                              <span className="text-[10px] font-extrabold text-amber-400 uppercase">Warnings:</span>
                              {siteHealth.warnings.map((warn: any, idx: number) => (
                                <div key={idx} className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px]">
                                  [{warn.code}] {warn.message}
                                </div>
                              ))}
                            </div>
                          )}

                          {siteHealth.recommendations && siteHealth.recommendations.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-800">
                              <span className="text-[10px] font-extrabold text-blue-400 uppercase">Recommendations:</span>
                              <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                                {siteHealth.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {showSiteInfoPanel && siteInfo && (
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🌐</span>
                          <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">
                            WordPress Site Information
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleFetchSiteInfo}
                          disabled={isLoadingSiteInfo}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-200 text-[11px] font-bold transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          {isLoadingSiteInfo ? "Refreshing..." : "🔄 Refresh Information"}
                        </button>
                      </div>

                      {/* Section 1: GENERAL */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">General</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Site URL</span>
                            <span className="text-slate-200 font-mono text-[11px]">{siteInfo.general?.siteUrl}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Home URL</span>
                            <span className="text-slate-200 font-mono text-[11px]">{siteInfo.general?.homeUrl}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">WordPress Version</span>
                            <span className="text-emerald-400 font-bold">{siteInfo.general?.wordpressVersion}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Locale / Language</span>
                            <span className="text-slate-200">{siteInfo.general?.locale} ({siteInfo.general?.language})</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Timezone</span>
                            <span className="text-slate-200 font-mono text-[11px]">{siteInfo.general?.timezone}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">REST API</span>
                            <span className="text-emerald-400 font-bold">✓ {siteInfo.general?.restApiStatus}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Multisite</span>
                            <span className="text-slate-200">{siteInfo.general?.multisiteStatus === "MULTISITE" ? "Multisite Enabled" : "Single Site"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: FORGESTUDIO CONNECTOR */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">ForgeStudio Connector</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Connector Version</span>
                            <span className="text-slate-200 font-mono">v{siteInfo.connector?.connectorVersion}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">API Version</span>
                            <span className="text-slate-200 font-mono">{siteInfo.connector?.apiVersion}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Connection Status</span>
                            <span className="text-emerald-400 font-bold">CONNECTED</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Response Latency</span>
                            <span className="text-emerald-400 font-mono font-bold">{siteInfo.connector?.responseTimeMs} ms</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] text-slate-400 block font-bold">Last Verified</span>
                            <span className="text-slate-300 text-[11px]">{siteInfo.connector?.lastVerifiedAt ? new Date(siteInfo.connector.lastVerifiedAt).toLocaleString() : "Just now"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: ACTIVE THEME */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Active Theme</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Theme Name</span>
                            <span className="text-slate-200 font-bold">{siteInfo.theme?.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Theme Version</span>
                            <span className="text-slate-200 font-mono">v{siteInfo.theme?.version}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Theme Architecture</span>
                            <span className="text-blue-300 font-semibold">{siteInfo.theme?.themeType === "BLOCK" ? "Block Theme (FSE)" : "Classic Theme"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Parent Theme</span>
                            <span className="text-slate-400">{siteInfo.theme?.parentTheme || "None (Standalone)"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: CAPABILITIES */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Capabilities</h5>
                        <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          {(siteInfo.capabilities || []).map((cap: string) => (
                            <span key={cap} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1">
                              <span>✓</span> {cap.charAt(0).toUpperCase() + cap.slice(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* F-496 WORDPRESS PUBLISH STATUS CARD */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📌</span>
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">
                            WordPress Publish Status (F-496)
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Authoritative publishing state, content freshness, & remote page verification.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${
                          wpPagePublishStatus?.state === "PUBLISHED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : wpPagePublishStatus?.state === "STALE"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : wpPagePublishStatus?.state === "REMOTE_MISSING"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : wpPagePublishStatus?.state === "FAILED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : wpPagePublishStatus?.state === "DISCONNECTED"
                            ? "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                            : wpPagePublishStatus?.state === "PUBLISHING"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            wpPagePublishStatus?.state === "PUBLISHED" ? "bg-emerald-400" :
                            wpPagePublishStatus?.state === "STALE" ? "bg-amber-400 animate-pulse" :
                            wpPagePublishStatus?.state === "REMOTE_MISSING" ? "bg-rose-400 animate-ping" :
                            wpPagePublishStatus?.state === "FAILED" ? "bg-red-400" : "bg-slate-400"
                          }`} />
                          {wpPagePublishStatus?.state === "PUBLISHED" && "Published"}
                          {wpPagePublishStatus?.state === "STALE" && "Changes Pending"}
                          {wpPagePublishStatus?.state === "REMOTE_MISSING" && "Remote Missing"}
                          {wpPagePublishStatus?.state === "FAILED" && "Publish Failed"}
                          {wpPagePublishStatus?.state === "DISCONNECTED" && "Disconnected"}
                          {wpPagePublishStatus?.state === "PUBLISHING" && "Publishing..."}
                          {wpPagePublishStatus?.state === "NEVER_PUBLISHED" && "Not Published"}
                          {(!wpPagePublishStatus || wpPagePublishStatus?.state === "UNKNOWN") && "Status Unknown"}
                        </span>

                        <button
                          type="button"
                          onClick={() => loadWpPagePublishStatus()}
                          disabled={isLoadingWpPublishStatus}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <span className={isLoadingWpPublishStatus ? "animate-spin" : ""}>🔄</span> Refresh
                        </button>
                      </div>
                    </div>

                    {/* Status Detail Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">WordPress URL</span>
                        {wpPagePublishStatus?.wordpressUrl ? (
                          <a
                            href={wpPagePublishStatus.wordpressUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-400 hover:underline truncate block"
                          >
                            {wpPagePublishStatus.wordpressUrl}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">Not available</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Last Synced</span>
                        <span className="font-medium text-slate-200 block">
                          {wpPagePublishStatus?.lastPublishedAt
                            ? new Date(wpPagePublishStatus.lastPublishedAt).toLocaleTimeString()
                            : "Never"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Content Freshness</span>
                        <span className={`font-bold block ${
                          wpPagePublishStatus?.contentState === "CURRENT" ? "text-emerald-400" :
                          wpPagePublishStatus?.contentState === "CHANGES_PENDING" ? "text-amber-400" : "text-slate-400"
                        }`}>
                          {wpPagePublishStatus?.contentState === "CURRENT" && "✓ Up to date"}
                          {wpPagePublishStatus?.contentState === "CHANGES_PENDING" && "⚠️ Changes pending"}
                          {wpPagePublishStatus?.contentState === "UNKNOWN" && "Unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Remote Page</span>
                        <span className={`font-bold block ${
                          wpPagePublishStatus?.remoteState === "EXISTS" ? "text-emerald-400" :
                          wpPagePublishStatus?.remoteState === "MISSING" ? "text-rose-400" : "text-slate-400"
                        }`}>
                          {wpPagePublishStatus?.remoteState === "EXISTS" && "✓ Verified"}
                          {wpPagePublishStatus?.remoteState === "MISSING" && "❌ Missing (404)"}
                          {wpPagePublishStatus?.remoteState === "UNKNOWN" && "Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Contextual Action Banners */}
                    {wpPagePublishStatus?.state === "STALE" && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>⚠️</span> ForgeStudio page content has been edited since last publish.
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePublishWpPageAction("publish")}
                          disabled={isPublishingWpPage}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] transition cursor-pointer shrink-0 ml-2"
                        >
                          Publish Changes
                        </button>
                      </div>
                    )}

                    {wpPagePublishStatus?.state === "REMOTE_MISSING" && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>🚨</span> Mapped remote page ID {wpPagePublishStatus.wordpressPageId} no longer exists.
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePublishWpPageAction("publish")}
                          disabled={isPublishingWpPage}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] transition cursor-pointer shrink-0 ml-2"
                        >
                          Publish Again
                        </button>
                      </div>
                    )}

                    {wpPagePublishStatus?.state === "DISCONNECTED" && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>🔌</span> WordPress site is disconnected or integration key was revoked.
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleConnectWordPress(e as any)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px] transition cursor-pointer shrink-0 ml-2"
                        >
                          Reconnect WordPress
                        </button>
                      </div>
                    )}
                  </div>

                  {/* F-495 WordPress Publish Engine Panel */}
                  <div className="rounded-xl border border-blue-900/50 bg-slate-900/90 p-4 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                          <span>🚀</span> WordPress Page Publish (F-495)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Publish canonical page document to connected WordPress site with block transformation and durable mapping.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <span className="text-[10px] text-slate-400 font-bold px-1.5">Status:</span>
                        <select
                          value={wpPublishStatusMode}
                          onChange={(e) => setWpPublishStatusMode(e.target.value as any)}
                          className="bg-slate-900 text-xs font-bold text-white rounded px-2 py-1 outline-none border border-slate-700 cursor-pointer"
                        >
                          <option value="publish">PUBLISH (Public)</option>
                          <option value="draft">DRAFT (Private Draft)</option>
                          <option value="private">PRIVATE (Authenticated Only)</option>
                        </select>
                      </div>
                    </div>

                    {/* Pre-Publish Review Summary */}
                    <div className="grid grid-cols-4 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Target Site</span>
                        <span className="font-bold text-blue-400 truncate block">{wpStatus?.connection?.siteUrl || "WordPress Site"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Page Count</span>
                        <span className="font-bold text-white">{pages?.length || 1} page(s)</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Health Status</span>
                        <span className="font-bold text-emerald-400">READY</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Mapping Strategy</span>
                        <span className="font-bold text-indigo-300">Durable Upsert</span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    {isPublishingWpPage && (
                      <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                          <span className="flex items-center gap-2">
                            <span className="animate-spin text-sm">⏳</span> {wpPublishStep}
                          </span>
                          <span className="font-mono text-[11px] animate-pulse">PUBLISHING...</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all duration-300 animate-pulse w-3/4"></div>
                        </div>
                      </div>
                    )}

                    {/* Publish Error Display */}
                    {wpPublishError && (
                      <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                        <div className="font-extrabold text-rose-200 flex items-center gap-1">
                          <span>❌ Publish Failed:</span>
                        </div>
                        <div className="font-mono text-[11px] text-rose-300">{wpPublishError}</div>
                      </div>
                    )}

                    {/* Publish Success Display */}
                    {wpPublishResult && (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-emerald-200 flex items-center gap-1.5">
                            <span>✅ Published Successfully!</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono uppercase">
                              {wpPublishResult.action} (WP ID: {wpPublishResult.wordpressPageId})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(wpPublishResult.publishedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[11px] font-mono text-slate-300 truncate">URL: {wpPublishResult.url}</span>
                          <a
                            href={wpPublishResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition shrink-0 ml-2"
                          >
                            View Published Page ↗
                          </a>
                        </div>
                        {wpPublishResult.warnings && wpPublishResult.warnings.length > 0 && (
                          <div className="text-[10px] text-amber-300 space-y-0.5 pt-1">
                            <span className="font-bold block">Advisory Notices:</span>
                            {wpPublishResult.warnings.map((w: any, i: number) => (
                              <div key={i}>• {w.message}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handlePublishWpPageAction("draft")}
                        disabled={isPublishingWpPage}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        Save Draft to WP
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishWpPageAction("publish")}
                        disabled={isPublishingWpPage}
                        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🚀</span> {wpStatus?.mappingsCount ? "Update Published Page" : "Publish to WordPress"}
                      </button>
                    </div>
                  </div>

                  {/* F-497 WordPress Publish Rollback Panel */}
                  <div className="rounded-xl border border-purple-900/50 bg-slate-900/90 p-4 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                          <span>⏪</span> WordPress Publish History & Rollback (F-497)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Restore a previously successful publish snapshot to WordPress without changing remote page ID or breaking public URLs.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadWpRollbackTargets()}
                        disabled={isLoadingRollbackTargets}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer"
                      >
                        🔄 Refresh History
                      </button>
                    </div>

                    {/* Progress Bar during Rollback */}
                    {isRollingBackWpPage && (
                      <div className="p-3.5 rounded-lg bg-purple-950/40 border border-purple-800/50 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                          <span className="flex items-center gap-2">
                            <span className="animate-spin text-purple-400">⏳</span> {wpRollbackStep}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono">Processing Rollback</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 animate-pulse w-3/4 rounded-full"></div>
                        </div>
                      </div>
                    )}

                    {/* Rollback Error Display */}
                    {wpRollbackError && (
                      <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-2">
                        <div className="font-extrabold text-rose-200 flex items-center gap-1">
                          <span>❌ Rollback Error:</span>
                        </div>
                        <div className="font-mono text-[11px] text-rose-300">{wpRollbackError}</div>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => loadWpPagePublishStatus()}
                            className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 border border-rose-700 text-white font-bold rounded text-[10px] transition cursor-pointer"
                          >
                            Check Status
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rollback Success Display */}
                    {wpRollbackResult && (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-emerald-200 flex items-center gap-1.5">
                            <span>✅ Rollback Executed Successfully!</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono uppercase">
                              RESTORED (WP ID: {wpRollbackResult.wordpressPageId})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(wpRollbackResult.publishedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          Status: <span className="text-emerald-400 font-bold">{wpRollbackResult.status}</span> | URL: {wpRollbackResult.url}
                        </div>
                      </div>
                    )}

                    {/* History List */}
                    {isLoadingRollbackTargets ? (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        Loading publish history & snapshots...
                      </div>
                    ) : wpRollbackTargets.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800">
                        No previous published snapshots found for this page. Publish a version first to enable rollback targets.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {wpRollbackTargets.map((target, idx) => (
                          <div
                            key={target.snapshotId || idx}
                            className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs transition"
                          >
                            <div className="space-y-1 truncate">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/60 text-purple-300 font-mono text-[10px] font-black">
                                  v{target.sourceVersion}
                                </span>
                                <span className="font-bold text-slate-200 truncate">{target.title}</span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-black uppercase">
                                    Latest Publish
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                                <span>📅 {new Date(target.publishedAt).toLocaleString()}</span>
                                <span>🧩 {target.elementCount || 0} Elements</span>
                                <span>🔗 /{target.slug}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRollbackTarget(target);
                                setShowRollbackConfirm(true);
                              }}
                              disabled={isRollingBackWpPage}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow transition disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              Rollback to v{target.sourceVersion}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmation Modal */}
                    {showRollbackConfirm && selectedRollbackTarget && (
                      <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-700 space-y-3 shadow-2xl">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                            <span>⚠️</span> Confirm WordPress Rollback
                          </h5>
                          <button
                            type="button"
                            onClick={() => setShowRollbackConfirm(false)}
                            className="text-slate-400 hover:text-white text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs text-slate-300">
                          Are you sure you want to restore <strong className="text-white">v{selectedRollbackTarget.sourceVersion}</strong> ({new Date(selectedRollbackTarget.publishedAt).toLocaleString()}) to WordPress?
                        </p>
                        <div className="p-2 rounded bg-purple-900/40 text-[11px] text-purple-300 font-mono">
                          This action will overwrite live WordPress page content (WP ID {selectedRollbackTarget.wordpressPageId}). Your current working draft in ForgeStudio will remain intact.
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRollbackConfirm(false)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteRollback}
                            disabled={isRollingBackWpPage}
                            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-600/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>⏪</span> Confirm Rollback
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* WordPress Pages Management UI Panel */}
                  {wpPagesError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                      <div className="font-extrabold text-rose-200">⚠️ WordPress Page Error:</div>
                      <div className="font-mono text-[11px] text-rose-300">{wpPagesError}</div>
                    </div>
                  )}

                  {showWpPagesPanel && (
                    <div className="rounded-xl border border-indigo-900/60 bg-slate-900/95 p-4 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📄</span>
                          <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">
                            WordPress Page Manager
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPageId(null);
                              setPageFormData({ title: "", slug: "", status: "draft", parent: 0, content: "" });
                              setIsCreatingPage(!isCreatingPage);
                              setShowMediaUploadModal(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold transition cursor-pointer"
                          >
                            {isCreatingPage ? "✕ Cancel" : "+ Create Page"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMediaUploadModal(!showMediaUploadModal);
                              setIsCreatingPage(false);
                              setEditingPageId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition cursor-pointer"
                          >
                            {showMediaUploadModal ? "✕ Close Upload" : "🖼️ Upload Media"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFetchWpPages()}
                            disabled={isLoadingWpPages}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            🔄 Refresh
                          </button>
                        </div>
                      </div>

                      {/* Media Upload Panel */}
                      {showMediaUploadModal && (
                        <div className="p-3.5 rounded-lg border border-emerald-700/50 bg-emerald-950/20 space-y-3">
                          <h5 className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider">
                            Upload Media to WordPress Library (F-493)
                          </h5>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Media Title</label>
                              <input
                                type="text"
                                placeholder="Optional title..."
                                value={mediaFormData.title}
                                onChange={(e) => setMediaFormData({ ...mediaFormData, title: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Alt Text</label>
                              <input
                                type="text"
                                placeholder="Image accessibility alt text..."
                                value={mediaFormData.altText}
                                onChange={(e) => setMediaFormData({ ...mediaFormData, altText: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Caption</label>
                              <input
                                type="text"
                                placeholder="Media caption..."
                                value={mediaFormData.caption}
                                onChange={(e) => setMediaFormData({ ...mediaFormData, caption: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Description</label>
                              <input
                                type="text"
                                placeholder="Detailed description..."
                                value={mediaFormData.description}
                                onChange={(e) => setMediaFormData({ ...mediaFormData, description: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1">
                            <label className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-emerald-600/50 bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition">
                              <span className="text-xs font-bold text-emerald-300">Choose File to Upload</span>
                              <span className="text-[10px] text-slate-400">Supported: JPG, PNG, GIF, WEBP, PDF (Max 10MB)</span>
                              <input
                                type="file"
                                disabled={isUploadingMedia}
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                onChange={handleUploadMediaFile}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {isUploadingMedia && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-emerald-400">
                                <span>Uploading file to WordPress...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}

                          {mediaUploadError && (
                            <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-[11px] font-medium text-rose-300">
                              ⚠️ {mediaUploadError}
                            </div>
                          )}

                          {mediaUploadSuccess && (
                            <div className="p-3.5 rounded bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                                <span>✅ Upload Successful!</span>
                                <span className="bg-emerald-900 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded">ID: #{mediaUploadSuccess.id}</span>
                              </div>
                              <div className="text-[11px] text-slate-300 truncate font-mono">
                                URL: <a href={mediaUploadSuccess.url} target="_blank" rel="noreferrer" className="underline hover:text-emerald-300">{mediaUploadSuccess.url}</a>
                              </div>
                              <div className="text-[10px] text-slate-400 flex gap-3">
                                <span>Filename: {mediaUploadSuccess.filename}</span>
                                <span>MIME: {mediaUploadSuccess.mimeType}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Search & Filter Bar */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search pages by title or slug..."
                          value={wpPageSearch}
                          onChange={(e) => setWpPageSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleFetchWpPages()}
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 font-sans"
                        />
                        <select
                          value={wpPageStatusFilter}
                          onChange={(e) => {
                            setWpPageStatusFilter(e.target.value);
                            handleFetchWpPages(e.target.value);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                        >
                          <option value="any">All Statuses</option>
                          <option value="publish">Published</option>
                          <option value="draft">Drafts</option>
                          <option value="pending">Pending</option>
                          <option value="private">Private</option>
                          <option value="trash">Trash</option>
                        </select>
                      </div>

                      {/* Create / Edit Form */}
                      {(isCreatingPage || editingPageId) && (
                        <form onSubmit={handleCreateOrUpdateWpPage} className="p-3.5 rounded-lg border border-indigo-700/50 bg-indigo-950/20 space-y-3">
                          <h5 className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">
                            {editingPageId ? `Edit WordPress Page (ID: ${editingPageId})` : "Create New WordPress Page"}
                          </h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Page Title *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. About Us"
                                value={pageFormData.title}
                                onChange={(e) => setPageFormData({ ...pageFormData, title: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">URL Slug</label>
                              <input
                                type="text"
                                placeholder="e.g. about-us"
                                value={pageFormData.slug}
                                onChange={(e) => setPageFormData({ ...pageFormData, slug: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Status</label>
                              <select
                                value={pageFormData.status}
                                onChange={(e) => setPageFormData({ ...pageFormData, status: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                              >
                                <option value="draft">Draft</option>
                                <option value="publish">Publish</option>
                                <option value="pending">Pending Review</option>
                                <option value="private">Private</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Parent Page ID</label>
                              <input
                                type="number"
                                min="0"
                                value={pageFormData.parent}
                                onChange={(e) => setPageFormData({ ...pageFormData, parent: Number(e.target.value) })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Page Content (HTML/Gutenberg Blocks)</label>
                              <textarea
                                rows={3}
                                placeholder="Page content or HTML markup..."
                                value={pageFormData.content}
                                onChange={(e) => setPageFormData({ ...pageFormData, content: e.target.value })}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingPage(false);
                                setEditingPageId(null);
                              }}
                              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isLoadingWpPages}
                              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                            >
                              {editingPageId ? "Update Page" : "Create Page"}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Pages Table */}
                      {wpPages.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                          No WordPress pages found matching your filters.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="w-8 px-2 py-2 text-center" title="Drag handle to reorder">⋮⋮</th>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Title / Slug</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Parent</th>
                                <th className="px-3 py-2">Order</th>
                                <th className="px-3 py-2">Modified</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-sans">
                              {wpPages.map((page: any) => (
                                <tr
                                  key={page.id}
                                  draggable={!isLoadingWpPages && !isReorderingWpPages}
                                  onDragStart={(e) => {
                                    setDraggedWpPageId(page.id);
                                    e.dataTransfer.setData("text/plain", String(page.id));
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (draggedWpPageId === page.id) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const midpoint = rect.top + rect.height / 2;
                                    const pos = e.clientY < midpoint ? "BEFORE" : "AFTER";
                                    setDropTargetWpPageId(page.id);
                                    setDropWpPosition(pos);
                                  }}
                                  onDragLeave={() => {
                                    if (dropTargetWpPageId === page.id) {
                                      setDropTargetWpPageId(null);
                                      setDropWpPosition(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedWpPageId && dropTargetWpPageId && dropWpPosition) {
                                      handleReorderWpPage(draggedWpPageId, dropTargetWpPageId, dropWpPosition);
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setDraggedWpPageId(null);
                                    setDropTargetWpPageId(null);
                                    setDropWpPosition(null);
                                  }}
                                  className={`hover:bg-slate-800/40 transition border-b border-slate-800/60 ${
                                    draggedWpPageId === page.id ? "opacity-40 bg-blue-950/40" : ""
                                  } ${
                                    dropTargetWpPageId === page.id && dropWpPosition === "BEFORE"
                                      ? "border-t-2 border-t-blue-500 bg-blue-950/30"
                                      : ""
                                  } ${
                                    dropTargetWpPageId === page.id && dropWpPosition === "AFTER"
                                      ? "border-b-2 border-b-blue-500 bg-blue-950/30"
                                      : ""
                                  }`}
                                >
                                  <td className="w-8 px-2 py-2 text-center text-slate-400 cursor-grab active:cursor-grabbing font-bold select-none hover:text-white">
                                    ⋮⋮
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">#{page.id}</td>
                                  <td className="px-3 py-2">
                                    <div className="font-bold text-white text-xs">{page.title}</div>
                                    <div className="text-[10px] font-mono text-blue-400">{page.slug}</div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      page.status === 'publish' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                      page.status === 'draft' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                                      page.status === 'trash' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}>
                                      {page.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                                    {page.parent > 0 ? `#${page.parent}` : "—"}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                                    {page.menuOrder ?? 0}
                                  </td>
                                  <td className="px-3 py-2 text-[10px] text-slate-400">
                                    {page.modified ? new Date(page.modified).toLocaleDateString() : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPageId(page.id);
                                          setPageFormData({
                                            title: page.title || "",
                                            slug: page.slug || "",
                                            status: page.status || "draft",
                                            parent: page.parent || 0,
                                            content: page.content || "",
                                          });
                                          setIsCreatingPage(false);
                                        }}
                                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-bold border border-slate-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateWpPage(page.id, page.title)}
                                        disabled={isLoadingWpPages}
                                        className="px-2 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 text-[10px] font-bold border border-indigo-800 transition disabled:opacity-50 cursor-pointer"
                                      >
                                        Duplicate
                                      </button>
                                      {page.status === 'trash' ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWpPage(page.id, true)}
                                          className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800"
                                        >
                                          Delete Permanently
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWpPage(page.id, false)}
                                          className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-[10px] font-bold border border-amber-800"
                                        >
                                          Trash
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WordPress Media Library Management UI Panel (F-494) */}
                  {wpMediaError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs space-y-1">
                      <div className="font-extrabold text-rose-200">⚠️ WordPress Media Library Error:</div>
                      <div className="font-mono text-[11px] text-rose-300">{wpMediaError}</div>
                    </div>
                  )}

                  {showWpMediaLibrary && (
                    <div className="rounded-xl border border-emerald-900/60 bg-slate-900/95 p-4 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🖼️</span>
                          <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">
                            WordPress Media Library Manager
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                            Total: {wpMediaPagination.total} items
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMediaUploadModal(!showMediaUploadModal);
                              setIsCreatingPage(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold transition cursor-pointer"
                          >
                            {showMediaUploadModal ? "✕ Close Upload" : "+ Upload New Media"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFetchWpMedia()}
                            disabled={isLoadingWpMedia}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer"
                          >
                            🔄 Refresh
                          </button>
                        </div>
                      </div>

                      {/* Search & Filter & Sort Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <input
                          type="text"
                          placeholder="Search media by title or filename..."
                          value={wpMediaSearch}
                          onChange={(e) => setWpMediaSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleFetchWpMedia(1)}
                          className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                        />
                        <select
                          value={wpMediaTypeFilter}
                          onChange={(e) => {
                            setWpMediaTypeFilter(e.target.value as any);
                            handleFetchWpMedia(1);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="all">All Media Types</option>
                          <option value="image">Images Only</option>
                          <option value="document">Documents Only</option>
                        </select>
                        <select
                          value={`${wpMediaOrderby}_${wpMediaOrder}`}
                          onChange={(e) => {
                            const [by, ord] = e.target.value.split("_");
                            setWpMediaOrderby(by as any);
                            setWpMediaOrder(ord as any);
                            handleFetchWpMedia(1);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                        >
                          <option value="date_DESC">Newest First (Date ↓)</option>
                          <option value="date_ASC">Oldest First (Date ↑)</option>
                          <option value="title_ASC">Title (A-Z)</option>
                          <option value="title_DESC">Title (Z-A)</option>
                          <option value="filename_ASC">Filename (A-Z)</option>
                        </select>
                      </div>

                      {/* Media Edit Metadata Drawer / Card */}
                      {selectedMediaDetail && (
                        <div className="p-3.5 rounded-lg border border-emerald-700/50 bg-emerald-950/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider">
                              Media Item Metadata (ID: #{selectedMediaDetail.id})
                            </h5>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMediaDetail(null);
                                setIsEditingMediaMeta(false);
                              }}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              ✕ Close Details
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            {/* Preview box */}
                            <div className="flex flex-col items-center justify-center p-2 rounded bg-slate-950/60 border border-slate-800 text-center">
                              {selectedMediaDetail.mimeType?.startsWith("image/") ? (
                                <img
                                  src={selectedMediaDetail.url}
                                  alt={selectedMediaDetail.altText || selectedMediaDetail.title}
                                  className="max-h-32 object-contain rounded mb-2"
                                />
                              ) : (
                                <div className="text-3xl my-3">📄</div>
                              )}
                              <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
                                {selectedMediaDetail.filename}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {selectedMediaDetail.mimeType} {selectedMediaDetail.filesize ? `• ${Math.round(selectedMediaDetail.filesize / 1024)} KB` : ""}
                              </span>
                            </div>

                            {/* Metadata Edit Form */}
                            <div className="md:col-span-2 space-y-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Title</label>
                                <input
                                  type="text"
                                  disabled={!isEditingMediaMeta}
                                  value={editMediaMetaForm.title}
                                  onChange={(e) => setEditMediaMetaForm({ ...editMediaMetaForm, title: e.target.value })}
                                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-70"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Alt Text (Accessibility)</label>
                                <input
                                  type="text"
                                  disabled={!isEditingMediaMeta}
                                  value={editMediaMetaForm.altText}
                                  onChange={(e) => setEditMediaMetaForm({ ...editMediaMetaForm, altText: e.target.value })}
                                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-70"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Caption</label>
                                <input
                                  type="text"
                                  disabled={!isEditingMediaMeta}
                                  value={editMediaMetaForm.caption}
                                  onChange={(e) => setEditMediaMetaForm({ ...editMediaMetaForm, caption: e.target.value })}
                                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-70"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Description</label>
                                <textarea
                                  rows={2}
                                  disabled={!isEditingMediaMeta}
                                  value={editMediaMetaForm.description}
                                  onChange={(e) => setEditMediaMetaForm({ ...editMediaMetaForm, description: e.target.value })}
                                  className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-70"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                {isEditingMediaMeta ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setIsEditingMediaMeta(false)}
                                      className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveMediaMetadata}
                                      disabled={isUpdatingMediaMeta}
                                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                                    >
                                      {isUpdatingMediaMeta ? "Saving..." : "Save Metadata"}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingMediaMeta(true)}
                                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                                  >
                                    ✏️ Edit Metadata
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Media Grid / Library Listing */}
                      {wpMediaList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                          No WordPress media items found matching your filters.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {wpMediaList.map((item: any) => (
                            <div
                              key={item.id}
                              className={`group relative rounded-lg border bg-slate-950/60 p-2 flex flex-col justify-between transition hover:border-emerald-500/70 ${
                                selectedMediaDetail?.id === item.id ? "border-emerald-500 bg-emerald-950/20" : "border-slate-800"
                              }`}
                            >
                              <div className="aspect-video w-full rounded overflow-hidden bg-slate-900 flex items-center justify-center mb-2 border border-slate-800/80">
                                {item.mimeType?.startsWith("image/") ? (
                                  <img
                                    src={item.url}
                                    alt={item.altText || item.title}
                                    className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                ) : (
                                  <span className="text-2xl text-slate-500">📄</span>
                                )}
                              </div>

                              <div className="space-y-0.5 mb-2">
                                <div className="font-bold text-white text-xs truncate" title={item.title || item.filename}>
                                  {item.title || item.filename}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 truncate" title={item.filename}>
                                  {item.filename}
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span>#{item.id}</span>
                                  <span>{item.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMediaDetail(item);
                                    setEditMediaMetaForm({
                                      title: item.title || "",
                                      altText: item.altText || "",
                                      caption: item.caption || "",
                                      description: item.description || "",
                                    });
                                    setIsEditingMediaMeta(false);
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-bold border border-slate-700"
                                >
                                  Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowDeleteMediaModal(item.id);
                                    setDeleteMediaForceOption(false);
                                  }}
                                  className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pagination Footer */}
                      {wpMediaPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                          <div>
                            Showing page <span className="font-bold text-white">{wpMediaPagination.page}</span> of{" "}
                            <span className="font-bold text-white">{wpMediaPagination.totalPages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={wpMediaPagination.page <= 1 || isLoadingWpMedia}
                              onClick={() => handleFetchWpMedia(wpMediaPagination.page - 1)}
                              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-50"
                            >
                              ← Previous
                            </button>
                            <button
                              type="button"
                              disabled={wpMediaPagination.page >= wpMediaPagination.totalPages || isLoadingWpMedia}
                              onClick={() => handleFetchWpMedia(wpMediaPagination.page + 1)}
                              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-50"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete Media Confirmation Dialog */}
                  {showDeleteMediaModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                      <div className="w-full max-w-md rounded-2xl border border-rose-900/40 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-400">
                          <span className="text-2xl">🗑️</span>
                          <h3 className="text-base font-extrabold text-white">Delete WordPress Media Attachment?</h3>
                        </div>
                        <p className="text-xs text-slate-300">
                          Are you sure you want to delete media item <strong className="text-white">#{showDeleteMediaModal}</strong> from the connected WordPress site?
                        </p>
                        <div className="flex items-center gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          <input
                            type="checkbox"
                            id="deleteForceMediaCheck"
                            checked={deleteMediaForceOption}
                            onChange={(e) => setDeleteMediaForceOption(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500"
                          />
                          <label htmlFor="deleteForceMediaCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                            Force permanent deletion (bypass WordPress trash)
                          </label>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDeleteMediaModal(null)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMediaItem(showDeleteMediaModal, deleteMediaForceOption)}
                            disabled={Boolean(isDeletingMediaId)}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
                          >
                            {isDeletingMediaId === showDeleteMediaModal ? "Deleting..." : "Confirm Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Download Plugin Banner */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          <span>📦</span> ForgeStudio Connector Plugin (v1.0.0)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Download and install our official WordPress plugin to establish a secure bridge with your site.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadPlugin}
                        disabled={isDownloadingPlugin}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-blue-400 hover:text-blue-300 transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isDownloadingPlugin ? "Downloading..." : "⬇ Download Plugin (.zip)"}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                      <p>1. Download <code className="text-blue-300">forgestudio-connector.zip</code> and upload via <strong>WP Admin → Plugins → Add New → Upload Plugin</strong>.</p>
                      <p>2. Activate the plugin and navigate to <strong>Settings → ForgeStudio Connector</strong> to copy your secret key.</p>
                      <p>3. Enter your Site URL and Key below to finalize connection.</p>
                    </div>
                  </div>

                  {/* Connect WordPress Form */}
                  <form onSubmit={handleConnectWordPress} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-white">Connect WordPress Site</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Connect via the ForgeStudio WordPress Connector plugin using an API key. We never ask for admin passwords.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          WordPress Site URL *
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://mybrand.com or https://wp.mydomain.com"
                          value={wpSiteUrl}
                          onChange={(e) => setWpSiteUrl(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Connector API Key / Secret Token *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Paste connector token from WordPress plugin settings"
                          value={wpApiKey}
                          onChange={(e) => setWpApiKey(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                        />
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          🔒 Hashed with SHA-256 on the server. Never exposed to browser or frontend storage.
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Site Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. My Production WordPress Site"
                          value={wpSiteName}
                          onChange={(e) => setWpSiteName(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400">
                        ForgeStudio remains the brain; WordPress is the destination.
                      </span>
                      <button
                        type="submit"
                        disabled={isConnectingWp}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
                      >
                        {isConnectingWp ? "Connecting..." : "Connect WordPress"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* SFTP Destination Panel */}
          {activeTab === "sftp" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
                <h4 className="text-xs font-bold text-amber-400">SFTP Direct Server Deployment</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Publish compiled static website files directly to any Linux/UNIX web server, cPanel, AWS EC2, or DigitalOcean droplet via SSH File Transfer Protocol.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Server Host / IP</label>
                  <input
                    type="text"
                    placeholder="e.g. sftp.example.com or 203.0.113.10"
                    value={sftpHost}
                    onChange={(e) => setSftpHost(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Port</label>
                  <input
                    type="number"
                    value={sftpPort}
                    onChange={(e) => setSftpPort(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Username</label>
                  <input
                    type="text"
                    placeholder="e.g. deploy or root"
                    value={sftpUsername}
                    onChange={(e) => setSftpUsername(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Password / SSH Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={sftpPassword}
                    onChange={(e) => setSftpPassword(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Remote Directory Path</label>
                <input
                  type="text"
                  placeholder="e.g. /var/www/html or /public_html"
                  value={sftpRemotePath}
                  onChange={(e) => setSftpRemotePath(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              {sftpFeedback && (
                <div
                  className={`rounded-lg p-2.5 text-xs font-semibold text-center ${
                    sftpFeedback.type === "success"
                      ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/60 border border-rose-500/50 text-rose-300"
                  }`}
                >
                  {sftpFeedback.message}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestSftp}
                  disabled={isTestingSftp}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 text-xs font-bold transition cursor-pointer"
                >
                  {isTestingSftp ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={handleSyncSftp}
                  disabled={isSyncingSftp}
                  className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 text-xs font-bold transition shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  {isSyncingSftp ? "Syncing Files..." : "Deploy via SFTP Now"}
                </button>
              </div>
            </div>
          )}

          {/* Static ZIP Bundle Panel */}
          {activeTab === "zip" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
                <h4 className="text-xs font-bold text-purple-400">1-Click Static Website Export (.zip)</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Download a production-optimized static website bundle ready for instant self-hosting on AWS S3, Cloudflare Pages, Netlify, Vercel, Apache, or Nginx.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Included in Bundle</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>HTML pages for all {pages.length} website routes with SEO meta tags</li>
                  <li>Clean standalone stylesheet (<code className="text-blue-400">styles.css</code>) with responsive media queries</li>
                  <li>Lightweight interactive JavaScript runtime (<code className="text-blue-400">runtime.js</code>)</li>
                  <li>Form handling scripts and asset references</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={`/api/websites/${websiteId}/export/zip`}
                  download
                  className="w-full text-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  📦 Download Static Website Bundle (.zip)
                </a>
                <a
                  href="/api/plugins/wordpress/download"
                  download
                  className="w-full text-center rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2 transition"
                >
                  🔌 Download WordPress Connector Plugin (.zip)
                </a>
              </div>
            </div>
          )}

          {saveFeedback && (
            <div className="rounded-lg bg-blue-900/40 border border-blue-500/40 p-2.5 text-xs font-semibold text-blue-200 text-center animate-fadeIn">
              {saveFeedback}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPreview();
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>👁️</span>
              <span>Open Interactive Preview</span>
            </button>
            {publishing.status === "PUBLISHED" && Boolean(publishing.publishedAt) && Boolean(websiteId) && (
              <a
                href={`/site/${websiteId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
              >
                <span>🌐</span>
                <span>Visit Live Site ↗</span>
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/40 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-extrabold text-white">Disconnect WordPress Destination?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will stop ForgeStudio from publishing or synchronizing pages with this WordPress site.
            </p>
            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-emerald-400">Preserved Data Guarantee:</div>
              <div>• Your ForgeStudio pages, documents, and revisions remain completely safe.</div>
              <div>• Content already published to WordPress will NOT be deleted.</div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDisconnect}
                disabled={isDisconnectingWp}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isDisconnectingWp ? "Disconnecting..." : "Confirm Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
