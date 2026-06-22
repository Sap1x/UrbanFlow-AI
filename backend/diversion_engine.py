"""
UrbanFlow Command Center — AI Diversion Recommendation Engine (Phase 3)
Road network graph + optimal alternate route generation using NetworkX.
"""

import networkx as nx
import numpy as np


# ---------------------------------------------------------------------------
# Bengaluru Road Network Graph (simplified for demo)
# Nodes = Major junctions/intersections
# Edges = Road segments with distance (km) and typical congestion weight
# ---------------------------------------------------------------------------

_JUNCTIONS = {
    "silk_board": (12.9172, 77.6230),
    "marathahalli": (12.9591, 77.7009),
    "kr_puram": (13.0050, 77.6950),
    "hebbal": (13.0358, 77.5970),
    "yeshwanthpur": (13.0220, 77.5440),
    "rajajinagar": (12.9920, 77.5540),
    "majestic": (12.9771, 77.5727),
    "mg_road": (12.9757, 77.6065),
    "brigade_road": (12.9716, 77.6070),
    "koramangala": (12.9352, 77.6245),
    "hsr_layout": (12.9116, 77.6389),
    "btm_layout": (12.9166, 77.6101),
    "jayanagar": (12.9308, 77.5838),
    "jp_nagar": (12.9100, 77.5802),
    "banashankari": (12.9250, 77.5465),
    "basavanagudi": (12.9432, 77.5740),
    "malleshwaram": (13.0035, 77.5670),
    "indiranagar": (12.9784, 77.6408),
    "whitefield": (12.9698, 77.7500),
    "electronic_city": (12.8440, 77.6600),
    "yelahanka": (13.1007, 77.5963),
    "peenya": (13.0280, 77.5190),
    "sadashivanagar": (13.0060, 77.5800),
    "ulsoor": (12.9830, 77.6200),
    "shivajinagar": (12.9860, 77.5960),
    "cantonment": (12.9990, 77.5940),
    "rt_nagar": (13.0210, 77.5950),
    "hennur": (13.0450, 77.6350),
    "nagawara": (13.0440, 77.6160),
    "thanisandra": (13.0600, 77.6370),
}

