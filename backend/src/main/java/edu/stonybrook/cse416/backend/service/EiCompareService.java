package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EiCompareDoc;
import edu.stonybrook.cse416.backend.model.State;
import edu.stonybrook.cse416.backend.repository.EiCompareRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Optional;

/**
 * EiCompareService — serves
 * {@code GET /api/states/{stateId}/ei-compare?race1=&race2=}.
 */
@Service
public class EiCompareService {

    private final EiCompareRepository eiCompareRepo;

    public EiCompareService(EiCompareRepository eiCompareRepo) {
        this.eiCompareRepo = eiCompareRepo;
    }

    /**
     * Builds the deterministic composite ID for a race pair — races are sorted
     * alphabetically so query-param order doesn't matter.
     */
    public static String buildId(State stateId, String race1, String race2) {
        String[] pair = { race1.toLowerCase(), race2.toLowerCase() };
        Arrays.sort(pair);
        return stateId.name() + "_eicompare_" + pair[0] + "_" + pair[1];
    }

    /**
     * Returns the EI-compare document for the given state and race pair,
     * or {@code null} if the pair was not computed.
     */
    @Cacheable(value = "ei_compare", key = "T(edu.stonybrook.cse416.backend.service.EiCompareService).buildId(#stateId, #race1, #race2)")
    public EiCompareDoc getEiCompare(State stateId, String race1, String race2) {
        String id = buildId(stateId, race1, race2);
        Optional<EiCompareDoc> opt = eiCompareRepo.findById(id);
        return opt.orElse(null);
    }
}
