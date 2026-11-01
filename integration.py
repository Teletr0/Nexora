# INTEGRAÇÃO — chamado por app.py via register_ecommerce_routes(app)
from flask import render_template, jsonify, request
from ecommerce_blueprint import PRODUCTS


def _find_product(pid: int):
    return next((p for p in PRODUCTS if p["id"] == pid), None)


def register_ecommerce_routes(app):
    """Chame uma vez com o app Flask existente: register_ecommerce_routes(app)."""

    @app.get("/ecommerce")
    def ecommerce_page():
        return render_template("ecommerce.html")

    @app.get("/api/shop/health")
    def ecommerce_health():
        return jsonify(status="ok", service="nexora-commerce")

    @app.get("/api/shop/categories")
    def ecommerce_categories():
        return jsonify(items=sorted({p["category"] for p in PRODUCTS}, key=str.casefold))

    @app.get("/api/shop/products")
    def ecommerce_products():
        q = request.args.get("q", "").strip().casefold()
        category = request.args.get("category", "").strip()
        sort = request.args.get("sort", "featured")
        if sort not in {"featured", "price-asc", "price-desc", "name-asc"}:
            return jsonify(error={"code": "INVALID_SORT",
                                  "message": "Ordenação inválida."}), 400

        items = [
            p for p in PRODUCTS
            if (not q or q in f'{p["name"]} {p["description"]} {p["category"]}'.casefold())
            and (not category or p["category"] == category)
        ]
        if sort == "price-asc":
            items.sort(key=lambda p: p["price"])
        elif sort == "price-desc":
            items.sort(key=lambda p: p["price"], reverse=True)
        elif sort == "name-asc":
            items.sort(key=lambda p: p["name"].casefold())
        else:
            items.sort(key=lambda p: p["featured"])

        public_items = [{k: v for k, v in p.items() if k != "featured"} for p in items]
        return jsonify(items=public_items, total=len(public_items),
                       filters={"q": request.args.get("q", ""),
                                "category": category, "sort": sort})

    @app.get("/api/shop/products/<int:product_id>")
    def ecommerce_product_detail(product_id):
        product = _find_product(product_id)
        if product is None:
            return jsonify(error={"code": "PRODUCT_NOT_FOUND",
                                  "message": "Produto não encontrado."}), 404
        return jsonify({k: v for k, v in product.items() if k != "featured"})

    @app.get("/produto/<int:product_id>")
    def product_page(product_id):
        product = _find_product(product_id)
        if product is None:
            return render_template("produto.html", product=None), 404
        return render_template("produto.html", product=product)

    # ────────────────────────────────────────────────────────
    # CORAÇÃO DA MISSÃO 03 — o servidor é a autoridade.
    # O cliente envia apenas {id, quantity}. QUALQUER campo
    # de preço enviado é IGNORADO. Preço e estoque vêm do
    # catálogo do servidor (PRODUCTS).
    # ────────────────────────────────────────────────────────
    @app.post("/api/shop/cart/validate")
    def ecommerce_cart_validate():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error={"code": "INVALID_BODY",
                                  "message": "Corpo deve ser um objeto JSON."}), 400

        items = payload.get("items")
        if not isinstance(items, list) or not items:
            return jsonify(error={"code": "INVALID_ITEMS",
                                  "message": "Envie items: [{id, quantity}, ...]."}), 400

        result_items, total = [], 0.0

        for raw in items:
            if not isinstance(raw, dict):
                return jsonify(error={"code": "INVALID_ITEM",
                                      "message": "Cada item deve ser um objeto."}), 400

            pid = raw.get("id")
            qty = raw.get("quantity")

            if not isinstance(pid, int):
                return jsonify(error={"code": "INVALID_ID",
                                      "message": f"id deve ser inteiro: {pid!r}."}), 400
            if not isinstance(qty, int) or qty <= 0:
                return jsonify(error={"code": "INVALID_QUANTITY",
                                      "message": f"quantity deve ser inteiro > 0: {qty!r}."}), 400

            product = _find_product(pid)
            if product is None:
                return jsonify(error={"code": "PRODUCT_NOT_FOUND",
                                      "message": f"Produto {pid} não existe."}), 404

            if qty > product["stock"]:
                return jsonify(error={
                    "code": "OUT_OF_STOCK",
                    "message": f"Estoque insuficiente para {product['name']}.",
                    "available": product["stock"],
                    "requested": qty,
                }), 409

            unit = product["price"]                    # ← do servidor
            subtotal = round(unit * qty, 2)
            result_items.append({
                "id": product["id"],
                "name": product["name"],
                "quantity": qty,
                "unit_price": unit,
                "subtotal": subtotal,
                "stock_available": product["stock"],
            })
            total += subtotal

        return jsonify({
            "status": "validated",
            "items": result_items,
            "total": round(total, 2),
            "message": "Carrinho validado pelo servidor.",
        })
