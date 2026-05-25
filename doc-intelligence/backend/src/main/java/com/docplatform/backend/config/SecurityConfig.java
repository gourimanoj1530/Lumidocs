package com.docplatform.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security config — currently permits all requests so you can test
 * every endpoint freely with curl or Postman.
 *
 * TODO: Replace with JWT authentication in a later step.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)      // disable CSRF for REST APIs
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()               // allow everything for now
            );
        return http.build();
    }
}
