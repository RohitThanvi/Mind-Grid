# app/routers/interests_routes.py

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import database, models, auth
from pydantic import BaseModel
from typing import List
from app.badges_engine import evaluate_badges

router = APIRouter(prefix="/interests", tags=["Interests"])

# ── Seed data ──────────────────────────────────────────────────────────────────
INTEREST_SEED = [
    {"slug": "history",       "label": "History",          "icon": "📜",
     "topics": ["Was colonialism ultimately more harmful than beneficial?",
                "Should historical monuments of controversial figures be removed?",
                "Did the Industrial Revolution improve quality of life?",
                "Was the partition of India inevitable?",
                "Should countries pay reparations for historical injustices?"]},
    {"slug": "science",       "label": "Science & Tech",   "icon": "🔬",
     "topics": ["Should AI be regulated by governments?",
                "Is nuclear energy the answer to climate change?",
                "Should human genetic engineering be permitted?",
                "Is space colonization a moral imperative?",
                "Are social media algorithms more harmful than helpful?"]},
    {"slug": "politics",      "label": "Politics",         "icon": "🏛️",
     "topics": ["Should voting be mandatory in democracies?",
                "Is democracy the best system of governance?",
                "Should the UN Security Council veto power be abolished?",
                "Is nationalism a positive force in the modern world?",
                "Should politicians be limited to two terms?"]},
    {"slug": "philosophy",    "label": "Philosophy",       "icon": "🧠",
     "topics": ["Is free will an illusion?",
                "Does morality require religion?",
                "Is suffering necessary for personal growth?",
                "Should we prioritise individual rights over collective welfare?",
                "Is truth objective or subjective?"]},
    {"slug": "economics",     "label": "Economics",        "icon": "💹",
     "topics": ["Is universal basic income viable?",
                "Should billionaires exist?",
                "Is capitalism the best economic system?",
                "Should college education be free?",
                "Does globalisation benefit developing nations?"]},
    {"slug": "environment",   "label": "Environment",      "icon": "🌿",
     "topics": ["Should plastic production be banned?",
                "Is individual action enough to combat climate change?",
                "Should fossil fuel companies be held criminally liable?",
                "Is veganism the most ethical diet?",
                "Should we geoengineer the climate?"]},
    {"slug": "culture",       "label": "Culture & Society","icon": "🎭",
     "topics": ["Does social media do more harm than good?",
                "Should cultural appropriation be legally prohibited?",
                "Is cancel culture beneficial to society?",
                "Should violent video games be restricted?",
                "Is art a necessary part of education?"]},
    {"slug": "sports",        "label": "Sports",           "icon": "⚽",
     "topics": ["Should performance-enhancing drugs be allowed in sports?",
                "Is esports a legitimate sport?",
                "Should college athletes be paid?",
                "Is the Olympic Games still relevant?",
                "Should contact sports be banned for minors?"]},
    {"slug": "education",     "label": "Education",        "icon": "📚",
     "topics": ["Is homework beneficial for students?",
                "Should standardised tests be abolished?",
                "Is online education as effective as in-person learning?",
                "Should smartphones be banned in schools?",
                "Should philosophy be taught in primary school?"]},
    {"slug": "ethics",        "label": "Ethics & Morality","icon": "⚖️",
     "topics": ["Should euthanasia be legalised?",
                "Is civil disobedience ever justified?",
                "Should wealthy nations have open borders?",
                "Is it ethical to eat meat?",
                "Should there be a universal basic income?"]},
]


def seed_interests(db: Session):
    for item in INTEREST_SEED:
        existing = db.query(models.Interest).filter(models.Interest.slug == item["slug"]).first()
        if not existing:
            db.add(models.Interest(
                slug=item["slug"],
                label=item["label"],
                icon=item["icon"],
                topic_pool=json.dumps(item["topics"])
            ))
    db.commit()


# ── Schemas ────────────────────────────────────────────────────────────────────
class InterestOut(BaseModel):
    id: int
    slug: str
    label: str
    icon: str | None = None

    class Config:
        from_attributes = True


class SetInterestsRequest(BaseModel):
    interest_slugs: List[str]


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.get("/", response_model=List[InterestOut])
def list_interests(db: Session = Depends(database.get_db)):
    return db.query(models.Interest).all()


@router.get("/me", response_model=List[InterestOut])
def get_my_interests(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    rows = db.query(models.UserInterest).filter(
        models.UserInterest.user_id == current_user.id
    ).all()
    return [r.interest for r in rows if r.interest]


@router.post("/me")
def set_my_interests(
    body: SetInterestsRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not body.interest_slugs:
        raise HTTPException(status_code=400, detail="Select at least one interest.")
    if len(body.interest_slugs) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 interests allowed.")

    # Delete existing
    db.query(models.UserInterest).filter(
        models.UserInterest.user_id == current_user.id
    ).delete()

    for slug in body.interest_slugs:
        interest = db.query(models.Interest).filter(models.Interest.slug == slug).first()
        if not interest:
            continue
        db.add(models.UserInterest(user_id=current_user.id, interest_id=interest.id))

    current_user.interests_setup = True
    db.commit()
    db.refresh(current_user)

    evaluate_badges(db, current_user)
    return {"status": "ok", "interests_set": len(body.interest_slugs)}
