from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, Date, Boolean
from sqlalchemy.orm import relationship
from backend.database.engine import Base


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    upload_date = Column(Date)

    clauses = relationship("Clause", back_populates="contract")
    obligations = relationship("Obligation", back_populates="contract")


class Clause(Base):
    __tablename__ = "clauses"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String, ForeignKey("contracts.id"))
    clause_type = Column(String)
    text = Column(Text)
    source_chunk = Column(Text)

    contract = relationship("Contract", back_populates="clauses")


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String, ForeignKey("contracts.id"))
    clause_id = Column(Integer, ForeignKey("clauses.id"))

    action_required = Column(Text)
    responsible_party = Column(String)

    raw_deadline = Column(String)
    normalized_due_date = Column(String)

    risk_score = Column(Float)
    validation_status = Column(String)
    grounding_confidence = Column(Float)

    contract = relationship("Contract", back_populates="obligations")


class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id"))

    category = Column(String)
    severity = Column(String)
    likelihood = Column(String)
    risk_score = Column(Float)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id"))

    title = Column(String)
    priority = Column(String)
    due_date = Column(String)
    notify = Column(Boolean)


class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id"))

    severity = Column(String)
    category = Column(String)
    message = Column(Text)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String)
    subject = Column(String)
    status = Column(String)


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(String)

    faithfulness = Column(Float)
    context_precision = Column(Float)
    context_recall = Column(Float)
    answer_relevancy = Column(Float)