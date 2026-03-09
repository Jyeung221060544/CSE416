package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.repository.EiKdeRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * EiService — serves {@code GET /api/states/{stateId}/ei?race=}.
 *
 * <p>Each call returns EI KDE curves for all candidates for a single racial
 * group (~2 KB).  The frontend's {@code eiRaceFilter} is a multi-select; when
 * the user toggles a race on, the frontend fetches that race's doc and merges
 * it client-side with previously fetched races.  Caching per (stateId, race)
 * makes repeat toggles instant.
 *
 * <p>Cached under {@code "ei_kde"} keyed by {@code stateId + "_" + race}.
 */
@Service
public class EiService {

    private final EiKdeRepository eiRepo;

    public EiService(EiKdeRepository eiRepo) {
        this.eiRepo = eiRepo;
    }

    /**
     * Returns the EI KDE document for the given state and racial group,
     * or {@code null} if not found.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race    racial group key — case-insensitive (e.g. "black", "Black")
     */
    @Cacheable(value = "ei_kde", key = "#stateId + '_' + #race.toLowerCase()")
    public EiKdeDoc getEiKde(String stateId, String race) {
        Optional<EiKdeDoc> opt = eiRepo.findByStateIdAndRaceIgnoreCase(stateId, race);
        return opt.orElse(null);
    }
}
