import React, { useState, useEffect } from "react";
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ChevronLeft,
  AdminPanelSettingsOutlined,
  HomeWorkOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import FlexBetween from "./FlexBetween";

const navItems = [
  {
    text: "Listings",
    icon: <HomeWorkOutlined />,
    // path: "/listings",
    hasSubItems: true,
  },
  {
    text: "Display View",
    icon: <VisibilityOutlined />,
    path: "/listings/display-view",
    parent: "Listings",
  },
  { text: "Management", icon: null },
  { text: "Admin", icon: <AdminPanelSettingsOutlined />, path: "/admin" },
];

const Sidebar = ({ user, drawerWidth, isSidebarOpen, setIsSidebarOpen }) => {
  const { pathname } = useLocation();
  const [active, setActive] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    setActive(pathname);
  }, [pathname]);

  const drawerContent = (
    <Box width="100%">
      <Box m="1.5rem 2rem 2rem 3rem">
        <FlexBetween color={theme.palette.secondary.main}>
          <Box display="flex" alignItems="center" gap="0.5rem">
            <Typography variant="h4" fontWeight="bold">
              Coastal Realty
            </Typography>
          </Box>
          <IconButton
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            sx={{ display: { md: "none" } }}
          >
            <ChevronLeft />
          </IconButton>
        </FlexBetween>
      </Box>
      <List>
        {navItems.map(({ text, icon, path, parent }) => {
          const isChild = !!parent;
          const isActive = active === path;
          if (!icon) {
            return (
              <Typography key={text} sx={{ m: "2.25rem 0 1rem 3rem" }}>
                {text}
              </Typography>
            );
          }
          return (
            <ListItem key={text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(path);
                  setActive(path);
                }}
                sx={{
                  backgroundColor: isActive
                    ? theme.palette.secondary[300]
                    : "transparent",
                  color: isActive
                    ? theme.palette.primary[600]
                    : theme.palette.secondary[100],
                  pl: isChild ? "3.75rem" : "2rem",
                }}
              >
                <ListItemIcon
                  sx={{
                    ml: isChild ? "1rem" : "2rem",
                    color: isActive
                      ? theme.palette.primary[600]
                      : theme.palette.secondary[200],
                  }}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box component="nav">
      <Drawer
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        variant="temporary"
        anchor="left"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            color: theme.palette.secondary[200],
            backgroundColor: theme.palette.background.alt,
            boxSizing: "border-box",
            borderWidth: "2px",
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        open={isSidebarOpen}
        variant="permanent"
        anchor="left"
        sx={{
          display: { xs: "none", md: isSidebarOpen ? "block" : "none" },
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            color: theme.palette.secondary[200],
            backgroundColor: theme.palette.background.alt,
            boxSizing: "border-box",
            borderWidth: 0,
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
