package com.embabel.example.crplanner

import com.embabel.agent.domain.library.HasContent
import com.fasterxml.jackson.annotation.JsonClassDescription
import com.fasterxml.jackson.annotation.JsonPropertyDescription

@JsonClassDescription("User's buying intent")
data class BuyingIntent(
    @get:JsonPropertyDescription("Product category (e.g. washing-machines, laptops, mattresses)")
    val category: String,
    @get:JsonPropertyDescription("Maximum budget in dollars, 0 means no limit")
    val maxBudget: Double = 0.0,
    @get:JsonPropertyDescription("Priorities the user cares about, e.g. reliability, battery_life")
    val priorities: List<String> = emptyList(),
    @get:JsonPropertyDescription("Any specific requirements like 'front-load' or '15-inch screen'")
    val requirements: String = "",
)

@JsonClassDescription("A product candidate with match score")
data class ProductCandidate(
    @get:JsonPropertyDescription("The product ID from the catalog")
    val id: String,
    @get:JsonPropertyDescription("Product name")
    val name: String,
    @get:JsonPropertyDescription("Brand name")
    val brand: String,
    @get:JsonPropertyDescription("Current price in dollars")
    val price: Double,
    @get:JsonPropertyDescription("Consumer Reports overall score (0-100)")
    val overallScore: Int,
    @get:JsonPropertyDescription("1-2 sentences explaining why this product matches the user's needs")
    val matchExplanation: String,
)

@JsonClassDescription("List of product candidates ranked by relevance")
data class ProductCandidateList(val candidates: List<ProductCandidate>)

@JsonClassDescription("Complete buying plan with top picks and reasoning")
data class BuyingPlan(
    val topPick: ProductCandidate,
    val runnerUp: ProductCandidate,
    val budgetPick: ProductCandidate,
    val reasoning: String,
    val comparisonSummary: String,
    val timingAdvice: String,
    override val content: String,
) : HasContent
