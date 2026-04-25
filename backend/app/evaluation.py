# app/evaluation.py — Debate evaluation using a separate judge prompt

import json
import asyncio
from typing import Dict, Any, List, Optional
from app import models
from groq import AsyncGroq
import os

# Use a SEPARATE client call with a judge system prompt — not get_ai_response()
# because that has a debate-partner system prompt baked in.

async def _call_judge(prompt: str) -> str:
    client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    resp = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert, impartial debate judge. "
                    "You evaluate debates fairly and return ONLY valid JSON — "
                    "no markdown, no code fences, no preamble, just the raw JSON object."
                )
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
    )
    return resp.choices[0].message.content.strip()


async def evaluate_debate_human(
    messages: List[models.Message],
    debate: Optional[models.Debate] = None
) -> Dict[str, Any]:
    empty = {
        'winner': 'draw', 'player1_score': 50, 'player2_score': 50,
        'feedback': {
            'player1': {'logic': 50, 'persuasion': 50, 'evidence': 50, 'style': 50, 'summary': 'No content to evaluate.'},
            'player2': {'logic': 50, 'persuasion': 50, 'evidence': 50, 'style': 50, 'summary': 'No content to evaluate.'},
        },
        'overall': 'No messages were submitted for evaluation.',
        'key_moments': [],
        'topic': debate.topic if debate else 'Unknown',
    }

    if not messages:
        return empty

    p1_id = debate.player1_id if debate else None
    transcript_lines = []
    p1_has_messages = False
    p2_has_messages = False

    for msg in messages:
        if msg.sender_type == 'system':
            continue
        if msg.sender_id == p1_id:
            transcript_lines.append(f"Player1: {msg.content}")
            p1_has_messages = True
        else:
            transcript_lines.append(f"Player2: {msg.content}")
            p2_has_messages = True

    if not transcript_lines:
        return empty

    topic = debate.topic if debate else 'Unknown topic'
    transcript = "\n".join(transcript_lines)

    prompt = f"""Evaluate this debate and return ONLY a JSON object.

TOPIC: {topic}

TRANSCRIPT:
{transcript}

Return this exact JSON structure (no markdown, no backticks, just raw JSON):
{{
  "winner": "player1",
  "player1_score": 72,
  "player2_score": 61,
  "feedback": {{
    "player1": {{
      "logic": 75,
      "persuasion": 70,
      "evidence": 68,
      "style": 72,
      "summary": "Player1 presented well-structured arguments with clear reasoning. Their point about X was particularly strong."
    }},
    "player2": {{
      "logic": 60,
      "persuasion": 65,
      "evidence": 55,
      "style": 63,
      "summary": "Player2 made some good points but lacked supporting evidence. Their rebuttal could have been stronger."
    }}
  }},
  "overall": "A competitive debate where Player1 held a slight edge due to better structured arguments.",
  "key_moments": ["Player1's opening argument set a strong foundation", "Player2 failed to counter the economic point effectively"]
}}

Winner must be "player1", "player2", or "draw". All scores 0-100. Be specific and fair."""

    try:
        raw = await _call_judge(prompt)

        # Strip any accidental markdown fences
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    raw = part
                    break

        # Find JSON object in response
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        parsed = json.loads(raw)

        winner = parsed.get("winner", "draw")
        if winner not in ("player1", "player2", "draw"):
            winner = "draw"

        # If one side had no messages, auto-win for the other
        if not p1_has_messages:
            winner = "player2"
        elif not p2_has_messages:
            winner = "player1"

        return {
            'winner':        winner,
            'player1_score': int(parsed.get("player1_score", 50)),
            'player2_score': int(parsed.get("player2_score", 50)),
            'feedback':      parsed.get("feedback", empty["feedback"]),
            'overall':       parsed.get("overall", ""),
            'key_moments':   parsed.get("key_moments", []),
            'topic':         topic,
        }

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Evaluation Error] {type(e).__name__}: {e}")
        print(f"[Evaluation Raw response] {raw[:300] if 'raw' in dir() else 'N/A'}")
        # Fallback: basic score based on message count
        p1_count = sum(1 for m in messages if m.sender_id == p1_id and m.sender_type != 'system')
        p2_count = len(messages) - p1_count
        if p1_count > p2_count:
            fallback_winner = "player1"
        elif p2_count > p1_count:
            fallback_winner = "player2"
        else:
            fallback_winner = "draw"
        return {**empty, 'winner': fallback_winner, 'overall': 'AI evaluation encountered an error. Result based on participation.'}


