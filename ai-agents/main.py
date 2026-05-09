from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.agent_routes import router as agent_router

app = FastAPI(title="EcoNexus AI Agents", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router, prefix="/api/agents")

@app.get("/")
def root():
    return {"status": "EcoNexus AI Agent Service Running"}
