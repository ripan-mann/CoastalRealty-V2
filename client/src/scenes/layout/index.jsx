import React, { useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
// import { useSelector } from "react-redux";
// import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";
// import { useGetUserQuery } from "state/api";

const Layout = () => {
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
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
        {/* {isNavbarVisible && (
          <Navbar
            // user={data || {}}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )} */}
        <Box
          sx={{
            height: "100vh",
            overflowY: pathname.startsWith("/admin/display-settings") ? "auto" : "hidden",
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
