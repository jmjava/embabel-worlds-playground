package com.embabel.example.buyingplanner

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.ParameterizedTypeReference
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * REST client for the synthetic ratings mock API.
 *
 * Uses Spring Boot 3's [RestClient] with [ParameterizedTypeReference] for
 * generic JSON deserialization. Returns untyped maps because the mock API's
 * response shapes vary by endpoint and are consumed as raw JSON by the LLM
 * prompts.
 *
 * @param baseUrl injected from `catalog-api.base-url` in application.yml
 */
@Component
class CatalogApiClient(
    @Value("\${catalog-api.base-url}") private val baseUrl: String,
) {
    private val restClient: RestClient by lazy {
        RestClient.builder()
            .baseUrl(baseUrl)
            .build()
    }

    /** List all product categories. Corresponds to `GET /api/categories`. */
    fun getCategories(): List<Map<String, Any>> {
        return restClient.get()
            .uri("/api/categories")
            .retrieve()
            .body(object : ParameterizedTypeReference<List<Map<String, Any>>>() {})
            ?: emptyList()
    }

    /**
     * List products in a category with optional price/score filters.
     * Corresponds to `GET /api/categories/{categoryId}/products`.
     */
    fun getProducts(
        categoryId: String,
        maxPrice: Double? = null,
        minScore: Int? = null,
    ): List<Map<String, Any>> {
        return restClient.get()
            .uri { uriBuilder ->
                uriBuilder.path("/api/categories/{categoryId}/products")
                maxPrice?.let { uriBuilder.queryParam("max_price", it) }
                minScore?.let { uriBuilder.queryParam("min_score", it) }
                uriBuilder.build(categoryId)
            }
            .retrieve()
            .body(object : ParameterizedTypeReference<List<Map<String, Any>>>() {})
            ?: emptyList()
    }

    /** Fetch a single product with its full rating detail. `GET /api/products/{id}`. */
    fun getProduct(productId: String): Map<String, Any> {
        return restClient.get()
            .uri("/api/products/{productId}", productId)
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: emptyMap()
    }

    /** Fetch price history entries for a product. `GET /api/products/{id}/price-history`. */
    fun getPriceHistory(productId: String): List<Map<String, Any>> {
        val response = restClient.get()
            .uri("/api/products/{productId}/price-history", productId)
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return response["entries"] as? List<Map<String, Any>> ?: emptyList()
    }

    /** Side-by-side comparison of products by id. `GET /api/compare?ids=a,b,c`. */
    fun compareProducts(ids: List<String>): Map<String, Any> {
        val idsParam = ids.joinToString(",")
        return restClient.get()
            .uri { uriBuilder ->
                uriBuilder.path("/api/compare")
                    .queryParam("ids", idsParam)
                    .build()
            }
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: emptyMap()
    }

    /** Full-text product search. `GET /api/search?q=...`. Returns the `results` array. */
    fun search(query: String): List<Map<String, Any>> {
        val response = restClient.get()
            .uri { uriBuilder ->
                uriBuilder.path("/api/search")
                    .queryParam("q", query)
                    .build()
            }
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return response["results"] as? List<Map<String, Any>> ?: emptyList()
    }
}
