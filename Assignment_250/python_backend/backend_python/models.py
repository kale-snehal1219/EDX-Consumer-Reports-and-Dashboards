from sqlalchemy import Column, String, Text, JSON, Integer, ForeignKey
from sqlalchemy import Column, String, Text, JSON
from database import Base
from sqlalchemy import DateTime


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(100), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    dataset_id = Column(String(100), nullable=True)
    purpose_id = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True)
    summary = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

    
class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(String(100), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), nullable=True)
    summary = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

    
class ConsumerFavorite(Base):
    __tablename__ = "consumer_favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    consumer_id = Column(Integer, nullable=False)
    item_id = Column(String(100), nullable=False)
    item_type = Column(String(30), nullable=False)

class MetricCatalog(Base):
    __tablename__ = "metric_catalog"

    id = Column(String(100), primary_key=True, index=True)
    metric_name = Column(String(150), nullable=False)
    definition = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

class ReportingAggregate(Base):
    __tablename__ = "reporting_aggregates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    aggregate_type = Column(String(50), nullable=False)
    school_year = Column(String(20), nullable=True)
    organization = Column(String(150), nullable=True)
    data = Column(JSON, nullable=True)

class PublicationSnapshot(Base):
    __tablename__ = "publication_snapshots"

    id = Column(String(150), primary_key=True, index=True)
    report_id = Column(String(100), nullable=True)
    version = Column(String(30), nullable=True)
    status = Column(String(50), nullable=True)
    published_at = Column(DateTime, nullable=True)
    details = Column(JSON, nullable=True)

class Consumer(Base):
    __tablename__ = "consumers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    principal_id = Column(String(150), nullable=False, unique=True)
    name = Column(String(150), nullable=True)
    role = Column(String(50), default="consumer")