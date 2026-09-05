from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import get_db, engine, Base
import app.models  # Ensures all models are registered
from app.middleware.error_handler import setup_exception_handlers
from app.routes import auth_routes, product_routes, order_routes, auction_routes, ai_routes
from app.repositories import product_repo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize all database tables
    Base.metadata.create_all(bind=engine)
    
    # Ensure uploads directory exists
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
    os.makedirs(upload_dir, exist_ok=True)

    # Seed default categories if none exist
    db = next(get_db())
    try:
        if len(product_repo.list_categories(db)) == 0:
            default_categories = [
                ("Electronics", "electronics"),
                ("Laptops & PC", "laptops-computers"),
                ("Phones & Tablets", "mobiles-tablets"),
                ("Audio & Wearables", "audio-gear"),
                ("Gaming Consoles", "gaming-consoles"),
                ("Cameras & Optics", "cameras-optics"),
                ("Home Appliances", "appliances")
            ]
            for name, slug in default_categories:
                product_repo.create_category(db, name, slug)
    finally:
        db.close()
        
    yield


app = FastAPI(
    title="Auction Hub API",
    description="AI-integrated second-hand marketplace and auction platform backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup standardized exception handling
setup_exception_handlers(app)

# Register API Routers
app.include_router(auth_routes.router)
app.include_router(product_routes.router)
app.include_router(order_routes.router)
app.include_router(auction_routes.router)
app.include_router(ai_routes.router)


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
        
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


# Frontend static assets & HTML delivery
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend"))
upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
os.makedirs(upload_dir, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

if os.path.exists(frontend_dir):
    css_dir = os.path.join(frontend_dir, "css")
    js_dir = os.path.join(frontend_dir, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

    @app.get("/", tags=["Frontend"])
    def serve_homepage():
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Auction Hub API Live"}

    @app.get("/{page_name}.html", tags=["Frontend"])
    def serve_html_page(page_name: str):
        page_path = os.path.join(frontend_dir, f"{page_name}.html")
        if os.path.exists(page_path):
            return FileResponse(page_path)
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/seller/{page_name}.html", tags=["Frontend"])
    def serve_seller_html_page(page_name: str):
        page_path = os.path.join(frontend_dir, "seller", f"{page_name}.html")
        if os.path.exists(page_path):
            return FileResponse(page_path)
        return FileResponse(os.path.join(frontend_dir, "index.html"))

