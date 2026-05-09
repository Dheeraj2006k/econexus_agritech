import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from typing import TypedDict, Optional
from src.db import supabase

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# Agent state definition
class FarmerAgentState(TypedDict):
    farmer_id: str
    listing_id: str
    crop_name: str
    quantity_kg: float
    expected_price: float
    urgency_score: float
    matched_buyers: list
    best_buyer: Optional[dict]
    ai_analysis: str
    negotiation_id: Optional[str]
    agent_log: list

# Node 1 - Understand the listing
def understand_listing(state: FarmerAgentState):
    log = state.get("agent_log", [])
    log.append(f"Agent activated for listing: {state['crop_name']} ({state['quantity_kg']}kg)")
    log.append(f"Farmer expects: Rs {state['expected_price']}/kg")
    log.append(f"Urgency score: {state['urgency_score']}/100")
    return {**state, "agent_log": log}

# Node 2 - Search for matching buyers
def search_buyers(state: FarmerAgentState):
    log = state.get("agent_log", [])
    log.append("Searching buyer database for matching profiles...")

    crop_lower = state["crop_name"].lower()
    search_terms = crop_lower.split()

    result = supabase.from_("buyers")\
        .select("id, name, business_name, business_type, city, state, preferred_crops, passport_score, passport_tier")\
        .eq("status", "active")\
        .execute()

    buyers = result.data or []

    matched = []
    for buyer in buyers:
        crops = [c.lower() for c in (buyer.get("preferred_crops") or [])]
        if any(term in crop for crop in crops for term in search_terms) or \
           any(crop in crop_lower for crop in crops):
            score = (buyer.get("passport_score", 50) / 100) * 50
            if buyer.get("passport_tier") == "Platinum": score += 20
            elif buyer.get("passport_tier") == "Gold": score += 15
            else: score += 10
            if state["urgency_score"] >= 80 and buyer.get("business_type") == "wholesaler":
                score += 20
            buyer["match_score"] = round(score)
            matched.append(buyer)

    matched.sort(key=lambda x: x["match_score"], reverse=True)
    log.append(f"Found {len(matched)} matching buyer(s)")

    if matched:
        log.append(f"Best match: {matched[0]['business_name']} (score: {matched[0]['match_score']})")

    return {**state, "matched_buyers": matched, "agent_log": log}

# Node 3 - Evaluate best opportunity
def evaluate_opportunity(state: FarmerAgentState):
    log = state.get("agent_log", [])

    if not state["matched_buyers"]:
        log.append("No buyers found. Will retry later.")
        return {**state, "best_buyer": None, "agent_log": log}

    best = state["matched_buyers"][0]
    log.append(f"Evaluating opportunity with {best['business_name']}...")
    log.append(f"   Location: {best['city']}, {best['state']}")
    log.append(f"   Trust Score: {best['passport_score']}/100 ({best['passport_tier']})")

    return {**state, "best_buyer": best, "agent_log": log}

# Node 4 - AI Analysis
def ai_analysis(state: FarmerAgentState):
    log = state.get("agent_log", [])
    log.append("Running AI market analysis...")

    if not state["best_buyer"]:
        return {**state, "ai_analysis": "No buyers available", "agent_log": log}

    buyer = state["best_buyer"]
    prompt = f"""
You are a Local Farmer AI Agent in the EcoNexus system.
Analyze this agricultural transaction opportunity briefly.

Crop: {state['crop_name']}
Quantity: {state['quantity_kg']}kg
Farmer Expected Price: Rs {state['expected_price']}/kg
Urgency: {state['urgency_score']}/100
Best Buyer: {buyer['business_name']} ({buyer['business_type']})
Buyer Location: {buyer['city']}, {buyer['state']}
Buyer Trust Score: {buyer['passport_score']}/100

In 2-3 sentences, assess if this is a good opportunity for the farmer
and what negotiation strategy the agent should use.
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    analysis = response.content
    log.append(f"AI Analysis: {analysis}")

    return {**state, "ai_analysis": analysis, "agent_log": log}

# Node 5 - Initiate negotiation
def initiate_negotiation(state: FarmerAgentState):
    log = state.get("agent_log", [])

    if not state["best_buyer"]:
        log.append("Negotiation paused - no buyer available")
        return {**state, "agent_log": log}

    log.append("Creating negotiation record...")

    result = supabase.from_("negotiations").insert({
        "listing_id": state["listing_id"],
        "farmer_id": state["farmer_id"],
        "buyer_id": state["best_buyer"]["id"],
        "initial_farmer_price": state["expected_price"],
        "status": "pending"
    }).execute()

    neg_id = result.data[0]["id"] if result.data else None
    log.append(f"Negotiation initiated! ID: {neg_id}")
    log.append("Awaiting human approval before proceeding...")

    return {**state, "negotiation_id": neg_id, "agent_log": log}

# Build the agent graph
def build_farmer_agent():
    graph = StateGraph(FarmerAgentState)

    graph.add_node("understand_listing", understand_listing)
    graph.add_node("search_buyers", search_buyers)
    graph.add_node("evaluate_opportunity", evaluate_opportunity)
    graph.add_node("ai_analysis", ai_analysis)
    graph.add_node("initiate_negotiation", initiate_negotiation)

    graph.set_entry_point("understand_listing")
    graph.add_edge("understand_listing", "search_buyers")
    graph.add_edge("search_buyers", "evaluate_opportunity")
    graph.add_edge("evaluate_opportunity", "ai_analysis")
    graph.add_edge("ai_analysis", "initiate_negotiation")
    graph.add_edge("initiate_negotiation", END)

    return graph.compile()

farmer_agent = build_farmer_agent()
