# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Sign up for activities
- Interactive API documentation (Swagger UI & ReDoc)

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application from the **project root**:

   ```
   uvicorn src.app:app --reload
   ```

3. Open your browser:
   - **Web UI:** http://localhost:8000
   - **Swagger UI (interactive docs):** http://localhost:8000/docs
   - **ReDoc (alternative docs):** http://localhost:8000/redoc
   - **Raw OpenAPI schema:** http://localhost:8000/openapi.json

## Quick Usage

### List all activities

```http
GET /activities
```

**Response (200)**
```json
{
  "Chess Club": {
    "description": "Learn strategies and compete in chess tournaments",
    "schedule": "Fridays, 3:30 PM - 5:00 PM",
    "max_participants": 12,
    "participants": ["michael@mergington.edu"]
  }
}
```

---

### Teacher login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "ms.smith",
  "password": "teach1234"
}
```

**Response (200)**
```json
{
  "message": "Teacher logged in successfully",
  "token": "<bearer-token>",
  "username": "ms.smith"
}
```

---

### Sign up a student *(teachers only)*

```http
POST /activities/{activity_name}/signup?email=student@mergington.edu
Authorization: Bearer <token>
```

**Response (200)**
```json
{ "message": "Teacher ms.smith signed up student@mergington.edu for Chess Club" }
```

---

### Unregister a student *(teachers only)*

```http
DELETE /activities/{activity_name}/unregister?email=student@mergington.edu
Authorization: Bearer <token>
```

**Response (200)**
```json
{ "message": "Teacher ms.smith unregistered student@mergington.edu from Chess Club" }
```

## API Endpoints

| Method   | Endpoint                                  | Auth required | Description                              |
| -------- | ----------------------------------------- | ------------- | ---------------------------------------- |
| GET      | `/activities`                             | No            | List all activities and participants     |
| POST     | `/auth/login`                             | No            | Obtain a teacher bearer token            |
| GET      | `/auth/status`                            | Optional      | Check current authentication status     |
| POST     | `/auth/logout`                            | Yes (teacher) | Invalidate the current session token     |
| POST     | `/activities/{activity_name}/signup`      | Yes (teacher) | Enrol a student in an activity           |
| DELETE   | `/activities/{activity_name}/unregister`  | Yes (teacher) | Remove a student from an activity        |

## Data Model

The application uses a simple in-memory data model (data resets on server restart):

**Activity** (keyed by name)

| Field             | Type           | Description                              |
| ----------------- | -------------- | ---------------------------------------- |
| `description`     | string         | Short description of the activity        |
| `schedule`        | string         | Days and times the activity meets        |
| `max_participants`| integer        | Maximum number of students allowed       |
| `participants`    | list of emails | Students currently enrolled              |
