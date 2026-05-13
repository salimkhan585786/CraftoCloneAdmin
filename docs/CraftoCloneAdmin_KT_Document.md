# Crafto Clone Admin - Knowledge Transfer Document

## 1. Document Purpose

This document is a detailed knowledge transfer handover for the `CraftoCloneAdmin` project. Its goal is to help a new engineer, maintainer, QA owner, or technical lead understand:

- what the application does
- how the codebase is structured
- how the main business flows work
- how the frontend talks to the backend
- where the risk areas and technical gaps are
- what to check before making future changes

The document is based on the implementation currently present in the repository as of May 10, 2026.

## 2. Project Overview

`CraftoCloneAdmin` is a React + TypeScript admin dashboard for managing the Crafto poster/template ecosystem. The app is built as a single-page application using Vite and React Router.

At a high level, the admin panel supports:

- admin authentication
- dashboard analytics viewing
- user listing and search
- category creation, editing, and deletion
- language management
- subscription plan management
- template creation and editing
- banner media upload to storage using backend-generated presigned URLs

The most complex feature in the project is the template editor. It allows admins to upload an image or video banner, define a visible crop for image banners, and place a photo frame overlay that appears to represent where a user image will later be positioned in the consumer app.

## 3. Technology Stack

Core frontend stack:

- React 19
- TypeScript
- Vite 6
- React Router DOM 7
- Tailwind CSS 4 via `@tailwindcss/vite`

UI and interaction libraries:

- `lucide-react` for icons
- `motion` for entrance animations
- `react-konva` and `konva` for the interactive template editor canvas
- `use-image` for loading remote/local images into the canvas

Networking:

- `axios` for API calls
- custom Axios interceptors for auth token injection, token refresh, and retry behavior

Notes on dependencies:

- `express`, `better-sqlite3`, `dotenv`, and `@google/genai` exist in `package.json` but are not used by the current frontend code under `src/`
- this suggests the package manifest may have been copied forward from another project or prepared for future backend/AI work

## 4. Deployment and Runtime Model

This repository behaves as a frontend admin client.

Runtime characteristics:

- built and served with Vite
- reads API configuration from Vite environment variables
- sends requests directly to a backend API
- persists admin auth session in browser `localStorage`
- relies on backend token refresh and S3-style presigned uploads

There is no local backend implementation in this repository. All CRUD and analytics operations depend on external APIs.

## 5. Environment Configuration

Relevant config is defined in `src/config.ts` and `.env.example`.

Environment variables:

- `VITE_API_BASE_URL`
- `VITE_API_KEY`

Default fallback values in code:

- base URL defaults to `http://13.234.38.223`
- API key defaults to `pk_test_121456w7s89swabcde34`

Important implication:

- because there are hardcoded fallbacks, the app may still make real API calls even when local env vars are missing
- this is convenient for quick testing but risky for production discipline because developers can accidentally hit a shared backend

## 6. Scripts and Local Development

Available npm scripts:

- `npm run dev` starts the Vite dev server on port `3000` and binds to `0.0.0.0`
- `npm run build` creates the production build
- `npm run preview` previews the production build
- `npm run lint` runs `tsc --noEmit`
- `npm run clean` attempts to remove `dist`

Important note:

- the `clean` script uses `rm -rf dist`, which is Unix-style and will not work in default Windows shells without a compatible environment

Recommended local startup flow:

1. install dependencies with `npm install`
2. create a `.env` or equivalent Vite env file with API settings
3. run `npm run dev`
4. log in with valid admin credentials from the backend environment

## 7. High-Level Application Architecture

The codebase is relatively compact and organized by feature type:

- `src/pages` contains route-level screens
- `src/components` contains reusable layout and card components
- `src/services` contains business-facing API wrappers
- `src/lib` contains lower-level API and auth storage utilities
- `src/types.ts` centralizes shared TypeScript models

The overall request flow is:

1. UI page triggers a service call
2. service calls the shared Axios instance
3. Axios injects API key and bearer token
4. if access token is expired, the interceptor tries refresh
5. backend response is normalized into typed frontend data
6. page updates local React state and renders results

## 8. Routing and Access Control

Routing is defined in `src/App.tsx`.

