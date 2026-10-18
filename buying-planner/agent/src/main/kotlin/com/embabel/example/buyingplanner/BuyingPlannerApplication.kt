package com.embabel.example.buyingplanner

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class BuyingPlannerApplication

fun main(args: Array<String>) {
    runApplication<BuyingPlannerApplication>(*args)
}
