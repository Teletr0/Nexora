from flask import Flask, jsonify, render_template, request
from pathlib import Path
import json
import time
import requests

from integration import register_ecommerce_routes

app = Flask(__name__)

DATA = Path(__file__).parent / "data" / "usuarios.json"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/usuarios")
def listar():
    cenario = request.args.get("scenario", "normal")

    if cenario == "error":
        return jsonify({"erro": "Falha interna simulada"}), 500

    if cenario == "notfound":
        return jsonify({"erro": "Não encontrado"}), 404

    if cenario == "empty":
        return jsonify([])

    if cenario == "slow":
        time.sleep(6)

    if cenario == "malformed":
        return (
            "isso não é json {{",
            200,
            {"Content-Type": "text/plain; charset=utf-8"},
        )

    try:
        usuarios = json.loads(DATA.read_text(encoding="utf-8"))
        return jsonify(usuarios)

    except FileNotFoundError:
        app.logger.exception("Arquivo de usuários não encontrado.")
        return jsonify({"erro": "Arquivo de usuários não encontrado"}), 500

    except json.JSONDecodeError:
        app.logger.exception("O arquivo de usuários contém JSON inválido.")
        return jsonify({"erro": "Dados de usuários inválidos"}), 500


@app.route("/api/externo/usuarios")
def proxy_usuarios():
    """Busca dados da JSONPlaceholder e repassa para o frontend."""
    try:
        resposta = requests.get(
            "https://jsonplaceholder.typicode.com/users",
            timeout=5,
        )
        resposta.raise_for_status()
        return jsonify(resposta.json())

    except requests.RequestException:
        app.logger.exception("Falha ao consultar a API externa.")
        return jsonify({
            "erro": "Falha ao contatar a API externa"
        }), 502


# Registra as rotas da loja no Flask existente.
@app.post("/api/mission/validate-4")
def mission_validate_4():
    """Valida a Missão 04 (criação da página de detalhes)."""
    from mission_validators import validar_missao_04
    return jsonify(validar_missao_04(app))


register_ecommerce_routes(app)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
    )

