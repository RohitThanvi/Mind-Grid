# app/main.py — MindGrid Production Server

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth_routes, leaderboard_routes, dashboard_routes,
    token_routes, gamification_routes, forum_routes,
    ai_debate_routes, analysis_routes,
    interests_routes, profile_routes,
)
from app import debate, matchmaking
from app.socketio_instance import sio
from app.database import engine, Base, SessionLocal
from app import models
from app.badges_engine import seed_badges
from app.routers.interests_routes import seed_interests
import socketio
import traceback

# Create tables
Base.metadata.create_all(bind=engine)

# Seed reference data
with SessionLocal() as db:
    seed_badges(db)
    seed_interests(db)

# ── CORS origins ───────────────────────────────────────────────────────────────
import os
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # "https://minddeploy1-1.onrender.com",
]
fastapi_app = FastAPI(title="MindGrid API", version="2.0.0")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
fastapi_app.include_router(auth_routes.router)
fastapi_app.include_router(debate.router)
fastapi_app.include_router(leaderboard_routes.router)
fastapi_app.include_router(dashboard_routes.router)
fastapi_app.include_router(token_routes.router)
fastapi_app.include_router(gamification_routes.router)
fastapi_app.include_router(forum_routes.router)
fastapi_app.include_router(ai_debate_routes.router)
fastapi_app.include_router(analysis_routes.router)
fastapi_app.include_router(interests_routes.router)
fastapi_app.include_router(profile_routes.router)

# ── ASGI App ───────────────────────────────────────────────────────────────────
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

# ── Health check ───────────────────────────────────────────────────────────────
@fastapi_app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