_ROADS = [
    # (from, to, distance_km, road_name, lanes, base_congestion_weight)
    ("silk_board", "koramangala", 3.5, "Hosur Road", 4, 1.8),
    ("silk_board", "btm_layout", 3.0, "Hosur Road", 4, 1.6),
    ("silk_board", "hsr_layout", 4.0, "ORR South", 6, 1.5),
    ("silk_board", "electronic_city", 12.0, "Hosur Road", 4, 2.0),
    ("koramangala", "indiranagar", 4.0, "Inner Ring Road", 4, 1.7),
    ("koramangala", "mg_road", 4.5, "Residency Road", 3, 1.5),
    ("koramangala", "btm_layout", 2.5, "Hosur Road", 4, 1.4),
    ("indiranagar", "mg_road", 3.0, "Old Airport Road", 4, 1.6),
    ("indiranagar", "ulsoor", 2.5, "100 Feet Road", 3, 1.3),
    ("mg_road", "brigade_road", 0.5, "MG Road", 4, 1.2),
    ("mg_road", "shivajinagar", 2.0, "MG Road", 4, 1.5),
    ("mg_road", "majestic", 3.0, "KG Road", 3, 1.6),
    ("majestic", "rajajinagar", 3.5, "West of Chord Road", 4, 1.4),
    ("majestic", "basavanagudi", 3.0, "Mysore Road", 3, 1.5),
    ("majestic", "shivajinagar", 2.0, "Dr Ambedkar Road", 3, 1.3),
    ("rajajinagar", "yeshwanthpur", 3.0, "Tumkur Road", 4, 1.5),
    ("rajajinagar", "malleshwaram", 2.0, "Sampige Road", 3, 1.3),
    ("yeshwanthpur", "peenya", 4.0, "Tumkur Road", 4, 1.4),
    ("yeshwanthpur", "hebbal", 5.0, "Bellary Road", 4, 1.6),
    ("hebbal", "yelahanka", 8.0, "Bellary Road", 4, 1.3),
    ("hebbal", "rt_nagar", 3.0, "Bellary Road", 3, 1.4),
    ("hebbal", "nagawara", 3.5, "ORR North", 6, 1.5),
    ("nagawara", "hennur", 3.0, "Hennur Road", 3, 1.3),
    ("nagawara", "thanisandra", 4.0, "Thanisandra Road", 3, 1.2),
    ("hennur", "kr_puram", 6.0, "Old Madras Road", 4, 1.5),
    ("kr_puram", "marathahalli", 5.0, "ORR East", 6, 1.8),
    ("marathahalli", "indiranagar", 6.0, "Old Airport Road", 4, 1.7),
    ("marathahalli", "whitefield", 7.0, "Whitefield Road", 4, 1.6),
    ("marathahalli", "silk_board", 8.0, "ORR East", 6, 2.0),
    ("btm_layout", "jayanagar", 3.0, "BTM Road", 3, 1.3),
    ("jayanagar", "basavanagudi", 2.5, "South End Circle Road", 3, 1.2),
    ("jayanagar", "jp_nagar", 2.0, "Jayanagar Road", 3, 1.2),
    ("jp_nagar", "banashankari", 3.0, "Kanakapura Road", 3, 1.3),
    ("banashankari", "basavanagudi", 3.5, "BSK Road", 3, 1.3),
    ("hsr_layout", "btm_layout", 2.5, "ORR South", 6, 1.4),
    ("hsr_layout", "electronic_city", 8.0, "Hosur Road", 4, 1.8),
    ("malleshwaram", "sadashivanagar", 2.0, "Sadashiva Nagar Road", 3, 1.1),
    ("sadashivanagar", "cantonment", 2.5, "Palace Road", 3, 1.2),
    ("cantonment", "shivajinagar", 1.5, "Cubbon Road", 3, 1.3),
    ("shivajinagar", "ulsoor", 2.0, "Shivajinagar Road", 3, 1.3),
    ("rt_nagar", "sadashivanagar", 3.0, "Bellary Road", 3, 1.3),
    ("ulsoor", "mg_road", 1.5, "Ulsoor Road", 3, 1.4),
]

_graph = None


def _build_graph():
    """Build the road network graph."""
    global _graph
    _graph = nx.Graph()

    for name, coords in _JUNCTIONS.items():
        _graph.add_node(name, lat=coords[0], lng=coords[1], name=name)

    for frm, to, dist, road_name, lanes, cong in _ROADS:
        weight = dist * cong  # weighted distance
        _graph.add_edge(
            frm, to,
            distance_km=dist,
            road_name=road_name,
            lanes=lanes,
            congestion_weight=cong,
            weight=weight,
        )


def _find_nearest_junction(lat: float, lng: float) -> str:
    """Find the nearest junction node to given coordinates."""
    min_dist = float("inf")
    nearest = list(_JUNCTIONS.keys())[0]
    for name, (jlat, jlng) in _JUNCTIONS.items():
        dist = np.sqrt((lat - jlat) ** 2 + (lng - jlng) ** 2)
        if dist < min_dist:
            min_dist = dist
            nearest = name
    return nearest


