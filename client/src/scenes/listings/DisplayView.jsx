import React, { useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import {
  Box,
  Grid,
  Typography,
  Avatar,
  Paper,
  Fade,
  Grow,
  IconButton,
  useTheme,
  Stack,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import BedIcon from "@mui/icons-material/Bed";
import BathtubIcon from "@mui/icons-material/Bathtub";
import SquareFootIcon from "@mui/icons-material/SquareFoot";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import StraightenIcon from "@mui/icons-material/Straighten";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import HomeIcon from "@mui/icons-material/Home";
import CategoryIcon from "@mui/icons-material/Category";

import { getProperties, getMemberByAgentKey, listSeasonalImages, getDisplaySettings } from "../../state/api";
import { useDispatch, useSelector } from "react-redux";
import { setDisplaySettings } from "../../state";
import LoadingScreen from "../../components/LoadingScreen";
import realtyImage from "assets/c21-logo.png";
import defaultProfile from "assets/profile.jpeg";
import { QRCodeCanvas } from "qrcode.react";
import { useOutletContext } from "react-router-dom";
const NewsFeedLazy = lazy(() => import("../../components/NewsFeed"));

// Intervals are configured from backend settings; defaults apply if not loaded

const calculateMortgage = (listPrice) => {
  if (!listPrice || isNaN(listPrice)) return null;
  const downPayment = listPrice * 0.2;
  const loanAmount = listPrice - downPayment;
  const interestRate = 0.045 / 12;
  const numberOfPayments = 25 * 12;
  const monthlyPayment =
    (loanAmount * interestRate) /
    (1 - Math.pow(1 + interestRate, -numberOfPayments));
  return monthlyPayment.toFixed(2);
};

const DisplayView = () => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState(null);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const [currentPhotoSet, setCurrentPhotoSet] = useState([]);
  // const [photoStartIndex, setPhotoStartIndex] = useState(0);
  const [currentPhotoSetIndex, setCurrentPhotoSetIndex] = useState(0);
  const [totalPhotoSets, setTotalPhotoSets] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const currentListing = properties[currentListingIndex];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { setIsSidebarOpen, setIsNavbarVisible } = useOutletContext();
  const [weatherData, setWeatherData] = useState(null);
  const [seasonalImages, setSeasonalImages] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const [overlayImageVisible, setOverlayImageVisible] = useState(true);
  const overlayCloseTimeoutRef = useRef(null);
  const overlayIntervalRef = useRef(null);
  const overlayTriggerIntervalRef = useRef(null);
  const overlayOpenRef = useRef(false);
  const displayedListingKeysRef = useRef([]);
  const theme = useTheme();
  const dispatch = useDispatch();
  const displaySettings = useSelector((s) => s.global.displaySettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const photoRotateMs = useMemo(() => {
    const v = Number(displaySettings?.photoRotateMs);
    return Number.isFinite(v) && v > 0 ? v : 10000;
  }, [displaySettings?.photoRotateMs]);

  const listingSwitchMs = useMemo(() => {
    const v = Number(displaySettings?.listingSwitchMs);
    return Number.isFinite(v) && v > 0 ? v : 60000;
  }, [displaySettings?.listingSwitchMs]);

  const uploadedRotateMs = useMemo(() => {
    const v = Number(displaySettings?.uploadedRotateMs);
    return Number.isFinite(v) && v > 0 ? v : 15000;
  }, [displaySettings?.uploadedRotateMs]);

  // Fetch seasonal images once (selected only)
  useEffect(() => {
    const loadSeasonal = async () => {
      try {
        const data = await listSeasonalImages(true);
        if (Array.isArray(data)) setSeasonalImages(data);
      } catch (e) {
        console.error("Failed to load seasonal images", e);
      }
    };
    loadSeasonal();
  }, []);

  // Ensure timers use the latest saved settings from the backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getDisplaySettings();
        // Data is in milliseconds; matches reducers and timer usage
        dispatch(setDisplaySettings(data));
        setSettingsLoaded(true);
      } catch (e) {
        console.error("Failed to load display settings", e);
        // Still allow defaults to run, but avoid double‑scheduling by marking loaded
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, [dispatch]);

  // Keep ref of open state
  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
  }, [overlayOpen]);

  // Schedule popup overlay of selected seasonal images on a global repeating interval
  useEffect(() => {
    // Clear any previous trigger interval
    if (overlayTriggerIntervalRef.current) {
      clearInterval(overlayTriggerIntervalRef.current);
      overlayTriggerIntervalRef.current = null;
    }

    if (!settingsLoaded) return;
    if (!seasonalImages || seasonalImages.length === 0) return;
    if (!(uploadedRotateMs > 0)) return;

    // First trigger after the interval, then every interval thereafter
    overlayTriggerIntervalRef.current = setInterval(() => {
      if (overlayOpenRef.current) return; // don't stack if already showing
      setOverlayIndex(0);
      setOverlayImageVisible(true);
      setOverlayOpen(true);
    }, uploadedRotateMs);

    return () => {
      if (overlayTriggerIntervalRef.current) {
        clearInterval(overlayTriggerIntervalRef.current);
        overlayTriggerIntervalRef.current = null;
      }
    };
  }, [settingsLoaded, seasonalImages, uploadedRotateMs]);

  // When overlay opens, cycle through images one by one, then close
  useEffect(() => {
    if (!overlayOpen) {
      if (overlayIntervalRef.current) clearInterval(overlayIntervalRef.current);
      if (overlayCloseTimeoutRef.current) clearTimeout(overlayCloseTimeoutRef.current);
      return;
    }
    const count = seasonalImages.length;
    if (count === 0) {
      setOverlayOpen(false);
      return;
    }
    // Show each image for the same duration as photoRotateMs with subtle fade
    overlayIntervalRef.current = setInterval(() => {
      setOverlayImageVisible(false);
      setTimeout(() => {
        setOverlayIndex((prev) => (prev + 1) % count);
        setOverlayImageVisible(true);
      }, 150);
    }, photoRotateMs);

    // Close after one full pass
    overlayCloseTimeoutRef.current = setTimeout(() => {
      setOverlayOpen(false);
    }, photoRotateMs * count);

    return () => {
      if (overlayIntervalRef.current) clearInterval(overlayIntervalRef.current);
      if (overlayCloseTimeoutRef.current) clearTimeout(overlayCloseTimeoutRef.current);
    };
  }, [overlayOpen, seasonalImages, photoRotateMs]);

  const fetchProperties = async () => {
    // Show loading only when first loading (avoid overlay during background refresh)
    if (properties.length === 0) setIsLoading(true);
    try {
      const data = await getProperties(displayedListingKeysRef.current);
      if (Array.isArray(data) && data.length > 0) {
        setProperties(data);
        setCurrentListingIndex(0);
      } else {
        displayedListingKeysRef.current = [];
        const fresh = await getProperties([]);
        setProperties(fresh || []);
        setCurrentListingIndex(0);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!currentListing?.ListAgentKey) return;
      try {
        const data = await getMemberByAgentKey(
          currentListing.ListAgentKey.toString()
        );
        setAgentInfo(data?.[0] || null);
      } catch (err) {
        console.error("Failed to fetch agent info", err);
        setAgentInfo(null);
      }
    };
    fetchAgent();
  }, [currentListing]);

  useEffect(() => {
    // Only fetch weather after properties are loaded and we have a listing with a city
    if (!currentListing || !currentListing.City) return;
    const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
    if (!apiKey) return;

    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const currentListingCity = currentListing.City;

        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
            currentListingCity
          )}&limit=1&appid=${apiKey}`
        );
        const geoData = await geoRes.json();

        if (!cancelled && Array.isArray(geoData) && geoData.length > 0) {
          const { lat, lon } = geoData[0];

          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
          );
          const weather = await weatherRes.json();

          if (!cancelled && weather?.current?.weather?.[0]) {
            setWeatherData({
              temp: weather.current.temp,
              desc: weather.current.weather[0].main,
              icon: weather.current.weather[0].icon,
              city: geoData[0].name,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch weather:", err);
        }
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [currentListing]);

  const isFullscreenActive = () =>
    !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

  const handleFullscreenChange = () => {
    const active = isFullscreenActive();
    setIsFullscreen(active);
    if (active) {
      setIsSidebarOpen(false);
      setIsNavbarVisible(false);
    } else {
      setIsSidebarOpen(true);
      setIsNavbarVisible(true);
    }
  };

  const handleFullscreenChangeCb = useCallback(() => {
    handleFullscreenChange();
  }, [setIsSidebarOpen, setIsNavbarVisible]);
  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChangeCb);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChangeCb);
    document.addEventListener("mozfullscreenchange", handleFullscreenChangeCb);
    document.addEventListener("MSFullscreenChange", handleFullscreenChangeCb);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChangeCb);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChangeCb);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChangeCb);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChangeCb);
    };
  }, [handleFullscreenChangeCb]);

  const toggleFullscreen = () => {
    const element = document.documentElement;
    const active = isFullscreenActive();

    if (!active) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.webkitRequestFullscreen)
        element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
      // UI is updated in the fullscreenchange handler to keep in sync
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      // UI is updated in the fullscreenchange handler
    }
  };

  useEffect(() => {
    if (!currentListing) return;
    const totalPhotos = currentListing.Media?.length || 0;
    const remainder = totalPhotos % 6;
    let sets = Math.floor(totalPhotos / 6);
    if (remainder >= 4) sets += 1;
    setTotalPhotoSets(sets);
    setCurrentPhotoSetIndex(0);
  }, [currentListing]);

  // Helper to advance to next listing, refreshing list when needed
  const advanceToNextListing = async () => {
    setFadeIn(false);
    setTimeout(async () => {
      const currentKey = properties[currentListingIndex]?.ListingKey?.toString();
      if (currentKey && !displayedListingKeysRef.current.includes(currentKey)) {
        displayedListingKeysRef.current.push(currentKey);
      }

      if (currentListingIndex + 1 >= properties.length) {
        await fetchProperties();
      } else {
        setCurrentListingIndex((prev) => prev + 1);
      }
      setCurrentPhotoSetIndex(0);
      setFadeIn(true);
    }, 500);
  };

  // Rotate through photo sets independently; listing switches strictly by timer
  useEffect(() => {
    if (!currentListing) return;
    if (totalPhotoSets === 0) return;

    const interval = setInterval(() => {
      setCurrentPhotoSetIndex((prev) => (prev + 1) % totalPhotoSets);
    }, photoRotateMs);
    return () => clearInterval(interval);
  }, [
    currentPhotoSetIndex,
    totalPhotoSets,
    currentListing,
    properties,
    currentListingIndex,
    photoRotateMs,
  ]);

  // Listing-level timeout to force switch even if photos continue
  useEffect(() => {
    if (!currentListing) return;
    const t = setTimeout(() => {
      advanceToNextListing();
    }, listingSwitchMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListingIndex, currentListing, listingSwitchMs]);

  useEffect(() => {
    if (currentListing) {
      const startIndex = currentPhotoSetIndex * 6;
      const photos = currentListing.Media?.slice(startIndex, startIndex + 6);
      setCurrentPhotoSet(photos);
    }
  }, [currentPhotoSetIndex, currentListing]);

  if (!currentListing) {
    return <LoadingScreen open={isLoading} message="Loading listings..." />;
  }

  const monthlyMortgage = calculateMortgage(currentListing.ListPrice);

  return (
    <Fade in={fadeIn} timeout={500} appear={false}>
      <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        <Fade in={overlayOpen && seasonalImages.length > 0} timeout={300} unmountOnExit>
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              backgroundColor: "rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
              cursor: "pointer",
            }}
            onClick={() => setOverlayOpen(false)}
          >
            <Grow in={overlayOpen} timeout={300}>
              <Box sx={{ maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  const base = process.env.REACT_APP_BASE_URL || "";
                  const item = seasonalImages[overlayIndex];
                  const url = item?.url || "";
                  const src = url.startsWith("http") ? url : `${base}${url}`;
                  return (
                    <img
                      src={src}
                      alt={item?.originalName || "Uploaded"}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        transition: "opacity 200ms ease-in-out",
                        opacity: overlayImageVisible ? 1 : 0,
                      }}
                    />
                  );
                })()}
              </Box>
            </Grow>
          </Box>
        </Fade>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            boxSizing: "border-box",
            pt: isFullscreen ? 3 : 0,
            overflow: "hidden",
          }}
        >
          <Grid
            container
            sx={{
              flexDirection: "column",
              height: "100%",
              gap: 2,
            }}
          >
            {/* Row 1: Agent and Photos */}
            <Grid
              item
              sx={{
                flexGrow: 1,
                overflow: "hidden",
                minHeight: 0,
                height: { xs: "60vh", md: "70vh", lg: "75vh" },
              }}
            >
              <Grid container spacing={2} wrap="nowrap" sx={{ height: "100%" }}>
                {/* Column 1: Agent Info, Property Info, QR Code */}
                <Grid
                  item
                  sx={{
                    flexShrink: 0,
                    flexBasis: { xs: "100%", md: "25%" },
                    maxWidth: { xs: "100%", md: "25%" },
                  }}
                >
                  <Stack spacing={2} sx={{ width: "100%" }}>
                    <Paper
                      sx={{
                        p: 2,
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        boxShadow: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          flexGrow: 1,
                        }}
                      >
                        <Avatar
                          alt={`${agentInfo?.MemberFirstName} ${agentInfo?.MemberLastName}`}
                          src={agentInfo?.Media?.[0]?.MediaURL || defaultProfile}
                          sx={{ width: 100, height: 100, mb: 1 }}
                        />
                        <Typography
                          fontWeight="bold"
                          variant="h4"
                          sx={{ color: theme.palette.secondary[200] }}
                        >
                          {`${agentInfo?.MemberFirstName || ""} ${
                            agentInfo?.MemberLastName || ""
                          }`}
                        </Typography>
                        {/* <Typography variant="body2">
                        {agentInfo?.JobTitle || "Real Estate Agent"}
                      </Typography> */}
                        <Typography variant="body1">
                          {agentInfo?.MemberOfficePhone ||
                            "Phone not available"}
                        </Typography>
                      </Box>
                      {agentInfo?.MemberSocialMedia?.[0]
                        ?.SocialMediaUrlOrId && (
                        <Box ml={2}>
                          <QRCodeCanvas
                            value={
                              agentInfo.MemberSocialMedia[0].SocialMediaUrlOrId
                            }
                            size={80}
                          />
                        </Box>
                      )}
                    </Paper>
                    <Divider
                      sx={{ bgcolor: theme.palette.grey[200], height: 2 }}
                    />
                    <Box sx={{ position: "relative", width: "100%" }}>
                      <Paper
                        sx={{
                          pl: 2,
                          pr: 2,
                          pb: 0,
                          width: "100%",
                          boxShadow: 0,
                          mt: 3,
                          mb: 3,
                        }}
                      >
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          gutterBottom
                          sx={{
                            color: theme.palette.secondary[200],
                          }}
                        >
                          {`${currentListing.StreetNumber || ""} ${
                            currentListing.StreetName || ""
                          } ${currentListing.StreetSuffix || ""}`}
                        </Typography>
                        <Typography variant="body1">
                          {`${currentListing.City || ""}, ${
                            currentListing.StateOrProvince || ""
                          } `}
                        </Typography>

                        <Stack spacing={0.5} mt={4}>
                          <Box display="flex" alignItems="center">
                            <BedIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="h4">
                              {currentListing.BedroomsTotal || 0} Bedrooms
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <BathtubIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="h4" pt={1}>
                              {currentListing.BathroomsTotalInteger || 0}{" "}
                              Bathrooms
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <SquareFootIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="h4" pt={1}>
                              {currentListing.LivingArea || "N/A"} Sq. Ft.
                            </Typography>
                          </Box>
                          {currentListing.YearBuilt && (
                            <Box display="flex" alignItems="center">
                              <CalendarMonthIcon
                                fontSize="large"
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="h4" pt={1}>
                                Built in {currentListing.YearBuilt}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.LotSizeDimensions && (
                            <Box display="flex" alignItems="center">
                              <StraightenIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="h4" pt={1}>
                                Lot Size: {currentListing.LotSizeDimensions}{" "}
                                {currentListing.LotSizeUnits || ""}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.StructureType?.[0] && (
                            <Box display="flex" alignItems="center">
                              <HomeIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="h4" pt={1}>
                                Type: {currentListing.StructureType[0]}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.ArchitecturalStyle?.[0] && (
                            <Box display="flex" alignItems="center">
                              <CategoryIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="h4" pt={1}>
                                Style: {currentListing.ArchitecturalStyle[0]}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.ParkingFeatures?.length > 0 && (
                            <Box display="flex" alignItems="center">
                              <DirectionsCarIcon
                                fontSize="large"
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="h4" pt={1}>
                                Parking:{" "}
                                {currentListing.ParkingFeatures.join(", ")}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          sx={{
                            mb: 1,
                            mt: 4,
                            color: theme.palette.secondary[200],
                          }}
                        >
                          Price: $
                          {currentListing.ListPrice?.toLocaleString() || "N/A"}
                        </Typography>
                      </Paper>
                      {weatherData && (
                        <Paper
                          sx={{
                            p: 2,
                            textAlign: "center",
                            position: "absolute",
                            top: 16,
                            right: 16,
                            boxShadow: 0,
                          }}
                        >
                          <img
                            src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                            alt={weatherData.desc}
                            style={{ width: 50, height: 50 }}
                          />
                          <Typography variant="h5" fontWeight="bold">
                            {Math.round(weatherData.temp)}°C |{" "}
                            {weatherData.desc}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {weatherData.city}
                          </Typography>
                        </Paper>
                      )}
                    </Box>
                    {monthlyMortgage && (
                      <Paper
                        sx={{
                          p: 2,
                          width: "100%",
                          textAlign: "center",
                          boxShadow: 0,
                          // backgroundColor: theme.palette.grey[100],
                        }}
                      >
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          sx={{
                            mb: 1,
                          }}
                        >
                          Mortgage Estimate
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          sx={{
                            color: theme.palette.secondary[200],
                          }}
                        >
                          ${monthlyMortgage}/month
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1,
                            display: "block",
                            color: theme.palette.text.secondary,
                          }}
                        >
                          Based on 20% down, 4.50% interest,
                          <br />
                          25-year amortization
                        </Typography>
                      </Paper>
                    )}
                  </Stack>
                </Grid>

                {/* Column 2: Photo Grid */}
                <Grid
                  item
                  sx={{
                    flexGrow: 1,
                    flexBasis: { xs: "100%", md: "75%" },
                    maxWidth: { xs: "100%", md: "75%" },
                    height: { xs: "60vh", md: "70vh", lg: "75vh" },
                    overflow: "hidden",
                    pr: 2,
                    zIndex: 99,
                  }}
                >
                  <Grid
                    container
                    spacing={0}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexWrap: "wrap",
                      minHeight: 0,
                    }}
                  >
                    {currentPhotoSet?.slice(0, 6).map((media, index) => (
                      <Grid
                        item
                        key={index}
                        xs={6}
                        sx={{
                          width: "50%",
                          height: "calc(100% / 3)", // Each row gets 1/3 height
                          p: 0.5,
                          boxSizing: "border-box",
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            component="img"
                            src={media.MediaURL}
                            alt={`Property ${index + 1}`}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Row 2: Logo, News and QR */}
            <Grid
              item
              sx={{
                position: "relative",
                zIndex: 3,
                mt: "auto",
                // backgroundColor: theme.palette.grey[100],
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  // flexWrap: "wrap",
                  width: "100%",
                  // position: "absolute",
                  // bottom: 0,
                  // left: 0,
                }}
              >
                <Box>
                  <Box
                    component="img"
                    src={realtyImage}
                    alt="Century 21 Logo"
                    sx={{ maxHeight: { xs: 150, lg: 180 } }}
                  />
                </Box>

                <Suspense fallback={null}>
                  <NewsFeedLazy />
                </Suspense>
                <Paper
                  elevation={3}
                  sx={{
                    mr: 8,
                    ml: 8,
                    // p: 2,
                    textAlign: "center",
                    boxShadow: 0,
                    // backgroundColor: theme.palette.grey[100],
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <QRCodeCanvas
                      value={`https://${currentListing.ListingURL}`}
                      size={120}
                      style={{
                        backgroundColor: theme.palette.background.primary,
                      }}
                    />
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
      </Box>
      {/* Small banner with active intervals (only show when not fullscreen) */}
      {!isFullscreen && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            left: 24,
            zIndex: 9999,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: theme.palette.background.alt,
            color: theme.palette.secondary[200],
            boxShadow: 2,
            opacity: 0.85,
          }}
        >
          <Typography variant="caption">
            Listing: {Math.round(listingSwitchMs / 1000)}s · Photos: {Math.round(photoRotateMs / 1000)}s · Uploads: {Math.round(uploadedRotateMs / 1000)}s
          </Typography>
        </Box>
      )}
        <IconButton
          onClick={toggleFullscreen}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: isFullscreen ? 35 : 56,
            height: isFullscreen ? 35 : 56,
            borderRadius: "50%",
            backgroundColor: isFullscreen ? "#fff" : theme.palette.primary[300],
            color: isFullscreen ? "#fff" : theme.palette.secondary[200],
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: isFullscreen ? 0 : 3,
            cursor: "pointer",
            zIndex: 9999,
            fontSize: 24,
            '&:hover': {
              backgroundColor: isFullscreen ? theme.palette.grey[400] : undefined,
            },
          }}
        >
          {isFullscreen ? (
            <CloseIcon sx={{ color: "#fff" }} />
          ) : (
            <FullscreenIcon />
          )}
        </IconButton>
      </Box>
    </Fade>
  );
};

export default DisplayView;
