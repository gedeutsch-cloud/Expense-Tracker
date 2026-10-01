import base64
import os
import secrets
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import drafts
from app.companies import BOARDS, COMPANIES, LANES
from app.db import connect, get_kv, init_db, set_kv
from app.network import matches_company, parse_linkedin_connections
from app.profile import AI_PLAN, load_profile, save_profile
from app.sources import refresh_state, rescore_all, start_refresh

BASE = Path(__file__).resolve().parent
STATUSES = ["saved", "applied", "referred", "interviewing", "offer", "rejected", "withdrawn"]
WEEKLY_GOALS = {"application": (5, 8), "outreach": (3, 3), "info_call": (1, 1)}

app = FastAPI(title="PM Job Finder")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=BASE / "templates")
templates.env.globals.update(linkedin_jobs_url=drafts.linkedin_jobs_url, linkedin_people_url=drafts.linkedin_people_url)


@app.middleware("http")
async def basic_auth(request: Request, call_next):
    password = os.environ.get("APP_PASSWORD")
    if password:
        header = request.headers.get("authorization", "")
        supplied = ""
        if header.startswith("Basic "):
            supplied = base64.b64decode(header[6:]).decode(errors="ignore").partition(":")[2]
        if not secrets.compare_digest(supplied, password):
            return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="PM Job Finder"'})
    return await call_next(request)


@app.on_event("startup")
def startup() -> None:
    init_db()


def render(request: Request, name: str, **context):
    return templates.TemplateResponse(request, name, {"active": name.split(".")[0], **context})


def week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


def log_activity(conn, kind: str, company: str, person: str = "", notes: str = "") -> None:
    conn.execute(
        "INSERT INTO activities (kind, date, company, person, notes) VALUES (?, ?, ?, ?, ?)",
        (kind, date.today().isoformat(), company, person, notes),
    )


def connections_at(conn, company: str) -> list[dict]:
    rows = conn.execute("SELECT * FROM connections WHERE company_norm != ''").fetchall()
    return [dict(r) for r in rows if matches_company(r["company_norm"], company)]


@app.get("/")
def dashboard(request: Request):
    start = week_start().isoformat()
    with connect() as conn:
        counts = {
            kind: conn.execute(
                "SELECT COUNT(*) FROM activities WHERE kind = ? AND date >= ?", (kind, start)
            ).fetchone()[0]
            for kind in WEEKLY_GOALS
        }
        top = conn.execute(
            "SELECT * FROM jobs WHERE dismissed = 0 AND id NOT IN (SELECT job_id FROM applications WHERE job_id IS NOT NULL)"
            " ORDER BY score DESC, posted_at DESC LIMIT 10"
        ).fetchall()
        pipeline = dict(conn.execute("SELECT status, COUNT(*) FROM applications GROUP BY status").fetchall())
        total_jobs = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
        n_connections = conn.execute("SELECT COUNT(*) FROM connections").fetchone()[0]
        recent = conn.execute("SELECT * FROM activities ORDER BY date DESC, id DESC LIMIT 8").fetchall()
    return render(
        request,
        "dashboard.html",
        counts=counts,
        goals=WEEKLY_GOALS,
        top=top,
        pipeline=pipeline,
        statuses=STATUSES,
        total_jobs=total_jobs,
        n_connections=n_connections,
        recent=recent,
        boards=BOARDS,
        saved_searches=drafts.LINKEDIN_SAVED_SEARCHES,
        plan=AI_PLAN,
        plan_done=get_kv("plan_done", []),
        refresh=refresh_state,
    )


@app.post("/refresh")
def refresh():
    start_refresh()
    return JSONResponse({"started": True})


@app.get("/refresh/status")
def refresh_status():
    return JSONResponse(refresh_state)


