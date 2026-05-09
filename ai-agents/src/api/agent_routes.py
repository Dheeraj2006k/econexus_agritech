from fastapi import APIRouter
from pydantic import BaseModel
from src.agents.farmer_agent import farmer_agent
from src.agents.super_agent import super_agent
from src.agents.special_agent import special_agent
from src.db import supabase

router = APIRouter()

class FarmerAgentRequest(BaseModel):
    farmer_id: str
    listing_id: str

@router.post("/farmer/run")
async def run_farmer_agent(req: FarmerAgentRequest):
    # Fetch listing details
    listing = supabase.from_("listings")\
        .select("*")\
        .eq("id", req.listing_id)\
        .single()\
        .execute()

    if not listing.data:
        return {"error": "Listing not found"}

    l = listing.data

    # Run the agent
    result = farmer_agent.invoke({
        "farmer_id": req.farmer_id,
        "listing_id": req.listing_id,
        "crop_name": l["crop_name"],
        "quantity_kg": float(l["quantity_kg"]),
        "expected_price": float(l["expected_price_per_kg"]),
        "urgency_score": float(l["urgency_score"]),
        "matched_buyers": [],
        "best_buyer": None,
        "ai_analysis": "",
        "negotiation_id": None,
        "agent_log": []
    })

    return {
        "message": "Farmer Agent completed successfully",
        "farmer_id": req.farmer_id,
        "listing_id": req.listing_id,
        "crop": l["crop_name"],
        "best_buyer": result.get("best_buyer"),
        "negotiation_id": result.get("negotiation_id"),
        "ai_analysis": result.get("ai_analysis"),
        "agent_log": result.get("agent_log", [])
    }

class SuperAgentRequest(BaseModel):
    region: str = "Telangana"

@router.post("/super/run")
async def run_super_agent(req: SuperAgentRequest):
    result = super_agent.invoke({
        "region": req.region,
        "active_listings": [],
        "active_buyers": [],
        "fairness_alerts": [],
        "coordination_plan": "",
        "agent_log": []
    })

    return {
        "message": "Super Agent coordination complete",
        "region": req.region,
        "active_listings_count": len(result.get("active_listings", [])),
        "active_buyers_count": len(result.get("active_buyers", [])),
        "fairness_alerts": result.get("fairness_alerts", []),
        "coordination_plan": result.get("coordination_plan"),
        "agent_log": result.get("agent_log", [])
    }

class SpecialAgentRequest(BaseModel):
    buyer_id: str
    crop_needed: str
    quantity_needed: float
    budget_per_kg: float

@router.post("/special/run")
async def run_special_agent(req: SpecialAgentRequest):
    result = special_agent.invoke({
        "buyer_id": req.buyer_id,
        "crop_needed": req.crop_needed,
        "quantity_needed": req.quantity_needed,
        "budget_per_kg": req.budget_per_kg,
        "available_listings": [],
        "selected_farmers": [],
        "total_aggregated": 0.0,
        "fulfillment_possible": False,
        "aggregation_plan": "",
        "combined_price": None,
        "agent_log": []
    })

    return {
        "message": "Special Agent aggregation complete",
        "buyer_id": req.buyer_id,
        "crop_needed": req.crop_needed,
        "quantity_needed": req.quantity_needed,
        "total_aggregated": result.get("total_aggregated"),
        "fulfillment_possible": result.get("fulfillment_possible"),
        "combined_price": result.get("combined_price"),
        "farmers_selected": len(result.get("selected_farmers", [])),
        "aggregation_plan": result.get("aggregation_plan"),
        "agent_log": result.get("agent_log", [])
    }

@router.get("/status")
def agent_status():
    return {
        "status": "online",
        "agents": {
            "layer_1_farmer_agent": "active",
            "layer_2_super_agent": "active",
            "layer_3_special_agent": "active"
        }
    }
