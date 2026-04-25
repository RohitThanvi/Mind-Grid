from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, models, schemas, auth

router = APIRouter(prefix="/forums", tags=["Forums"])

FORUM_SEED = [
    {"name": "General Debate",      "description": "Open debates on any topic — all are welcome."},
    {"name": "History & Politics",  "description": "Discuss historical events, political theory, and governance."},
    {"name": "Science & Tech",      "description": "AI, space, climate, biotech — argue the future."},
    {"name": "Philosophy & Ethics", "description": "Morality, free will, consciousness and beyond."},
    {"name": "Economics & Society", "description": "Markets, inequality, policy and culture."},
]

def seed_forums(db: Session):
    for f in FORUM_SEED:
        existing = db.query(models.Forum).filter(models.Forum.name == f["name"]).first()
        if not existing:
            db.add(models.Forum(**f))
    db.commit()

@router.get("/", response_model=list[schemas.Forum])
def get_forums(db: Session = Depends(database.get_db)):
    forums = db.query(models.Forum).all()
    if not forums:
        seed_forums(db)
        forums = db.query(models.Forum).all()
    return forums

@router.get("/{forum_id}/threads", response_model=list[schemas.Thread])
def get_threads(forum_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Thread).filter(models.Thread.forum_id == forum_id).all()

@router.get("/threads/{thread_id}/posts", response_model=list[schemas.Post])
def get_posts(thread_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Post).filter(models.Post.thread_id == thread_id).all()

@router.post("/threads", response_model=schemas.Thread)
def create_thread(
    thread: schemas.ThreadCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_thread = models.Thread(**thread.dict(), user_id=current_user.id)
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)
    return db_thread

@router.post("/posts", response_model=schemas.Post)
def create_post(
    post: schemas.PostCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_post = models.Post(**post.dict(), user_id=current_user.id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post
