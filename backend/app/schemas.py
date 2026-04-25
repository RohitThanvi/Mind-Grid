# app/schemas.py — MindGrid Production Schemas

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime


def dt_iso(dt: datetime) -> str:
    return dt.isoformat()


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    elo: Optional[int] = 1200
    peak_elo: Optional[int] = 1200
    mind_tokens: Optional[int] = 0
    interests_setup: Optional[bool] = False
    wins: Optional[int] = 0
    losses: Optional[int] = 0
    draws: Optional[int] = 0
    win_streak: Optional[int] = 0
    total_debates: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class UserStats(BaseModel):
    debates_won: int
    debates_lost: int
    debates_competed: int

    model_config = ConfigDict(from_attributes=True)


class DebateHistory(BaseModel):
    id: int
    topic: str
    opponent_username: str
    winner: Optional[str]
    date: str

    model_config = ConfigDict(from_attributes=True)


class BadgeSchema(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    icon: Optional[str] = None
    tier: str
    rarity: str

    model_config = ConfigDict(from_attributes=True)


class Forum(BaseModel):
    id: int; name: str; description: str
    model_config = ConfigDict(from_attributes=True)

class Thread(BaseModel):
    id: int; title: str; forum_id: int; user_id: int
    model_config = ConfigDict(from_attributes=True)

class ThreadCreate(BaseModel):
    title: str; forum_id: int

class Post(BaseModel):
    id: int; content: str; thread_id: int; user_id: int
    model_config = ConfigDict(from_attributes=True)

class PostCreate(BaseModel):
    content: str; thread_id: int

class Analysis(BaseModel):
    analysis: str

class TopicSchema(BaseModel):
    topic: str

class DebateCreate(BaseModel):
    player1_id: int
    player2_id: Optional[int] = None
    topic: str

class DebateOut(BaseModel):
    id: int
    player1_id: int
    player2_id: Optional[int]
    topic: str
    winner: Optional[str] = None
    status: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: dt_iso}
    )

class MessageCreate(BaseModel):
    sender_id: Optional[int] = None
    content: str
    sender_type: str = 'user'

class MessageOut(BaseModel):
    id: int
    content: str
    sender_id: Optional[int] = None
    debate_id: int
    timestamp: datetime
    sender_type: str

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: dt_iso}
    )

class LeaderboardEntry(BaseModel):
    username: str
    elo: int
    mind_tokens: int

    model_config = ConfigDict(from_attributes=True)
