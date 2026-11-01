import unittest
from pathlib import Path

import app
from ecommerce_blueprint import PRODUCTS as BLUEPRINT_PRODUCTS
from integration import PRODUCTS


class EcommerceRegressionTests(unittest.TestCase):
    def setUp(self):
        app.app.config.update(TESTING=True)
        self.client = app.app.test_client()

    def test_catalog_filters_and_rejects_invalid_sort(self):
        response = self.client.get("/api/shop/products?category=Áudio&sort=name-asc")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["total"], 2)
        self.assertTrue(all(item["category"] == "Áudio" for item in body["items"]))
        self.assertNotIn("featured", body["items"][0])

        invalid = self.client.get("/api/shop/products?sort=banana")
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.get_json()["error"]["code"], "INVALID_SORT")

    def test_product_detail_page_and_unknown_product(self):
        response = self.client.get("/produto/101")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Teclado mecânico Orion", response.get_data(as_text=True))
        self.assertIn("249,90", response.get_data(as_text=True))

        missing = self.client.get("/produto/9999")
        self.assertEqual(missing.status_code, 404)
        self.assertIn("Produto não encontrado", missing.get_data(as_text=True))

    def test_product_api_keeps_json_not_found_contract(self):
        response = self.client.get("/api/shop/products/9999")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.get_json()["error"]["code"],
            "PRODUCT_NOT_FOUND",
        )

    def test_mission_04_validator_passes(self):
        response = self.client.post("/api/mission/validate-4")
        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result["complete"], result["checks"])
        self.assertEqual(result["passed"], result["total"])

    def test_cart_uses_server_price_and_enforces_stock(self):
        response = self.client.post(
            "/api/shop/cart/validate",
            json={"items": [{"id": 101, "quantity": 2, "price": 0.01}]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["total"], 499.8)

        out_of_stock = self.client.post(
            "/api/shop/cart/validate",
            json={"items": [{"id": 104, "quantity": 999}]},
        )
        self.assertEqual(out_of_stock.status_code, 409)
        self.assertEqual(out_of_stock.get_json()["error"]["code"], "OUT_OF_STOCK")

    def test_active_and_optional_routes_share_one_catalog(self):
        self.assertIs(BLUEPRINT_PRODUCTS, PRODUCTS)

    def test_store_exposes_browser_persisted_wishlist(self):
        root = Path(__file__).resolve().parents[1]
        javascript = (root / "static/ecommerce/ecommerce.js").read_text(
            encoding="utf-8"
        )
        template = (root / "templates/ecommerce.html").read_text(
            encoding="utf-8"
        )

        self.assertIn("nexora-wishlist-v1", javascript)
        self.assertIn("localStorage.setItem(WISHLIST_KEY", javascript)
        self.assertIn("const API = '/api/shop'", javascript)
        self.assertIn("`${API}/products?sort=featured`", javascript)
        self.assertIn('id="open-wishlist"', template)
        self.assertIn('id="wishlist-drawer"', template)
        self.assertIn("`/produto/${product.id}`", javascript)


if __name__ == "__main__":
    unittest.main()
