package com.embabel.example.crplanner

import org.springframework.beans.factory.annotation.Value
import org.springframework.core.ParameterizedTypeReference
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class CrApiClient(
    @Value("\${cr-api.base-url}") private val baseUrl: String,
) {
    private val restClient: RestClient by lazy {
        RestClient.builder()
            .baseUrl(baseUrl)
            .build()
    }

    fun getCategories(): List<Map<String, Any>> {
        return restClient.get()
            .uri("/api/categories")
            .retrieve()
            .body(object : ParameterizedTypeReference<List<Map<String, Any>>>() {})
            ?: emptyList()
    }

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

    fun getProduct(productId: String): Map<String, Any> {
        return restClient.get()
            .uri("/api/products/{productId}", productId)
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: emptyMap()
    }

    fun getPriceHistory(productId: String): List<Map<String, Any>> {
        val response = restClient.get()
            .uri("/api/products/{productId}/price-history", productId)
            .retrieve()
            .body(object : ParameterizedTypeReference<Map<String, Any>>() {})
            ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return response["entries"] as? List<Map<String, Any>> ?: emptyList()
    }

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
