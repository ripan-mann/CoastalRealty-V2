import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { Routes } from "react-router-dom";
import { themeSettings } from "theme";
import Layout from "scenes/layout";
import { BrowserRouter, Navigate, Route } from "react-router-dom";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import Dashboard from "scenes/dashboard";
import Listings from "scenes/listings";
import DisplayView from "scenes/listings/DisplayView";
import Sold from "scenes/listings/Sold";
import OpenHouses from "scenes/listings/OpenHouses";

function App() {
  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);
  return (
    <div className="app">
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/"
                element={<Navigate to="/listings/display-view" replace />}
              />
              {/* <Route path="/dashboard" element={<Dashboard />} /> */}
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/display-view" element={<DisplayView />} />
              {/* <Route path="/listings/sold" element={<Sold />} />
              <Route path="/listings/open-houses" element={<OpenHouses />} /> */}
            </Route>
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
