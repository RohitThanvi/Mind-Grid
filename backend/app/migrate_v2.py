"""
Run this script once to add new columns to existing databases.
Usage: python -m app.migrate_v2
"""
from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        stmts = [
            # users new columns
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS peak_elo INTEGER DEFAULT 1200",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS interests_setup BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_debates INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0",
            # debates new columns
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS interest_slug VARCHAR",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'waiting'",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS result VARCHAR",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS p1_elo_before INTEGER",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS p2_elo_before INTEGER",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS p1_elo_after INTEGER",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS p2_elo_after INTEGER",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS draw_proposed_by INTEGER",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ",
            "ALTER TABLE debates ADD COLUMN IF NOT EXISTS evaluation_json TEXT",
            # badges — add new columns
            "ALTER TABLE badges ADD COLUMN IF NOT EXISTS slug VARCHAR",
            "ALTER TABLE badges ADD COLUMN IF NOT EXISTS icon VARCHAR",
            "ALTER TABLE badges ADD COLUMN IF NOT EXISTS tier VARCHAR DEFAULT 'bronze'",
            "ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity VARCHAR DEFAULT 'common'",
            # user_badges earned_at
            "ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ",
        ]
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"SKIP: {stmt[:60]}... ({e})")
        conn.commit()
        print("Migration v2 complete.")

if __name__ == "__main__":
    run()
