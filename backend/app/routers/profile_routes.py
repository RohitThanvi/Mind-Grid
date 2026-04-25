# app/routers/profile_routes.py — GitHub-style profile

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import database, models, auth
from pydantic import BaseModel
from typing import List, Optional
from app.elo import elo_rank_label

router = APIRouter(prefix="/profile", tags=["Profile"])


class BadgeOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    icon: Optional[str] = None
    tier: str
    rarity: str
    earned_at: Optional[str] = None

    class Config:
        from_attributes = True


class EloPoint(BaseModel):
    debate_id: int
    elo_after: int
    change: int
    result: str
    timestamp: str


class ProfileOut(BaseModel):
    id: int
    username: str
    bio: Optional[str] = None
    elo: int
    peak_elo: int
    rank_label: str
    mind_tokens: int
    total_debates: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    win_streak: int
    max_win_streak: int
    interests: List[str]
    badges: List[BadgeOut]
    elo_graph: List[EloPoint]
    member_since: str


@router.get("/{username}", response_model=ProfileOut)
def get_profile(username: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Interests
    interest_rows = db.query(models.UserInterest).filter(
        models.UserInterest.user_id == user.id
    ).all()
    interests = [r.interest.label for r in interest_rows if r.interest]

    # Badges
    badge_rows = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == user.id
    ).order_by(models.UserBadge.earned_at).all()
    badges = []
    for ub in badge_rows:
        if ub.badge:
            badges.append(BadgeOut(
                id=ub.badge.id, slug=ub.badge.slug, name=ub.badge.name,
                description=ub.badge.description, icon=ub.badge.icon,
                tier=ub.badge.tier, rarity=ub.badge.rarity,
                earned_at=ub.earned_at.isoformat() if ub.earned_at else None
            ))

    # ELO history graph (last 30 entries)
    elo_history = db.query(models.EloHistory).filter(
        models.EloHistory.user_id == user.id
    ).order_by(models.EloHistory.timestamp).limit(30).all()
    elo_graph = [
        EloPoint(
            debate_id=eh.debate_id or 0,
            elo_after=eh.elo_after,
            change=eh.change,
            result=eh.result,
            timestamp=eh.timestamp.isoformat() if eh.timestamp else ""
        ) for eh in elo_history
    ]

    total = user.total_debates or 0
    wins  = user.wins or 0
    win_rate = round(wins / total * 100, 1) if total > 0 else 0.0

    return ProfileOut(
        id=user.id,
        username=user.username,
        bio=user.bio,
        elo=user.elo or 1200,
        peak_elo=user.peak_elo or user.elo or 1200,
        rank_label=elo_rank_label(user.elo or 1200),
        mind_tokens=user.mind_tokens or 0,
        total_debates=total,
        wins=wins,
        losses=user.losses or 0,
        draws=user.draws or 0,
        win_rate=win_rate,
        win_streak=user.win_streak or 0,
        max_win_streak=user.max_win_streak or 0,
        interests=interests,
        badges=badges,
        elo_graph=elo_graph,
        member_since=user.created_at.strftime("%b %Y") if user.created_at else "Unknown",
    )


@router.get("/me/summary")
def get_my_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Quick summary for navbar/header."""
    interest_rows = db.query(models.UserInterest).filter(
        models.UserInterest.user_id == current_user.id
    ).all()
    interests = [r.interest.slug for r in interest_rows if r.interest]

    return {
        "id": current_user.id,
        "username": current_user.username,
        "elo": current_user.elo or 1200,
        "rank_label": elo_rank_label(current_user.elo or 1200),
        "mind_tokens": current_user.mind_tokens or 0,
        "wins": current_user.wins or 0,
        "losses": current_user.losses or 0,
        "draws": current_user.draws or 0,
        "interests": interests,
        "interests_setup": current_user.interests_setup or False,
    }
