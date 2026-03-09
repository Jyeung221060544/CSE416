package edu.stonybrook.cse416.backend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * CacheConfig — enables Spring's annotation-driven caching.
 *
 * <p>The cache implementation (Caffeine) and its spec (max size + TTL) are
 * configured via {@code application.properties}:
 * <pre>
 * spring.cache.type=caffeine
 * spring.cache.caffeine.spec=maximumSize=500,expireAfterWrite=86400s
 * </pre>
 *
 * <p>Named caches used in this application:
 * <ul>
 *   <li>{@code states}         — GET /api/states list</li>
 *   <li>{@code state_overview} — GET /api/states/{id}/overview</li>
 *   <li>{@code heatmaps}       — GET /api/states/{id}/heatmap?granularity=</li>
 *   <li>{@code ensemble}       — GET /api/states/{id}/ensemble</li>
 *   <li>{@code gingles}        — GET /api/states/{id}/gingles?race=</li>
 *   <li>{@code ei_kde}         — GET /api/states/{id}/ei?race=</li>
 *   <li>{@code ei_compare}     — GET /api/states/{id}/ei-compare?race1=&race2=</li>
 *   <li>{@code vote_seat_share}— GET /api/states/{id}/vote-seat-share</li>
 *   <li>{@code geo_us_states} — GET /api/geo/us-states</li>
 *   <li>{@code geo_districts} — GET /api/states/{id}/districts</li>
 * </ul>
 *
 * <p>All analytics data is static (computed offline); cache entries are evicted
 * only on application restart or after the 24-hour TTL.
 */
@EnableCaching
@Configuration
public class CacheConfig {}