@app.get("/jobs")
def jobs(request: Request, q: str = "", tier: str = "", min_score: int = 50, remote: str = "1", view: str = "open"):
    sql = "SELECT * FROM jobs WHERE score >= ?"
    params: list = [min_score]
    if view == "saved":
        sql += " AND saved = 1"
    elif view == "dismissed":
        sql += " AND dismissed = 1"
    else:
        sql += " AND dismissed = 0"
    if tier == "target":
        sql += " AND tier IS NOT NULL"
    elif tier in {"1", "2", "3"}:
        sql += " AND tier = ?"
        params.append(int(tier))
    if remote == "1":
        sql += " AND (remote = 1 OR location LIKE '%remote%')"
    if q:
        sql += " AND (title LIKE ? OR company LIKE ? OR description LIKE ?)"
        params += [f"%{q}%"] * 3
    sql += " ORDER BY score DESC, posted_at DESC LIMIT 300"
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
        applied = {r[0] for r in conn.execute("SELECT job_id FROM applications WHERE job_id IS NOT NULL")}
    return render(
        request,
        "jobs.html",
        jobs=rows,
        applied=applied,
        q=q,
        tier=tier,
        min_score=min_score,
        remote=remote,
        view=view,
        refresh=refresh_state,
    )


def get_job(conn, job_id: str) -> dict:
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Job not found")
    return dict(row)


@app.get("/jobs/{job_id}")
def job_detail(request: Request, job_id: str):
    profile = load_profile()
    with connect() as conn:
        job = get_job(conn, job_id)
        people = connections_at(conn, job["company"])
        application = conn.execute("SELECT * FROM applications WHERE job_id = ?", (job_id,)).fetchone()
    return render(
        request,
        "job.html",
        job=job,
        people=people,
        application=application,
        company=drafts.company_info(job["company"]),
        note=drafts.application_note(job, profile),
        referrals={p["id"]: drafts.referral_message(p["first_name"], job["company"], job, profile) for p in people},
    )


@app.post("/jobs/{job_id}/toggle")
def toggle_job(job_id: str, field: str = Form(...), back: str = Form("/jobs")):
    if field not in {"saved", "dismissed"}:
        raise HTTPException(400)
    with connect() as conn:
        conn.execute(f"UPDATE jobs SET {field} = 1 - {field} WHERE id = ?", (job_id,))
    return RedirectResponse(back, status_code=303)


@app.post("/jobs/{job_id}/apply")
def apply_job(job_id: str, notes: str = Form(""), contact: str = Form("")):
    with connect() as conn:
        job = get_job(conn, job_id)
        if not conn.execute("SELECT 1 FROM applications WHERE job_id = ?", (job_id,)).fetchone():
            conn.execute(
                "INSERT INTO applications (job_id, company, role, url, status, date_applied, contact, notes, updated_at)"
                " VALUES (?, ?, ?, ?, 'applied', ?, ?, ?, ?)",
                (
                    job_id,
                    job["company"],
                    job["title"],
                    job["url"],
                    date.today().isoformat(),
                    contact,
                    notes,
                    date.today().isoformat(),
                ),
            )
            log_activity(conn, "application", job["company"], notes=job["title"])
    return RedirectResponse(f"/jobs/{job_id}", status_code=303)


@app.get("/companies")
def companies(request: Request):
    with connect() as conn:
        job_counts = dict(
            conn.execute(
                "SELECT company, COUNT(*) FROM jobs WHERE dismissed = 0 AND score >= 40 GROUP BY company"
            ).fetchall()
        )
        people = {c.name: len(connections_at(conn, c.name)) for c in COMPANIES}
    return render(request, "companies.html", companies=COMPANIES, lanes=LANES, job_counts=job_counts, people=people)


@app.get("/network")
def network(request: Request, message: str = ""):
    profile = load_profile()
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM connections").fetchone()[0]
        job_companies = [
            r[0] for r in conn.execute("SELECT DISTINCT company FROM jobs WHERE dismissed = 0 AND score >= 50")
        ]
        all_rows = [dict(r) for r in conn.execute("SELECT * FROM connections WHERE company_norm != ''")]
        product_people = [
            r for r in all_rows if any(w in (r["position"] or "").lower() for w in ("product", "pm ", "chief product"))
        ]
    groups = []
    for name in [c.name for c in COMPANIES] + sorted(set(job_companies) - {c.name for c in COMPANIES}):
        matched = [r for r in all_rows if matches_company(r["company_norm"], name)]
        if matched:
            info = drafts.company_info(name)
            groups.append(
                {
                    "company": name,
                    "tier": info.tier if info else None,
                    "people": [
                        {
                            **p,
                            "referral": drafts.referral_message(p["first_name"], name, None, profile),
                            "info_call": drafts.info_call_message(p["first_name"], name, profile),
                        }
                        for p in matched
                    ],
                }
            )
    return render(
        request, "network.html", total=total, groups=groups, product_people=product_people[:50], message=message
    )


