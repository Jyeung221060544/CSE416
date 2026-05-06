package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EiKdeDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.EiKdeRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * EiService — serves {@code GET /api/states/{stateId}/ei}.
 */
@Service
public class EiService {

    private final EiKdeRepository eiRepo;

    public EiService(EiKdeRepository eiRepo) {
        this.eiRepo = eiRepo;
    }

    /**
     * Returns the EI KDE document for the given state, or {@code null} if not found.
     */
    @Cacheable(value = "ei_kde", key = "#stateId")
    public EiKdeDoc getEiKde(State stateId) {
        Optional<EiKdeDoc> opt = eiRepo.findByStateId(stateId);
        return opt.orElse(null);
    }
}
