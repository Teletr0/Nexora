"""Blueprint opcional para registrar a loja no Flask existente."""
from flask import Blueprint, render_template, jsonify, request

ecommerce_bp = Blueprint(
    "ecommerce",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/ecommerce-static",
)

PRODUCTS = [
    {"id":101,"name":"Teclado mecânico Orion","category":"Periféricos","price":249.90,"stock":12,"image":"https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85","description":"Teclado mecânico com conexão USB-C e construção sólida.","featured":1},
    {"id":102,"name":"Mouse sem fio Vector","category":"Periféricos","price":159.90,"stock":18,"image":"https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85","description":"Mouse sem fio ergonômico com sensor preciso.","featured":2},
    {"id":103,"name":"Headset Studio Pro","category":"Áudio","price":389.00,"stock":7,"image":"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85","description":"Headset confortável para reuniões e criação de conteúdo.","featured":3},
    {"id":104,"name":"Monitor UltraView 27","category":"Monitores","price":1499.00,"stock":5,"image":"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85","description":"Monitor de 27 polegadas para uma área de trabalho ampla.","featured":4},
    {"id":105,"name":"Webcam Focus 4K","category":"Acessórios","price":459.90,"stock":9,"image":"https://images.unsplash.com/photo-1587826080692-f439cd0b70da?auto=format&fit=crop&w=900&q=85","description":"Webcam para videoconferências e gravações.","featured":5},
    {"id":106,"name":"SSD portátil Atlas 1 TB","category":"Armazenamento","price":629.90,"stock":10,"image":"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=85","description":"Armazenamento portátil compacto para arquivos e projetos.","featured":6},
    {"id":107,"name":"Microfone Pulse USB","category":"Áudio","price":319.90,"stock":0,"image":"https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=85","description":"Microfone USB para aulas, chamadas e produção de áudio.","featured":7},
    {"id":108,"name":"Hub USB-C Dock 7","category":"Acessórios","price":279.90,"stock":15,"image":"https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=85","description":"Hub compacto com múltiplas portas para notebooks.","featured":8},
]

@ecommerce_bp.get("/ecommerce")
def ecommerce_page():
    return render_template("ecommerce.html")


@ecommerce_bp.get("/produto/<int:product_id>")
def product_page(product_id):
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if product is None:
        return render_template("produto.html", product=None), 404
    return render_template("produto.html", product=product)


@ecommerce_bp.get("/api/shop/health")
def ecommerce_health():
    return jsonify(status="ok", service="nexora-commerce")

@ecommerce_bp.get("/api/shop/categories")
def ecommerce_categories():
    return jsonify(items=sorted({p["category"] for p in PRODUCTS}, key=str.casefold))

@ecommerce_bp.get("/api/shop/products")
def ecommerce_products():
    q = request.args.get("q", "").strip().casefold()
    category = request.args.get("category", "").strip()
    sort = request.args.get("sort", "featured")
    if sort not in {"featured", "price-asc", "price-desc", "name-asc"}:
        return jsonify(error={"code":"INVALID_SORT","message":"Ordenação inválida."}), 400
    items = [p for p in PRODUCTS if (not q or q in f'{p["name"]} {p["description"]} {p["category"]}'.casefold()) and (not category or p["category"] == category)]
    if sort == "price-asc": items.sort(key=lambda p:p["price"])
    elif sort == "price-desc": items.sort(key=lambda p:p["price"], reverse=True)
    elif sort == "name-asc": items.sort(key=lambda p:p["name"].casefold())
    else: items.sort(key=lambda p:p["featured"])
    items = [{k:v for k,v in p.items() if k != "featured"} for p in items]
    return jsonify(items=items,total=len(items),filters={"q":request.args.get("q",""),"category":category,"sort":sort})

@ecommerce_bp.get("/api/shop/products/<int:product_id>")
def ecommerce_product_detail(product_id):
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if product is None:
        return jsonify(error={"code":"PRODUCT_NOT_FOUND","message":"Produto não encontrado."}), 404
    return jsonify({k:v for k,v in product.items() if k != "featured"})
