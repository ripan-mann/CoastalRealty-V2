import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
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
  Tooltip,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import { CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { API_BASE } from "../../config";
import {
  getDisplaySettings,
  updateDisplaySettings,
  listSeasonalImages,
  uploadSeasonalImages,
  deleteSeasonalImage,
  updateSeasonalSelection,
} from "state/api";
import { useDispatch } from "react-redux";
import { setDisplaySettings } from "state";
const SeasonalImagesSection = lazy(() =>
  import("../../components/admin/SeasonalImagesSection")
);
// AI Suggestions section removed

// (No office filter UI currently)

const DisplaySettings = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  // Store values in seconds in the form state
  const [form, setForm] = useState({
    listingSwitchMs: 60,
    photoRotateMs: 10,
    uploadedRotateMs: 15,
    uploadedDisplayMs: 8,
    selectedCities: [],
    newsRotateMs: 50,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // image preview modal
  // AI suggestions removed
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectedIdsRef = useRef(new Set());
  const saveDebounceRef = useRef(null);
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionSaved, setSelectionSaved] = useState(false);
  const [allCities, setAllCities] = useState([]);
  // Load available cities for the selector (fast path)
  useEffect(() => {
    (async () => {
      try {
        const { listCities } = await import("state/api");
        const cities = await listCities();
        setAllCities(Array.isArray(cities) ? cities : []);
      } catch (e) {
        console.error("Failed to load cities", e);
        setAllCities([]);
      }
    })();
  }, []);
  // AI generation state removed

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getDisplaySettings();
      // Convert ms from backend into seconds for the UI
      setForm({
        listingSwitchMs: (data.listingSwitchMs ?? 60000) / 1000,
        photoRotateMs: (data.photoRotateMs ?? 10000) / 1000,
        uploadedRotateMs: (data.uploadedRotateMs ?? 15000) / 1000,
        uploadedDisplayMs: (data.uploadedDisplayMs ?? 8000) / 1000,
        selectedCities: Array.isArray(data.selectedCities)
          ? data.selectedCities
          : [],
        newsRotateMs: (data.newsRotateMs ?? 50000) / 1000,
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

  // City filter disabled for now — no city list fetch

  // No office API fetch — using static list for instant load

  // AI suggestions logic removed

  // AI generation helpers removed

  // Stripe checkout flow removed

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
        uploadedDisplayMs: Math.round((form.uploadedDisplayMs ?? 0) * 1000),
        selectedCities: Array.isArray(form.selectedCities) ? form.selectedCities : [],
        newsRotateMs: Math.round((form.newsRotateMs ?? 0) * 1000),
      };
      const updated = await updateDisplaySettings(payload);
      // Keep Redux store in ms for DisplayView timing
      dispatch(setDisplaySettings(updated));
      // Update local form back to seconds for UI
      setForm({
        listingSwitchMs: (updated.listingSwitchMs ?? 60000) / 1000,
        photoRotateMs: (updated.photoRotateMs ?? 10000) / 1000,
        uploadedRotateMs: (updated.uploadedRotateMs ?? 15000) / 1000,
        uploadedDisplayMs: (updated.uploadedDisplayMs ?? 8000) / 1000,
        selectedCities: Array.isArray(updated.selectedCities) ? updated.selectedCities : [],
        newsRotateMs: (updated.newsRotateMs ?? 50000) / 1000,
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
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  Listing switch interval
                  <Tooltip title="Time before moving to the next property listing." componentsProps={{ tooltip: { sx: { fontSize: '0.95rem' } } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
              type="number"
              size="small"
              value={form.listingSwitchMs}
              onChange={handleChange("listingSwitchMs")}
              inputProps={{ min: 1, step: 1 }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
              InputProps={{
                endAdornment: <InputAdornment position="end" sx={{ '& p, & span': { fontSize: '1rem' } }}>s</InputAdornment>,
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
                "& .MuiInputBase-input": { fontSize: '1.1rem' },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.secondary.main,
                },
                "& .MuiFormHelperText-root": { fontSize: '0.95rem' },
              }}
              helperText="Time before moving to next listing (seconds)"
              fullWidth
            />

            <TextField
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  Photo rotation interval
                  <Tooltip title="Interval between automatic photo grid rotations." componentsProps={{ tooltip: { sx: { fontSize: '0.95rem' } } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
              type="number"
              size="small"
              value={form.photoRotateMs}
              onChange={handleChange("photoRotateMs")}
              inputProps={{ min: 0.5, step: 0.5 }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
              InputProps={{
                endAdornment: <InputAdornment position="end" sx={{ '& p, & span': { fontSize: '1rem' } }}>s</InputAdornment>,
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
                "& .MuiInputBase-input": { fontSize: '1.1rem' },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.primary.main,
                },
                "& .MuiFormHelperText-root": { fontSize: '0.95rem' },
              }}
              helperText="Interval between photo grid rotations (seconds)"
              fullWidth
            />

            <TextField
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  Uploaded images rotation interval
                  <Tooltip title="How often any uploaded seasonal images rotate on the display." componentsProps={{ tooltip: { sx: { fontSize: '0.95rem' } } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
              type="number"
              size="small"
              value={form.uploadedRotateMs}
              onChange={handleChange("uploadedRotateMs")}
              inputProps={{ min: 0.5, step: 0.5 }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
              InputProps={{
                endAdornment: <InputAdornment position="end" sx={{ '& p, & span': { fontSize: '1rem' } }}>s</InputAdornment>,
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
                "& .MuiInputBase-input": { fontSize: '1.1rem' },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.secondary.main,
                },
                "& .MuiFormHelperText-root": { fontSize: '0.95rem' },
              }}
              helperText="Interval for rotating any uploaded seasonal images (seconds)"
              fullWidth
            />

            <TextField
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  Uploaded image display duration
                  <Tooltip title="How long a seasonal image stays visible when shown." componentsProps={{ tooltip: { sx: { fontSize: '0.95rem' } } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
              type="number"
              size="small"
              value={form.uploadedDisplayMs}
              onChange={handleChange("uploadedDisplayMs")}
              inputProps={{ min: 0.5, step: 0.5 }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
              InputProps={{
                endAdornment: <InputAdornment position="end" sx={{ '& p, & span': { fontSize: '1rem' } }}>s</InputAdornment>,
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
                "& .MuiInputBase-input": { fontSize: '1.1rem' },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.secondary.main,
                },
                "& .MuiFormHelperText-root": { fontSize: '0.95rem' },
              }}
              helperText="Duration each uploaded seasonal image is shown (seconds)"
              fullWidth
            />

            <TextField
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  News rotation interval
                  <Tooltip title="Time before moving to the next news headline." componentsProps={{ tooltip: { sx: { fontSize: '0.95rem' } } }}>
                    <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                  </Tooltip>
                </Box>
              }
              type="number"
              size="small"
              value={form.newsRotateMs}
              onChange={handleChange("newsRotateMs")}
              inputProps={{ min: 1, step: 1 }}
              InputLabelProps={{ sx: { fontSize: '1rem' } }}
              InputProps={{
                endAdornment: <InputAdornment position="end" sx={{ '& p, & span': { fontSize: '1rem' } }}>s</InputAdornment>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.info.main, 0.6),
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.info.main,
                  },
                },
                "& .MuiInputBase-input": { fontSize: '1.1rem' },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: theme.palette.info.main,
                },
                "& .MuiFormHelperText-root": { fontSize: '0.95rem' },
              }}
              helperText="Time before moving to next news headline (seconds)"
              fullWidth
            />
          </Stack>

          {/* City Filter disabled — using Office Filter only for now */}

          {/* City Filter */}
          <Box sx={{ mt: 3, maxWidth: 560 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              City Filter
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Choose which cities to include in the property rotation. Leave empty to include all.
            </Typography>
            <Autocomplete
              multiple
              options={["(Show all cities)", ...allCities]}
              value={form.selectedCities || []}
              onChange={(_e, val) => {
                const ALL = "(Show all cities)";
                if (Array.isArray(val) && val.includes(ALL)) {
                  setForm((p) => ({ ...p, selectedCities: [] }));
                } else {
                  setForm((p) => ({
                    ...p,
                    selectedCities: (val || []).filter((v) => v && v !== ALL),
                  }));
                }
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const tagProps = getTagProps({ index });
                  const { key, ...rest } = tagProps;
                  return (
                    <Chip key={key} variant="outlined" label={option} {...rest} />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selected Cities"
                  placeholder="Type to search cities"
                  size="small"
                />
              )}
            />
          </Box>

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
        {/* AI suggestions removed */}
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
                  src={(() => {
                    const url = preview?.url || "";
                    return url.startsWith("http") ? url : `${API_BASE || ''}${url}`;
                  })()}
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

        {/* AI generation modal removed */}
        {/* Global banner removed; per-event messages shown next to buttons */}
      </Container>
    </Box>
  );
};

export default DisplaySettings;