def get_diversions(event_lat: float, event_lng: float, affected_radius_km: float = 2.0, score: float = 5.0) -> dict:
    """
    Generate primary, secondary, and emergency diversion routes.

    Blocks roads near the event and finds alternate paths using Dijkstra's algorithm.
    Returns GeoJSON-compatible route data.
    """
    if _graph is None:
        _build_graph()

    G = _graph.copy()
    event_node = _find_nearest_junction(event_lat, event_lng)

    # Identify affected nodes (within radius)
    affected_nodes = []
    for name, (jlat, jlng) in _JUNCTIONS.items():
        dist_km = _haversine(event_lat, event_lng, jlat, jlng)
        if dist_km <= affected_radius_km:
            affected_nodes.append(name)

    # Increase weights on affected edges (simulate congestion)
    congestion_multiplier = 1 + (score / 10) * 4  # 1x to 5x
    for u, v, data in G.edges(data=True):
        if u in affected_nodes or v in affected_nodes:
            data["weight"] *= congestion_multiplier

    # Find important origin-destination pairs through the affected area
    # Select peripheral nodes as O-D pairs
    peripheral_nodes = [n for n in _JUNCTIONS if n not in affected_nodes and n != event_node]
    np.random.seed(42)
    if len(peripheral_nodes) >= 4:
        selected = np.random.choice(peripheral_nodes, size=min(4, len(peripheral_nodes)), replace=False)
    else:
        selected = peripheral_nodes

    diversions = {"primary": [], "secondary": [], "emergency": []}

    for i, dest in enumerate(selected):
        # Find 2 paths: original (through event) and diversion (avoiding event)
        try:
            # Diversion route (on congested graph)
            path = nx.shortest_path(G, source=event_node, target=dest, weight="weight")
            coords = [
                {"lat": _JUNCTIONS[n][0], "lng": _JUNCTIONS[n][1], "name": n.replace("_", " ").title()}
                for n in path
            ]
            total_dist = sum(
                G[path[j]][path[j + 1]]["distance_km"]
                for j in range(len(path) - 1)
            )
            road_names = list(set(
                G[path[j]][path[j + 1]]["road_name"]
                for j in range(len(path) - 1)
            ))

            route = {
                "from": event_node.replace("_", " ").title(),
                "to": dest.replace("_", " ").title(),
                "coordinates": coords,
                "total_distance_km": round(total_dist, 1),
                "estimated_time_mins": round(total_dist * 3, 1),  # ~20 km/h avg
                "roads_used": road_names,
                "waypoints": [n.replace("_", " ").title() for n in path],
            }

            if i == 0:
                diversions["primary"].append(route)
            elif i == 1:
                diversions["secondary"].append(route)
            else:
                diversions["emergency"].append(route)
        except nx.NetworkXNoPath:
            continue

    # Also compute a fully-blocked route (emergency: remove event node entirely)
    G_blocked = G.copy()
    if event_node in G_blocked:
        G_blocked.remove_node(event_node)

    if len(peripheral_nodes) >= 2:
        try:
            origin = peripheral_nodes[0]
            dest = peripheral_nodes[-1]
            path = nx.shortest_path(G_blocked, source=origin, target=dest, weight="weight")
            coords = [
                {"lat": _JUNCTIONS[n][0], "lng": _JUNCTIONS[n][1], "name": n.replace("_", " ").title()}
                for n in path
            ]
            total_dist = sum(
                G_blocked[path[j]][path[j + 1]]["distance_km"]
                for j in range(len(path) - 1)
            )
            diversions["emergency"].append({
                "from": origin.replace("_", " ").title(),
                "to": dest.replace("_", " ").title(),
                "coordinates": coords,
                "total_distance_km": round(total_dist, 1),
                "estimated_time_mins": round(total_dist * 3.5, 1),
                "roads_used": list(set(
                    G_blocked[path[j]][path[j + 1]]["road_name"]
                    for j in range(len(path) - 1)
                )),
                "waypoints": [n.replace("_", " ").title() for n in path],
            })
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            pass

    return {
        "event_location": {"lat": event_lat, "lng": event_lng},
        "event_node": event_node.replace("_", " ").title(),
        "affected_nodes": [n.replace("_", " ").title() for n in affected_nodes],
        "affected_radius_km": affected_radius_km,
        "diversions": diversions,
        "total_routes_generated": (
            len(diversions["primary"])
            + len(diversions["secondary"])
            + len(diversions["emergency"])
        ),
        "road_network_nodes": len(_JUNCTIONS),
        "road_network_edges": len(_ROADS),
    }


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = np.radians(lat2 - lat1)
    dlng = np.radians(lng2 - lng1)
    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlng / 2) ** 2
    )
    return R * 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
