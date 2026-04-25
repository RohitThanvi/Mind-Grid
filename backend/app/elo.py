# app/elo.py — Chess.com style ELO calculation

K_FACTOR_NEW  = 40   # < 30 games
K_FACTOR_MID  = 20   # 30-100 games
K_FACTOR_EST  = 10   # > 100 games, ELO >= 2400
K_FACTOR_STD  = 20   # > 100 games, ELO < 2400

ELO_FLOOR = 100      # minimum ELO, no one goes below this


def get_k_factor(elo: int, games_played: int) -> int:
    if games_played < 30:
        return K_FACTOR_NEW
    elif games_played < 100:
        return K_FACTOR_MID
    elif elo >= 2400:
        return K_FACTOR_EST
    return K_FACTOR_STD


def expected_score(rating_a: int, rating_b: int) -> float:
    """Expected score for player A against player B."""
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))


def calculate_elo_change(
    winner_elo: int, loser_elo: int,
    winner_games: int, loser_games: int,
    result: str = "win"   # "win" | "draw" | "forfeit_win"
) -> tuple[int, int]:
    """
    Returns (winner_elo_change, loser_elo_change).
    Both are signed integers (positive for winner, negative for loser).
    """
    ea = expected_score(winner_elo, loser_elo)
    eb = expected_score(loser_elo, winner_elo)

    if result == "draw":
        sa, sb = 0.5, 0.5
    elif result == "forfeit_win":
        sa, sb = 1.0, 0.0  # same as win but you may want reduced K
    else:  # win
        sa, sb = 1.0, 0.0

    ka = get_k_factor(winner_elo, winner_games)
    kb = get_k_factor(loser_elo, loser_games)

    change_a = round(ka * (sa - ea))
    change_b = round(kb * (sb - eb))

    # Apply floor
    new_loser_elo = loser_elo + change_b
    if new_loser_elo < ELO_FLOOR:
        change_b = ELO_FLOOR - loser_elo

    return change_a, change_b


def elo_rank_label(elo: int) -> str:
    """Chess.com style rank labels."""
    if elo < 400:  return "Novice"
    if elo < 600:  return "Beginner"
    if elo < 800:  return "Intermediate"
    if elo < 1000: return "Advanced"
    if elo < 1200: return "Expert"
    if elo < 1400: return "Candidate Master"
    if elo < 1600: return "Master"
    if elo < 1800: return "International Master"
    if elo < 2000: return "Grandmaster"
    if elo < 2200: return "Super Grandmaster"
    return "World Champion"


def match_quality(elo_a: int, elo_b: int) -> float:
    """Returns 0-1 quality score; 1 = perfect match."""
    diff = abs(elo_a - elo_b)
    return max(0.0, 1.0 - diff / 400)
