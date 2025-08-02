import React from "react";
import { Backdrop, CircularProgress, Typography, Box } from "@mui/material";

const LoadingScreen = ({ open, message }) => (
  <Backdrop
    sx={{
      backgroundColor: "#21295c",
      zIndex: (theme) => theme.zIndex.drawer + 1,
    }}
    open={open}
  >
    <Box textAlign="center">
      <CircularProgress backgroundColor="#ffe3a3" />
      {message && (
        <Typography color="#fff6e0" variant="h6" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  </Backdrop>
);

export default LoadingScreen;
