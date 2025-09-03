import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { themeSettings } from "theme";
import Layout from "scenes/layout";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useMemo } from "react";
import Listings from "scenes/listings";
import DisplayView from "scenes/listings/DisplayView";
import DisplaySettings from "scenes/admin/DisplaySettings";
import useWakeLock from "./hooks/useWakeLock";
import Status from "scenes/status/Status";

function App() {
  useWakeLock();
  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(
    () => responsiveFontSizes(createTheme(themeSettings(mode))),
    [mode]
  );
  return (
    <div className="app">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider
          router={createBrowserRouter(
            [
              {
                element: <Layout />,
                children: [
                  { path: "/", element: <Navigate to="/listings/display-view" replace /> },
                  { path: "/listings", element: <Listings /> },
                  { path: "/listings/display-view", element: <DisplayView /> },
                  { path: "/admin/display-settings", element: <DisplaySettings /> },
                  { path: "/status", element: <Status /> },
                ],
              },
            ],
            {
              future: {
                v7_relativeSplatPath: true,
              },
            }
          )}
          future={{ v7_startTransition: true }}
        />
      </ThemeProvider>
    </div>
  );
}

// Auth-related helper removed

export default App;
