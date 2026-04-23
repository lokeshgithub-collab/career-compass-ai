from __future__ import annotations

from typing import List, Dict, Any
from fastapi import FastAPI
from pydantic import BaseModel, Field
import numpy as np
from sklearn.cluster import KMeans
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = FastAPI(title="Career Compass ML Service")


CAREERS = [
    "Full Stack Developer",
    "Data Scientist",
    "Product Manager",
]

SKILL_VOCAB = [
    "python",
    "javascript",
    "react",
    "node",
    "sql",
    "machine learning",
    "data analysis",
    "ui/ux",
    "project management",
    "communication",
    "leadership",
    "problem solving",
    "git",
    "aws",
    "docker",
]

ROLE_SKILL_MAP = {
    "full stack developer": ["javascript", "react", "node.js", "sql", "git", "api design", "docker", "testing"],
    "data scientist": ["python", "sql", "machine learning", "statistics", "data analysis", "pandas", "feature engineering"],
    "product manager": ["communication", "leadership", "product strategy", "roadmapping", "analytics", "stakeholder management"],
}

ROLE_APTITUDE_WEIGHTS = {
    "full stack developer": {"technical": 0.45, "adaptability": 0.2, "analytical": 0.2, "collaboration": 0.15},
    "data scientist": {"analytical": 0.5, "technical": 0.2, "communication": 0.15, "adaptability": 0.15},
    "product manager": {"communication": 0.3, "leadership": 0.3, "business": 0.2, "collaboration": 0.2},
}


class Profile(BaseModel):
    name: str | None = None
    year: int | None = None
    cgpa: float | None = None
    skills: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    aptitude: Dict[str, float] = Field(default_factory=dict)
    weeklyStudyHours: int | None = None
    projectCount: int | None = None
    internshipCount: int | None = None
    certificationsCount: int | None = None
    expectedSalaryLpa: float | None = None
    recentStudyHoursAvg: float | None = None
    checkInConsistency: float | None = None
    recentApplications: int | None = None
    recentInterviews: int | None = None
    offersReceived: int | None = None
    successfulInterviews: int | None = None


class SkillSimulationRequest(BaseModel):
    targetRole: str
    weeks: int = 8
    profile: Profile


class JobInput(BaseModel):
    id: str
    title: str
    company: str
    description: str = ""
    requiredSkills: List[str] = Field(default_factory=list)


class RecommendJobsRequest(BaseModel):
    profile: Profile
    jobs: List[JobInput]
    top_k: int = 10


class ExtractSkillsRequest(BaseModel):
    text: str


class ClusterRequest(BaseModel):
    profiles: List[Profile]
    k: int = 3


def _skill_vector(skills: List[str], interests: List[str]) -> np.ndarray:
    bag = " ".join(skills + interests).lower()
    return np.array([1.0 if s in bag else 0.0 for s in SKILL_VOCAB], dtype=float)


def _aptitude_vector(aptitude: Dict[str, float]) -> np.ndarray:
    keys = [
        "analytical",
        "creative",
        "leadership",
        "technical",
        "communication",
        "collaboration",
        "adaptability",
        "business",
    ]
    return np.array([float(aptitude.get(k, 0.0)) for k in keys], dtype=float)


def _profile_vector(profile: Profile) -> np.ndarray:
    year = float(profile.year or 0)
    cgpa = float(profile.cgpa or 0)
    return np.concatenate([
        np.array([year, cgpa], dtype=float),
        _aptitude_vector(profile.aptitude),
        _skill_vector(profile.skills, profile.interests),
    ])


