import React from "react";
import { Box, Paper, Typography, Button, Divider, Stack } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

const AISuggestionsSection = ({
  suggestions,
  generatingIdx,
  aiLimitMap,
  maxPerDay,
  timeLeftText,
  onGenerate,
  uploading,
  monthLabel,
  onNextMonth,
  onThisMonth,
  isCurrentMonth,
}) => {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2.5, md: 3 }, borderRadius: 3, borderColor: alpha(theme.palette.secondary.main, 0.25), backgroundColor: theme.palette.background.alt }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
            AI Suggestions{monthLabel ? ` — ${monthLabel}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This month’s notable holidays and events for seasonal imagery.
          </Typography>
        </Box>
        { (onNextMonth || onThisMonth) && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {onThisMonth && (
              <Button size="small" variant="text" onClick={onThisMonth} disabled={isCurrentMonth} sx={{ textTransform: "none" }}>
                This Month
              </Button>
            )}
            {onNextMonth && (
              <Button size="small" variant="text" onClick={onNextMonth} sx={{ textTransform: "none" }}>
                Next Month
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 2, opacity: 0.4 }} />

      {(!suggestions || suggestions.length === 0) ? (
        <Typography variant="body2" color="text.secondary">No suggestions for this month.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {suggestions.map((s, idx) => (
            <Box key={`${s.title}-${idx}`} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{
                minWidth: 8,
                height: 8,
                mt: 0.5,
                borderRadius: "50%",
                backgroundColor: theme.palette.secondary.main,
              }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {s.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.month} • {s.when} • {s.type}
                </Typography>
                {s.note && (
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {s.note}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={() => onGenerate(s, idx)}
                  disabled={generatingIdx === idx || uploading || (aiLimitMap[s.title]?.remaining ?? maxPerDay) <= 0}
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  {generatingIdx === idx ? "Generating..." : "Generate AI Image"}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 70 }}>
                  {(aiLimitMap[s.title]?.remaining ?? maxPerDay)}/{maxPerDay} remaining
                </Typography>
                {(aiLimitMap[s.title]?.remaining ?? maxPerDay) <= 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Limit reached. Try again in {timeLeftText(s.title)}.
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default AISuggestionsSection;
