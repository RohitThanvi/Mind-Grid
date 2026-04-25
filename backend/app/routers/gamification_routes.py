from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import database, models, schemas, auth

router = APIRouter(prefix="/gamification", tags=["Gamification"])

@router.get("/badges", response_model=list[schemas.BadgeSchema])
def get_badges(db: Session = Depends(database.get_db)):
    return db.query(models.Badge).all()

@router.get("/my-badges", response_model=list[schemas.BadgeSchema])
def get_my_badges(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    rows = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == current_user.id
    ).all()
    return [r.badge for r in rows if r.badge]