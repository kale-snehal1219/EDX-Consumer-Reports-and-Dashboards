
import json
from pathlib import Path
from datetime import datetime

from database import SessionLocal
from models import (
    Consumer,
    Report,
    Dashboard,
    PublicationSnapshot,
    ReportingAggregate,
    MetricCatalog,
)

# Locate the original project JSON file
PROJECT_ROOT = Path(__file__).resolve().parents[2]

JSON_FILE = (
    PROJECT_ROOT
    / "pages"
    / "consumer"
    / "reports-dashboards"
    / "reports-dashboards.json"
)


def as_list(value):
    """Convert a JSON list or dictionary into a list of records."""
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.values())
    return []


def parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        ).replace(tzinfo=None)
    except ValueError:
        return None


def synchronize():
    if not JSON_FILE.exists():
        raise FileNotFoundError(
            f"JSON file not found: {JSON_FILE}"
        )

    with open(JSON_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    db = SessionLocal()

    try:
        # 1. CONSUMERS
        principal_id = data.get("principal_id")

        if principal_id:
            consumer = (
                db.query(Consumer)
                .filter(
                    Consumer.principal_id == str(principal_id)
                )
                .first()
            )

            if not consumer:
                db.add(
                    Consumer(
                        principal_id=str(principal_id),
                        role="consumer"
                    )
                )

        # 2. REPORTS
        reports = as_list(data.get("reports"))

        for item in reports:
            db.merge(
                Report(
                    id=str(item["id"]),
                    title=item.get("title", "Untitled Report"),
                    dataset_id=item.get("dataset_id"),
                    purpose_id=item.get("purpose_id"),
                    status=item.get("status"),
                    summary=item.get("summary"),
                    details=item
                )
            )
        db.flush()
        print("Reports imported:", db.query(Report.id).all())
       
       
        # 3. DASHBOARDS
        dashboards = as_list(data.get("dashboards"))

        for item in dashboards:
            db.merge(
                Dashboard(
                    id=str(item["id"]),
                    title=item.get("title", "Untitled Dashboard"),
                    status=item.get("status"),
                    summary=item.get("summary"),
                    details=item
                )
            )

        report_ids = {
            report.id for report in db.query(Report.id).all()
        }

        for snapshot in as_list(data.get("publication_snapshots")):
            report_id = snapshot.get("report_id")

            if report_id and report_id not in report_ids:
                print("Missing report ID:", report_id)

                
        # 4. PUBLICATION SNAPSHOTS
        snapshots = as_list(data.get("publication_snapshots"))

        for item in snapshots:
            snapshot_id = item.get("id") or item.get("snapshot_id")

            if not snapshot_id:
                raise ValueError(
                    "A publication snapshot is missing its ID."
                )

            db.merge(
                PublicationSnapshot(
                    id=str(snapshot_id),
                    report_id=item.get("report_id"),
                    version=str(item.get("version"))
                    if item.get("version") is not None else None,
                    status=item.get("status"),
                    published_at=parse_datetime(
                        item.get("published_at")
                    ),
                    details=item
                )
            )

        # 5. REPORTING AGGREGATES
        aggregates = data.get("aggregates", {})

        if not isinstance(aggregates, dict):
            raise ValueError(
                "The JSON aggregates field must be an object."
            )

        # Replace aggregate rows so rerunning does not duplicate them.
        db.query(ReportingAggregate).delete(
            synchronize_session=False
        )

        for aggregate_type in (
            "enrollment",
            "attendance",
            "outcomes"
        ):
            records = as_list(
                aggregates.get(aggregate_type)
            )

            for item in records:
                db.add(
                    ReportingAggregate(
                        aggregate_type=aggregate_type,
                        school_year=item.get("school_year"),
                        organization=item.get("organization"),
                        data=item
                    )
                )

        # 6. METRIC CATALOG
       
        metrics = as_list(data.get("metric_catalog"))

        for index, item in enumerate(metrics, start=1):

            metric_id = (
                item.get("id")
                or item.get("metric_id")
                or f"METRIC-{index:03d}"
            )

            metric_name = (
                item.get("metric_name")
                or item.get("name")
                or item.get("title")
            )

            if not metric_name:
                raise ValueError(
                    f"Metric name is missing: {item}"
                )

            db.merge(
                MetricCatalog(
                    id=str(metric_id),
                    metric_name=str(metric_name),
                    definition=item.get("definition"),
                    details=item
                )
            )


        # 7. FAVORITES
        # Favorites are user-specific records, not static JSON data.
        # Preserve existing favorite records; do not delete or overwrite them.

        db.commit()

        print("JSON synchronization completed successfully!")
        print("Reports:", len(reports))
        print("Dashboards:", len(dashboards))
        print("Publication snapshots:", len(snapshots))
        print("Enrollment records:",
              len(as_list(aggregates.get("enrollment"))))
        print("Attendance records:",
              len(as_list(aggregates.get("attendance"))))
        print("Outcomes records:",
              len(as_list(aggregates.get("outcomes"))))
        print("Metric definitions:", len(metrics))

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    synchronize()
