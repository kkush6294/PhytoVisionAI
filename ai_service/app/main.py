import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router, init_inference

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model and class mapping exactly once during startup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    
    print(f"Initializing inference service. Project root detected as: {project_root}")
    init_inference(project_root)
    
    yield
    # Clean up on shutdown if needed
    print("Shutting down AI Inference Service.")

app = FastAPI(
    title="PhytoVisionAI Inference Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict_router, tags=["predict"])

@app.get("/")
def read_root():
    return {
        "service": "PhytoVisionAI AI Inference Service",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
