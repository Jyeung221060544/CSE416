package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.GeoAssetDoc;
import edu.stonybrook.cse416.backend.repository.GeoAssetRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

/**
 * GeoAssetService — serves GeoJSON assets stored in MongoDB.
 *
 * <p>Covers the US-48 states outline and per-state congressional district
 * boundaries.  Precinct GeoJSONs are too large for MongoDB and are served
 * directly from disk by {@code PrecinctGeoController}.
 */
@Service
public class GeoAssetService {

    private final GeoAssetRepository geoRepo;

    public GeoAssetService(GeoAssetRepository geoRepo) {
        this.geoRepo = geoRepo;
    }

    /** Returns the 48 contiguous US states GeoJSON, or {@code null} if not seeded. */
    @Cacheable("geo_us_states")
    public Map<String, Object> getUsStates() {
        return fetch("us_states");
    }

    /**
     * Returns the congressional district GeoJSON for the given state,
     * or {@code null} if not found.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     */
    @Cacheable(value = "geo_districts", key = "#stateId")
    public Map<String, Object> getDistricts(String stateId) {
        return fetch(stateId + "_districts");
    }

    private Map<String, Object> fetch(String id) {
        Optional<GeoAssetDoc> opt = geoRepo.findById(id);
        return opt.map(GeoAssetDoc::getGeojson).orElse(null);
    }
}
