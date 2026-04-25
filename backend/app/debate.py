# app/debate.py — Debate HTTP routes

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas, database, auth
from app.models import DebateStatus
import random

router = APIRouter(prefix="/debate", tags=["Debates"])

DEBATE_TOPICS = [
    "Should social media platforms censor content?",
    "Is universal basic income a viable solution to poverty?",
    "Is artificial intelligence more beneficial or harmful?",
    "Should college education be free for everyone?",
    "Is climate change primarily caused by human activity?",
    "Should voting be mandatory in democratic countries?",
    "Is space exploration worth the investment?",
    "Should genetically modified foods be widely adopted?",
]

@router.post("/start-human", response_model=schemas.DebateOut)
def start_human_match(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    topic = random.choice(DEBATE_TOPICS)
    db_debate = models.Debate(
        player1_id=current_user.id,
        player2_id=None,
        topic=topic,
        status=DebateStatus.waiting,
        p1_elo_before=current_user.elo,
    )
    db.add(db_debate)
    db.commit()
    db.refresh(db_debate)
    return db_debate

@router.get("/{debate_id}", response_model=schemas.DebateOut)
def get_debate(debate_id: int, db: Session = Depends(database.get_db),
               current_user: models.User = Depends(auth.get_current_user)):
    d = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Debate not found")
    return d

@router.get("/{debate_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(debate_id: int, db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth.get_current_user)):
    d = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Debate not found")
    return db.query(models.Message).filter(models.Message.debate_id == debate_id)\
             .order_by(models.Message.timestamp).all()
