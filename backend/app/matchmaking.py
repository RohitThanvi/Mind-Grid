# app/matchmaking.py — Production matchmaking with forfeit, draw, evaluation

from app.socketio_instance import sio
from sqlalchemy.orm import Session
from app import database, models
from app.models import DebateStatus, DebateResult
from app.elo import calculate_elo_change, match_quality
from app import badges_engine
from typing import Dict, Any, Optional, List
from datetime import datetime
import pytz
import json
import traceback
import os
from jose import JWTError, jwt

SECRET_KEY = os.getenv("JWT_SECRET", "testsecret")
ALGORITHM  = "HS256"
IST = pytz.timezone('Asia/Kolkata')

# ── In-memory state ────────────────────────────────────────────────────────────
online_users: Dict[str, Any] = {}
matchmaking_queue: List[Dict[str, Any]] = []
debate_players: Dict[str, set] = {}   # debate_id_str -> {uid1, uid2}


def _ist_now():
    return datetime.now(IST)


def _get_user_db(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def _pick_topic(db: Session, common_slugs: List[str]):
    import random
    for slug in random.sample(common_slugs, len(common_slugs)):
        interest = db.query(models.Interest).filter(models.Interest.slug == slug).first()
        if interest and interest.topic_pool:
            try:
                topics = json.loads(interest.topic_pool)
                if topics:
                    return random.choice(topics), slug
            except Exception:
                pass
    fallback = [
        ("Should AI be regulated by governments?", "technology"),
        ("Is social media net positive for society?", "society"),
        ("Should voting be mandatory?", "politics"),
    ]
    return random.choice(fallback)


def _find_best_match(candidate: Dict, queue: List[Dict]) -> Optional[Dict]:
    c_elo = candidate.get("elo", 1200)
    c_interests = set(candidate.get("interests", []))
    c_uid = candidate["user_id"]
    best, best_score = None, -1

    for p in queue:
        if p["user_id"] == c_uid:
            continue
        p_elo = p.get("elo", 1200)
        if abs(c_elo - p_elo) > 300:
            continue
        common = c_interests & set(p.get("interests", []))
        score = len(common) * 2 + match_quality(c_elo, p_elo)
        if score > best_score:
            best_score, best = score, p

    if best is None:
        for p in queue:
            if p["user_id"] == c_uid:
                continue
            if abs(candidate.get("elo", 1200) - p.get("elo", 1200)) <= 600:
                best = p
                break
    return best


def _update_stats_and_elo(db: Session, debate: models.Debate, result: DebateResult):
    p1 = _get_user_db(db, debate.player1_id)
    p2 = _get_user_db(db, debate.player2_id)
    if not p1 or not p2:
        return None, None, 0, 0

    p1_games = p1.total_debates or 0
    p2_games = p2.total_debates or 0
    debate.p1_elo_before = p1.elo
    debate.p2_elo_before = p2.elo

    if result == DebateResult.player1_win:
        c1, c2 = calculate_elo_change(p1.elo, p2.elo, p1_games, p2_games, "win")
        p1.wins += 1; p2.losses += 1
        p1.win_streak = (p1.win_streak or 0) + 1; p2.win_streak = 0
        debate.winner = p1.username
        r1, r2 = "win", "loss"
    elif result == DebateResult.player2_win:
        c2, c1 = calculate_elo_change(p2.elo, p1.elo, p2_games, p1_games, "win")
        p2.wins += 1; p1.losses += 1
        p2.win_streak = (p2.win_streak or 0) + 1; p1.win_streak = 0
        debate.winner = p2.username
        r1, r2 = "loss", "win"
    elif result == DebateResult.forfeit_p1:
        c2, c1 = calculate_elo_change(p2.elo, p1.elo, p2_games, p1_games, "forfeit_win")
        p2.wins += 1; p1.losses += 1
        p2.win_streak = (p2.win_streak or 0) + 1; p1.win_streak = 0
        debate.winner = p2.username
        r1, r2 = "forfeit_loss", "forfeit_win"
    elif result == DebateResult.forfeit_p2:
        c1, c2 = calculate_elo_change(p1.elo, p2.elo, p1_games, p2_games, "forfeit_win")
        p1.wins += 1; p2.losses += 1
        p1.win_streak = (p1.win_streak or 0) + 1; p2.win_streak = 0
        debate.winner = p1.username
        r1, r2 = "forfeit_win", "forfeit_loss"
    else:  # draw
        c1, c2 = calculate_elo_change(p1.elo, p2.elo, p1_games, p2_games, "draw")
        p1.draws += 1; p2.draws += 1
        p1.win_streak = 0; p2.win_streak = 0
        debate.winner = "Draw"
        r1, r2 = "draw", "draw"

    p1.elo = max(100, (p1.elo or 1200) + c1)
    p2.elo = max(100, (p2.elo or 1200) + c2)
    p1.peak_elo = max(p1.peak_elo or 1200, p1.elo)
    p2.peak_elo = max(p2.peak_elo or 1200, p2.elo)
    p1.max_win_streak = max(p1.max_win_streak or 0, p1.win_streak or 0)
    p2.max_win_streak = max(p2.max_win_streak or 0, p2.win_streak or 0)
    p1.total_debates = (p1.total_debates or 0) + 1
    p2.total_debates = (p2.total_debates or 0) + 1
    debate.p1_elo_after = p1.elo
    debate.p2_elo_after = p2.elo
    debate.result = result
    debate.status = DebateStatus.completed
    debate.ended_at = _ist_now()

    # Tokens
    if result in (DebateResult.player1_win, DebateResult.forfeit_p2):
        p1.mind_tokens = (p1.mind_tokens or 0) + 10
        p2.mind_tokens = (p2.mind_tokens or 0) + 2
    elif result in (DebateResult.player2_win, DebateResult.forfeit_p1):
        p2.mind_tokens = (p2.mind_tokens or 0) + 10
        p1.mind_tokens = (p1.mind_tokens or 0) + 2
    else:
        p1.mind_tokens = (p1.mind_tokens or 0) + 5
        p2.mind_tokens = (p2.mind_tokens or 0) + 5

    db.add(models.EloHistory(user_id=p1.id, debate_id=debate.id,
        elo_before=debate.p1_elo_before, elo_after=p1.elo, change=c1, result=r1))
    db.add(models.EloHistory(user_id=p2.id, debate_id=debate.id,
        elo_before=debate.p2_elo_before, elo_after=p2.elo, change=c2, result=r2))

    db.commit()
    db.refresh(p1); db.refresh(p2)
    badges_engine.evaluate_badges(db, p1)
    badges_engine.evaluate_badges(db, p2)
    return p1, p2, c1, c2


async def _finalize_debate(debate_id, result: DebateResult, evaluation: dict = None, mutual: bool = False):
    """Apply ELO, save to DB, emit debate_ended to both players."""
    try:
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if not db_debate or db_debate.status == DebateStatus.completed:
                return

            p1, p2, c1, c2 = _update_stats_and_elo(db, db_debate, result)
            if not p1 or not p2:
                return

            if mutual:
                badges_engine.award_badge(db, p1, "peacemaker")
                badges_engine.award_badge(db, p2, "peacemaker")

            payload = {
                'debate_id': debate_id,
                'result':    result.value,
                'winner':    db_debate.winner,
                'p1': {
                    'id': p1.id, 'username': p1.username,
                    'elo_before': db_debate.p1_elo_before,
                    'elo_after':  p1.elo, 'elo_change': c1,
                },
                'p2': {
                    'id': p2.id, 'username': p2.username,
                    'elo_before': db_debate.p2_elo_before,
                    'elo_after':  p2.elo, 'elo_change': c2,
                },
                'evaluation': evaluation,
            }
            # Emit to the debate room — both players receive this
            await sio.emit('debate_ended', payload, room=str(debate_id))
            debate_players.pop(str(debate_id), None)

    except Exception:
        traceback.print_exc()


# ── Socket Events ──────────────────────────────────────────────────────────────

@sio.event
async def connect(sid, environ, auth=None):
    token = (auth or {}).get('token')
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            await sio.save_session(sid, {'email': payload.get("sub")})
        except JWTError:
            pass
    return True


@sio.event
async def user_online(sid, data):
    uid = str(data.get('userId', ''))
    if uid:
        online_users[uid] = {
            'username': data.get('username'), 'elo': data.get('elo', 1200),
            'id': uid, 'sid': sid, 'interests': data.get('interests', [])
        }


@sio.event
async def user_offline(sid, data=None):
    uid = str((data or {}).get('userId', ''))
    if uid:
        online_users.pop(uid, None)
        global matchmaking_queue
        matchmaking_queue = [q for q in matchmaking_queue if q['user_id'] != uid]


@sio.event
async def disconnect(sid):
    # Find which user disconnected
    uid_disconnected = None
    for uid, udata in list(online_users.items()):
        if udata.get('sid') == sid:
            uid_disconnected = uid
            break

    if uid_disconnected:
        # Check active debates
        for debate_id_str, players in list(debate_players.items()):
            if uid_disconnected in players:
                await _handle_forfeit(debate_id_str, uid_disconnected, "disconnect")
                break
        online_users.pop(uid_disconnected, None)
        global matchmaking_queue
        matchmaking_queue = [q for q in matchmaking_queue if q['user_id'] != uid_disconnected]


@sio.event
async def join_debate_room(sid, data):
    debate_id = str(data.get('debateId', ''))
    uid = str(data.get('userId', ''))
    if debate_id:
        await sio.enter_room(sid, debate_id)
        if debate_id not in debate_players:
            debate_players[debate_id] = set()
        if uid:
            debate_players[debate_id].add(uid)


@sio.event
async def leave_debate_room(sid, data):
    debate_id = str(data.get('debateId', ''))
    if debate_id:
        await sio.leave_room(sid, debate_id)


@sio.event
async def join_matchmaking_queue(sid, data):
    user_id  = str(data.get('userId', ''))
    username = data.get('username', '')
    elo      = data.get('elo', 1200)
    interests = data.get('interests', [])

    if not user_id:
        await sio.emit('error', {'detail': 'Missing userId'}, room=sid)
        return

    online_users[user_id] = {'username': username, 'elo': elo, 'id': user_id, 'sid': sid, 'interests': interests}

    global matchmaking_queue
    matchmaking_queue = [q for q in matchmaking_queue if q['user_id'] != user_id]
    candidate = {'user_id': user_id, 'username': username, 'elo': elo, 'sid': sid, 'interests': interests}
    matchmaking_queue.append(candidate)

    await sio.emit('queue_joined', {'position': len(matchmaking_queue)}, room=sid)

    rest = [q for q in matchmaking_queue if q['user_id'] != user_id]
    match = _find_best_match(candidate, rest)

    if match:
        matchmaking_queue = [q for q in matchmaking_queue if q['user_id'] not in (user_id, match['user_id'])]
        try:
            with database.SessionLocal() as db:
                common = list(set(candidate.get('interests', [])) & set(match.get('interests', []))) \
                         or candidate.get('interests', []) or match.get('interests', [])
                topic, slug = _pick_topic(db, common) if common else ("Should AI be regulated?", "technology")

                p1 = _get_user_db(db, int(user_id))
                p2 = _get_user_db(db, int(match['user_id']))
                if not p1 or not p2:
                    raise ValueError("User not found")

                debate = models.Debate(
                    player1_id=p1.id, player2_id=p2.id,
                    topic=topic, interest_slug=slug,
                    status=DebateStatus.active,
                    p1_elo_before=p1.elo, p2_elo_before=p2.elo,
                    started_at=_ist_now(),
                )
                db.add(debate)
                db.commit()
                db.refresh(debate)

                room_id = str(debate.id)
                debate_players[room_id] = {user_id, match['user_id']}

                await sio.enter_room(sid, room_id)
                await sio.enter_room(match['sid'], room_id)
                await sio.emit('match_found', {
                    'debate_id': debate.id, 'topic': topic, 'interest': slug,
                    'opponent': {'id': match['user_id'], 'username': match['username'], 'elo': match['elo']},
                    'your_elo': elo,
                }, room=sid)
                await sio.emit('match_found', {
                    'debate_id': debate.id, 'topic': topic, 'interest': slug,
                    'opponent': {'id': user_id, 'username': username, 'elo': elo},
                    'your_elo': match['elo'],
                }, room=match['sid'])

        except Exception:
            traceback.print_exc()
            matchmaking_queue.append(candidate)
            matchmaking_queue.append(match)
            await sio.emit('error', {'detail': 'Matchmaking failed, try again'}, room=sid)


@sio.event
async def cancel_matchmaking(sid, data):
    user_id = str(data.get('userId', ''))
    global matchmaking_queue
    matchmaking_queue = [q for q in matchmaking_queue if q['user_id'] != user_id]
    await sio.emit('queue_cancelled', {}, room=sid)


@sio.event
async def send_message_to_human(sid, data):
    debate_id   = data.get('debateId')
    sender_id   = data.get('senderId')
    content     = data.get('content', '').strip()
    sender_type = data.get('senderType', 'user')

    if not debate_id or sender_id is None or not content:
        return

    try:
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if not db_debate or db_debate.status != DebateStatus.active:
                await sio.emit('error', {'detail': 'Debate not active.'}, room=sid)
                return

            msg = models.Message(content=content, sender_type=sender_type,
                                 debate_id=debate_id, sender_id=int(sender_id))
            db.add(msg)
            db.commit()
            db.refresh(msg)

            await sio.emit('new_message', {
                'id': msg.id, 'content': msg.content, 'sender_id': msg.sender_id,
                'debate_id': msg.debate_id, 'timestamp': msg.timestamp.isoformat(),
                'sender_type': msg.sender_type,
            }, room=str(debate_id))
    except Exception:
        traceback.print_exc()


@sio.event
async def propose_draw(sid, data):
    debate_id = data.get('debateId')
    user_id   = str(data.get('userId', ''))
    if not debate_id:
        return
    try:
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if not db_debate or db_debate.status != DebateStatus.active:
                return
            uid_int = int(user_id)
            if db_debate.draw_proposed_by and db_debate.draw_proposed_by != uid_int:
                # Other player already proposed — both agreed
                db_debate.draw_proposed_by = None
                db.commit()
                await _finalize_debate(debate_id, DebateResult.draw, mutual=True)
                return
            db_debate.draw_proposed_by = uid_int
            db.commit()
        await sio.emit('draw_proposed', {'proposer_id': user_id, 'debate_id': debate_id}, room=str(debate_id))
    except Exception:
        traceback.print_exc()


@sio.event
async def accept_draw(sid, data):
    debate_id = data.get('debateId')
    if debate_id:
        await _finalize_debate(debate_id, DebateResult.draw, mutual=True)


@sio.event
async def reject_draw(sid, data):
    debate_id = data.get('debateId')
    if not debate_id:
        return
    try:
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if db_debate:
                db_debate.draw_proposed_by = None
                db.commit()
        await sio.emit('draw_rejected', {'debate_id': debate_id}, room=str(debate_id))
    except Exception:
        traceback.print_exc()


@sio.event
async def end_debate(sid, data):
    """Called by frontend when timer expires — runs AI evaluation then finalizes."""
    debate_id = data.get('debate_id') or data.get('debateId')
    if not debate_id:
        return

    print(f"[end_debate] triggered for debate_id={debate_id}")

    try:
        # Extract everything needed INSIDE the session so objects aren't detached
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if not db_debate or db_debate.status != DebateStatus.active:
                print(f"[end_debate] debate {debate_id} not active or not found, status={getattr(db_debate, 'status', None)}")
                return

            topic      = db_debate.topic
            p1_id      = db_debate.player1_id

            # Build simple message dicts — no ORM objects outside session
            msg_rows = db.query(models.Message).filter(
                models.Message.debate_id == debate_id
            ).order_by(models.Message.timestamp).all()

            msg_data = [
                {"sender_id": m.sender_id, "content": m.content, "sender_type": m.sender_type}
                for m in msg_rows
            ]

        print(f"[end_debate] {len(msg_data)} messages, topic='{topic}'")

        # Run AI evaluation with plain dicts — no ORM dependency
        from app.evaluation import evaluate_debate_plain
        evaluation = await evaluate_debate_plain(msg_data, topic, p1_id)
        print(f"[end_debate] evaluation winner={evaluation.get('winner')}")

        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if db_debate:
                db_debate.evaluation_json = json.dumps(evaluation)
                db.commit()

        ev_winner = evaluation.get('winner', 'draw')
        if ev_winner == 'player1':
            result = DebateResult.player1_win
        elif ev_winner == 'player2':
            result = DebateResult.player2_win
        else:
            result = DebateResult.draw

        await _finalize_debate(debate_id, result, evaluation=evaluation)

    except Exception:
        traceback.print_exc()
        await _finalize_debate(debate_id, DebateResult.draw)


@sio.event
async def forfeit_debate(sid, data):
    """Explicit forfeit button press."""
    debate_id = str(data.get('debateId', ''))
    user_id   = str(data.get('userId', ''))
    if debate_id and user_id:
        await _handle_forfeit(debate_id, user_id, "forfeit")


async def _handle_forfeit(debate_id_str: str, leaver_uid: str, reason: str = "forfeit"):
    """Player left/forfeited — award win to opponent immediately."""
    try:
        debate_id = int(debate_id_str)
        with database.SessionLocal() as db:
            db_debate = db.query(models.Debate).filter(models.Debate.id == debate_id).first()
            if not db_debate or db_debate.status != DebateStatus.active:
                return
            leaver_id = int(leaver_uid)
            result = DebateResult.forfeit_p1 if db_debate.player1_id == leaver_id else DebateResult.forfeit_p2

        # Notify room BEFORE finalizing so both players see the message
        await sio.emit('opponent_forfeited', {
            'debate_id': debate_id,
            'forfeiter_id': leaver_uid,
            'reason': reason,
        }, room=debate_id_str)

        await _finalize_debate(debate_id, result)
        debate_players.pop(debate_id_str, None)

    except Exception:
        traceback.print_exc()
