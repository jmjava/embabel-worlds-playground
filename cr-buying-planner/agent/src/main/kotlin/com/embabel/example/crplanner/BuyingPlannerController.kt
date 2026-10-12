package com.embabel.example.crplanner

import com.embabel.agent.core.AgentPlatform
import com.embabel.agent.domain.io.UserInput
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = ["*"])
class BuyingPlannerController(
    private val agentPlatform: AgentPlatform,
) {

    private val logger = LoggerFactory.getLogger(javaClass)

    /**
     * Accept a natural-language buying request and run the BuyingPlannerAgent
     * to produce a [BuyingPlan].
     *
     * The agent is exported as goal "buyingPlan" with starting input type
     * [UserInput], so we invoke it through the platform's process runner.
     *
     * Request body: `{ "content": "I'm looking for a laptop under $1500..." }`
     * Response: the serialised [BuyingPlan] JSON.
     */
    @PostMapping("/buying-plan")
    fun generatePlan(@RequestBody input: Map<String, String>): ResponseEntity<Any> {
        val content = input["content"]
            ?: return ResponseEntity.badRequest()
                .body(mapOf("error" to "Missing 'content' field"))

        logger.info("Buying-plan request: {}", content.take(120))

        val userInput = UserInput(content = content)

        return try {
            val result = agentPlatform.runProcess(
                input = userInput,
                agentScope = "BuyingPlannerAgent",
                goalName = "buyingPlan",
            )
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            logger.error("Agent failed", e)
            ResponseEntity.internalServerError()
                .body(mapOf("error" to "Agent execution failed: ${e.message}"))
        }
    }
}
