from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from models import TaskStatus, TaskPriority

# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: Optional[str] = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Projects ──────────────────────────────────────────────────────────────────
class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    owner_id: int
    created_at: datetime

# ── Members ───────────────────────────────────────────────────────────────────
class MemberUserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str
    email: str

class MemberAdd(BaseModel):
    user_id: int
    role: Optional[str] = "member"

class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    project_id: int
    role: str
    joined_at: datetime
    user: Optional[MemberUserInfo] = None

# ── Tasks ─────────────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.todo
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None
    project_id: int
    created_at: datetime

# ── Sprint 2: Comments ────────────────────────────────────────────────────────
class CommentAuthorInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    first_name: str
    last_name: str

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    content: str
    task_id: int
    author_id: int
    created_at: datetime
    author: Optional[CommentAuthorInfo] = None

# ── Sprint 2: Invitations ─────────────────────────────────────────────────────
class InvitationCreate(BaseModel):
    project_id: int
    email: str

class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    inviter_id: int
    invitee_id: int
    token: str
    status: str
    created_at: datetime
    expires_at: datetime

# ── Sprint 3: Supervision ─────────────────────────────────────────────────────
class ProjectSupervisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    owner_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    total_tasks: int
    done_tasks: int
    in_progress_tasks: int
    todo_tasks: int
    progress_percent: float

class FeedbackCreate(BaseModel):
    content: str
    grade: Optional[float] = None

class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    teacher_id: int
    content: str
    grade: Optional[float] = None
    created_at: datetime