def _synthetic_training_data() -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(42)
    samples = []
    labels = []
    for i, career in enumerate(CAREERS):
        for _ in range(60):
            year = rng.integers(1, 5)
            cgpa = rng.uniform(6.0, 9.8)
            aptitude = {
                "analytical": rng.uniform(2.5, 5.0),
                "creative": rng.uniform(2.5, 5.0),
                "leadership": rng.uniform(2.5, 5.0),
                "technical": rng.uniform(2.5, 5.0),
                "communication": rng.uniform(2.5, 5.0),
                "collaboration": rng.uniform(2.5, 5.0),
                "adaptability": rng.uniform(2.5, 5.0),
                "business": rng.uniform(2.5, 5.0),
            }

            skills = []
            if career == "Full Stack Developer":
                skills = ["javascript", "react", "node", "sql", "git"]
                aptitude["technical"] = rng.uniform(4.0, 5.0)
                aptitude["adaptability"] = rng.uniform(3.8, 5.0)
            elif career == "Data Scientist":
                skills = ["python", "machine learning", "data analysis", "sql"]
                aptitude["analytical"] = rng.uniform(4.0, 5.0)
                aptitude["communication"] = rng.uniform(3.5, 5.0)
            else:
                skills = ["communication", "leadership", "project management", "ui/ux"]
                aptitude["leadership"] = rng.uniform(4.0, 5.0)
                aptitude["communication"] = rng.uniform(4.0, 5.0)
                aptitude["business"] = rng.uniform(3.8, 5.0)
                aptitude["collaboration"] = rng.uniform(3.8, 5.0)

            profile = Profile(
                year=int(year),
                cgpa=float(cgpa),
                skills=skills,
                interests=[career],
                aptitude=aptitude,
            )
            samples.append(_profile_vector(profile))
            labels.append(i)

    X = np.vstack(samples)
    y = np.array(labels)
    return X, y


def _train_classifier() -> Pipeline:
    X, y = _synthetic_training_data()
    clf = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=500)),
    ])
    clf.fit(X, y)
    return clf


CLASSIFIER = _train_classifier()


def _normalize_role(role: str) -> str:
    value = (role or "").strip().lower()
    if "data" in value:
        return "data scientist"
    if "product" in value:
        return "product manager"
    return "full stack developer"


def _to_skill_slug(skill: str) -> str:
    return " ".join(str(skill or "").strip().lower().replace("-", " ").replace("_", " ").split())


def _role_aptitude_score(role: str, aptitude: Dict[str, float]) -> float:
    weights = ROLE_APTITUDE_WEIGHTS[role]
    total_weight = sum(weights.values()) or 1.0
    weighted = sum(float(aptitude.get(key, 0.0)) * weight for key, weight in weights.items())
    return weighted / total_weight


def _simulate_feature_vector(profile: Profile, target_role: str, weeks: int) -> tuple[np.ndarray, Dict[str, Any]]:
    role_key = _normalize_role(target_role)
    required = ROLE_SKILL_MAP[role_key]
    current_skills = {_to_skill_slug(skill) for skill in profile.skills}
    required_slugs = [_to_skill_slug(skill) for skill in required]
    matched = [skill for skill, slug in zip(required, required_slugs) if slug in current_skills]
    missing = [skill for skill, slug in zip(required, required_slugs) if slug not in current_skills]
    coverage = len(matched) / max(len(required), 1)
    aptitude_score = _role_aptitude_score(role_key, profile.aptitude)
    aptitude_norm = aptitude_score / 5.0
    cgpa_norm = min(1.0, max(0.0, float(profile.cgpa or 0.0) / 10.0))
    year_norm = min(1.0, max(0.0, float(profile.year or 1) / 4.0))
    study_hours = float(profile.weeklyStudyHours or 10)
    recent_study_avg = float(profile.recentStudyHoursAvg or study_hours)
    hours_norm = min(1.0, max(0.0, study_hours / 25.0))
    recent_hours_norm = min(1.0, max(0.0, recent_study_avg / 25.0))
    weeks_norm = min(1.0, max(0.0, float(weeks) / 24.0))
    interest_match = 1.0 if any(role_key in str(interest).lower() for interest in profile.interests) else 0.0
    missing_ratio = len(missing) / max(len(required), 1)
    project_norm = min(1.0, max(0.0, float(profile.projectCount or 0) / 6.0))
    internship_norm = min(1.0, max(0.0, float(profile.internshipCount or 0) / 3.0))
    certification_norm = min(1.0, max(0.0, float(profile.certificationsCount or 0) / 5.0))
    application_norm = min(1.0, max(0.0, float(profile.recentApplications or 0) / 12.0))
    interview_norm = min(1.0, max(0.0, float(profile.recentInterviews or 0) / 6.0))
    offer_norm = min(1.0, max(0.0, float(profile.offersReceived or 0) / 2.0))
    success_norm = min(1.0, max(0.0, float(profile.successfulInterviews or 0) / 6.0))
    consistency_norm = min(1.0, max(0.0, float(profile.checkInConsistency or 0.0)))

    features = np.array([
        coverage,
        missing_ratio,
        aptitude_norm,
        cgpa_norm,
        year_norm,
        hours_norm,
        recent_hours_norm,
        weeks_norm,
        interest_match,
        project_norm,
        internship_norm,
        certification_norm,
        application_norm,
        interview_norm,
        offer_norm,
        success_norm,
        consistency_norm,
    ], dtype=float)

    return features, {
        "role_key": role_key,
        "required": required,
        "matched": matched,
        "missing": missing,
        "coverage": coverage,
        "aptitude_score": aptitude_score,
        "study_hours": int(study_hours),
    }