Public route:

- `/login`

Protected routes under `ProtectedLayout`:

- `/` dashboard
- `/users`
- `/categories`
- `/languages`
- `/subscriptions`
- `/editor`

Protection behavior:

- `ProtectedLayout` calls `authService.restoreSession()` on mount
- while auth state is being checked, the app shows a "Restoring your session..." screen
- if no valid session exists, the user is redirected to `/login`
- if auth is valid, the user sees the shared layout with `Navbar`, `Sidebar`, and page content

This is a frontend-only route guard. Real authorization still depends on backend validation.

## 9. Authentication Design

Authentication is implemented across:

- `src/services/authService.ts`
- `src/lib/api.ts`
- `src/lib/authStorage.ts`

### 9.1 Login Flow

Login sends:

- `POST /v1/auth/admin/login`

Expected response contains:

- `access_token`
- `refresh_token`
- `admin` profile object

On success:

- tokens and admin profile are saved to `localStorage`
- an `auth-change` browser event is dispatched
- the login page navigates to `/`

### 9.2 Session Persistence

Stored keys:

- `admin_access_token`
- `admin_refresh_token`
- `admin_profile`

The app treats the presence of access token or refresh token plus profile as an authenticated session candidate.

### 9.3 Token Refresh

Refresh is handled by `refreshAccessToken()` in `src/lib/api.ts`.

Behavior:

- reads refresh token and stored admin profile
- sends `POST /v1/auth/refresh`
- passes refresh token in `Authorization: Bearer <refresh_token>`
- stores the returned access token and refresh token
- reuses existing admin profile if refresh response omits admin data

Concurrency protection:

- refresh requests are serialized using a module-level `refreshPromise`
- this prevents multiple simultaneous refresh calls from racing

### 9.4 Logout

Logout attempts:

- `POST /v1/auth/logout`

Even if the request fails, local auth state is cleared in `finally`, which is the correct UX choice for expired sessions.

## 10. Shared API Client Behavior

The Axios client in `src/lib/api.ts` is one of the key infrastructure pieces.

Default headers:

- `Content-Type: application/json`
- `x-api-key: <configured API key>`

### 10.1 Request Interceptor

If an access token exists, it adds:

- `Authorization: Bearer <access_token>`

### 10.2 Retry Behavior

Safe retries are applied to selected failures:

- retries are disabled for `POST` requests
- retries are also disabled if `skipRequestRetry` is set
- retriable cases include network failure, timeout, and HTTP `408`, `425`, `429`, `500`, `502`, `503`, `504`
- max retries: `2`
- delay: `300ms * retryCount`

### 10.3 Auth Recovery

On a `401` response:

- non-refresh requests may trigger token refresh
- the original request is replayed once after refresh
- if refresh fails, the request ultimately rejects and the UI must handle logout/redirection

This is a solid lightweight pattern for admin tools.

## 11. Domain Model Summary

The central data types live in `src/types.ts`.

Main entities:

- `AdminCategory`
- `AdminTemplate`
- `AdminTemplateSummary`
- `AdminUser`
- `Language`
- `SubscriptionPlan`
- `SubscriptionStatus`
- `AnalyticsDashboard`

Template-specific models:

- `PhotoFrame`
- `BackgroundCrop`
- `TemplatePayload`

The backend appears to use an envelope pattern:

- `{ status, message, data }`

Paginated endpoints use:

- `{ data: T[], total, page, limit }`

## 12. Feature Walkthrough

## 12.1 Login Page

File:

- `src/pages/Login.tsx`

Responsibilities:

- capture email and password
- submit login request
- display inline auth errors
- navigate to dashboard after success

Observations:

- default credentials are prefilled in the UI
- this is convenient for development/demo but should be reviewed for production hygiene

## 12.2 Dashboard

File:

- `src/pages/Dashboard.tsx`

Data sources:

- `adminService.getAnalytics()`
- `adminService.getTopTemplates(5)`
- `subscriptionService.getStatus()`

Purpose:

- show core analytics counts
- surface top templates by usage
- show current subscription state
- provide quick links to common admin tasks

Metrics shown:

- daily active users
- total users
- total templates
- total quotes
- media generated
- pending media jobs
- premium subscribers

