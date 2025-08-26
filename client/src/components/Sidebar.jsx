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
  // AdminPanelSettingsOutlined,
  HomeWorkOutlined,
  VisibilityOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import FlexBetween from "./FlexBetween";
import { API_BASE } from "../config";

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
  // { text: "Admin", icon: <AdminPanelSettingsOutlined />, path: "/admin" },
  {
    text: "Display Settings",
    icon: <SettingsOutlined />,
    path: "/admin/display-settings",
    parent: "Admin",
  },
];

const Sidebar = ({ user, drawerWidth, isSidebarOpen, setIsSidebarOpen }) => {
  const { pathname } = useLocation();
  const [active, setActive] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();
  const [counts, setCounts] = useState({ listings: null, news: null });

  useEffect(() => {
    setActive(pathname);
  }, [pathname]);

  // Load lightweight counts for listings and news to show a small banner
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = API_BASE || "";
        const [lsRes, nsRes] = await Promise.allSettled([
          fetch(`${base}/api/ddf/stats`, { credentials: "omit" }),
          fetch(`${base}/api/news/count`, { credentials: "omit" }),
        ]);
        const ls =
          lsRes.status === "fulfilled" && lsRes.value.ok
            ? await lsRes.value.json()
            : { propertyCount: null };
        const ns =
          nsRes.status === "fulfilled" && nsRes.value.ok
            ? await nsRes.value.json()
            : { count: null };
        if (!cancelled) {
          setCounts({
            listings: Number(ls.propertyCount ?? 0) || 0,
            news: Number(ns.count ?? 0) || 0,
          });
        }
      } catch {
        if (!cancelled) setCounts({ listings: 0, news: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <Box
        sx={{
          mx: 3,
          mt: 0,
          mb: 1,
          py: 1,
          px: 1.5,
          borderRadius: 1.5,
          color: theme.palette.secondary[100],
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.secondary[800]}`,
          fontSize: 13,
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Totals
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Listings: {counts.listings ?? "—"} · News: {counts.news ?? "—"}
        </Typography>
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
          const prefetchDisplaySettings = async () => {
            try {
              // Preload admin sections
              import(
                /* webpackPrefetch: true */ "../components/admin/SeasonalImagesSection"
              );
              import(
                /* webpackPrefetch: true */ "../components/admin/AISuggestionsSection"
              );
              // Prefetch images and stash into sessionStorage for quick first paint
              const base = API_BASE || "";
              const res = await fetch(`${base}/api/seasonal/images?t=${Date.now()}`, {
                credentials: "omit",
              });
              if (res.ok) {
                const data = await res.json();
                sessionStorage.setItem(
                  "seasonalImagesCache",
                  JSON.stringify({ ts: Date.now(), data })
                );
              }
            } catch {}
          };
          return (
            <ListItem key={text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(path);
                  setActive(path);
                }}
                onMouseEnter={() => {
                  if (path === "/admin/display-settings")
                    prefetchDisplaySettings();
                }}
                onFocus={() => {
                  if (path === "/admin/display-settings")
                    prefetchDisplaySettings();
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
