# app/models.py — MindGrid Production Models

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text,
    Boolean, Enum as SAEnum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
import pytz
import enum
from app.database import Base


def get_ist():
    return datetime.now(pytz.timezone('Asia/Kolkata'))


class DebateStatus(str, enum.Enum):
    waiting     = "waiting"
    active      = "active"
    completed   = "completed"
    abandoned   = "abandoned"


class DebateResult(str, enum.Enum):
    player1_win  = "player1_win"
    player2_win  = "player2_win"
    draw         = "draw"
    forfeit_p1   = "forfeit_p1"
    forfeit_p2   = "forfeit_p2"
    undetermined = "undetermined"


class User(Base):
    __tablename__ = "users"
    id               = Column(Integer, primary_key=True, index=True)
    username         = Column(String, unique=True, index=True, nullable=False)
    email            = Column(String, unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    created_at       = Column(DateTime(timezone=True), default=get_ist)
    elo              = Column(Integer, default=1200)
    peak_elo         = Column(Integer, default=1200)
    mind_tokens      = Column(Integer, default=0)
    bio              = Column(Text, nullable=True)
    avatar_url       = Column(String, nullable=True)
    interests_setup  = Column(Boolean, default=False)
    total_debates    = Column(Integer, default=0)
    wins             = Column(Integer, default=0)
    losses           = Column(Integer, default=0)
    draws            = Column(Integer, default=0)
    win_streak       = Column(Integer, default=0)
    max_win_streak   = Column(Integer, default=0)

    interests   = relationship("UserInterest", back_populates="user", cascade="all, delete-orphan")
    debates_as_p1 = relationship("Debate", foreign_keys="[Debate.player1_id]", back_populates="player1_obj")
    debates_as_p2 = relationship("Debate", foreign_keys="[Debate.player2_id]", back_populates="player2_obj")
    messages    = relationship("Message", back_populates="sender_obj")
    badges      = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    elo_history = relationship("EloHistory", back_populates="user", cascade="all, delete-orphan")


class Interest(Base):
    __tablename__ = "interests"
    id         = Column(Integer, primary_key=True, index=True)
    slug       = Column(String, unique=True, nullable=False)
    label      = Column(String, nullable=False)
    icon       = Column(String, nullable=True)
    topic_pool = Column(Text, nullable=True)   # JSON array of debate topics


class UserInterest(Base):
    __tablename__ = "user_interests"
    __table_args__ = (UniqueConstraint("user_id", "interest_id"),)
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    interest_id = Column(Integer, ForeignKey("interests.id"), nullable=False)
    user        = relationship("User", back_populates="interests")
    interest    = relationship("Interest")


class Debate(Base):
    __tablename__ = "debates"
    id               = Column(Integer, primary_key=True, index=True)
    player1_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    player2_id       = Column(Integer, ForeignKey("users.id"), nullable=True)
    topic            = Column(String, nullable=False)
    interest_slug    = Column(String, nullable=True)
    status           = Column(SAEnum(DebateStatus), default=DebateStatus.waiting, nullable=False)
    result           = Column(SAEnum(DebateResult), nullable=True)
    winner           = Column(String, nullable=True)
    p1_elo_before    = Column(Integer, nullable=True)
    p2_elo_before    = Column(Integer, nullable=True)
    p1_elo_after     = Column(Integer, nullable=True)
    p2_elo_after     = Column(Integer, nullable=True)
    draw_proposed_by = Column(Integer, nullable=True)
    timestamp        = Column(DateTime(timezone=True), default=get_ist)
    started_at       = Column(DateTime(timezone=True), nullable=True)
    ended_at         = Column(DateTime(timezone=True), nullable=True)
    evaluation_json  = Column(Text, nullable=True)

    player1_obj = relationship("User", foreign_keys=[player1_id], back_populates="debates_as_p1")
    player2_obj = relationship("User", foreign_keys=[player2_id], back_populates="debates_as_p2")
    messages    = relationship("Message", back_populates="debate", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id          = Column(Integer, primary_key=True, index=True)
    debate_id   = Column(Integer, ForeignKey("debates.id"), nullable=False)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    content     = Column(Text, nullable=False)
    timestamp   = Column(DateTime(timezone=True), default=get_ist)
    sender_type = Column(String, default='user')
    debate      = relationship("Debate", back_populates="messages")
    sender_obj  = relationship("User", back_populates="messages")


class EloHistory(Base):
    __tablename__ = "elo_history"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    debate_id   = Column(Integer, ForeignKey("debates.id"), nullable=True)
    elo_before  = Column(Integer, nullable=False)
    elo_after   = Column(Integer, nullable=False)
    change      = Column(Integer, nullable=False)
    result      = Column(String, nullable=False)
    timestamp   = Column(DateTime(timezone=True), default=get_ist)
    user        = relationship("User", back_populates="elo_history")


class Badge(Base):
    __tablename__ = "badges"
    id          = Column(Integer, primary_key=True, index=True)
    slug        = Column(String, unique=True, nullable=False)
    name        = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon        = Column(String, nullable=True)
    tier        = Column(String, default="bronze")
    rarity      = Column(String, default="common")


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id"),)
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id    = Column(Integer, ForeignKey("badges.id"), nullable=False)
    earned_at   = Column(DateTime(timezone=True), default=get_ist)
    user        = relationship("User", back_populates="badges")
    badge       = relationship("Badge")


class Forum(Base):
    __tablename__ = "forums"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=False)


class Thread(Base):
    __tablename__ = "threads"
    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String, index=True, nullable=False)
    forum_id    = Column(Integer, ForeignKey("forums.id"), nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)


class Post(Base):
    __tablename__ = "posts"
    id          = Column(Integer, primary_key=True, index=True)
    content     = Column(Text, nullable=False)
    thread_id   = Column(Integer, ForeignKey("threads.id"), nullable=False)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
