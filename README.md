# Typeform Clone

## Overview
This repository contains a full-stack, Typeform-inspired conversational form builder and respondent platform developed specifically for an SDE evaluation assignment. The application enables creators to design multi-question forms with custom configurations, publish them to unique public slugs, collect responses via an interactive single-question-at-a-time respondent experience, and analyze submission metrics with aggregated statistical breakdowns.

The project emphasizes robust software engineering practices, including a layered backend architecture (`Route → Service → Repository → ORM → Database`), atomic multi-answer submissions, database cascade management, and a clean, accessible Next.js frontend.

---

## Features

- **Form CRUD**: Create, read, update title/status, and delete forms.
- **Form Builder**: Interactive builder for adding, modifying, and removing questions.
- **8 Supported Question Types**:
  1. `short_text` (Single-line text input)
  2. `long_text` (Multi-line text area)
  3. `multiple_choice` (Configurable choice options with keyboard hotkeys)
  4. `dropdown` (Select picker for single option selection)
  5. `email` (Validated email input)
  6. `number` (Numeric input with optional min/max constraints)
  7. `yes_no` (Boolean binary selection with hotkeys)
  8. `rating` (Configurable scale rating, default 1 to 5 stars)
- **Question Ordering & Reordering**: Up/down reordering API and UI preserving order indices.
- **Question Configuration**: Customizable titles, optional descriptions, required/optional flags, and type-specific settings.
- **Draft & Published Lifecycle**: Forms start in `draft` mode. Publishing enforces that at least one question exists.
- **Public Shareable Forms**: Published forms generate stable, slugified public links (`/f/[slug]`).
- **Typeform-Style Respondent Experience**:
  - Exactly one question displayed at a time with smooth transitions.
  - Progress bar and completion percentage tracking.
  - Keyboard navigation hints (`Enter ↵`, `Shift + Enter`, `A/B/C`, `Y/N`, numeric keys `1-5`).
  - Strict client-side and server-side validation for required fields before advancing.
- **Atomic Response Submission**:
  - Submits all question answers in a single database transaction.
  - If any answer validation fails, the entire transaction rolls back cleanly.
- **Response Management**:
  - Listing of all submitted responses per form.
  - Detailed modal view displaying each question title, type badge, and submitted answer.
  - Individual response deletion with cascade cleanup of associated answer records.
- **Analytics & Statistics**:
  - Real-time aggregation of total responses and response counts per question.
  - Numerical metrics: average, minimum, maximum for numeric inputs.
  - Rating metrics: average score and 1-to-5 star distribution breakdowns.
  - Categorical metrics: choice counts and percentages for Multiple Choice, Dropdown, and Yes/No.
- **Mock Signup UI**:
  - Lightweight frontend-only signup modal storing user state in `localStorage`.
  - Header displays active user profile and "Logged in" badge.
- **Default Creator & Simplified Authentication**:
  - Focuses evaluation on core form logic, data modeling, and conversational UX without third-party auth dependencies.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Native `fetch` with centralized API wrapper and error normalization

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Language**: Python
- **Validation & Serialization**: Pydantic v2 & Pydantic-Settings
- **ORM**: SQLAlchemy 2.0
- **ASGI Server**: Uvicorn

### Database
- **Database Engine**: SQLite 3
- **Integrity**: Enabled foreign key constraints via `PRAGMA foreign_keys = ON` on connection

### Testing
- **Test Framework**: `pytest`
- **HTTP Test Client**: Starlette / `httpx` (`TestClient`)
- **Isolation**: In-memory SQLite with `StaticPool` for isolated test transactions

---

## Architecture

The backend strictly enforces a layered separation of concerns:

