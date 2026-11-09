
from fastapi.middleware.cors import CORSMiddleware
from models import Consumer
from models import PublicationSnapshot
from models import ReportingAggregate
from models import MetricCatalog
from fastapi import FastAPI
from sqlalchemy import text
from database import engine, SessionLocal
from models import Report, Dashboard, ConsumerFavorite
app = FastAPI(
    title="EDX Consumer API",
    description="Backend for Reports and Dashboards",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporary for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "EDX Consumer Backend is running!"
    }


@app.get("/api/db-test")
def test_database():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "success",
            "message": "MySQL connected successfully!"
        }

    except Exception as error:
        return {
            "status": "error",
            "message": str(error)
        }

@app.get("/api/reports")
def get_reports():
    db = SessionLocal()

    try:
        reports = db.query(Report).all()

        return [
            {
                "id": report.id,
                "title": report.title,
                "dataset_id": report.dataset_id,
                "purpose_id": report.purpose_id,
                "status": report.status,
                "summary": report.summary,
                "details": report.details
            }
            for report in reports
        ]

    except Exception as error:
        return {"error": str(error)}

    finally:
        db.close()

@app.get("/api/dashboards")
def get_dashboards():
    db = SessionLocal()

    try:
        dashboards = db.query(Dashboard).all()

        return [
            {
                "id": dashboard.id,
                "title": dashboard.title,
                "status": dashboard.status,
                "summary": dashboard.summary,
                "details": dashboard.details
            }
            for dashboard in dashboards
        ]

    except Exception as error:
        return {"error": str(error)}

    finally:
        db.close()

        
from fastapi import HTTPException

@app.get("/api/favorites/{consumer_id}")
def get_favorites(consumer_id: int):
    db = SessionLocal()
    try:
        favorites = db.query(ConsumerFavorite).filter(
            ConsumerFavorite.consumer_id == consumer_id
        ).all()

        return [
            {
                "id": f.id,
                "consumer_id": f.consumer_id,
                "item_id": f.item_id,
                "item_type": f.item_type
            }
            for f in favorites
        ]
    finally:
        db.close()


@app.post("/api/favorites")
def add_favorite(consumer_id: int, item_id: str, item_type: str):
    db = SessionLocal()

    try:
        favorite = ConsumerFavorite(
            consumer_id=consumer_id,
            item_id=item_id,
            item_type=item_type
        )

        db.add(favorite)
        db.commit()
        db.refresh(favorite)

        return {
            "message": "Favorite added successfully",
            "id": favorite.id
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:
        db.close()

@app.delete("/api/favorites/{favorite_id}")
def delete_favorite(favorite_id: int):
    db = SessionLocal()

    try:
        favorite = db.query(ConsumerFavorite).filter(
            ConsumerFavorite.id == favorite_id
        ).first()

        if not favorite:
            raise HTTPException(
                status_code=404,
                detail="Favorite not found"
            )

        db.delete(favorite)
        db.commit()

        return {
            "message": "Favorite deleted successfully"
        }

    finally:
        db.close()       

@app.get("/api/metrics")
def get_metrics():
    db = SessionLocal()

    try:
        metrics = db.query(MetricCatalog).all()

        return [
            {
                "id": metric.id,
                "metric_name": metric.metric_name,
                "definition": metric.definition,
                "details": metric.details
            }
            for metric in metrics
        ]

    finally:
        db.close()

@app.get("/api/aggregates")
def get_aggregates():
    db = SessionLocal()

    try:
        aggregates = db.query(ReportingAggregate).all()

        return [
            {
                "id": aggregate.id,
                "aggregate_type": aggregate.aggregate_type,
                "school_year": aggregate.school_year,
                "organization": aggregate.organization,
                "data": aggregate.data
            }
            for aggregate in aggregates
        ]

    finally:
        db.close()

@app.get("/api/publications")
def get_publications():
    db = SessionLocal()

    try:
        publications = db.query(PublicationSnapshot).all()

        return [
            {
                "id": publication.id,
                "report_id": publication.report_id,
                "version": publication.version,
                "status": publication.status,
                "published_at": publication.published_at,
                "details": publication.details
            }
            for publication in publications
        ]

    finally:
        db.close()

@app.get("/api/consumers")
def get_consumers():
    db = SessionLocal()

    try:
        consumers = db.query(Consumer).all()

        return [
            {
                "id": consumer.id,
                "principal_id": consumer.principal_id,
                "name": consumer.name,
                "role": consumer.role
            }
            for consumer in consumers
        ]

    finally:
        db.close()