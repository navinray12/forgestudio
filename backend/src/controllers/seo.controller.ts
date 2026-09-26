import type { Request, Response, NextFunction } from "express";
import { getWebsiteById, updateWebsiteEditorData } from "../services/website.service.js";
import {
  analyzePageSeo,
  auditPageImages,
  auditPageAccessibility,
  generateStructuredData,
  escapeJsonLd,
} from "../services/seo/seoAnalyzer.service.js";
import { runFullQualityAudit } from "../services/seo/unifiedQualityAnalyzer.service.js";
import { auditPagePerformance } from "../services/seo/performanceAnalyzer.service.js";
import { auditCodeQuality } from "../services/seo/codeQualityAnalyzer.service.js";
import { runVisualRegressionTest } from "../services/seo/visualRegression.service.js";
import { runGoldenCodeTest } from "../services/seo/goldenCode.service.js";
import { auditPerformanceBudget } from "../services/seo/performanceBudget.service.js";

/**
 * POST /api/websites/:id/seo/analyze
 * Analyzes SEO quality for a specific page or the entire site
 */
export async function analyzeSeoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [
          {
            id: websiteData.homePageId || "home",
            title: "Home",
            slug: "",
            isHome: true,
            elements: Array.isArray(websiteData.elements) ? websiteData.elements : [],
          },
        ];

    const targetPage = pageId
      ? pages.find((p: any) => p.id === pageId) || pages[0]
      : pages[0];

    const pageResult = analyzePageSeo(targetPage, websiteData);

    // Site-wide summary
    const siteAudits = pages.map((p: any) => {
      const res = analyzePageSeo(p, websiteData);
      return {
        pageId: p.id,
        pageName: p.name || p.title || "Untitled Page",
        score: res.score,
        grade: res.grade,
        criticalCount: res.critical.length,
        warningCount: res.warnings.length,
        passedCount: res.passed.length,
      };
    });

    const averageScore = Math.round(
      siteAudits.reduce((acc: number, curr: any) => acc + curr.score, 0) / siteAudits.length
    );

    return res.status(200).json({
      success: true,
      pageAudit: pageResult,
      siteSummary: {
        totalPages: pages.length,
        averageScore,
        pages: siteAudits,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/audit-images
 * Scans all images on a page or whole site for missing/empty/generic alt text
 */
export async function auditImagesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [
          {
            id: websiteData.homePageId || "home",
            title: "Home",
            elements: Array.isArray(websiteData.elements) ? websiteData.elements : [],
          },
        ];

    let result;
    if (pageId) {
      const targetPage = pages.find((p: any) => p.id === pageId) || pages[0];
      result = auditPageImages(targetPage.elements || [], targetPage.id);
    } else {
      // Audit all pages
      const allItems: any[] = [];
      for (const p of pages) {
        const audit = auditPageImages(p.elements || [], p.id);
        allItems.push(...audit.items);
      }
      result = {
        total: allItems.length,
        valid: allItems.filter((i) => i.issueType === "valid").length,
        missing: allItems.filter((i) => i.issueType === "missing").length,
        empty: allItems.filter((i) => i.issueType === "empty").length,
        generic: allItems.filter((i) => i.issueType === "generic").length,
        items: allItems,
      };
    }

    return res.status(200).json({
      success: true,
      imageAudit: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/audit-a11y
 * Programmatic WCAG 2.1 accessibility checks
 */
export async function auditAccessibilityHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [
          {
            id: websiteData.homePageId || "home",
            title: "Home",
            elements: Array.isArray(websiteData.elements) ? websiteData.elements : [],
          },
        ];

    const targetPage = pageId
      ? pages.find((p: any) => p.id === pageId) || pages[0]
      : pages[0];

    const a11yResult = auditPageAccessibility(targetPage, websiteData);

    return res.status(200).json({
      success: true,
      accessibilityAudit: a11yResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/structured-data
 * Generates and validates Schema.org JSON-LD structured data
 */
export async function generateStructuredDataHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { type, pageId, customFields, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [
          {
            id: websiteData.homePageId || "home",
            title: "Home",
            elements: Array.isArray(websiteData.elements) ? websiteData.elements : [],
          },
        ];

    const targetPage = pageId
      ? pages.find((p: any) => p.id === pageId) || pages[0]
      : pages[0];

    const schemaObj = generateStructuredData(type || "WebPage", targetPage, websiteData, customFields);
    const escapedJsonLd = escapeJsonLd(schemaObj);

    return res.status(200).json({
      success: true,
      schema: schemaObj,
      escapedJsonLd,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/websites/:id/seo
 * Persists updated SEO settings and structured data to the canonical website model
 * Guarded by authorizeCapability("EDIT_SEO")
 */
export async function saveWebsiteSeoHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, pageSettings, siteSettings, structuredData } = req.body;

    const website = await getWebsiteById(websiteId, user.id);
    const editorData = website.editorData || { version: 1, elements: [], pages: [] };

    // Update site-level settings if provided
    if (siteSettings && typeof siteSettings === "object") {
      editorData.siteSettings = {
        ...(editorData.siteSettings || {}),
        ...siteSettings,
      };
    }

    // Update page-level SEO settings if pageId is provided
    if (pageId && Array.isArray(editorData.pages)) {
      editorData.pages = editorData.pages.map((p: any) => {
        if (p.id === pageId) {
          const mergedPageSettings = {
            ...(p.pageSettings || {}),
            ...(pageSettings || {}),
          };
          if (structuredData) {
            mergedPageSettings.structuredData = structuredData;
          }
          return {
            ...p,
            pageSettings: mergedPageSettings,
          };
        }
        return p;
      });
    }

    const updatedWebsite = await updateWebsiteEditorData(websiteId, user.id, editorData);

    return res.status(200).json({
      success: true,
      message: "SEO settings and structured data saved successfully",
      website: updatedWebsite,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/full-audit
 * Runs the complete multi-domain quality, SEO & technical analysis suite (F-756 -> F-767)
 */
export async function fullQualityAuditHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const report = runFullQualityAudit(targetPage, websiteData);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/performance-audit
 */
export async function performanceAuditHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const audit = auditPagePerformance(targetPage, websiteData);

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/quality-audit
 */
export async function codeQualityAuditHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const audit = auditCodeQuality(targetPage, websiteData);

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/visual-regression
 */
export async function visualRegressionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData, baselineData, threshold } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const audit = runVisualRegressionTest(targetPage, websiteData, baselineData, threshold);

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/golden-test
 */
export async function goldenTestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData, goldenFixtures } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const audit = runGoldenCodeTest(targetPage, websiteData, goldenFixtures);

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/seo/performance-budget
 */
export async function performanceBudgetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { pageId, websiteData: liveData, budgetConfig } = req.body;

    let websiteData = liveData;
    if (!websiteData) {
      const website = await getWebsiteById(websiteId, user.id);
      websiteData = website.editorData || {};
    }

    const pages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
      ? websiteData.pages
      : [{ id: "home", title: "Home", slug: "", isHome: true, elements: websiteData.elements || [] }];

    const targetPage = pageId ? pages.find((p: any) => p.id === pageId) || pages[0] : pages[0];
    const audit = auditPerformanceBudget(targetPage, websiteData, budgetConfig);

    return res.status(200).json({ success: true, audit });
  } catch (error) {
    next(error);
  }
}