```
HTTP Request
     ↓
[ Route Layer ]       (FastAPI APIRouter: request routing, parameter parsing, HTTP status codes)
     ↓
[ Service Layer ]     (Domain logic, business validation, multi-step transaction management)
     ↓
[ Repository Layer ]  (Data access abstractions, ORM queries, database operations)
     ↓
[ SQLAlchemy ORM ]    (Declarative models, relationships, cascades)
     ↓
[ SQLite Database ]   (Storage with enforced foreign keys)
```

### Backend Layer Responsibilities
- **Routes (`backend/app/routes/`)**: Accept HTTP requests, enforce request/response schemas, delegate to services, and return appropriate status codes. No raw database queries exist in routes.
- **Services (`backend/app/services/`)**: Implement business logic (e.g., verifying form state before publishing, validating question types and settings, orchestrating atomic multi-answer submissions, calculating analytics).
- **Repositories (`backend/app/repositories/`)**: Encapsulate persistence queries and CRUD operations. Repositories do not commit transactions independently during composite flows.
- **Models (`backend/app/models/`)**: Define SQLAlchemy ORM entities, column constraints, indexes, foreign keys, and relationship cascade rules (`all, delete-orphan`).
- **Schemas (`backend/app/schemas/`)**: Pydantic models for incoming payload validation and outgoing JSON serialization.
- **Database Layer (`backend/app/database/`)**: Manages the SQLAlchemy `engine`, `sessionmaker`, and connection listeners that enforce SQLite foreign key pragmas.
- **Core / Configuration (`backend/app/core/`)**: Application settings (`BaseSettings`), centralized exception hierarchy, and slug generation utilities.

### Frontend Architecture
- **App Router (`frontend/src/app/`)**:
  - `/dashboard`: Forms catalog, creation trigger, and quick management actions.
  - `/forms/new`: Lightweight creation screen redirecting to the builder.
  - `/forms/[id]/edit`: Form builder for question creation, inline editing, and reordering.
  - `/forms/[id]/responses`: Response table with slide-over detail modals.
  - `/forms/[id]/analytics`: Aggregated metric cards and CSS distribution bars.
  - `/f/[slug]`: Public, standalone conversational respondent questionnaire.
- **Centralized API Client (`frontend/src/lib/api.ts`)**: Type-safe HTTP client reading `NEXT_PUBLIC_API_URL` with structured error extraction.
- **Domain Types (`frontend/src/lib/types.ts`)**: TypeScript interfaces mirroring Pydantic transfer schemas.

---

## Database Schema

### Entity Definitions

#### Form (`forms`)
- `id` (Integer, Primary Key)
- `title` (String, Indexed, Required)
- `slug` (String, Unique, Indexed, Required)
- `status` (String, Default `'draft'`, Required)
- `created_at` (DateTime, Default UTC now)
- `updated_at` (DateTime, Default UTC now, on-update)

#### Question (`questions`)
- `id` (Integer, Primary Key)
- `form_id` (Integer, Foreign Key `forms.id`, Required, Indexed)
- `type` (String, Required: short_text, long_text, multiple_choice, etc.)
- `title` (String, Required)
- `description` (Text, Nullable)
- `required` (Boolean, Default `True`)
- `order_index` (Integer, Default `0`, Indexed)
- `settings` (JSON, Nullable for options, min, max)
- `created_at` (DateTime, Default UTC now)
- `updated_at` (DateTime, Default UTC now, on-update)

#### Response (`responses`)
- `id` (Integer, Primary Key)
- `form_id` (Integer, Foreign Key `forms.id`, Required, Indexed)
- `submitted_at` (DateTime, Default UTC now)
- `created_at` (DateTime, Default UTC now)

#### Answer (`answers`)
- `id` (Integer, Primary Key)
- `response_id` (Integer, Foreign Key `responses.id`, Required, Indexed)
- `question_id` (Integer, Foreign Key `questions.id`, Required, Indexed)
- `value` (JSON, Stores text, numbers, booleans, or selected option strings)
- `created_at` (DateTime, Default UTC now)
- **Constraint**: Unique constraint `uq_response_question` (`response_id`, `question_id`) preventing multiple answers to the same question within a single response.

