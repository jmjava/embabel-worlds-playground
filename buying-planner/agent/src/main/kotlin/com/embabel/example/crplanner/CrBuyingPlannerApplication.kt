package com.embabel.example.crplanner

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class CrBuyingPlannerApplication

fun main(args: Array<String>) {
    runApplication<CrBuyingPlannerApplication>(*args)
}
