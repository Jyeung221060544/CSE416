package edu.stonybrook.cse416.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CensusBlockService — builds an in-memory spatial index over census block
 * GeoJSON files so that viewport-bounded queries return only visible features.
 *
 * <h2>Index structure</h2>
 * Each feature line in the GeoJSON file is indexed as:
 * <ul>
 *   <li>File byte-offset (long) — where the line starts in the raw file</li>
 *   <li>Line byte-length (int)  — how many bytes to read</li>
 *   <li>Bounding box (4 floats) — minLon, minLat, maxLon, maxLat</li>
 * </ul>
 * Total memory: ~28 bytes × 185 K features ≈ 5 MB per state. The raw geometry
 * bytes stay on disk; only matching lines are read at query time.
 *
 * <h2>Query strategy</h2>
 * A linear scan over the bbox index (~5 MB) takes &lt;1 ms. Matching offsets are
 * sorted so that sequential disk reads are used wherever features cluster
 * geographically (typical for a zoomed-in viewport).
 */
@Service
public class CensusBlockService {

    private static final Logger log = LoggerFactory.getLogger(CensusBlockService.class);

    /** Maximum features returned per query — prevents accidental full-state dumps. */
    private static final int MAX_FEATURES = 50_000;

    @Value("${app.census.al-file:../frontend/src/assets/ALCensusMap.json}")
    private String alFilePath;

    @Value("${app.census.or-file:../frontend/src/assets/ORCensusMap.json}")
    private String orFilePath;

    // ── Per-state index ───────────────────────────────────────────────────────

    private static class StateIndex {
        File   file;
        int    count;
        long[] offsets;
        int[]  lengths;
        float[] minLon, minLat, maxLon, maxLat;
    }

    private final Map<String, StateIndex> indices = new ConcurrentHashMap<>();

    // ── Startup ───────────────────────────────────────────────────────────────

    @PostConstruct
    public void buildIndices() {
        buildIndex("AL", alFilePath);
        buildIndex("OR", orFilePath);
    }

    private void buildIndex(String state, String configPath) {
        File file = resolveFile(configPath);
        if (file == null || !file.exists()) {
            log.warn("[CensusBlock] {} file not found: {}", state,
                    configPath + " (resolved: " + (file != null ? file.getAbsolutePath() : "null") + ")");
            return;
        }

        log.info("[CensusBlock] Building index for {} ({} MB)...",
                state, file.length() / 1_048_576);
        long t0 = System.currentTimeMillis();

        // Temporary lists — converted to arrays after full scan
        List<Long>  offList  = new ArrayList<>(200_000);
        List<Integer> lenList = new ArrayList<>(200_000);
        List<float[]> bboxList = new ArrayList<>(200_000);

        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            long lineStart = 0;
            byte[] buf = new byte[16 * 1024]; // 16 KB read buffer
            StringBuilder sb = new StringBuilder(4096);
            long fileLen = raf.length();
            long pos = 0;

            while (pos < fileLen) {
                // Read chunk
                int toRead = (int) Math.min(buf.length, fileLen - pos);
                raf.seek(pos);
                int read = raf.read(buf, 0, toRead);
                if (read <= 0) break;

                for (int i = 0; i < read; i++) {
                    char c = (char) (buf[i] & 0xFF);
                    if (c == '\n') {
                        String line = sb.toString();
                        long lineEnd = pos + i + 1;
                        processLine(line, lineStart, (int)(lineEnd - lineStart),
                                offList, lenList, bboxList);
                        lineStart = lineEnd;
                        sb.setLength(0);
                    } else if (c != '\r') {
                        sb.append(c);
                    }
                }
                pos += read;
            }
            // Handle file not ending with newline
            if (sb.length() > 0) {
                String line = sb.toString();
                processLine(line, lineStart, (int)(fileLen - lineStart),
                        offList, lenList, bboxList);
            }

        } catch (IOException e) {
            log.error("[CensusBlock] Failed to build index for {}: {}", state, e.getMessage());
            return;
        }

        // Pack into parallel arrays
        int n = offList.size();
        StateIndex idx = new StateIndex();
        idx.file   = file;
        idx.count  = n;
        idx.offsets = new long[n];
        idx.lengths = new int[n];
        idx.minLon  = new float[n];
        idx.minLat  = new float[n];
        idx.maxLon  = new float[n];
        idx.maxLat  = new float[n];
        for (int i = 0; i < n; i++) {
            idx.offsets[i] = offList.get(i);
            idx.lengths[i] = lenList.get(i);
            float[] bb = bboxList.get(i);
            idx.minLon[i] = bb[0];
            idx.minLat[i] = bb[1];
            idx.maxLon[i] = bb[2];
            idx.maxLat[i] = bb[3];
        }
        indices.put(state.toUpperCase(), idx);