### Entity Relationship (ER) Diagram

```text
+-------------------+             1 : N             +---------------------+
|       Form        |------------------------------>|      Question       |
|-------------------|                               |---------------------|
| PK  id            |                               | PK  id              |
|     title         |                               | FK  form_id         |
| U   slug          |                               |     type            |
|     status        |                               |     title           |
|     created_at    |                               |     description     |
|     updated_at    |                               |     required        |
+-------------------+                               |     order_index     |
          |                                         |     settings (JSON) |
          | 1 : N                                   +---------------------+
          v                                                    ^
+-------------------+                                          |
|     Response      |                                          |
|-------------------|                                          |
| PK  id            |                                          |
| FK  form_id       |                                          |
|     submitted_at  |                                          |
|     created_at    |                                          |
+-------------------+                                          |
          |                                                    |
          | 1 : N                                              |
          v                                                    |
+-------------------+                                          |
|      Answer       |                                          |
|-------------------|                                          |
| PK  id            |                                          |
| FK  response_id   |                                          |
| FK  question_id   |------------------------------------------+ (N : 1)
|     value (JSON)  |
|     created_at    |
| UQ(resp, quest)   |
+-------------------+
```

### Relational Integrity & Cascades
- **Cascade Deletion**: Deleting a `Form` automatically deletes all associated `Question`s and `Response`s via database foreign keys and ORM `cascade="all, delete-orphan"`.
- **Response Cascade**: Deleting a `Response` cascades to delete all its `Answer`s.
- **SQLite Pragma**: SQLite does not enable foreign keys by default; the connection layer executes `PRAGMA foreign_keys=ON;` on every engine checkout.

---

## API Overview

### Health
- `GET /health` - Health check verification endpoint.

### Forms
- `GET /api/forms` - List all forms with computed `response_count`.
- `POST /api/forms` - Create a new form (generates initial unique slug).
- `GET /api/forms/{id}` - Retrieve form metadata and response count.
- `PATCH /api/forms/{id}` - Update form title or status.
- `DELETE /api/forms/{id}` - Delete a form, its questions, and responses.

### Publishing & Public Forms
- `POST /api/forms/{id}/publish` - Publish a form (validates $\ge 1$ question).
- `POST /api/forms/{id}/unpublish` - Revert form status to draft.
- `GET /api/public/forms/{slug}` - Public endpoint to retrieve published form and its questions for respondents (returns 404 for draft forms).

### Questions
- `POST /api/forms/{form_id}/questions` - Add a question with type-specific validation.
- `GET /api/forms/{form_id}/questions` - List all questions belonging to a form ordered by `order_index`.
- `PUT /api/forms/{form_id}/questions/reorder` - Update ordering of all form questions atomically.
- `GET /api/questions/{id}` - Retrieve a single question.
- `PATCH /api/questions/{id}` - Update question title, required flag, type, or settings.
- `DELETE /api/questions/{id}` - Delete a question.

### Responses
- `POST /api/forms/{form_id}/responses` - Atomically submit responses for a published form.
- `GET /api/forms/{form_id}/responses` - List all responses submitted for a form.
- `GET /api/forms/{form_id}/responses/count` - Get submission count for a form.
- `GET /api/responses/{id}` - Get single response with detailed questions and answers.
- `DELETE /api/responses/{id}` - Delete a response and its answers.

### Analytics
- `GET /api/forms/{form_id}/analytics` - Read-only statistics: overall response count, answer counts per question, numeric min/max/average, rating averages and distributions, choice frequencies, and boolean counts.

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20+ recommended)
- Git

### 1. Backend Setup
From the repository root:

```powershell
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
# .\venv\Scripts\activate.bat
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn app.main:app --port 8000 --reload
```
The backend API will be available at: `http://localhost:8000`  
Swagger API Documentation: `http://localhost:8000/docs`

