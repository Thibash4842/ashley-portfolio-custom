from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.contact import router as contact_router
import os

app = FastAPI()

# Get allowed origins from environment or use defaults
origins = [
    "http://localhost:5500",  # VS Code Live Server
    "http://localhost:8000",  # Local backend
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8000",
    "https://thibash4842.github.io",  # Will update after GitHub Pages
    # "https://yourdomain.com",  # Your custom domain if you have one
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contact_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Server is running"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Email service is running"}