def _synthetic_simulation_data() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.default_rng(7)
    rows = []
    readiness_targets = []
    improvement_targets = []

    for role_key, required in ROLE_SKILL_MAP.items():
        for _ in range(220):
            coverage = rng.uniform(0.0, 1.0)
            missing_ratio = max(0.0, 1.0 - coverage + rng.normal(0, 0.05))
            aptitude_norm = rng.uniform(0.35, 0.95)
            cgpa_norm = rng.uniform(0.55, 0.98)
            year_norm = rng.uniform(0.25, 1.0)
            hours_norm = rng.uniform(0.2, 1.0)
            recent_hours_norm = np.clip(hours_norm + rng.normal(0, 0.08), 0.15, 1.0)
            weeks_norm = rng.uniform(0.08, 1.0)
            interest_match = rng.choice([0.0, 1.0], p=[0.35, 0.65])
            project_norm = rng.uniform(0.0, 1.0)
            internship_norm = rng.uniform(0.0, 1.0)
            certification_norm = rng.uniform(0.0, 1.0)
            application_norm = rng.uniform(0.0, 1.0)
            interview_norm = rng.uniform(0.0, 1.0)
            offer_norm = rng.uniform(0.0, 1.0)
            success_norm = rng.uniform(0.0, 1.0)
            consistency_norm = rng.uniform(0.0, 1.0)

            baseline = (
                coverage * 0.52
                + aptitude_norm * 0.18
                + cgpa_norm * 0.08
                + year_norm * 0.07
                + interest_match * 0.08
                + (1 - missing_ratio) * 0.03
                + project_norm * 0.02
                + internship_norm * 0.01
                + consistency_norm * 0.01
            ) * 100
            baseline += rng.normal(0, 3)
            baseline = float(np.clip(baseline, 18, 92))

            learning_efficiency = (
                hours_norm * 0.42
                + recent_hours_norm * 0.08
                + weeks_norm * 0.24
                + aptitude_norm * 0.16
                + interest_match * 0.1
                + missing_ratio * 0.05
                + project_norm * 0.06
                + internship_norm * 0.05
                + certification_norm * 0.03
                + application_norm * 0.04
                + interview_norm * 0.05
                + offer_norm * 0.05
                + success_norm * 0.04
                + consistency_norm * 0.03
            )
            improvement = learning_efficiency * (35 + missing_ratio * 20) + rng.normal(0, 2.5)
            improvement = float(np.clip(improvement, 4, 42))

            rows.append([
                coverage,
                missing_ratio,
                aptitude_norm,
                cgpa_norm,
                year_norm,
                hours_norm,
                recent_hours_norm,
                weeks_norm,
                interest_match,
                project_norm,
                internship_norm,
                certification_norm,
                application_norm,
                interview_norm,
                offer_norm,
                success_norm,
                consistency_norm,
            ])
            readiness_targets.append(baseline)
            improvement_targets.append(improvement)

    return np.array(rows), np.array(readiness_targets), np.array(improvement_targets)


def _train_simulation_models() -> tuple[RandomForestRegressor, RandomForestRegressor]:
    X, readiness_y, improvement_y = _synthetic_simulation_data()
    readiness_model = RandomForestRegressor(n_estimators=250, max_depth=10, random_state=42)
    improvement_model = RandomForestRegressor(n_estimators=250, max_depth=10, random_state=42)
    readiness_model.fit(X, readiness_y)
    improvement_model.fit(X, improvement_y)
    return readiness_model, improvement_model


READINESS_MODEL, IMPROVEMENT_MODEL = _train_simulation_models()


@app.post("/predict-career")
def predict_career(profile: Profile):
    vec = _profile_vector(profile).reshape(1, -1)
    probs = CLASSIFIER.predict_proba(vec)[0]
    ranked = sorted(
        [{"career": CAREERS[i], "score": float(p)} for i, p in enumerate(probs)],
        key=lambda x: x["score"],
        reverse=True,
    )
    return {"top": ranked[0], "ranked": ranked}