### 2. Frontend Setup
In a new terminal, from the repository root:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run the Next.js development server
npm run dev
```
The frontend application will be available at: `http://localhost:3000`

*(Optional Environment Variable)*: By default, the frontend points to `http://localhost:8000`. You can configure a custom backend URL by creating a `.env.local` file inside `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Running Backend Tests
From the project root or `backend` folder:
```powershell
# Run full pytest suite with verbose output
backend\venv\Scripts\pytest -v backend/tests
```

---

## Production Deployment

- **Frontend Hosting**: Vercel  
  Production URL: [https://typeform-clone-scalar-ai.vercel.app](https://typeform-clone-scalar-ai.vercel.app)
- **Backend Hosting**: Render  
  Production URL: [https://typeform-clone-backend-hdm7.onrender.com](https://typeform-clone-backend-hdm7.onrender.com)
- **Environment Configuration**: The frontend build on Vercel is configured with `NEXT_PUBLIC_API_URL=https://typeform-clone-backend-hdm7.onrender.com`.
- **CORS Policy**: The backend explicitly allows the production Vercel frontend origin (`https://typeform-clone-scalar-ai.vercel.app`) as well as local development origins (`http://localhost:3000`, `http://127.0.0.1:3000`). Wildcard origins (`*`) are disallowed.

---

## Assumptions / Mocked Data

- **Simplified Authentication**: Authentication is intentionally streamlined for the scope of this assignment. A default creator identity is assumed for all form builder workflows.
- **Frontend Mock Signup**: The top-right navbar includes a mock signup flow stored in browser `localStorage` to showcase user state presentation without introducing unnecessary database tables or auth services.
- **Public Respondent Access**: Respondent questionnaire links (`/f/[slug]`) are public and anonymous; respondents are not required to create accounts or log in.
- **Database Engine**: SQLite is utilized as the persistent storage engine, configured with strict foreign key constraints.
- **Scope Boundaries**: Enterprise features such as workspace team management, billing/metering, webhook integrations, and dynamic branching logic trees were omitted to prioritize architecture, test coverage, and conversational UX quality.
- **No Mocking of Core Functionality**: All form CRUD, question persistence, reordering, atomic response transactions, and analytics aggregations are backed by live database operations and validated API routes.

---

## Testing

- **Backend Test Suite**: 63 automated tests covering:
  - Form lifecycle and duplicate slug deduplication
  - Question CRUD, validation for all 8 types, and atomic reordering
  - Form publishing rules and public slug exposure
  - Atomic response submissions and transactional rollback upon validation failure
  - Response cascade deletions
  - Analytics calculation (averages, min/max, distributions)
  - Production CORS preflight and origin verification
- **Test Status**: **63 passed, 0 failed** (`pytest backend/tests`).
- **Frontend Build**: Verified clean production compilation (`npm run build`) with zero TypeScript or routing errors.

---

## Assignment Notes

This project was built from the ground up for the SDE assignment evaluation. Engineering decisions were guided by:
- **Clean Architecture**: Clear boundaries between route handlers, business logic services, and persistence repositories.
- **Data Integrity**: Enforced database-level foreign key cascades and unique constraints.
- **Conversational UX**: Adherence to Typeform's fluid single-question paradigm with keyboard shortcut accessibility.
- **Predictable APIs**: Explicit status codes (200, 201, 204, 400, 404, 422) and consistent error schemas.

---

## Original Work

This implementation is original work created specifically for this assignment. Architectural patterns and code structure follow standard industry best practices for FastAPI, SQLAlchemy, and Next.js applications.

---

## Demo / Deployment

- **Live Frontend**: [https://typeform-clone-scalar-ai.vercel.app](https://typeform-clone-scalar-ai.vercel.app)
- **GitHub Repository**: [https://github.com/Anubhav260305/Typeform-Clone_Scalar-Ai](https://github.com/Anubhav260305/Typeform-Clone_Scalar-Ai)
