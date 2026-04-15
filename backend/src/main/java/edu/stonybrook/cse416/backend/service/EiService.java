package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.repository.EiKdeRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * EiService — serves {@code GET /api/states/{stateId}/ei}.
 *
 * <p>Returns the full EI KDE document for the given state in one response.
 * The document is candidate-first; race filtering is done on the frontend
 * via {@code eiRaceFilter}.  Cached per stateId.
 */
@Service
public class EiService {

    private final EiKdeRepository eiRepo;

    public EiService(EiKdeRepository eiRepo) {
        this.eiRepo = eiRepo;
    }

    /**
     * Returns the EI KDE document for the given state, or {@code null} if not found.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     */
    @Cacheable(value = "ei_kde", key = "#stateId")
    public EiKdeDoc getEiKde(String stateId) {
        Optional<EiKdeDoc> opt = eiRepo.findById(stateId);
        return opt.orElse(null);
    }
}
