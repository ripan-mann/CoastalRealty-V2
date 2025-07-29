import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  Avatar,
  Paper,
  Fade,
  IconButton,
  useTheme,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import {
  getProperties,
  getMemberByAgentKey,
  getOpenHouseByListingKey,
} from "../../state/api";
import realtyImage from "assets/c21-logo.png";
import { QRCodeCanvas } from "qrcode.react";
import { useOutletContext } from "react-router-dom";

const DISPLAY_DURATION = 6000; // 60 sec
const IMAGE_ROTATE_INTERVAL = 10000; // 10 sec

const formatTime = (timeString) => {
  const [hour, minute] = timeString.split(":");
  const date = new Date();
  date.setHours(+hour, +minute);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

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
  const [agentInfo, setAgentInfo] = useState(null);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const [currentPhotoSet, setCurrentPhotoSet] = useState([]);
  const [photoStartIndex, setPhotoStartIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const currentListing = properties[currentListingIndex];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { setIsSidebarOpen, setIsNavbarVisible } = useOutletContext();
  const [openHouseListingInfo, setOpenHouseListingInfo] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const displayedListingKeysRef = useRef([]);
  const theme = useTheme();

  const fetchProperties = async () => {
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
  };

  useEffect(() => {
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
  }, [currentListing?.ListAgentKey]);

  useEffect(() => {
    const fetchOpenHouseListing = async () => {
      if (!currentListing?.ListingKey) return;
      try {
        const data = await getOpenHouseByListingKey(
          currentListing.ListingKey.toString()
        );
        setOpenHouseListingInfo(data);
      } catch (err) {
        console.error("Failed to fetch open house info", err);
        setOpenHouseListingInfo(null);
      }
    };
    fetchOpenHouseListing();
  }, [currentListing?.ListingKey]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
        const currentListingCity = currentListing.City || "Vancouver";

        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${currentListingCity}&limit=1&appid=${apiKey}`
        );
        const geoData = await geoRes.json();

        if (geoData.length > 0) {
          const { lat, lon } = geoData[0];

          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
          );
          const weather = await weatherRes.json();

          setWeatherData({
            temp: weather.current.temp,
            desc: weather.current.weather[0].main,
            icon: weather.current.weather[0].icon,
            city: geoData[0].name,
          });
        }
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    };

    fetchWeather();
  }, [currentListing?.City]);

  const toggleFullscreen = () => {
    const element = document.documentElement;

    if (!isFullscreen) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.webkitRequestFullscreen)
        element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();

      setIsSidebarOpen(false); // 👈 hide sidebar
      setIsNavbarVisible(false); // 👈 hide navbar
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();

      setIsSidebarOpen(true); // 👈 show sidebar
      setIsNavbarVisible(true); // 👈 show navbar
    }

    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    if (properties.length === 0) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(async () => {
        const currentKey =
          properties[currentListingIndex]?.ListingKey?.toString();
        if (
          currentKey &&
          !displayedListingKeysRef.current.includes(currentKey)
        ) {
          displayedListingKeysRef.current.push(currentKey);
        }

        if (currentListingIndex + 1 >= properties.length) {
          await fetchProperties();
        } else {
          setCurrentListingIndex((prev) => prev + 1);
        }
        setPhotoStartIndex(0);
        setFadeIn(true);
      }, 500);
    }, DISPLAY_DURATION);
    return () => clearInterval(interval);
  }, [properties, currentListingIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentListing?.Media?.length > 6) {
        setPhotoStartIndex((prev) => {
          const maxIndex = currentListing.Media.length;
          return prev + 6 >= maxIndex ? 0 : prev + 6;
        });
      }
    }, IMAGE_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [currentListing]);

  useEffect(() => {
    if (currentListing) {
      const photos = currentListing.Media?.slice(
        photoStartIndex,
        photoStartIndex + 6
      );
      setCurrentPhotoSet(photos);
    }
  }, [photoStartIndex, currentListing]);

  if (!currentListing) return null;

  const monthlyMortgage = calculateMortgage(currentListing.ListPrice);

  return (
    <Fade in={fadeIn} timeout={500}>
      <Box sx={{ position: "relative" }}>
        <Box
          sx={{
            // p: 2,
            backgroundColor: "#fff",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            // width: "100vw",
            overflow: "hidden",
            pt: isFullscreen ? 10 : 0,
          }}
        >
          <Grid
            container
            // spacing={2}
            sx={{
              display: "flex",
              flexWrap: "nowrap", // prevent row wrapping
              height: "100%",
            }}
          >
            {/* Column 1: Agent Info, Property Info, QR Code */}
            <Grid
              item
              sx={{
                minWidth: "20%",
                maxWidth: "20%",
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  backgroundColor: "#fff",
                  color: "#000",
                  boxShadow: 0,
                }}
              >
                <Avatar
                  alt={`${agentInfo?.MemberFirstName} ${agentInfo?.MemberLastName}`}
                  src={
                    agentInfo?.Media?.[0]?.MediaURL ||
                    "/images/default-agent.png"
                  }
                  sx={{ width: 72, height: 72, mb: 1 }}
                />
                <Typography fontWeight="bold">
                  {`${agentInfo?.MemberFirstName || ""} ${
                    agentInfo?.MemberLastName || ""
                  }`}
                </Typography>
                <Typography variant="body2">
                  {agentInfo?.JobTitle || "Real Estate Agent"}
                </Typography>
                <Typography variant="body2">
                  {agentInfo?.MemberOfficePhone || "Phone not available"}
                </Typography>
                {agentInfo?.MemberSocialMedia?.[0]?.SocialMediaUrlOrId && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, wordBreak: "break-word" }}
                  >
                    <a
                      href={agentInfo.MemberSocialMedia[0].SocialMediaUrlOrId}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "#1976d2" }}
                    >
                      {agentInfo.MemberSocialMedia[0].SocialMediaUrlOrId}
                    </a>
                  </Typography>
                )}
              </Paper>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: "#fff",
                  color: "#000",
                  boxShadow: 0,
                }}
              >
                <Typography fontWeight="bold" gutterBottom>
                  {`${currentListing.StreetNumber || ""} ${
                    currentListing.StreetName || ""
                  } ${currentListing.StreetSuffix || ""}
                  `}
                </Typography>
                <Typography variant="body2">
                  {`${currentListing.City || ""}, ${
                    currentListing.StateOrProvince || ""
                  } ${currentListing.PostalCode || ""}`}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Price: ${currentListing.ListPrice?.toLocaleString() || "N/A"}
                </Typography>
                <ul style={{ paddingLeft: "16px", margin: 0 }}>
                  <li>{currentListing.BedroomsTotal || 0} Bedrooms</li>
                  <li>{currentListing.BathroomsTotalInteger || 0} Bathrooms</li>
                  <li>{currentListing.LivingArea || "N/A"} Sq. Ft.</li>
                  {currentListing.YearBuilt && (
                    <li>Built in {currentListing.YearBuilt}</li>
                  )}
                  {currentListing.LotSizeDimensions && (
                    <li>
                      Lot Size: {currentListing.LotSizeDimensions}{" "}
                      {currentListing.LotSizeUnits || ""}
                    </li>
                  )}
                  {currentListing.StructureType?.[0] && (
                    <li>Type: {currentListing.StructureType[0]}</li>
                  )}
                  {currentListing.ArchitecturalStyle?.[0] && (
                    <li>Style: {currentListing.ArchitecturalStyle[0]}</li>
                  )}
                  {currentListing.ParkingFeatures?.length > 0 && (
                    <li>
                      Parking: {currentListing.ParkingFeatures.join(", ")}
                    </li>
                  )}
                </ul>
                {/* Optional QR Code */}
                <QRCodeCanvas
                  value={`https://${currentListing.ListingURL}`}
                  size={150}
                  style={{
                    marginTop: "3rem",
                    backgroundColor: theme.palette.background.primary,
                  }}
                />

                <Typography variant="caption" display="block" mt={4}>
                  {new Date().toLocaleDateString("en-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Typography>

                <Typography variant="caption">
                  {new Date().toLocaleTimeString()}
                </Typography>
              </Paper>
            </Grid>

            {/* Column 2: Photo Grid */}
            <Grid
              item
              sx={{
                minWidth: "65%",
                maxWidth: "65%",
                height: "90%",
                overflow: "hidden",
              }}
            >
              <Grid
                container
                spacing={0}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexWrap: "wrap",
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

            {/* Column 3: Placeholder for future info */}
            <Grid item sx={{ minWidth: "15%", maxWidth: "15%" }}>
              <Box sx={{ textAlign: "center", color: "#000", px: 1 }}>
                <img
                  src={realtyImage}
                  alt="Century 21 Logo"
                  style={{ width: "100%", maxHeight: 100 }}
                />
                <Typography mt={2}>Coastal Realty Ltd</Typography>
                <Typography variant="body2" mt={2}>
                  (604) 599-4888
                </Typography>
                {Array.isArray(openHouseListingInfo) &&
                  openHouseListingInfo.length > 0 && (
                    <Box mt={4}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Open House
                      </Typography>
                      {openHouseListingInfo.map((entry) => (
                        <Box key={entry.OpenHouseKey} mb={2}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <CalendarTodayIcon fontSize="small" />
                            <Typography variant="body2">
                              {new Date(entry.OpenHouseDate).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <AccessTimeIcon fontSize="small" />
                            <Typography variant="body2">
                              {formatTime(entry.OpenHouseStartTime)} -{" "}
                              {formatTime(entry.OpenHouseEndTime)}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  )}
                {openHouseListingInfo &&
                  !Array.isArray(openHouseListingInfo) && (
                    <Typography mt={4}>{openHouseListingInfo}</Typography>
                  )}
                <Paper
                  elevation={3}
                  sx={{
                    mt: 4,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.background.alt
                        : theme.palette.background.default,
                    color: theme.palette.text.primary,
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{
                      color: theme.palette.secondary.main,
                      mb: 1,
                    }}
                  >
                    Mortgage Estimate
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ color: theme.palette.secondary[200] }}
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
                {weatherData && (
                  <Paper
                    sx={{
                      mt: 4,
                      p: 2,
                      borderRadius: 2,
                      textAlign: "center",
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? theme.palette.background.alt
                          : theme.palette.background.default,
                      color: theme.palette.text.primary,
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ color: theme.palette.secondary.main, mb: 1 }}
                    >
                      Current Weather
                    </Typography>
                    <img
                      src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                      alt={weatherData.desc}
                      style={{ width: 50, height: 50 }}
                    />
                    <Typography variant="h5" fontWeight="bold">
                      {Math.round(weatherData.temp)}°C | {weatherData.desc}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {weatherData.city}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
        <IconButton
          onClick={toggleFullscreen}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: isFullscreen ? 35 : 56,
            height: isFullscreen ? 35 : 56,
            borderRadius: "50%",
            backgroundColor: isFullscreen
              ? theme.palette.secondary[200]
              : theme.palette.primary[500],
            color: theme.palette.secondary[200],
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: isFullscreen ? 0 : 3,
            cursor: "pointer",
            zIndex: 9999,
            fontSize: 24,
          }}
        >
          {isFullscreen ? (
            <CloseIcon sx={{ color: "black" }} />
          ) : (
            <FullscreenIcon />
          )}
        </IconButton>
      </Box>
    </Fade>
  );
};

export default DisplayView;
