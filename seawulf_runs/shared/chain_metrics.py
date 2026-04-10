"""
chain_metrics.py
================
Per-step metric helpers shared by both AL and OR ReCom runners.

All functions operate on a GerryChain ``Partition`` object and are
designed to be called inside the Markov-chain loop.

Functions
---------
district_minority_pct   : Minority VAP share for one district.
opp_count               : Number of opportunity districts in a plan.
effective_count         : Number of effective (opportunity + party win) districts.
seat_count              : Democratic and Republican seat counts.
plan_metrics            : Aggregate metrics dict for one plan step.
"""


def district_minority_pct(part, dist, group_key):
    """
    Return the minority VAP share for district *dist* in *part*.

    Parameters
    ----------
    part      : gerrychain.Partition  Current chain partition.
    dist      : int | str             District label.
    group_key : str                   Tally updater key for the minority group.

    Returns
    -------
    float
        Minority share in [0, 1]; 0.0 when total population is 0.
    """
    pop = part["population"][dist]
    if pop <= 0:
        return 0.0
    m = part["min_{}".format(group_key)][dist]
    return float(m) / float(pop)


def opp_count(part, thr, group_key):
    """
    Count districts whose minority share is at or above *thr*.

    Parameters
    ----------
    part      : gerrychain.Partition
    thr       : float                 Opportunity threshold (e.g. 0.40).
    group_key : str

    Returns
    -------
    int
    """
    return sum(
        1 for dist in part.parts
        if district_minority_pct(part, dist, group_key) >= thr
    )


def effective_count(part, thr, group_key, party):
    """
    Count districts that are both opportunity districts *and* won by *party*.

    Returns 0 if the partition lacks ``dem`` / ``rep`` updaters.

    Parameters
    ----------
    part      : gerrychain.Partition
    thr       : float
    group_key : str
    party     : str  "D" or "R"

    Returns
    -------
    int
    """
    if ("dem" not in part.updaters) or ("rep" not in part.updaters):
        return 0

    c = 0
    for dist in part.parts:
        if district_minority_pct(part, dist, group_key) < thr:
            continue
        dem = part["dem"][dist]
        rep = part["rep"][dist]
        winner = "D" if dem > rep else "R"
        if winner == party:
            c += 1
    return c


def seat_count(part):
    """
    Return ``(dem_seats, rep_seats)`` for the current plan.

    Returns ``(None, None)`` when the partition lacks election updaters.

    Parameters
    ----------
    part : gerrychain.Partition

    Returns
    -------
    tuple[int | None, int | None]
    """
    if ("dem" not in part.updaters) or ("rep" not in part.updaters):
        return None, None
    dem_seats = 0
    for dist in part.parts:
        if part["dem"][dist] > part["rep"][dist]:
            dem_seats += 1
    rep_seats = len(part.parts) - dem_seats
    return dem_seats, rep_seats


def plan_metrics(part, group_key=None, thr=None, party=None):
    """
    Build a summary metrics dict for the current plan step.

    Parameters
    ----------
    part      : gerrychain.Partition
    group_key : str | None   Include VRA opportunity counts when provided.
    thr       : float | None
    party     : str | None   Include effective-district counts when provided.

    Returns
    -------
    dict
        Keys: ``dem_seats``, ``rep_seats``, ``cut_edges``,
        and optionally ``opp_districts``, ``eff_districts``.
    """
    dem_seats, rep_seats = seat_count(part)
    cut = len(part["cut_edges"]) if "cut_edges" in part.updaters else None

    metrics = {
        "dem_seats": dem_seats,
        "rep_seats": rep_seats,
        "cut_edges": cut,
    }

    if group_key is not None and thr is not None:
        metrics["opp_districts"] = opp_count(part, thr, group_key)
        if party is not None:
            metrics["eff_districts"] = effective_count(part, thr, group_key, party)

    return metrics