# Legacy alias
async def evaluate_debate(messages):
    return await evaluate_debate_human(messages)


async def evaluate_debate_plain(
    msg_data: list,   # list of {"sender_id", "content", "sender_type"}
    topic: str,
    p1_id: int,
) -> Dict[str, Any]:
    """
    Same as evaluate_debate_human but works on plain dicts (no SQLAlchemy objects).
    Called from matchmaking.py after session is closed.
    """
    empty = {
        'winner': 'draw', 'player1_score': 50, 'player2_score': 50,
        'feedback': {
            'player1': {'logic': 50, 'persuasion': 50, 'evidence': 50, 'style': 50, 'summary': 'No content.'},
            'player2': {'logic': 50, 'persuasion': 50, 'evidence': 50, 'style': 50, 'summary': 'No content.'},
        },
        'overall': 'No messages were submitted.',
        'key_moments': [],
        'topic': topic,
    }

    transcript_lines = []
    p1_has = False
    p2_has = False

    for m in msg_data:
        if m.get("sender_type") == "system":
            continue
        if m.get("sender_id") == p1_id:
            transcript_lines.append(f"Player1: {m['content']}")
            p1_has = True
        else:
            transcript_lines.append(f"Player2: {m['content']}")
            p2_has = True

    if not transcript_lines:
        return empty

    transcript = "\n".join(transcript_lines)

    prompt = f"""Evaluate this debate and return ONLY a JSON object.

TOPIC: {topic}

TRANSCRIPT:
{transcript}

Return this exact JSON structure (raw JSON only, no markdown, no backticks):
{{
  "winner": "player1",
  "player1_score": 72,
  "player2_score": 61,
  "feedback": {{
    "player1": {{
      "logic": 75,
      "persuasion": 70,
      "evidence": 68,
      "style": 72,
      "summary": "Two to three sentences about Player1's performance."
    }},
    "player2": {{
      "logic": 60,
      "persuasion": 65,
      "evidence": 55,
      "style": 63,
      "summary": "Two to three sentences about Player2's performance."
    }}
  }},
  "overall": "Two to three sentence summary of the debate.",
  "key_moments": ["moment 1", "moment 2"]
}}

Winner must be exactly "player1", "player2", or "draw". All scores 0-100."""

    try:
        raw = await _call_judge(prompt)

        # Strip markdown fences
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    raw = part
                    break

        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        parsed = json.loads(raw)
        winner = parsed.get("winner", "draw")
        if winner not in ("player1", "player2", "draw"):
            winner = "draw"
        if not p1_has:
            winner = "player2"
        elif not p2_has:
            winner = "player1"

        return {
            'winner':        winner,
            'player1_score': int(parsed.get("player1_score", 50)),
            'player2_score': int(parsed.get("player2_score", 50)),
            'feedback':      parsed.get("feedback", empty["feedback"]),
            'overall':       parsed.get("overall", ""),
            'key_moments':   parsed.get("key_moments", []),
            'topic':         topic,
        }

    except Exception as e:
        print(f"[evaluate_debate_plain] Error: {type(e).__name__}: {e}")
        p1_count = sum(1 for m in msg_data if m.get("sender_id") == p1_id)
        p2_count = len(msg_data) - p1_count
        fallback = "player1" if p1_count > p2_count else "player2" if p2_count > p1_count else "draw"
        return {**empty, 'winner': fallback, 'overall': 'AI evaluation error — result based on participation.'}
