
# Validadores da Missão 04.
# Roda no próprio Flask via test_client — sem rede, sem deadlock.
from pathlib import Path


def validar_missao_04(app) -> dict:
    checks = []
    root = Path(__file__).parent

    def add(name, passed, detail=""):
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    # ── Check 1 — Template existe ─────────────────────────────
    tpl = root / "templates" / "produto.html"
    if not tpl.exists():
        add("Template templates/produto.html existe", False,
            "crie o arquivo em templates/produto.html")
        return _result(checks)

    add("Template templates/produto.html existe", True)

    # ── Check 2 — Rota /produto/101 responde 200 ──────────────
    with app.test_client() as client:
        try:
            res = client.get("/produto/101")
            status = res.status_code
            html = res.get_data(as_text=True)
        except Exception as e:
            add("GET /produto/101 responde 200", False, f"erro: {e}")
            html = ""
            status = None

        if status is not None:
            add("GET /produto/101 responde 200", status == 200,
                "" if status == 200 else f"status {status}")

        # ── Check 3 — Rota /produto/102 também responde 200 ───
        try:
            res2 = client.get("/produto/102")
            add("GET /produto/102 responde 200 (outro produto)",
                res2.status_code == 200,
                "" if res2.status_code == 200 else f"status {res2.status_code}")
        except Exception as e:
            add("GET /produto/102 responde 200 (outro produto)",
                False, f"erro: {e}")

        # ── Check 4 — Produto inexistente é tratado ───────────
        try:
            res404 = client.get("/produto/9999")
            body = res404.get_data(as_text=True).lower()
            tratado = (
                res404.status_code == 404
                or "não encontr" in body
                or "not found" in body
                or "inexistente" in body
            )
            add("GET /produto/9999 tratado (404 ou mensagem)",
                tratado,
                "" if tratado else f"status {res404.status_code} sem mensagem de erro")
        except Exception as e:
            add("GET /produto/9999 tratado (404 ou mensagem)",
                False, f"exceção não tratada: {e}")

    # ── Check 5 — Template renderiza dados ────────────────────
    tpl_content = tpl.read_text(encoding="utf-8")
    has_jinja = "{{" in tpl_content or "{%" in tpl_content
    has_fetch = "fetch(" in tpl_content or "/api/shop/products" in tpl_content
    add("Template renderiza dados (Jinja2 ou fetch)",
        has_jinja or has_fetch,
        "" if (has_jinja or has_fetch) else
        "use Jinja2 ({% extends %}) ou fetch no cliente")

    # ── Check 6 — Link na loja ────────────────────────────────
    js_path = root / "static" / "ecommerce" / "ecommerce.js"
    has_link = False
    if js_path.exists():
        js = js_path.read_text(encoding="utf-8")
        has_link = (
            "/produto/" in js
            or ("location.href" in js and "produto" in js.lower())
            or ("<a " in js and "produto" in js.lower())
        )
    add("Loja tem link para página de detalhes",
        has_link,
        "" if has_link else
        "adicione clique no card em ecommerce.js (ex: location.href)")

    return _result(checks)


def _result(checks):
    passed = sum(1 for c in checks if c["passed"])
    return {
        "checks": checks,
        "passed": passed,
        "total": len(checks),
        "complete": passed == len(checks),
    }
