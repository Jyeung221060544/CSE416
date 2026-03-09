package edu.stonybrook.cse416.backend.service;

import edu.stonybrook.cse416.backend.model.VoteSeatShareDoc;
import edu.stonybrook.cse416.backend.repository.VoteSeatShareRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * VoteSeatShareService — serves
 * {@code GET /api/states/{stateId}/vote-seat-share}.
 *
 * <p>Cached under {@code "vote_seat_share"} keyed by {@code stateId}.
 */
@Service
public class VoteSeatShareService {

    private final VoteSeatShareRepository vsRepo;

    public VoteSeatShareService(VoteSeatShareRepository vsRepo) {
        this.vsRepo = vsRepo;
    }

    /**
     * Returns the vote-seat share document for the given state,
     * or {@code null} if not found.
     *
     * @param stateId two-letter state abbreviation (e.g. "AL")
     */
    @Cacheable(value = "vote_seat_share", key = "#stateId")
    public VoteSeatShareDoc getVoteSeatShare(String stateId) {
        Optional<VoteSeatShareDoc> opt = vsRepo.findById(stateId);
        return opt.orElse(null);
    }
}