        log.info("[CensusBlock] Index for {} ready: {} features in {} ms",
                state, n, System.currentTimeMillis() - t0);
    }

    private void processLine(String line, long offset, int length,
                             List<Long> offList, List<Integer> lenList, List<float[]> bboxList) {
        String trimmed = line.trim();
        if (!trimmed.startsWith("{\"type\":\"Feature\"")) return;
        float[] bbox = parseBbox(trimmed);
        if (bbox == null) return;
        offList.add(offset);
        lenList.add(length);
        bboxList.add(bbox);
    }

    // ── Bbox parsing ──────────────────────────────────────────────────────────

    /**
     * Extracts the bounding box from a GeoJSON Feature line by scanning the
     * coordinate numbers directly — no full JSON parse needed.
     *
     * <p>GeoJSON coordinate arrays contain lon/lat pairs in strict alternating
     * order, interleaved only with structural characters ({@code [ ] ,}).
     * We scan for numbers and treat them as alternating lon, lat values.
     */
    private float[] parseBbox(String line) {
        int coordsStart = line.indexOf("\"coordinates\":");
        if (coordsStart < 0) return null;
        int propsStart = line.indexOf("\"properties\":", coordsStart);
        int end = propsStart > 0 ? propsStart : line.length();

        float minLon = Float.MAX_VALUE, minLat = Float.MAX_VALUE;
        float maxLon = -Float.MAX_VALUE, maxLat = -Float.MAX_VALUE;
        boolean expectLon = true;
        float lon = 0f;

        int i = coordsStart + 14; // skip past "coordinates":
        while (i < end) {
            char c = line.charAt(i);
            if (c == '-' || (c >= '0' && c <= '9')) {
                int start = i;
                if (c == '-') i++;
                while (i < end) {
                    char d = line.charAt(i);
                    if (d >= '0' && d <= '9' || d == '.') i++;
                    else break;
                }
                try {
                    float val = Float.parseFloat(line.substring(start, i));
                    if (expectLon) {
                        lon = val;
                        expectLon = false;
                    } else {
                        if (lon  < minLon) minLon = lon;
                        if (lon  > maxLon) maxLon = lon;
                        if (val  < minLat) minLat = val;
                        if (val  > maxLat) maxLat = val;
                        expectLon = true;
                    }
                } catch (NumberFormatException ignored) {
                    i++;
                }
            } else {
                i++;
            }
        }

        if (minLon == Float.MAX_VALUE) return null;
        return new float[]{minLon, minLat, maxLon, maxLat};
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    /**
     * Returns a GeoJSON FeatureCollection containing all census blocks whose
     * bounding box intersects the given viewport bbox.
     *
     * @param stateId  two-letter state code ("AL", "OR")
     * @param minLon   western longitude of viewport
     * @param minLat   southern latitude of viewport
     * @param maxLon   eastern longitude of viewport
     * @param maxLat   northern latitude of viewport
     * @return GeoJSON string, or {@code null} if the state index is not loaded
     * @throws IOException if file reads fail
     */
    public byte[] queryBbox(String stateId, double minLon, double minLat,
                            double maxLon, double maxLat) throws IOException {
        StateIndex idx = indices.get(stateId.toUpperCase());
        if (idx == null) return null;

        // Collect matching (offset, length) pairs
        List<long[]> hits = new ArrayList<>();
        float fMinLon = (float) minLon, fMinLat = (float) minLat;
        float fMaxLon = (float) maxLon, fMaxLat = (float) maxLat;

        for (int i = 0; i < idx.count; i++) {
            if (idx.maxLon[i] >= fMinLon && idx.minLon[i] <= fMaxLon
                    && idx.maxLat[i] >= fMinLat && idx.minLat[i] <= fMaxLat) {
                hits.add(new long[]{idx.offsets[i], idx.lengths[i]});
                if (hits.size() >= MAX_FEATURES) break;
            }
        }

        // Sort by offset for sequential disk reads
        hits.sort((a, b) -> Long.compare(a[0], b[0]));

        // Build the FeatureCollection response
        ByteArrayOutputStream baos = new ByteArrayOutputStream(hits.size() * 512);
        baos.write("{\"type\":\"FeatureCollection\",\"features\":[".getBytes(StandardCharsets.UTF_8));

        boolean first = true;
        try (RandomAccessFile raf = new RandomAccessFile(idx.file, "r")) {
            byte[] buf = new byte[8192];
            for (long[] hit : hits) {
                raf.seek(hit[0]);
                int lineLen = (int) hit[1];
                if (buf.length < lineLen) buf = new byte[lineLen];
                raf.readFully(buf, 0, lineLen);

                // Trim newline / carriage-return bytes at end
                int trimLen = lineLen;
                while (trimLen > 0 && (buf[trimLen - 1] == '\n' || buf[trimLen - 1] == '\r'
                        || buf[trimLen - 1] == ',')) {
                    trimLen--;
                }

                if (!first) baos.write(',');
                baos.write(buf, 0, trimLen);
                first = false;
            }
        }

        baos.write("]}".getBytes(StandardCharsets.UTF_8));
        return baos.toByteArray();
    }

    /** Returns true if the index for the given state is loaded and ready. */
    public boolean isReady(String stateId) {
        return indices.containsKey(stateId.toUpperCase());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private File resolveFile(String path) {
        File f = new File(path);
        if (f.isAbsolute()) return f;
        // Relative to project root (one level above the backend working directory)
        File fromRoot = new File("..", path);
        if (fromRoot.exists()) return fromRoot;
        // Also try relative to cwd directly (e.g. when running from project root)
        return f.exists() ? f : fromRoot;
    }
}
