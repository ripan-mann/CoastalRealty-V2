import React, { useEffect, useState } from "react";
import { Box, IconButton, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
// import { useSelector } from "react-redux";
// import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";
// import { useGetUserQuery } from "state/api";
import MenuIcon from "@mui/icons-material/Menu";

const Layout = () => {
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const isSmall = useMediaQuery("(max-width:900px)");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const isFsActive = () => !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    const onFsChange = () => setIsFullscreen(isFsActive());
    onFsChange();
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, []);
  // const userId = useSelector((state) => state.global.userId);
  // const { data } = useGetUserQuery(userId);

  return (
    <Box
      display="flex"
      flexDirection={{ xs: "column", md: "row" }}
      width="100%"
      height="100%"
    >
      <Sidebar
        // user={data || {}}
        drawerWidth="250px"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <Box flexGrow={1}>
        {isSmall && !isSidebarOpen && !isFullscreen && (
          <IconButton
            aria-label="Open menu"
            onClick={() => setIsSidebarOpen(true)}
            size="large"
            sx={{
              position: "fixed",
              top: 10,
              left: 10,
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: (theme) => theme.palette.background.paper,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              boxShadow: 1,
              '&:hover': { backgroundColor: (theme) => theme.palette.background.default },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {/* {isNavbarVisible && (
          <Navbar
            // user={data || {}}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )} */}
        <Box
          sx={{
            height: { xs: "auto", md: "100vh" },
            overflowY: { xs: "auto", md: pathname.startsWith("/admin/display-settings") ? "auto" : "hidden" },
          }}
        >
          <Outlet
            context={{
              setIsSidebarOpen,
              setIsNavbarVisible,
              isSidebarOpen,
              isNavbarVisible,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
