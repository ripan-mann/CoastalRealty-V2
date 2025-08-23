import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Divider,
  InputAdornment,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import {
  getDisplaySettings,
  updateDisplaySettings,
  listSeasonalImages,
  uploadSeasonalImages,
  deleteSeasonalImage,
  updateSeasonalSelection,
  previewGenerateSeasonalImage,
  createCheckoutForGeneratedImage,
  confirmGeneratedImage,
} from "state/api";
import { useDispatch } from "react-redux";
import { setDisplaySettings } from "state";
const SeasonalImagesSection = lazy(() =>
  import("../../components/admin/SeasonalImagesSection")
);
const AISuggestionsSection = lazy(() =>
  import("../../components/admin/AISuggestionsSection")
);

const DisplaySettings = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  // Store values in seconds in the form state
  const [form, setForm] = useState({
    listingSwitchMs: 60,
    photoRotateMs: 10,
    uploadedRotateMs: 15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // image preview modal
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectedIdsRef = useRef(new Set());
  const saveDebounceRef = useRef(null);
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionSaved, setSelectionSaved] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState(null);
  const [genPreview, setGenPreview] = useState({
    open: false,
    title: "",
    b64: "",
    idx: null,
    loading: false,
  });
  const GEN_LIMIT = 3;
  const [aiLimitMap, setAiLimitMap] = useState({}); // title -> { remaining, resetAt }

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getDisplaySettings();
      // Convert ms from backend into seconds for the UI
      setForm({
        listingSwitchMs: (data.listingSwitchMs ?? 60000) / 1000,
        photoRotateMs: (data.photoRotateMs ?? 10000) / 1000,
        uploadedRotateMs: (data.uploadedRotateMs ?? 15000) / 1000,
      });
    } catch (e) {
      // keep defaults, show quiet error
      console.error("Failed to load display settings", e);
    }
  }, []);

  const fetchImages = useCallback(async () => {
      try {
        setImagesLoading(true);
        // Seed from sessionStorage cache to reduce perceived wait
        try {
          const raw = sessionStorage.getItem("seasonalImagesCache");
          if (raw) {
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - Number(ts) < 15000 && Array.isArray(data)) {
              setImages(data);
              const sel0 = new Set(data.filter((i) => i.selected).map((i) => i._id));
              setSelectedIds(sel0);
              selectedIdsRef.current = sel0;
            }
          }
        } catch {}

        const data = await listSeasonalImages();
        const list = Array.isArray(data) ? data : [];
        setImages(list);
        const sel = new Set(list.filter((i) => i.selected).map((i) => i._id));
        setSelectedIds(sel);
        selectedIdsRef.current = sel;
        try {
          sessionStorage.setItem("seasonalImagesCache", JSON.stringify({ ts: Date.now(), data: list }));
        } catch {}
      } catch (e) {
        console.error("Failed to load images", e);
      }
      finally {
        setImagesLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchSettings();
    fetchImages();
  }, [fetchSettings, fetchImages]);

  // Replace static monthly suggestions with server-derived Canadian + BC holidays for the current month
  useEffect(() => {
    (async () => {
      try {
        const { getHolidays } = await import("state/api");
        const now = new Date();
        const list = await getHolidays(now.getFullYear(), ["CA", "CA-BC"]);
        const month = now.getMonth();
        const monthHolidays = (list || []).filter((h) => new Date(h.date).getMonth() === month);
        // Map to AI suggestions format
        let mapped = monthHolidays.map((h) => ({
          title: h.name,
          when: new Date(h.date).toISOString().slice(0, 10),
          type: h.region ? `Holiday • ${h.region}` : "Holiday",
          note: h.region === 'BC' ? 'Provincial (British Columbia)' : 'Canadian holiday',
          month: now.toLocaleString(undefined, { month: 'long' }),
        }));
        // Ensure both BC Day and Civic Holiday appear in August if applicable
        if (month === 7) { // August is 7
          const titles = new Set(mapped.map((x) => x.title.toLowerCase()))
          const firstMonday = (() => {
            const d = new Date(now.getFullYear(), 7, 1);
            const day = d.getDay();
            const offset = (8 - day) % 7 || 7; // days to next Monday
            d.setDate(d.getDate() + (day === 1 ? 0 : offset));
            return d.toISOString().slice(0, 10);
          })();
          if (!titles.has('bc day') && !titles.has('british columbia day')) {
            mapped.push({
              title: 'BC Day (British Columbia, CA)',
              when: firstMonday,
              type: 'Holiday • BC',
              note: 'Provincial (British Columbia)',
              month: now.toLocaleString(undefined, { month: 'long' }),
            });
          }
          if (!titles.has('civic holiday')) {
            mapped.push({
              title: 'Civic Holiday (various provinces, CA)',
              when: firstMonday,
              type: 'Holiday • Various provinces',
              note: 'Observed in many Canadian provinces',
              month: now.toLocaleString(undefined, { month: 'long' }),
            });
          }
          
        }

        // Ensure at least one seasonal event in addition to holidays
        if (mapped.length > 0) {
          const monthEvents = [
            'Winter Home Maintenance',
            'Home Energy Efficiency',
            'Spring Begins',
            'Garden & Lawn Prep',
            'Outdoor Living Setup',
            'Summer Curb Appeal',
            'Mid-Summer Home Check',
            'Back-to-School Prep',
            'Fall Home Prep',
            'Halloween Decor',
            'Winterization',
            'Holiday Home Safety',
          ];
          const monthEventWhen = ['Varies','Varies','March 20','Varies','Varies','Varies','Varies','Late August','Varies','Oct 31','Varies','Varies'];
          const eventNotes = [
            'Seal drafts, check filters, declutter.',
            'Programmable thermostats, insulation checks.',
            'Fresh decor, organizing spaces.',
            'Planting, tool cleanup, irrigation checks.',
            'Patios, BBQ zones, outdoor furniture.',
            'Landscaping, exterior touch-ups.',
            'Gutters, roofing check, exterior paint.',
            'Study nooks, schedules, storage.',
            'Furnace, gutters, weatherstripping.',
            'Tasteful decor ideas; safety first.',
            'Pipes, doors/windows, heating.',
            'Detectors, lights, package safety.',
          ];
          const eventTitle = monthEvents[month];
          if (!mapped.find(m => m.title.toLowerCase() === eventTitle.toLowerCase())) {
            mapped.push({
              title: eventTitle,
              when: monthEventWhen[month],
              type: 'Seasonal',
              note: eventNotes[month],
              month: now.toLocaleString(undefined, { month: 'long' }),
            });
          }
        }
    
        setSuggestions(mapped);

        // Prefetch per-event AI rate limits
        try {
          const { getAiGenRate } = await import("state/api");
          const entries = await Promise.all(
            mapped.map(async (s) => {
              const data = await getAiGenRate(s.title);
              return [s.title, { remaining: Number(data.remaining ?? GEN_LIMIT), resetAt: Date.now() + Number(data.resetInSec || 0) * 1000 }];
            })
          );
          setAiLimitMap(Object.fromEntries(entries));
        } catch {}
      } catch (e) {
        console.error('Failed to load holidays', e);
        // Fallback to existing static set if present
        setSuggestions([]);
      }
    })();
  }, []);

  const decAiLimit = (title) => {
    setAiLimitMap((prev) => {
      const cur = prev[title] || {
        remaining: GEN_LIMIT,
        resetAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      return {
        ...prev,
        [title]: {
          ...cur,
          remaining: Math.max(0, (cur.remaining ?? GEN_LIMIT) - 1),
        },
      };
    });
  };

  const timeLeftText = (title) => {
    const info = aiLimitMap[title];
    if (!info?.resetAt) return "later";
    const ms = Math.max(0, info.resetAt - Date.now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Handle Stripe checkout return to finalize saving the previewed image
  const confirmOnceRef = useRef({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const tmpId = params.get("tmpId");
    const sessionId = params.get("session_id");
    const key = `${tmpId}:${sessionId}`;
    if (
      checkout === "success" &&
      tmpId &&
      sessionId &&
      !confirmOnceRef.current[key]
    ) {
      confirmOnceRef.current[key] = true;
      (async () => {
        try {
          setSavingSelection(true);
          await confirmGeneratedImage(tmpId, sessionId);
          await fetchImages();
          setSelectionSaved(true);
        } catch (e) {
          console.error("Confirm generated image failed", e);
          setError(
            e?.response?.data?.error ||
              e.message ||
              "Failed to confirm generated image"
          );
        } finally {
          setSavingSelection(false);
          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete("checkout");
          url.searchParams.delete("tmpId");
          url.searchParams.delete("session_id");
          window.history.replaceState({}, document.title, url.toString());
        }
      })();
    }
  }, [fetchImages]);

  // Refetch when the tab regains focus or becomes visible
  useEffect(() => {
    const onFocus = () => {
      fetchImages();
      fetchSettings();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchImages, fetchSettings]);

  const handleChange = (field) => (e) => {
    const val = parseFloat(e.target.value);
    setForm((prev) => ({ ...prev, [field]: Number.isFinite(val) ? val : 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      // Convert seconds to ms for the backend
      const payload = {
        listingSwitchMs: Math.round((form.listingSwitchMs ?? 0) * 1000),
        photoRotateMs: Math.round((form.photoRotateMs ?? 0) * 1000),
        uploadedRotateMs: Math.round((form.uploadedRotateMs ?? 0) * 1000),
      };
      const updated = await updateDisplaySettings(payload);
      // Keep Redux store in ms for DisplayView timing
      dispatch(setDisplaySettings(updated));
      // Update local form back to seconds for UI
      setForm({
        listingSwitchMs: (updated.listingSwitchMs ?? 60000) / 1000,
        photoRotateMs: (updated.photoRotateMs ?? 10000) / 1000,
        uploadedRotateMs: (updated.uploadedRotateMs ?? 15000) / 1000,
      });
      setSaved(true);
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || "Failed to save";
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await uploadSeasonalImages(files);
      // Optimistically show new items and then refresh from server
      setImages((prev) => [...uploaded, ...prev]);
      await fetchImages();
    } catch (e) {
      console.error("Upload failed", e);
      setError(e?.response?.data?.error || e.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSeasonalImage(id);
      setImages((prev) => prev.filter((img) => img._id !== id));
      setSelectedIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        selectedIdsRef.current = copy;
        return copy;
      });
    } catch (e) {
      console.error("Delete failed", e);
      setError(e?.response?.data?.error || e.message || "Delete failed");
    }
  };

  const openPreview = (img) => {
    if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    setPreview(img);
  };
  const closePreview = () => setPreview(null);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      selectedIdsRef.current = copy;
      return copy;
    });
    // Auto-save with debounce so selection persists even if user navigates away
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    setSavingSelection(true);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateSeasonalSelection(
          Array.from(selectedIdsRef.current)
        );
        const list = Array.isArray(updated) ? updated : [];
        setImages(list);
        const sel = new Set(list.filter((i) => i.selected).map((i) => i._id));
        setSelectedIds(sel);
        selectedIdsRef.current = sel;
        setSelectionSaved(true);
      } catch (e) {
        console.error("Auto-save selection failed", e);
        setError(
          e?.response?.data?.error || e.message || "Failed to save selection"
        );
      } finally {
        setSavingSelection(false);
        setTimeout(() => setSelectionSaved(false), 1500);
      }
    }, 400);
  };

  const handleSaveSelection = async () => {
    setSavingSelection(true);
    setError("");
    try {
      const updated = await updateSeasonalSelection(Array.from(selectedIds));
      const list = Array.isArray(updated) ? updated : [];
      setImages(list);
      setSelectedIds(new Set(list.filter((i) => i.selected).map((i) => i._id)));
      setSelectionSaved(true);
    } catch (e) {
      console.error("Selection save failed", e);
      setError(
        e?.response?.data?.error || e.message || "Failed to save selection"
      );
    } finally {
      setSavingSelection(false);
      setTimeout(() => setSelectionSaved(false), 2000);
    }
  };

  // (Removed unused buildMonthlySuggestions helper to satisfy ESLint)

  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 4 }, minHeight: "100%" }}>
      <Container maxWidth="md" disableGutters>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 800 }}>
              Display Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure timers for the Display View. Values are in seconds.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 2.5,
              // Removed gradient styling; use theme-contained button
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {/* Card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            borderColor: alpha(theme.palette.primary.main, 0.2),
            backgroundColor: theme.palette.background.alt,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 0.5,
              fontWeight: 700,
              color: theme.palette.secondary.main,
            }}
          >
            Timers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tune how often listings switch, photos rotate, and uploaded images
            rotate.
          </Typography>
          <Divider
            sx={{
              mb: 2,
              opacity: 0.4,
              borderColor: alpha(theme.palette.secondary.main, 0.4),
            }}
          />

          <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
            <TextField
              label="Listing switch interval"
              type="number"
              size="small"
              value={form.listingSwitchMs}
              onChange={handleChange("listingSwitchMs")}
              inputProps={{ min: 1, step: 1 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">s</InputAdornment>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.secondary.main, 0.6),
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.secondary.main,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.secondary.main,
                },
              }}
              helperText="Time before moving to next listing (seconds)"
              fullWidth
            />

            <TextField
              label="Photo rotation interval"
              type="number"
              size="small"
              value={form.photoRotateMs}
              onChange={handleChange("photoRotateMs")}
              inputProps={{ min: 0.5, step: 0.5 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">s</InputAdornment>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.primary.main, 0.6),
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.primary.main,
                },
              }}
              helperText="Interval between photo grid rotations (seconds)"
              fullWidth
            />

            <TextField
              label="Uploaded images rotation interval"
              type="number"
              size="small"
              value={form.uploadedRotateMs}
              onChange={handleChange("uploadedRotateMs")}
              inputProps={{ min: 0.5, step: 0.5 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">s</InputAdornment>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.secondary.main, 0.6),
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.secondary.main,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.secondary.main,
                },
              }}
              helperText="Interval for rotating any uploaded seasonal images (seconds)"
              fullWidth
            />
          </Stack>

          <Box sx={{ mt: 3 }}>
            {saved && <Alert severity="success">Settings saved</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </Paper>

        <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={20} /></Box>} >
          <SeasonalImagesSection
            images={images}
            loading={imagesLoading}
            uploading={uploading}
            onUpload={handleUpload}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onSaveSelection={handleSaveSelection}
            savingSelection={savingSelection}
            selectionSaved={selectionSaved}
            onOpenPreview={openPreview}
            onDelete={handleDelete}
          />
        </Suspense>
        <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={20} /></Box>} >
          <AISuggestionsSection
            suggestions={suggestions}
            generatingIdx={generatingIdx}
            aiLimitMap={aiLimitMap}
            maxPerDay={GEN_LIMIT}
            timeLeftText={timeLeftText}
            uploading={uploading}
            onGenerate={async (s, idx) => {
              if (document && document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
              }
              const info = aiLimitMap[s.title];
              if (info && info.remaining <= 0) {
                setError(
                  `AI image generation limit reached for this event (${GEN_LIMIT} per 24h). Try again in ${timeLeftText(
                    s.title
                  )}.`
                );
                return;
              }
              try {
                setGeneratingIdx(idx);
                setGenPreview({
                  open: true,
                  title: s.title,
                  b64: "",
                  idx,
                  loading: true,
                });
                const prev = await previewGenerateSeasonalImage(s.title);
                setGenPreview({
                  open: true,
                  title: s.title,
                  b64: prev?.b64 || "",
                  idx,
                  loading: false,
                });
                if (prev?.rate) {
                  setAiLimitMap((map) => ({
                    ...map,
                    [s.title]: {
                      remaining: Number(prev.rate.remaining ?? 0),
                      resetAt:
                        Date.now() + Number(prev.rate.resetInSec || 0) * 1000,
                    },
                  }));
                } else {
                  decAiLimit(s.title);
                }
              } catch (e) {
                console.error("AI generate failed", e);
                const msg =
                  e?.response?.data?.error || e.message || "AI generate failed";
                setError(msg);
                if (e?.response?.status === 429) {
                  setAiLimitMap((map) => ({
                    ...map,
                    [s.title]: {
                      remaining: 0,
                      resetAt: Date.now() + 24 * 60 * 60 * 1000,
                    },
                  }));
                }
                setGenPreview({
                  open: false,
                  title: "",
                  b64: "",
                  idx: null,
                  loading: false,
                });
              } finally {
                setGeneratingIdx(null);
              }
            }}
          
            />
        </Suspense>
        {/* Image Preview Modal */}
        <Dialog
          open={!!preview}
          onClose={closePreview}
          maxWidth="md"
          fullWidth
          onContextMenu={(e) => e.preventDefault()}
        >
          <DialogTitle>{preview?.originalName || "Image Preview"}</DialogTitle>
          <DialogContent
            dividers
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            <Box
              sx={{ display: "flex", justifyContent: "center" }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
            >
              {preview && (
                <img
                  src={preview.url}
                  alt={preview.originalName}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitUserDrag: "none",
                  }}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={closePreview}
              variant="contained"
              sx={{ textTransform: "none" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* AI Generate Preview Modal */}
        <Dialog
          open={genPreview.open}
          onClose={() =>
            setGenPreview({
              open: false,
              title: "",
              b64: "",
              idx: null,
              loading: false,
            })
          }
          maxWidth="lg"
          fullWidth
          onContextMenu={(e) => e.preventDefault()}
        >
          <DialogTitle>AI Generated Preview — {genPreview.title}</DialogTitle>
          <DialogContent
            dividers
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            <Box
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              {genPreview.loading ? (
                <Typography variant="body2" color="text.secondary">
                  Generating preview...
                </Typography>
              ) : genPreview.b64 ? (
                <img
                  src={`data:image/png;base64,${genPreview.b64}`}
                  alt={genPreview.title}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitUserDrag: "none",
                  }}
                />
              ) : (
                <Typography variant="body2" color="error.main">
                  Failed to generate preview.
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              color="secondary"
              onClick={async () => {
                const title = genPreview.title;
                if ((aiLimitMap[title]?.remaining ?? GEN_LIMIT) <= 0) {
                  setError(
                    `AI image generation limit reached for this event (${GEN_LIMIT} per 24h). Try again in ${timeLeftText(
                      title
                    )}.`
                  );
                  return;
                }
                try {
                  setGenPreview((p) => ({ ...p, loading: true }));
                  const prev = await previewGenerateSeasonalImage(title);
                  setGenPreview((p) => ({
                    ...p,
                    b64: prev?.b64 || "",
                    loading: false,
                  }));
                  if (prev?.rate) {
                    setAiLimitMap((map) => ({
                      ...map,
                      [title]: {
                        remaining: Number(prev.rate.remaining ?? 0),
                        resetAt:
                          Date.now() + Number(prev.rate.resetInSec || 0) * 1000,
                      },
                    }));
                  } else {
                    decAiLimit(title);
                  }
                } catch (e) {
                  console.error("AI regenerate failed", e);
                  const msg =
                    e?.response?.data?.error ||
                    e.message ||
                    "AI regenerate failed";
                  setError(msg);
                  if (e?.response?.status === 429) {
                    setAiLimitMap((map) => ({
                      ...map,
                      [title]: {
                        remaining: 0,
                        resetAt: Date.now() + 24 * 60 * 60 * 1000,
                      },
                    }));
                  }
                  setGenPreview((p) => ({ ...p, loading: false }));
                }
              }}
              disabled={
                genPreview.loading ||
                (aiLimitMap[genPreview.title]?.remaining ?? GEN_LIMIT) <= 0
              }
              sx={{ textTransform: "none" }}
            >
              Retry
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, minWidth: 70 }}
            >
              {aiLimitMap[genPreview.title]?.remaining ?? GEN_LIMIT}/{GEN_LIMIT}{" "}
              remaining
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                try {
                  setGenPreview((p) => ({ ...p, loading: true }));
                  const resp = await createCheckoutForGeneratedImage(
                    genPreview.title,
                    genPreview.b64
                  );
                  setGenPreview((p) => ({ ...p, loading: false }));
                  if (resp?.url) window.location.href = resp.url;
                } catch (e) {
                  console.error("AI save failed", e);
                  setError(
                    e?.response?.data?.error ||
                      e.message ||
                      "Failed to start checkout"
                  );
                  setGenPreview((p) => ({ ...p, loading: false }));
                }
              }}
              disabled={genPreview.loading || !genPreview.b64}
              sx={{ textTransform: "none" }}
            >
              Use ($5)
            </Button>
          </DialogActions>
        </Dialog>
        {/* Global banner removed; per-event messages shown next to buttons */}
      </Container>
    </Box>
  );
};

export default DisplaySettings;