Notes:

- dashboard combines direct top-template fetch with `analytics.top_templates` fallback
- UI is presentation-rich but data flow is simple and self-contained

## 12.3 Users

File:

- `src/pages/Users.tsx`

Service:

- `adminService.listUsers()`

Capabilities:

- paginated user browsing
- search by phone number or name
- display subscription summary and creation timestamp

Implementation details:

- page size is fixed at `6`
- search input is debounced by `350ms`
- changing search resets page to `1`

Good design choice:

- the component keeps the typed paginated response instead of flattening it too early, so total counts and current page remain available for the UI

## 12.4 Categories

File:

- `src/pages/Categories.tsx`

Services:

- `categoryService.listCategories()`
- `categoryService.createCategory()`
- `categoryService.updateCategory()`
- `categoryService.deleteCategory()`
- `templateService.listTemplates()` for category-specific template listing

Capabilities:

- create category
- edit category
- delete category
- browse templates within selected category
- navigate into template editor for create/edit

Behavior details:

- categories are filtered client-side to only active ones
- first active category becomes the initial selected category
- selecting a category triggers template fetch with `limit: 50`

Operational note:

- the category page doubles as the launch point into the template editor
- opening editor from here ensures `categoryId` is passed as a query parameter

## 12.5 Languages

File:

- `src/pages/Languages.tsx`

Services:

- `languageService.listLanguages()`
- `languageService.createLanguage()`
- `languageService.deleteLanguage()`

Capabilities:

- add supported language
- remove language
- list active/inactive state returned by API

Input normalization:

- language code is lowercased before create

Current limitation:

- there is no edit/update path for a language once created

## 12.6 Subscription Plans

File:

- `src/pages/SubscriptionPlans.tsx`

Services:

- `subscriptionService.listPlans()`
- `subscriptionService.createPlan()`
- `subscriptionService.updatePlan()`
- `subscriptionService.getStatus()`

Capabilities:

- create plan
- edit plan
- show current status
- show active premium plan count

Key implementation detail:

- features are edited as newline-separated text, then converted to a string array before submission

Current limitation:

- there is no delete/deactivate action in the UI
- any deactivation depends on backend behavior or a missing admin action

## 12.7 Template Editor

File:

- `src/pages/TemplateEditor.tsx`

This is the most important page to understand.

### Functional Purpose

The editor is used to create or modify a template record that combines:

- category
- template type (`IMAGE` or `VIDEO`)
- storage keys for media assets
- language
- premium flag
- a `photo_frame` geometry object stored in `config_json`
- a visible banner preview/crop workflow for image templates

### Route Contract

The editor expects query parameters:

- `categoryId`
- optional `templateId`

Typical entry points:

- create new template from category page
- edit existing template from category page template listing

### Core Editor State

Important local state includes:

- `activeCategoryId`
- `templateName`
- `templateType`
- `language`
- `thumbnailKey`
- `templateKey`
- `mediaPreviewUrl`
- `isPremium`
- `existingConfigJson`
- `frame`
- `bannerCrop`
- `editorMode`

### Canvas Model

The editor uses a fixed virtual canvas:

- width `400`
- height `560`

There are two working modes:

- `crop`
- `frame`

Crop mode:

- only relevant for image templates
- admin drags and zooms the banner image
- wheel input and range slider control zoom
- crop is mathematically clamped to keep the visible area inside the stage

Frame mode:

- admin positions and resizes the user photo placeholder
- supported shapes are circle, square, rectangle
- Konva `Transformer` is used for resizing

### Shape Handling

Frame geometry is stored as `PhotoFrame`.

Rules:

- circle forces equal width/height and stores `radius`
- square forces equal width/height
- rectangle keeps independent width and height

When transform ends:

- Konva scale is reset back to `1`
- actual dimensions are recalculated into persistent coordinates

This is the right pattern for keeping serialized geometry clean.

### Upload Workflow

The upload flow is:

1. admin chooses an image or video
2. frontend asks backend for a presigned upload URL
3. frontend uploads directly to storage
4. returned asset key is converted into `template_key` and `thumbnail_key`
5. preview URL is shown in the editor

Endpoint used:

- `POST /v1/s3/presigned-url`

