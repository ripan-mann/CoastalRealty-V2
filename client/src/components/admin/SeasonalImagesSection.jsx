import React from "react";
import { Box, Paper, Typography, Button, Divider, CircularProgress } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const SeasonalImagesSection = ({
  images,
  loading,
  uploading,
  onUpload,
  selectedIds,
  onToggleSelected,
  onSaveSelection,
  savingSelection,
  selectionSaved,
  onOpenPreview,
  onDelete,
}) => {
  const theme = useTheme();
  return (
    <Paper
      variant="outlined"
      sx={{ mt: 3, p: { xs: 2.5, md: 3 }, borderRadius: 3, borderColor: alpha(theme.palette.primary.main, 0.2), backgroundColor: theme.palette.background.alt }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
            Seasonal Images
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload images to rotate during seasonal events.
          </Typography>
        </Box>
        <Button component="label" variant="contained" disabled={uploading} sx={{ textTransform: "none", borderRadius: 2, px: 2.5 }}>
          {uploading ? "Uploading..." : "Upload Images"}
          <input hidden multiple accept="image/*" type="file" onChange={onUpload} />
        </Button>
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.4 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        {selectionSaved && (
          <Typography variant="body2" color="success.main">Selection saved</Typography>
        )}
        <Button
          variant="outlined"
          onClick={onSaveSelection}
          disabled={savingSelection}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {savingSelection ? "Saving..." : "Save Selection"}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : images.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No images uploaded yet.</Typography>
      ) : (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 2,
        }}>
          {images.map((img) => (
            <Paper key={img._id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Box sx={{
                width: "100%",
                height: 100,
                borderRadius: 1.5,
                overflow: "hidden",
                mb: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(theme.palette.text.primary, 0.05),
              }} onContextMenu={(e) => e.preventDefault()}>
                <img
                  src={img.url}
                  alt={img.originalName}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitUserDrag: "none",
                  }}
                />
              </Box>
              <Typography variant="caption" noWrap title={img.originalName} sx={{ display: "block", mb: 0.5 }}>
                {img.originalName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(img._id)}
                  onChange={() => onToggleSelected(img._id)}
                  id={`select-${img._id}`}
                />
                <label htmlFor={`select-${img._id}`} style={{ fontSize: 12 }}>
                  {selectedIds.has(img._id) ? "selected" : "select"}
                </label>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={() => onOpenPreview(img)}
                  sx={{ textTransform: "none" }}
                >
                  View
                </Button>
                <Button size="small" color="error" onClick={() => onDelete(img._id)} sx={{ textTransform: "none" }}>
                  Delete
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default SeasonalImagesSection;
