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

class SpecialAgentState(TypedDict):
    buyer_id: str
    crop_needed: str
    quantity_needed: float
    budget_per_kg: float
    available_listings: list
    selected_farmers: list
    total_aggregated: float
    fulfillment_possible: bool
    aggregation_plan: str
    combined_price: Optional[float]
    agent_log: list

# Node 1 - Understand buyer requirement
def understand_requirement(state: SpecialAgentState):
    log = state.get("agent_log", [])
    log.append(f"Special Agent activated for bulk order")
    log.append(f"Crop needed: {state['crop_needed']}")
    log.append(f"Quantity needed: {state['quantity_needed']}kg")
    log.append(f"Buyer budget: Rs {state['budget_per_kg']}/kg")
    return {**state, "agent_log": log}

# Node 2 - Find all available listings for this crop
def find_available_listings(state: SpecialAgentState):
    log = state.get("agent_log", [])
    log.append("Scanning all active farmer listings...")

    crop_lower = state["crop_needed"].lower()

    result = supabase.from_("listings")\
        .select("*")\
        .eq("status", "active")\
        .execute()

    listings = result.data or []

    search_words = crop_lower.split()
    matched = [
        l for l in listings
        if any(word in l["crop_name"].lower() for word in search_words)
        or any(word in l["crop_category"].lower() for word in search_words)
    ]

    log.append(f"Found {len(matched)} listing(s) matching {state['crop_needed']}")
    for l in matched:
        log.append(f"  Farmer listing: {l['quantity_kg']}kg @ Rs {l['expected_price_per_kg']}/kg from {l['location_district']}")

    return {**state, "available_listings": matched, "agent_log": log}

# Node 3 - Aggregate farmers to meet demand
def aggregate_farmers(state: SpecialAgentState):
    log = state.get("agent_log", [])
    log.append("Aggregating farmers to fulfill bulk order...")

    listings = state["available_listings"]
    quantity_needed = state["quantity_needed"]

    selected = []
    total = 0.0

    for listing in sorted(listings, key=lambda x: x["urgency_score"], reverse=True):
        if total >= quantity_needed:
            break
        selected.append(listing)
        total += float(listing["quantity_kg"])
        log.append(f"  Added farmer listing: {listing['quantity_kg']}kg (running total: {total}kg)")

    fulfillment = total >= quantity_needed

    if fulfillment:
        log.append(f"Fulfillment POSSIBLE: {total}kg aggregated from {len(selected)} farmer(s)")
    else:
        log.append(f"Partial fulfillment: {total}kg of {quantity_needed}kg needed")

    # Calculate weighted average price
    if selected:
        total_value = sum(float(l["quantity_kg"]) * float(l["expected_price_per_kg"]) for l in selected)
        combined_price = round(total_value / total, 2)
        log.append(f"Combined weighted price: Rs {combined_price}/kg")
    else:
        combined_price = None

    return {
        **state,
        "selected_farmers": selected,
        "total_aggregated": total,
        "fulfillment_possible": fulfillment,
        "combined_price": combined_price,
        "agent_log": log
    }

# Node 4 - Generate aggregation plan with AI
def generate_aggregation_plan(state: SpecialAgentState):
    log = state.get("agent_log", [])
    log.append("Generating AI aggregation and logistics plan...")

    farmers_summary = "\n".join([
        f"- Listing {i+1}: {l['quantity_kg']}kg @ Rs {l['expected_price_per_kg']}/kg from {l['location_village']}, {l['location_district']}"
        for i, l in enumerate(state["selected_farmers"])
    ]) or "No farmers found"

    prompt = f"""
You are the EcoNexus Special Agent handling bulk agricultural aggregation.

BULK ORDER DETAILS:
- Crop: {state['crop_needed']}
- Quantity Needed: {state['quantity_needed']}kg
- Buyer Budget: Rs {state['budget_per_kg']}/kg

FARMERS BEING AGGREGATED:
{farmers_summary}

AGGREGATION RESULT:
- Total Available: {state['total_aggregated']}kg
- Fulfillment Possible: {state['fulfillment_possible']}
- Combined Weighted Price: Rs {state['combined_price']}/kg

In 3-4 sentences provide:
1. Logistics coordination plan for pickup
2. Fair price recommendation for pooled negotiation
3. Risk assessment for this aggregation
"""
    response = llm.invoke([HumanMessage(content=prompt)])
    plan = response.content
    log.append("Aggregation plan generated successfully")

    return {**state, "aggregation_plan": plan, "agent_log": log}

def build_special_agent():
    graph = StateGraph(SpecialAgentState)
    graph.add_node("understand_requirement", understand_requirement)
    graph.add_node("find_available_listings", find_available_listings)
    graph.add_node("aggregate_farmers", aggregate_farmers)
    graph.add_node("generate_aggregation_plan", generate_aggregation_plan)
    graph.set_entry_point("understand_requirement")
    graph.add_edge("understand_requirement", "find_available_listings")
    graph.add_edge("find_available_listings", "aggregate_farmers")
    graph.add_edge("aggregate_farmers", "generate_aggregation_plan")
    graph.add_edge("generate_aggregation_plan", END)
    return graph.compile()

special_agent = build_special_agent()