Upload modes supported:

- presigned POST with form fields
- presigned PUT with direct binary upload

Special handling:

- if fetch fails with a browser CORS-style error, user gets a specific message pointing at S3 bucket CORS configuration

### Save Workflow for Video Templates

For video templates:

- uploaded asset key becomes `template_key`
- thumbnail key becomes `<basename>-thumbnail.jpg` unless backend key already implies otherwise
- payload is saved directly through create/update API

### Save Workflow for Image Templates

For image templates:

1. uploaded image is shown in the editor
2. admin adjusts visible crop
3. on save, frontend renders the selected crop into a new `400x560` canvas
4. rendered canvas is converted to JPEG
5. cropped JPEG is uploaded again
6. new uploaded asset key becomes the saved `template_key`
7. thumbnail key is derived from that uploaded cropped asset

This means:

- original uploaded image is not the final saved template asset
- the final saved asset is a newly generated cropped image

This is a very important KT point for debugging storage mismatches.

### Existing Template Hydration

When `templateId` exists:

- `templateService.getTemplate(templateId)` is called
- editor fields are populated from backend data
- `config_json.photo_frame` is parsed if valid
- `config_json.background_crop` is parsed if valid

### Important Implementation Caveat

There is a mismatch between UI wording and current save logic.

The UI says:

- the saved crop is sent with the template so the React Native app can render the same banner position before placing the user photo

But current `buildPayload()` logic does:

- sets `photo_frame`
- deletes `background_crop`
- keeps `background_preview` if available

Meaning:

- `background_crop` is loaded when editing existing templates
- but it is not persisted when saving
- after saving, the frontend effectively discards crop metadata and only stores the already-cropped image plus preview reference

This should be treated as a known implementation gap or a deliberate product decision that needs clarification. It is one of the most important maintenance risks in the codebase.

## 13. Services Layer Summary

## 13.1 `authService`

Responsibilities:

- login
- logout
- restore session
- expose reactive auth state through `useSyncExternalStore`

## 13.2 `adminService`

Endpoints:

- `GET /v1/admin/analytics`
- `GET /v1/admin/templates/top`
- `GET /v1/admin/users`

## 13.3 `categoryService`

Endpoints:

- `GET /v1/categories`
- `POST /v1/categories/admin`
- `PUT /v1/categories/admin/:id`
- `DELETE /v1/categories/admin/:id`

## 13.4 `languageService`

Endpoints:

- `GET /v1/languages`
- `POST /v1/languages/admin`
- `DELETE /v1/languages/admin/:id`

## 13.5 `subscriptionService`

Endpoints:

- `GET /v1/subscriptions/plans`
- `POST /v1/subscriptions/admin/plans`
- `PUT /v1/subscriptions/admin/plans/:id`
- `GET /v1/subscriptions/status`

## 13.6 `templateService`

Endpoints:

- `GET /v1/templates`
- `GET /v1/templates/:id`
- `POST /v1/templates/admin`
- `PUT /v1/templates/admin/:id`
- `DELETE /v1/templates/admin/:id`
- `POST /v1/s3/presigned-url`

Extra responsibilities:

- normalize inconsistent presigned upload response shapes
- perform actual storage upload
- derive user-friendly error messages

## 14. UI Components Summary

## 14.1 Navbar

File:

- `src/components/Navbar.tsx`

Responsibilities:

- show brand
- show current admin name
- perform logout

## 14.2 Sidebar

File:

- `src/components/Sidebar.tsx`

Responsibilities:

- provide primary navigation for protected routes

Current note:

- there is no direct nav item for `/editor`, which is intentional because the editor is accessed contextually from categories

## 14.3 CategoryCard

File:

- `src/components/CategoryCard.tsx`

Responsibilities:

- display category summary
- expose edit/delete actions
- provide direct "Add Template" navigation

## 15. Backend API Expectations

This frontend assumes several backend conventions.

Expected conventions:

- all standard endpoints return an envelope with `status`, `message`, and `data`
- admin login returns both access and refresh tokens
- refresh endpoint accepts refresh token as bearer token
- presigned upload endpoint may return multiple possible field names
- template details may include `config_json`
- template summary rows may include `thumbnail_url`, `template_url`, and `usage_count`

