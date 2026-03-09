package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.EiCompareDoc;
import edu.stonybrook.cse416.backend.repository.EiCompareRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Optional;

/**
 * EiCompareService — serves
 * {@code GET /api/states/{stateId}/ei-compare?race1=&race2=}.
 *
 * <p>Looks up the EI-compare document by building the deterministic composite
 * ID used at seed time: {@code "{stateId}_eicompare_{r1}_{r2}"} where the two
 * race params are sorted alphabetically (matching the DataLoader convention).
 *
 * <p>Cached under {@code "ei_compare"} keyed by the composite document ID.
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
     *
     * @param stateId two-letter state abbreviation
     * @param race1   first racial group (any case)
     * @param race2   second racial group (any case)
     * @return composite ID string, e.g. "AL_eicompare_black_white"
     */
    public static String buildId(String stateId, String race1, String race2) {
        String[] pair = { race1.toLowerCase(), race2.toLowerCase() };
        Arrays.sort(pair);
        return stateId + "_eicompare_" + pair[0] + "_" + pair[1];
    }

    /**
     * Returns the EI-compare document for the given state and race pair,
     * or {@code null} if the pair was not computed.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     * @param race1   first racial group (order doesn't matter)
     * @param race2   second racial group
     */
    @Cacheable(value = "ei_compare", key = "T(edu.stonybrook.cse416.backend.service.EiCompareService).buildId(#stateId, #race1, #race2)")
    public EiCompareDoc getEiCompare(String stateId, String race1, String race2) {
        String id = buildId(stateId, race1, race2);
        Optional<EiCompareDoc> opt = eiCompareRepo.findById(id);
        return opt.orElse(null);
    }
}
