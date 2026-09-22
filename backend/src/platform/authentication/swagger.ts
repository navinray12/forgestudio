import type { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ForgeStudio API Documentation",
    version: "1.0.0",
    description: "Complete RESTful API specification for ForgeStudio Website Builder Platform backend services.",
    contact: {
      name: "ForgeStudio Team",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current Host",
    },
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "forge_session",
        description: "Session authentication cookie issued upon login or signup.",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Bearer token authentication header.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Invalid request parameters" },
          errorCode: { type: "string", example: "BAD_REQUEST" },
        },
      },
      Website: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string", example: "My Business Site" },
          slug: { type: "string", example: "my-business-site" },
          status: { type: "string", example: "DRAFT" },
          editorData: { type: "object" },
          performanceSettings: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      WebsiteKit: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string", example: "agency-starter" },
          name: { type: "string", example: "Agency Starter Kit" },
          category: { type: "string", example: "Business" },
          description: { type: "string" },
          thumbnail: { type: "string" },
          previewUrl: { type: "string" },
          pageCount: { type: "integer", example: 5 },
          tags: { type: "array", items: { type: "string" } },
          globalStyles: { type: "object" },
          pages: { type: "array", items: { type: "object" } },
          isActive: { type: "boolean", example: true },
        },
      },
      Template: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string", example: "Modern Landing Page" },
          description: { type: "string" },
          type: { type: "string", example: "PAGE" },
          category: { type: "string", example: "Landing Page" },
          isFavorite: { type: "boolean", example: false },
          isShared: { type: "boolean", example: false },
          shareToken: { type: "string", nullable: true },
          templateData: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fullName: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "user@example.com" },
          role: { type: "string", example: "USER" },
          status: { type: "string", example: "ACTIVE" },
        },
      },
    },
  },
  security: [
    { CookieAuth: [] },
    { BearerAuth: [] },
  ],
  tags: [
    { name: "Auth", description: "User authentication, registration, session management" },
    { name: "Websites", description: "Website workspace management & editor persistence" },
    { name: "Collaborators", description: "Team collaboration roles & granular resource permissions" },
    { name: "Uploads", description: "Media uploads for images and videos" },
    { name: "Website Kits", description: "Curated Website Kits catalogue and site application" },
    { name: "Templates", description: "User design templates and public sharing" },
    { name: "Subscriptions", description: "Subscription plans & active plan management" },
    { name: "Forms", description: "Public form submissions & website submission retrieval" },
    { name: "SFTP", description: "SFTP deployment credentials and file sync" },
    { name: "API Keys", description: "Developer API keys" },
    { name: "Custom Post Types", description: "Custom Post Types & Custom Fields" },
    { name: "Custom Code", description: "Custom JS/CSS code snippets" },
    { name: "Teams", description: "Team workspaces and member management" },
  ],
  paths: {
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "User Login",
        description: "Authenticates user with email/phone identifier and password, setting forge_session cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifier", "password"],
                properties: {
                  identifier: { type: "string", example: "demo@forgestudio.com" },
                  email: { type: "string", example: "demo@forgestudio.com" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful or OTP required" },
          400: { description: "Invalid credentials" },
          401: { description: "Authentication failed" },
        },
      },
    },
    "/api/v1/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "User Signup",
        description: "Registers a new user account with email or phone identifier.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "identifier", "password"],
                properties: {
                  fullName: { type: "string", example: "John Doe" },
                  identifier: { type: "string", example: "john@example.com" },
                  email: { type: "string", example: "john@example.com" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Email/identifier in use or validation error" },
        },
      },
    },
    "/api/v1/auth/signup/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify Signup OTP",
        description: "Verifies the 6-digit OTP sent to email or WhatsApp for new signup.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "otp"],
                properties: {
                  userId: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" },
                  otp: { type: "string", example: "123456" },
                  channel: { type: "string", example: "EMAIL" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Verification successful and session created" },
          400: { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/v1/auth/signup/resend-otp": {
      post: {
        tags: ["Auth"],
        summary: "Resend Signup OTP",
        description: "Resends a new verification code for signup.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OTP resent successfully" },
          429: { description: "Cooldown period active" },
        },
      },
    },
    "/api/v1/auth/login/send-otp": {
      post: {
        tags: ["Auth"],
        summary: "Send Login OTP",
        description: "Triggers OTP for passwordless login.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifier"],
                properties: {
                  identifier: { type: "string", example: "demo@forgestudio.com" },
                  userId: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" },
                  channel: { type: "string", example: "EMAIL" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login OTP sent" },
        },
      },
    },
    "/api/v1/auth/login/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify Login OTP",
        description: "Verifies the 6-digit OTP for login.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "otp"],
                properties: {
                  userId: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
          400: { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get Current User Profile",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "Current user profile data" },
          401: { description: "Unauthenticated" },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "Logged out successfully" },
        },
      },
    },
    "/api/v1/websites": {
      get: {
        tags: ["Websites"],
        summary: "List User Websites",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "List of user websites" },
          401: { description: "Unauthenticated" },
        },
      },
      post: {
        tags: ["Websites"],
        summary: "Create New Website",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "My New Website" },
                  slug: { type: "string", example: "my-new-website" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Website created successfully" },
          400: { description: "Invalid name or slug" },
        },
      },
    },
    "/api/v1/websites/{id}": {
      get: {
        tags: ["Websites"],
        summary: "Get Website By ID",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        responses: {
          200: { description: "Website details" },
          404: { description: "Website not found" },
        },
      },
      put: {
        tags: ["Websites"],
        summary: "Update Website Metadata",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Updated Portfolio Name" },
                  status: { type: "string", example: "PUBLISHED" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Website updated" },
          403: { description: "Forbidden" },
          404: { description: "Website not found" },
        },
      },
      delete: {
        tags: ["Websites"],
        summary: "Delete Website",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        responses: {
          200: { description: "Website deleted" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/v1/websites/{websiteId}/editor-data": {
      put: {
        tags: ["Websites"],
        summary: "Update Website Builder Canvas & Performance Settings",
        description: "Persists website editor JSON elements and performance configurations securely.",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "websiteId", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  editorData: { type: "object", example: { components: [{ id: "hero-1", type: "Hero", props: { title: "Welcome to ForgeStudio" } }] } },
                  performanceSettings: {
                    type: "object",
                    properties: {
                      lazyLoading: { type: "boolean", example: true },
                      imageOptimization: { type: "boolean", example: true },
                      cssMinification: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Editor data and performance settings updated" },
          400: { description: "Invalid parameters" },
          403: { description: "Forbidden" },
          404: { description: "Website not found" },
        },
      },
    },
    "/api/v1/uploads/image": {
      post: {
        tags: ["Uploads"],
        summary: "Upload Image",
        description: "Uploads an image file (PNG, JPG, WEBP, SVG) up to 5MB.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Image uploaded successfully" },
          400: { description: "No file provided" },
          413: { description: "File too large (> 5MB)" },
          415: { description: "Unsupported image format" },
        },
      },
    },
    "/api/v1/uploads/video": {
      post: {
        tags: ["Uploads"],
        summary: "Upload Video",
        description: "Uploads a video file (MP4, WEBM, OGG) up to 50MB with UUID filename sanitization.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Video uploaded successfully" },
          400: { description: "No file provided" },
          413: { description: "Payload Too Large (> 50MB)" },
          415: { description: "Unsupported Media Type" },
        },
      },
    },
    "/api/v1/website-kits": {
      get: {
        tags: ["Website Kits"],
        summary: "List Curated Website Kits",
        description: "Retrieves active Website Kits from database source with optional filters.",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "tag", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of available Website Kits" },
        },
      },
    },
    "/api/v1/website-kits/apply": {
      post: {
        tags: ["Website Kits"],
        summary: "Apply Website Kit To User Website",
        description: "Applies a Website Kit to a target site via an atomic Prisma transaction.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["kitId"],
                properties: {
                  websiteId: { type: "string", format: "uuid" },
                  kitId: { type: "string", example: "agency-starter" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Website Kit applied successfully" },
          400: { description: "Missing kitId or invalid parameters" },
          403: { description: "Unauthorized access to target website" },
          404: { description: "Website or Kit not found" },
        },
      },
    },
    "/api/v1/templates": {
      get: {
        tags: ["Templates"],
        summary: "Get Saved User Templates",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "List of templates saved by authenticated user" },
        },
      },
      post: {
        tags: ["Templates"],
        summary: "Create Reusable Template",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "templateData"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  templateData: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Template created" },
          400: { description: "Invalid template name" },
        },
      },
    },
    "/api/v1/templates/{id}": {
      put: {
        tags: ["Templates"],
        summary: "Update Template (PUT)",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  isFavorite: { type: "boolean" },
                  templateData: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Template updated successfully" },
          400: { description: "Invalid ID format or empty name" },
          403: { description: "Forbidden" },
          404: { description: "Template not found" },
        },
      },
      patch: {
        tags: ["Templates"],
        summary: "Update Template Metadata (PATCH)",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  isFavorite: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Template updated successfully" },
          400: { description: "Invalid input" },
          403: { description: "Forbidden" },
          404: { description: "Template not found" },
        },
      },
      delete: {
        tags: ["Templates"],
        summary: "Delete Template",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "Template deleted" },
          404: { description: "Template not found" },
        },
      },
    },
    "/api/v1/templates/{id}/share": {
      post: {
        tags: ["Templates"],
        summary: "Toggle Template Sharing",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isShared"],
                properties: {
                  isShared: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Sharing status updated" },
          404: { description: "Template not found" },
        },
      },
    },
    "/api/v1/templates/public/{shareToken}": {
      get: {
        tags: ["Templates"],
        summary: "Get Public Shared Template",
        description: "Public endpoint for viewing a shared template without authentication.",
        parameters: [
          { name: "shareToken", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Public template data" },
          404: { description: "Template not found or no longer shared" },
        },
      },
    },
    "/api/v1/subscriptions/plans": {
      get: {
        tags: ["Subscriptions"],
        summary: "List Subscription Plans",
        responses: {
          200: { description: "List of active subscription plans" },
        },
      },
    },
    "/api/v1/subscriptions/current": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get User Active Subscription",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "Active user subscription" },
          401: { description: "Unauthenticated" },
        },
      },
    },
    "/api/v1/subscriptions/select": {
      post: {
        tags: ["Subscriptions"],
        summary: "Select Subscription Plan",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planSlug"],
                properties: {
                  planSlug: { type: "string", example: "pro" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Plan updated successfully" },
        },
      },
    },
    "/api/v1/forms/submit": {
      post: {
        tags: ["Forms"],
        summary: "Submit Form Entry (Public)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["websiteId", "formId", "data"],
                properties: {
                  websiteId: { type: "string", format: "uuid" },
                  formId: { type: "string" },
                  data: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Form submitted successfully" },
          400: { description: "Invalid parameters" },
        },
      },
    },
    "/api/v1/forms/{websiteId}": {
      get: {
        tags: ["Forms"],
        summary: "Get Form Submissions For Website",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "websiteId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          200: { description: "List of form submissions" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/v1/sftp/config": {
      post: {
        tags: ["SFTP"],
        summary: "Save SFTP Deployment Credentials",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["websiteId", "host", "username"],
                properties: {
                  websiteId: { type: "string", format: "uuid" },
                  host: { type: "string" },
                  port: { type: "integer", example: 22 },
                  username: { type: "string" },
                  remotePath: { type: "string", example: "/var/www/html" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "SFTP configuration saved" },
        },
      },
    },
    "/api/v1/sftp/sync": {
      post: {
        tags: ["SFTP"],
        summary: "Sync Files Via SFTP",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["websiteId"],
                properties: {
                  websiteId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "SFTP deployment triggered" },
        },
      },
    },
    "/api/v1/apikeys": {
      get: {
        tags: ["API Keys"],
        summary: "List Developer API Keys",
        security: [{ CookieAuth: [] }],
        responses: {
          200: { description: "List of API keys" },
        },
      },
      post: {
        tags: ["API Keys"],
        summary: "Generate New Developer API Key",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Production Key" },
                  scopes: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "API Key generated" },
        },
      },
    },
    "/api/v1/websites/{id}/roles": {
      get: {
        tags: ["Collaborators"],
        summary: "Get Website Collaborators & Roles",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        responses: {
          200: { description: "List of collaborators and assigned roles" },
        },
      },
    },
    "/api/v1/websites/{id}/roles/{collaboratorUserId}": {
      put: {
        tags: ["Collaborators"],
        summary: "Update Collaborator Role",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
          { name: "collaboratorUserId", in: "path", required: true, schema: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["permission"],
                properties: {
                  permission: { type: "string", example: "EDITOR" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Collaborator role updated" },
        },
      },
    },
    "/api/v1/websites/{id}/invite": {
      post: {
        tags: ["Collaborators"],
        summary: "Invite Member To Website Team",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  permission: { type: "string", example: "EDITOR" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Invitation sent successfully" },
        },
      },
    },
    "/api/v1/websites/{id}/members/{collaboratorUserId}": {
      delete: {
        tags: ["Collaborators"],
        summary: "Remove Collaborator From Website",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
          { name: "collaboratorUserId", in: "path", required: true, schema: { type: "string", format: "uuid", example: "5213c5b6-1916-43bd-95a3-61f545c36592" } },
        ],
        responses: {
          200: { description: "Collaborator removed" },
        },
      },
    },
    "/api/v1/websites/{id}/permissions": {
      get: {
        tags: ["Collaborators"],
        summary: "Get Granular Resource Permissions",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        responses: {
          200: { description: "Granular permissions list" },
        },
      },
      post: {
        tags: ["Collaborators"],
        summary: "Set Granular Resource Permission",
        security: [{ CookieAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid", example: "75048c20-07b4-4a7e-b126-9c84e94afa8e" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["componentId", "permission"],
                properties: {
                  componentId: { type: "string", example: "hero-section-1" },
                  permission: { type: "string", example: "EDITOR" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Permission granted/updated" },
        },
      },
    },
  },
};

export const swaggerUiOptions = {
  swaggerOptions: {
    withCredentials: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: "list",
    defaultModelsExpandDepth: 1,
  },
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "ForgeStudio API Documentation",
};

export function setupSwagger(app: Express) {
  // 1. JSON Specification Route
  app.get("/api/v1/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openApiSpec);
  });

  // Also support alias /api/docs.json
  app.get("/api/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openApiSpec);
  });

  // 2. Swagger UI Route
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerUiOptions));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerUiOptions));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerUiOptions));

  console.log("Swagger documentation initialized at GET /api/v1/docs, GET /api/docs and GET /api-docs");
}