If backend responses drift from these assumptions, the admin panel may partially break even when TypeScript compiles.

## 16. File and Folder Map

Top-level items with current meaning:

- `src/App.tsx`: app routing and protected layout
- `src/main.tsx`: React entry point
- `src/config.ts`: environment-based API config
- `src/types.ts`: shared data models
- `src/lib/api.ts`: shared Axios client, refresh logic, retry logic
- `src/lib/authStorage.ts`: localStorage persistence
- `src/services/*`: feature service wrappers
- `src/pages/*`: screen implementations
- `src/components/*`: shared layout/UI pieces

## 17. Known Risks and Gaps

This section is especially useful for whoever takes over the project next.

### 17.1 Hardcoded Fallback API Settings

Risk:

- app can accidentally talk to a real/shared backend even without env configuration

### 17.2 Default Login Credentials in UI

Risk:

- demo defaults may be undesirable in production screenshots or shared environments

### 17.3 Template Crop Metadata Mismatch

Risk:

- UI promises saved crop metadata, but save logic removes `background_crop`

Impact:

- confusion between what is preview-only and what is meant to be reusable downstream

### 17.4 Windows-Incompatible Clean Script

Risk:

- `npm run clean` is not portable in a default Windows environment

### 17.5 Unused Dependencies

Risk:

- increases install size and causes ambiguity about project scope

### 17.6 No Central Loading/Error Abstraction

Risk:

- pages manually manage loading and error state in many places
- future features may duplicate patterns instead of sharing hooks

### 17.7 Limited Form Validation

Risk:

- most validation is presence-only
- backend remains the main source of correctness enforcement

### 17.8 No Automated Test Coverage

Risk:

- there are no tests in the repository for auth, API behavior, or template editor math

The template editor in particular would benefit from focused utility tests.

## 18. Suggested Improvement Backlog

High-value next steps:

- persist `background_crop` if downstream consumers need crop metadata
- move template editor geometry and crop math into isolated utility modules with tests
- replace hardcoded API fallbacks with explicit env requirements per environment
- remove unused dependencies from `package.json`
- make `clean` script cross-platform
- add route-level data hooks to standardize loading/error handling
- add confirmation dialog before destructive delete actions
- add language update and subscription deactivate/archive flows if product requires them
- add image/video upload validation for file size and supported formats

## 19. Recommended Onboarding Path for a New Engineer

Suggested learning order:

1. read `src/App.tsx` to understand route structure
2. read `src/lib/api.ts` and `src/services/authService.ts` to understand auth and request lifecycle
3. read `src/types.ts` to understand domain models
4. read `src/pages/Categories.tsx` and `src/services/templateService.ts`
5. read `src/pages/TemplateEditor.tsx` last and spend extra time on save flow

This sequence keeps the editor complexity from becoming overwhelming too early.

## 20. Operational Troubleshooting Guide

Common issue: login succeeds but protected pages fail later

Checks:

- verify access token exists in `localStorage`
- verify refresh endpoint is working
- verify backend still accepts configured API key

Common issue: template upload fails

Checks:

- verify `POST /v1/s3/presigned-url` response shape
- verify returned upload URL is reachable
- verify S3 bucket CORS settings allow the app origin
- verify uploaded file type is acceptable to backend/storage

Common issue: image template saves but looks different later

Checks:

- remember final saved asset is a cropped generated JPEG, not necessarily the original image
- verify whether downstream app uses `template_url`, `background_preview`, or historical `background_crop`

Common issue: editor opens without category

Checks:

- editor expects `categoryId` query parameter for a clean create flow
- safest entry path is always from the categories page

## 21. KT Summary

This project is a compact admin frontend with a relatively clean separation between page components, service wrappers, and shared API/auth infrastructure. Most screens are straightforward CRUD views. The primary area that deserves careful ownership is the template editor, because it combines asset upload, canvas interaction, coordinate serialization, and a two-stage save flow for images.

If a new team member understands:

- auth restoration and token refresh
- the category-to-editor navigation flow
- the template upload and save lifecycle
- the current `background_crop` persistence gap

they will understand the majority of the real maintenance risk in this codebase.
