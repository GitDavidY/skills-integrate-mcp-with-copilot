"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

import json
import os
import secrets
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(
    title="Mergington High School API",
    description="API for viewing and signing up for extracurricular activities",
)

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(Path(__file__).parent, "static")),
    name="static",
)


class TeacherLoginRequest(BaseModel):
    username: str
    password: str


def load_teachers() -> dict[str, str]:
    """Load teacher credentials from a JSON file."""
    teachers_path = current_dir / "teachers.json"
    with open(teachers_path, "r", encoding="utf-8") as teachers_file:
        teachers = json.load(teachers_file)
    return {teacher["username"]: teacher["password"] for teacher in teachers}


def get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    return authorization.replace("Bearer ", "", 1)


def get_authenticated_teacher(authorization: Optional[str] = Header(default=None)) -> str:
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Teacher authentication required")

    username = teacher_sessions.get(token)
    if not username:
        raise HTTPException(status_code=401, detail="Teacher session is invalid or expired")

    return username


teacher_credentials = load_teachers()
teacher_sessions: dict[str, str] = {}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"],
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"],
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"],
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"],
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"],
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"],
    },
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/auth/login")
def teacher_login(payload: TeacherLoginRequest):
    expected_password = teacher_credentials.get(payload.username)
    if not expected_password or expected_password != payload.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_urlsafe(24)
    teacher_sessions[token] = payload.username
    return {
        "message": "Teacher logged in successfully",
        "token": token,
        "username": payload.username,
    }


@app.post("/auth/logout")
def teacher_logout(
    teacher: str = Depends(get_authenticated_teacher),
    authorization: Optional[str] = Header(default=None),
):
    token = get_bearer_token(authorization)
    if token:
        teacher_sessions.pop(token, None)
    return {"message": f"Teacher {teacher} logged out"}


@app.get("/auth/status")
def auth_status(authorization: Optional[str] = Header(default=None)):
    token = get_bearer_token(authorization)
    username = teacher_sessions.get(token) if token else None
    if not username:
        return {"authenticated": False}
    return {"authenticated": True, "username": username}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(
    activity_name: str,
    email: str,
    teacher: str = Depends(get_authenticated_teacher),
):
    """Sign up a student for an activity (teachers only)."""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")

    activity["participants"].append(email)
    return {"message": f"Teacher {teacher} signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str,
    teacher: str = Depends(get_authenticated_teacher),
):
    """Unregister a student from an activity (teachers only)."""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity",
        )

    activity["participants"].remove(email)
    return {"message": f"Teacher {teacher} unregistered {email} from {activity_name}"}
