import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from typing import TypedDict
from src.db import supabase

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

class SuperAgentState(TypedDict):
    region: str
    active_listings: list
    active_buyers: list
    fairness_alerts: list
    coordination_plan: str
    agent_log: list

# Node 1 - Scan region
def scan_region(state: SuperAgentState):
    log = state.get("agent_log", [])
    log.append(f"Super Agent scanning region: {state['region']}")

    listings = supabase.from_("listings")\
        .select("*")\
        .eq("status", "active")\
        .execute()

    buyers = supabase.from_("buyers")\
        .select("id, name, business_name, business_type, city, state, passport_score")\
        .eq("status", "active")\
        .execute()

    log.append(f"Found {len(listings.data or [])} active listings")
    log.append(f"Found {len(buyers.data or [])} active buyers")

    return {
        **state,
        "active_listings": listings.data or [],
        "active_buyers": buyers.data or [],
        "agent_log": log
    }

# Node 2 - Monitor fairness
def monitor_fairness(state: SuperAgentState):
    log = state.get("agent_log", [])
    log.append("Running fairness monitoring across all negotiations...")

    alerts = []
    negotiations = supabase.from_("negotiations")\
        .select("*")\
        .in_("status", ["pending", "negotiating"])\
        .execute()

    for neg in (negotiations.data or []):
        farmer_price = float(neg.get("initial_farmer_price") or 0)
        buyer_offer = float(neg.get("initial_buyer_offer") or 0)
        if buyer_offer > 0 and farmer_price > 0:
            gap = ((farmer_price - buyer_offer) / farmer_price) * 100
            if gap > 25:
                alerts.append({
                    "negotiation_id": neg["id"],
                    "gap_percent": round(gap, 1),
                    "alert": f"Large price gap detected: {round(gap, 1)}% below farmer price"
                })
                log.append(f"Fairness alert: Negotiation {neg['id'][:8]}... has {round(gap, 1)}% price gap")

    if not alerts:
        log.append("All negotiations within fair price range")

    return {**state, "fairness_alerts": alerts, "agent_log": log}

# Node 3 - Generate coordination plan
def generate_coordination_plan(state: SuperAgentState):
    log = state.get("agent_log", [])
    log.append("Generating regional coordination plan...")

    listings_summary = "\n".join([
        f"- {l['crop_name']}: {l['quantity_kg']}kg @ Rs {l['expected_price_per_kg']}/kg (urgency: {l['urgency_score']})"
        for l in state["active_listings"][:5]
    ]) or "No active listings"

    buyers_summary = "\n".join([
        f"- {b['business_name']} ({b['business_type']}) in {b['city']}"
        for b in state["active_buyers"][:5]
    ]) or "No active buyers"

    prompt = f"""
You are the EcoNexus Super Agent coordinating agricultural supply chains in {state['region']}.

ACTIVE LISTINGS:
{listings_summary}

ACTIVE BUYERS:
{buyers_summary}

FAIRNESS ALERTS: {len(state['fairness_alerts'])} detected

In 3-4 sentences, provide a regional coordination strategy:
- Which listings need urgent attention?
- How should buyer-farmer matching be prioritized?
- Any exploitation risks to address?
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    plan = response.content
    log.append("Coordination plan ready")

    return {**state, "coordination_plan": plan, "agent_log": log}

def build_super_agent():
    graph = StateGraph(SuperAgentState)
    graph.add_node("scan_region", scan_region)
    graph.add_node("monitor_fairness", monitor_fairness)
    graph.add_node("generate_coordination_plan", generate_coordination_plan)
    graph.set_entry_point("scan_region")
    graph.add_edge("scan_region", "monitor_fairness")
    graph.add_edge("monitor_fairness", "generate_coordination_plan")
    graph.add_edge("generate_coordination_plan", END)
    return graph.compile()

super_agent = build_super_agent()
