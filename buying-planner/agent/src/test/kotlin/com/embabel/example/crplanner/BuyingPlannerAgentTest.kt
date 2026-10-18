package com.embabel.example.crplanner

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * Unit tests for the Buying Planner data types.
 *
 * These do NOT start a full Spring context because the Embabel agent starter
 * requires an LLM provider (e.g. OpenAI) at startup. Integration tests that
 * exercise the full GOAP chain belong in a separate profile with the mock API
 * running and an API key configured.
 */
class BuyingPlannerAgentTest {

    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    @Test
    fun `BuyingIntent serializes round-trip`() {
        val intent = BuyingIntent(
            category = "laptops",
            maxBudget = 1500.0,
            priorities = listOf("performance", "battery life"),
            requirements = "Need a laptop for software development",
        )
        val json = objectMapper.writeValueAsString(intent)
        val deserialized = objectMapper.readValue(json, BuyingIntent::class.java)
        assertEquals(intent.category, deserialized.category)
        assertEquals(intent.maxBudget, deserialized.maxBudget)
        assertEquals(intent.priorities, deserialized.priorities)
        assertEquals(intent.requirements, deserialized.requirements)
    }

    @Test
    fun `BuyingIntent defaults are sensible`() {
        val intent = BuyingIntent(category = "mattresses")
        assertEquals(0.0, intent.maxBudget)
        assertTrue(intent.priorities.isEmpty())
        assertEquals("", intent.requirements)
    }

    @Test
    fun `ProductCandidate serializes round-trip`() {
        val candidate = ProductCandidate(
            id = "laptop-001",
            name = "ThinkPad X1 Carbon",
            brand = "Lenovo",
            price = 1399.99,
            overallScore = 87,
            matchExplanation = "Excellent for development with long battery life",
        )
        val json = objectMapper.writeValueAsString(candidate)
        val deserialized = objectMapper.readValue(json, ProductCandidate::class.java)
        assertEquals(candidate.id, deserialized.id)
        assertEquals(candidate.name, deserialized.name)
        assertEquals(candidate.overallScore, deserialized.overallScore)
        assertEquals(candidate.price, deserialized.price)
    }

    @Test
    fun `ProductCandidateList holds multiple candidates`() {
        val list = ProductCandidateList(
            candidates = listOf(
                ProductCandidate("1", "A", "Brand", 100.0, 90, "Good"),
                ProductCandidate("2", "B", "Brand", 200.0, 80, "Okay"),
            ),
        )
        assertEquals(2, list.candidates.size)
        assertEquals("A", list.candidates[0].name)
    }

    @Test
    fun `BuyingPlan content field is accessible`() {
        val topPick = ProductCandidate("1", "Product A", "Brand A", 100.0, 90, "Best overall")
        val plan = BuyingPlan(
            topPick = topPick,
            runnerUp = ProductCandidate("2", "Product B", "Brand B", 80.0, 85, "Close second"),
            budgetPick = ProductCandidate("3", "Product C", "Brand C", 50.0, 75, "Good value"),
            reasoning = "Product A leads in Consumer Reports testing",
            comparisonSummary = "A vs B vs C comparison",
            timingAdvice = "Buy now — prices are stable",
            content = "Top pick: Product A. Runner-up: Product B. Budget: Product C.",
        )
        assertNotNull(plan.content)
        assertEquals("Product A", plan.topPick.name)
        assertEquals("Product B", plan.runnerUp.name)
        assertEquals("Product C", plan.budgetPick.name)
    }

    @Test
    fun `BuyingPlan serializes round-trip`() {
        val plan = BuyingPlan(
            topPick = ProductCandidate("1", "A", "B", 100.0, 90, "Good"),
            runnerUp = ProductCandidate("2", "C", "D", 200.0, 80, "Okay"),
            budgetPick = ProductCandidate("3", "E", "F", 50.0, 70, "Cheap"),
            reasoning = "Test reasoning",
            comparisonSummary = "Summary",
            timingAdvice = "Buy now",
            content = "Plan content",
        )
        val json = objectMapper.writeValueAsString(plan)
        val deserialized = objectMapper.readValue(json, BuyingPlan::class.java)
        assertEquals(plan.topPick.id, deserialized.topPick.id)
        assertEquals(plan.reasoning, deserialized.reasoning)
        assertEquals(plan.content, deserialized.content)
    }
}
