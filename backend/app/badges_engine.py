# app/badges_engine.py — GitHub-style badge system

from sqlalchemy.orm import Session
from app import models

# ── Badge definitions ──────────────────────────────────────────────────────────
BADGE_DEFINITIONS = [
    # Onboarding
    {"slug": "first_steps",     "name": "First Steps",       "description": "Completed your interests profile",             "icon": "🎯", "tier": "bronze",   "rarity": "common"},
    {"slug": "first_debate",    "name": "Into the Arena",    "description": "Completed your first debate",                  "icon": "⚔️", "tier": "bronze",   "rarity": "common"},
    # Win milestones
    {"slug": "win_1",           "name": "First Blood",       "description": "Won your first debate",                        "icon": "🏆", "tier": "bronze",   "rarity": "common"},
    {"slug": "win_10",          "name": "Seasoned Debater",  "description": "Won 10 debates",                               "icon": "🥈", "tier": "silver",   "rarity": "uncommon"},
    {"slug": "win_50",          "name": "Debate Veteran",    "description": "Won 50 debates",                               "icon": "🥇", "tier": "gold",     "rarity": "rare"},
    {"slug": "win_100",         "name": "Centurion",         "description": "Won 100 debates",                              "icon": "💎", "tier": "platinum", "rarity": "epic"},
    # Streak milestones
    {"slug": "streak_3",        "name": "On a Roll",         "description": "3-win streak",                                 "icon": "🔥", "tier": "bronze",   "rarity": "common"},
    {"slug": "streak_5",        "name": "Blazing",           "description": "5-win streak",                                 "icon": "🌟", "tier": "silver",   "rarity": "uncommon"},
    {"slug": "streak_10",       "name": "Unstoppable",       "description": "10-win streak",                                "icon": "⚡", "tier": "gold",     "rarity": "rare"},
    # ELO milestones
    {"slug": "elo_1400",        "name": "Candidate Master",  "description": "Reached 1400 ELO",                             "icon": "🧠", "tier": "silver",   "rarity": "uncommon"},
    {"slug": "elo_1600",        "name": "Master Mind",       "description": "Reached 1600 ELO",                             "icon": "👑", "tier": "gold",     "rarity": "rare"},
    {"slug": "elo_2000",        "name": "Grandmaster",       "description": "Reached 2000 ELO",                             "icon": "🌠", "tier": "platinum", "rarity": "legendary"},
    # Special
    {"slug": "versatile",       "name": "Renaissance Mind",  "description": "Debated in 5+ different interest categories",  "icon": "🎭", "tier": "gold",     "rarity": "rare"},
    {"slug": "comeback",        "name": "The Comeback Kid",  "description": "Won after losing 3 in a row",                  "icon": "💪", "tier": "silver",   "rarity": "uncommon"},
    {"slug": "peacemaker",      "name": "Peacemaker",        "description": "Agreed to a mutual draw",                      "icon": "🤝", "tier": "bronze",   "rarity": "common"},
]


def seed_badges(db: Session):
    """Insert badge definitions if they don't exist."""
    for defn in BADGE_DEFINITIONS:
        existing = db.query(models.Badge).filter(models.Badge.slug == defn["slug"]).first()
        if not existing:
            db.add(models.Badge(**defn))
    db.commit()


def award_badge(db: Session, user: models.User, slug: str):
    """Award a badge to a user if they don't already have it."""
    badge = db.query(models.Badge).filter(models.Badge.slug == slug).first()
    if not badge:
        return
    already = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == user.id,
        models.UserBadge.badge_id == badge.id
    ).first()
    if already:
        return
    db.add(models.UserBadge(user_id=user.id, badge_id=badge.id))
    db.commit()


def evaluate_badges(db: Session, user: models.User):
    """Check and award all applicable badges for a user."""
    # Onboarding
    if user.interests_setup:
        award_badge(db, user, "first_steps")
    if user.total_debates >= 1:
        award_badge(db, user, "first_debate")

    # Win milestones
    if user.wins >= 1:   award_badge(db, user, "win_1")
    if user.wins >= 10:  award_badge(db, user, "win_10")
    if user.wins >= 50:  award_badge(db, user, "win_50")
    if user.wins >= 100: award_badge(db, user, "win_100")

    # Streaks
    if user.max_win_streak >= 3:  award_badge(db, user, "streak_3")
    if user.max_win_streak >= 5:  award_badge(db, user, "streak_5")
    if user.max_win_streak >= 10: award_badge(db, user, "streak_10")

    # ELO
    if user.peak_elo >= 1400: award_badge(db, user, "elo_1400")
    if user.peak_elo >= 1600: award_badge(db, user, "elo_1600")
    if user.peak_elo >= 2000: award_badge(db, user, "elo_2000")

    # Versatile — count distinct interest slugs across debates
    from sqlalchemy import distinct, func
    distinct_interests = db.query(func.count(distinct(models.Debate.interest_slug))).filter(
        (models.Debate.player1_id == user.id) | (models.Debate.player2_id == user.id),
        models.Debate.interest_slug.isnot(None)
    ).scalar()
    if distinct_interests and distinct_interests >= 5:
        award_badge(db, user, "versatile")