@app.post("/recommend-jobs")
def recommend_jobs(req: RecommendJobsRequest):
    profile_text = " ".join(req.profile.skills + req.profile.interests).lower()
    job_texts = []
    for j in req.jobs:
        combined = " ".join([j.title, j.company, j.description, " ".join(j.requiredSkills)])
        job_texts.append(combined.lower())

    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform([profile_text] + job_texts)
    sims = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()

    ranked = sorted(
        [{"id": req.jobs[i].id, "score": float(sims[i])} for i in range(len(req.jobs))],
        key=lambda x: x["score"],
        reverse=True,
    )
    top = ranked[: req.top_k]
    return {"ranked": top}


@app.post("/extract-skills")
def extract_skills(req: ExtractSkillsRequest):
    text = req.text.lower()
    matched = [s for s in SKILL_VOCAB if s in text]
    vectorizer = TfidfVectorizer(vocabulary=SKILL_VOCAB)
    tfidf = vectorizer.fit_transform([text]).toarray()[0]
    ranked = sorted(
        [{"skill": SKILL_VOCAB[i], "score": float(tfidf[i])} for i in range(len(SKILL_VOCAB))],
        key=lambda x: x["score"],
        reverse=True,
    )
    ranked = [r for r in ranked if r["score"] > 0]
    return {"matched": matched, "ranked": ranked}


@app.post("/cluster-students")
def cluster_students(req: ClusterRequest):
    if len(req.profiles) == 0:
        return {"clusters": []}
    k = max(2, min(req.k, len(req.profiles)))
    X = np.vstack([_profile_vector(p) for p in req.profiles])
    model = KMeans(n_clusters=k, n_init=10, random_state=42)
    labels = model.fit_predict(X)
    clusters: Dict[int, List[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(int(label), []).append(idx)
    return {"clusters": [{"cluster": c, "members": ids} for c, ids in clusters.items()]}


@app.post("/simulate-skills")
def simulate_skills(req: SkillSimulationRequest):
    weeks = max(2, min(24, int(req.weeks)))
    features, context = _simulate_feature_vector(req.profile, req.targetRole, weeks)
    baseline = float(READINESS_MODEL.predict(features.reshape(1, -1))[0])
    improvement = float(IMPROVEMENT_MODEL.predict(features.reshape(1, -1))[0])

    matched = context["matched"]
    missing = context["missing"]
    baseline = max(baseline, context["coverage"] * 100 * 0.85)
    projected = min(97.0, baseline + improvement * (0.55 + min(weeks / 24.0, 1.0) * 0.45))

    weekly_capacity = max(4, round(context["study_hours"] * 0.65))
    plan_items = []
    for idx, skill in enumerate(missing[:weeks]):
        plan_items.append({
            "week": idx + 1,
            "focus": skill,
            "hours": weekly_capacity,
            "deliverable": f"Ship one mini project or case study proving {skill}",
        })

    confidence = float(np.clip(
        0.45
        + context["coverage"] * 0.2
        + min(context["study_hours"], 20) / 100
        + (1 if len(req.profile.aptitude) > 0 else 0) * 0.08,
        0.45,
        0.88,
    ))

    return {
        "targetRole": req.targetRole,
        "normalizedRole": context["role_key"],
        "weeks": weeks,
        "baselineReadiness": int(round(np.clip(baseline, 0, 100))),
        "projectedReadiness": int(round(np.clip(projected, 0, 100))),
        "matchedSkills": matched,
        "missingSkills": missing,
        "weeklyPlan": plan_items,
        "confidence": round(confidence, 2),
        "explanation": {
            "skillCoverage": int(round(context["coverage"] * 100)),
            "roleAptitude": round(context["aptitude_score"], 2),
            "studyHoursPerWeek": context["study_hours"],
            "recentStudyHoursAvg": round(float(req.profile.recentStudyHoursAvg or context["study_hours"]), 1),
            "checkInConsistency": round(float(req.profile.checkInConsistency or 0.0), 2),
            "recentApplications": int(req.profile.recentApplications or 0),
            "recentInterviews": int(req.profile.recentInterviews or 0),
            "offersReceived": int(req.profile.offersReceived or 0),
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}
