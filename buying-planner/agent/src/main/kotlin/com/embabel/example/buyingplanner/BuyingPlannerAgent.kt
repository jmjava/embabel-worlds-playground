package com.embabel.example.buyingplanner

import com.embabel.agent.api.annotation.AchievesGoal
import com.embabel.agent.api.annotation.Action
import com.embabel.agent.api.annotation.Agent
import com.embabel.agent.api.annotation.Export
import com.embabel.agent.api.common.OperationContext
import com.embabel.agent.domain.io.UserInput
import com.fasterxml.jackson.databind.ObjectMapper

/**
 * A 3-step GOAP agent that recommends rated products from the mock catalog.
 *
 * The action chain is resolved automatically by the Embabel platform
 * from input/output type compatibility:
 *
 *   UserInput → [parseIntent] → BuyingIntent → [searchProducts] → ProductCandidateList
 *             → [compareTopCandidates] → BuyingPlan
 *
 * Each action uses `context.ai().withDefaultLlm().createObject()` for structured
 * LLM output, and [CatalogApiClient] for product data from the mock API.
 *
 * The final action carries `@AchievesGoal` with `export = Export(remote = true)`,
 * making the entire chain available as a remote service named "buyingPlan".
 */
@Agent(
    description = "Recommend the best products to buy based on lab-style ratings, " +
        "budget constraints, and user priorities",
)
class BuyingPlannerAgent(
    private val catalogApiClient: CatalogApiClient,
    private val objectMapper: ObjectMapper,
) {

    /**
     * Extract a structured [BuyingIntent] from free-text user input.
     *
     * The LLM maps natural language ("I need a quiet washing machine under $800")
     * into category, budget, priorities, and requirements.
     */
    @Action
    fun parseIntent(userInput: UserInput, context: OperationContext): BuyingIntent {
        val prompt = """
            |Analyze the following user input and extract a structured buying intent.
            |
            |User said: "${userInput.content}"
            |
            |Available categories: washing-machines, laptops, mattresses
            |
            |Extract:
            |- category: the product category id that best matches (must be one of the available categories)
            |- maxBudget: maximum budget in dollars (0.0 if not specified)
            |- priorities: list of priorities the user cares about (e.g. reliability, noise_level, battery_life, comfort)
            |- requirements: any specific requirements mentioned (e.g. "front-load", "15-inch screen")
        """.trimMargin()

        return context.ai().withDefaultLlm().createObject(prompt, BuyingIntent::class.java)
    }

    /**
     * Fetch products from the mock API and ask the LLM to score/rank them
     * against the user's priorities, producing a [ProductCandidateList].
     */
    @Action
    fun searchProducts(intent: BuyingIntent, context: OperationContext): ProductCandidateList {
        val maxPrice = if (intent.maxBudget > 0) intent.maxBudget else null
        val products = catalogApiClient.getProducts(
            categoryId = intent.category,
            maxPrice = maxPrice,
        )

        val productsJson = objectMapper.writeValueAsString(products)

        val prompt = """
            |You are a product buying advisor. Score and rank these products
            |based on the user's priorities.
            |
            |User priorities: ${intent.priorities.joinToString(", ").ifEmpty { "overall value" }}
            |User requirements: ${intent.requirements.ifEmpty { "none specified" }}
            |Budget: ${if (intent.maxBudget > 0) "$${intent.maxBudget}" else "no limit"}
            |
            |Available products (with overall scores and verdicts):
            |$productsJson
            |
            |Return the top 5-6 candidates. For each candidate provide:
            |- id: the product id (as a string)
            |- name: product name
            |- brand: brand name
            |- price: current price
            |- overallScore: the overall score (0-100)
            |- matchExplanation: 1-2 sentences explaining why this product matches the user's needs
            |
            |Rank by relevance to the user's priorities, not just overall score.
        """.trimMargin()

        return context.ai().withDefaultLlm().createObject(prompt, ProductCandidateList::class.java)
    }

    /**
     * Gather full details, price histories, and comparison data for the top
     * candidates, then generate a complete [BuyingPlan] with top pick,
     * runner-up, budget pick, reasoning, and timing advice.
     *
     * This is the terminal action — `@AchievesGoal` marks the GOAP chain as
     * complete and exports it as a remote service.
     */
    @AchievesGoal(
        description = "Produce a buying plan with top pick, runner-up, and budget pick",
        export = Export(
            remote = true,
            name = "buyingPlan",
            startingInputTypes = [UserInput::class],
        ),
    )
    @Action
    fun compareTopCandidates(
        intent: BuyingIntent,
        candidates: ProductCandidateList,
        context: OperationContext,
    ): BuyingPlan {
        val topIds = candidates.candidates.take(4).map { it.id }

        val details = topIds.map { id -> catalogApiClient.getProduct(id) }
        val priceHistories = topIds.map { id -> catalogApiClient.getPriceHistory(id) }
        val comparison = if (topIds.size >= 2) {
            catalogApiClient.compareProducts(topIds)
        } else {
            emptyMap()
        }

        val detailsJson = objectMapper.writeValueAsString(details)
        val priceHistoryJson = objectMapper.writeValueAsString(priceHistories)
        val comparisonJson = objectMapper.writeValueAsString(comparison)

        val prompt = """
            |You are a product buying advisor creating a final buying plan.
            |
            |User intent:
            |- Category: ${intent.category}
            |- Budget: ${if (intent.maxBudget > 0) "$${intent.maxBudget}" else "no limit"}
            |- Priorities: ${intent.priorities.joinToString(", ").ifEmpty { "overall value" }}
            |- Requirements: ${intent.requirements.ifEmpty { "none" }}
            |
            |Top candidates with match explanations:
            |${objectMapper.writeValueAsString(candidates.candidates)}
            |
            |Detailed product info:
            |$detailsJson
            |
            |Price history (for timing advice):
            |$priceHistoryJson
            |
            |Side-by-side comparison:
            |$comparisonJson
            |
            |Create a buying plan with:
            |1. topPick — the single best product for this user
            |2. runnerUp — a strong alternative
            |3. budgetPick — the best value option (lowest price that still meets core needs)
            |4. reasoning — why you chose the top pick over alternatives (2-3 sentences)
            |5. comparisonSummary — a concise comparison table in text form
            |6. timingAdvice — based on price history, should they buy now or wait?
            |7. content — a friendly, complete summary paragraph the user can read
            |
            |Each pick must include: id, name, brand, price, overallScore, matchExplanation.
        """.trimMargin()

        return context.ai().withDefaultLlm().createObject(prompt, BuyingPlan::class.java)
    }
}
