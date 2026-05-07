package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.GinglesDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.GinglesRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * GinglesService — serves {@code GET /api/states/{stateId}/gingles?race=}.
 */
@Service
public class GinglesService {

    private final GinglesRepository ginglesRepo;

    public GinglesService(GinglesRepository ginglesRepo) {
        this.ginglesRepo = ginglesRepo;
    }

    // Gingles payloads are large and static, so cache each state/race lookup.
    @Cacheable(value = "gingles", key = "#stateId + '_' + #race")
    public GinglesDoc getGingles(State stateId, String race) {
        Optional<GinglesDoc> opt = ginglesRepo.findByStateIdAndRace(stateId, race.toLowerCase());
        return opt.orElse(null);
    }
}
