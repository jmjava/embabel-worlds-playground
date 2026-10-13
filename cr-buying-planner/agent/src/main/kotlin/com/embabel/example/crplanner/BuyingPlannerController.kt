package com.embabel.example.crplanner

import com.embabel.agent.core.AgentPlatform
import com.embabel.agent.core.AgentProcessStatusCode
import com.embabel.agent.core.ProcessOptions
import com.embabel.agent.domain.io.UserInput
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * REST controller that exposes the BuyingPlannerAgent as an HTTP endpoint.
 *
 * The agent is registered with goal "buyingPlan" (via @AchievesGoal export),
 * accepting [UserInput] and producing a [BuyingPlan]. This controller
 * performs the low-level invocation: look up the agent by name, create a
 * process, bind the input, run, and extract the typed result.
 */
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
     * The GOAP chain is: UserInput → parseIntent → searchProducts →
     * compareTopCandidates → BuyingPlan. The platform resolves this
     * automatically from the action type signatures.
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
            val agent = agentPlatform.agents().first { it.name == "BuyingPlannerAgent" }
            val process = agentPlatform.createAgentProcessFrom(agent, ProcessOptions.DEFAULT, userInput)
            process.run()

            if (process.status != AgentProcessStatusCode.COMPLETED) {
                logger.warn("Agent process did not complete: status={}", process.status)
                return ResponseEntity.internalServerError()
                    .body(mapOf("error" to "Agent process ended with status: ${process.status}"))
            }

            val result = process.resultOfType(BuyingPlan::class.java)
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            logger.error("Agent failed", e)
            ResponseEntity.internalServerError()
                .body(mapOf("error" to "Agent execution failed: ${e.message}"))
        }
    }
}
