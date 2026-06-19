from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Float, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="student")  # "student" | "teacher"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    projects = relationship("Project", back_populates="owner")
    memberships = relationship("ProjectMember", back_populates="user")
    comments = relationship("Comment", back_populates="author")
    messages = relationship("Message", back_populates="sender")


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="project")
    feedbacks = relationship("Feedback", back_populates="project")
    messages = relationship("Message", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.medium)
    status = Column(Enum(TaskStatus), default=TaskStatus.todo)
    due_date = Column(DateTime, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id])
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")


# Sprint 2
class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    task = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Invitation(Base):
    __tablename__ = "invitations"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    inviter_id = Column(Integer, ForeignKey("users.id"))
    invitee_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, nullable=False)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    project = relationship("Project", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])


# Sprint 3
class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    grade = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="feedbacks")
    teacher = relationship("User", foreign_keys=[teacher_id])


# Sprint 4 — Messagerie temps réel
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    project = relationship("Project", back_populates="messages")
    sender = relationship("User", back_populates="messages")
