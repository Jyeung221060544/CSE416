package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.repository.GinglesRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * GinglesService — serves {@code GET /api/states/{stateId}/gingles?race=}.
 *
 * <p>Gingles precinct data is the largest payload (~500 KB per race).  Splitting
 * by race and caching per (stateId, race) means a user who stays on "Black" for
 * the whole session never downloads "White" data, and vice versa.
 *
 * <p>Cached under {@code "gingles"} keyed by {@code stateId + "_" + race}.
 */
@Service
public class GinglesService {

    private final GinglesRepository ginglesRepo;

    public GinglesService(GinglesRepository ginglesRepo) {
        this.ginglesRepo = ginglesRepo;
    }

    /**
     * Returns the Gingles document for the given state and racial group,
     * or {@code null} if not found.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    lowercase racial group key (e.g. "black")
     */
    @Cacheable(value = "gingles", key = "#stateId + '_' + #race")
    public GinglesDoc getGingles(String stateId, String race) {
        Optional<GinglesDoc> opt = ginglesRepo.findByStateIdAndRace(stateId, race.toLowerCase());
        return opt.orElse(null);
    }
}