@app.post("/network/upload")
async def network_upload(file: UploadFile = File(...)):
    try:
        rows = parse_linkedin_connections(await file.read())
    except ValueError as exc:
        return RedirectResponse(f"/network?message={exc}", status_code=303)
    with connect() as conn:
        conn.execute("DELETE FROM connections")
        conn.executemany(
            "INSERT INTO connections (first_name, last_name, url, email, company, position, connected_on, company_norm)"
            " VALUES (:first_name, :last_name, :url, :email, :company, :position, :connected_on, :company_norm)",
            rows,
        )
    rescore_all()
    return RedirectResponse(f"/network?message=Imported {len(rows)} connections", status_code=303)


@app.post("/activities")
def add_activity(
    kind: str = Form(...), company: str = Form(""), person: str = Form(""), notes: str = Form(""), back: str = Form("/")
):
    if kind not in WEEKLY_GOALS:
        raise HTTPException(400)
    with connect() as conn:
        log_activity(conn, kind, company, person, notes)
    return RedirectResponse(back, status_code=303)


@app.get("/tracker")
def tracker(request: Request):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM applications ORDER BY updated_at DESC, id DESC").fetchall()
        activities = conn.execute("SELECT * FROM activities ORDER BY date DESC, id DESC LIMIT 100").fetchall()
    return render(request, "tracker.html", applications=rows, statuses=STATUSES, activities=activities)


@app.post("/tracker")
def add_application(
    company: str = Form(...),
    role: str = Form(...),
    url: str = Form(""),
    status: str = Form("applied"),
    contact: str = Form(""),
    notes: str = Form(""),
):
    today = date.today().isoformat()
    with connect() as conn:
        conn.execute(
            "INSERT INTO applications (company, role, url, status, date_applied, contact, notes, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (company, role, url, status, today, contact, notes, today),
        )
        if status != "saved":
            log_activity(conn, "application", company, notes=role)
    return RedirectResponse("/tracker", status_code=303)


@app.post("/tracker/{app_id}")
def update_application(app_id: int, status: str = Form(...), contact: str = Form(""), notes: str = Form("")):
    if status not in STATUSES:
        raise HTTPException(400)
    with connect() as conn:
        conn.execute(
            "UPDATE applications SET status = ?, contact = ?, notes = ?, updated_at = ? WHERE id = ?",
            (status, contact, notes, date.today().isoformat(), app_id),
        )
    return RedirectResponse("/tracker", status_code=303)


@app.post("/tracker/{app_id}/delete")
def delete_application(app_id: int):
    with connect() as conn:
        conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    return RedirectResponse("/tracker", status_code=303)


@app.get("/profile")
def profile_page(request: Request, saved: int = 0):
    return render(request, "profile.html", profile=load_profile(), saved=saved)


@app.post("/profile")
async def profile_save(request: Request):
    form = await request.form()
    current = load_profile()
    for key in current:
        if key == "us_only":
            current[key] = form.get(key) == "on"
        elif key == "min_salary":
            current[key] = int(form.get(key) or 0)
        elif key in form:
            current[key] = str(form.get(key)).strip()
    save_profile(current)
    rescore_all()
    return RedirectResponse("/profile?saved=1", status_code=303)


@app.post("/plan/{key}")
def toggle_plan(key: str):
    done = set(get_kv("plan_done", []))
    done ^= {key}
    set_kv("plan_done", sorted(done))
    return RedirectResponse("/#plan", status_code=303)


@app.get("/healthz")
def healthz():
    return {"ok": True}
