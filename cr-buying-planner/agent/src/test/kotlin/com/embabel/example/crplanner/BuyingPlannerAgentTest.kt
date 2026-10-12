package com.embabel.example.crplanner

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.ApplicationContext
import org.springframework.test.context.bean.override.mockito.MockitoBean
import kotlin.test.assertNotNull

@SpringBootTest
class BuyingPlannerAgentTest {

    @Autowired
    private lateinit var applicationContext: ApplicationContext

    @MockitoBean
    private lateinit var crApiClient: CrApiClient

    @Test
    fun `context loads`() {
        assertNotNull(applicationContext)
    }

    @Test
    fun `BuyingPlannerAgent bean exists`() {
        val agent = applicationContext.getBean(BuyingPlannerAgent::class.java)
        assertNotNull(agent)
    }

    @Test
    fun `CrApiClient bean exists`() {
        val client = applicationContext.getBean(CrApiClient::class.java)
        assertNotNull(client)
    }
}
