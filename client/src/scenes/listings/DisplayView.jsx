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

// const DISPLAY_DURATION = 6000; // 60 sec
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
  // const [photoStartIndex, setPhotoStartIndex] = useState(0);
  const [currentPhotoSetIndex, setCurrentPhotoSetIndex] = useState(0);
  const [totalPhotoSets, setTotalPhotoSets] = useState(0);
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

  // Remove a photo if the URL fails to load
  const handleImageError = (index) => {
    if (!currentListing) return;

    const globalIndex = currentPhotoSetIndex * 6 + index;

    setProperties((prev) => {
      const updated = [...prev];
      const listing = { ...updated[currentListingIndex] };
      if (Array.isArray(listing.Media)) {
        listing.Media = listing.Media.filter((_, i) => i !== globalIndex);
      }
      updated[currentListingIndex] = listing;

      const count = listing.Media?.length || 0;
      const rem = count % 6;
      let sets = Math.floor(count / 6);
      if (rem >= 4) sets += 1;
      setTotalPhotoSets(sets);
      if (currentPhotoSetIndex >= sets) {
        setCurrentPhotoSetIndex(sets > 0 ? sets - 1 : 0);
      }

      return updated;
    });

    // Remove from the current photo set so it disappears immediately
    setCurrentPhotoSet((prev) => prev.filter((_, i) => i !== index));
  };

  // Determine how many photo sets should be shown for the current listing
  useEffect(() => {
    if (!currentListing) return;
    const totalPhotos = currentListing.Media?.length || 0;
    const remainder = totalPhotos % 6;
    let sets = Math.floor(totalPhotos / 6);
    if (remainder >= 4) sets += 1;
    setTotalPhotoSets(sets);
    setCurrentPhotoSetIndex(0);
  }, [currentListing]);

  // Rotate through photo sets and move to the next listing when finished
  useEffect(() => {
    if (!currentListing) return;
    if (totalPhotoSets === 0) {
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
        setCurrentPhotoSetIndex(0);
        setFadeIn(true);
      }, 500);
      return;
    }

    const interval = setInterval(() => {
      if (currentPhotoSetIndex + 1 >= totalPhotoSets) {
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
          setCurrentPhotoSetIndex(0);
          setFadeIn(true);
        }, 500);
      } else {
        setCurrentPhotoSetIndex((prev) => prev + 1);
      }
    }, IMAGE_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [
    currentPhotoSetIndex,
    totalPhotoSets,
    currentListing,
    properties,
    currentListingIndex,
  ]);

  useEffect(() => {
    if (currentListing) {
      const startIndex = currentPhotoSetIndex * 6;
      const photos = currentListing.Media?.slice(startIndex, startIndex + 6);
      setCurrentPhotoSet(photos);
    }
  }, [currentPhotoSetIndex, currentListing]);

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
          <Grid container direction="column" sx={{ height: "100%" }}>
            <Grid item sx={{ flexGrow: 1 }}>
              <Grid container sx={{ height: "100%" }}>
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
                          href={
                            agentInfo.MemberSocialMedia[0].SocialMediaUrlOrId
                          }
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
                      Price: $
                      {currentListing.ListPrice?.toLocaleString() || "N/A"}
                    </Typography>
                    <ul style={{ paddingLeft: "16px", margin: 0 }}>
                      <li>{currentListing.BedroomsTotal || 0} Bedrooms</li>
                      <li>
                        {currentListing.BathroomsTotalInteger || 0} Bathrooms
                      </li>
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
                            onError={() => handleImageError(index)}
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
              <Grid item sx={{ width: "100%", mt: 2 }}>
                <Grid container alignItems="flex-start">
                  <Grid item sx={{ width: "15%", textAlign: "center", px: 1 }}>
                    <img
                      src={realtyImage}
                      alt="Century 21 Logo"
                      style={{ width: "100%", maxHeight: 100 }}
                    />
                    <Typography mt={2}>Coastal Realty Ltd</Typography>
                    <Typography variant="body2" mt={2}>
                      (604) 599-4888
                    </Typography>
                  </Grid>
                  {weatherData && (
                    <Grid item sx={{ width: "15%", px: 1 }}>
                      <Paper
                        sx={{
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
                    </Grid>
                  )}
                  <Grid item sx={{ flexGrow: 1, px: 1 }}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        height: "100%",
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Local News
                      </Typography>
                      <Typography variant="body2">
                        News feed coming soon...
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item sx={{ width: "20%", px: 1 }}>
                    <Paper
                      elevation={3}
                      sx={{
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
                        sx={{ color: theme.palette.secondary.main, mb: 1 }}
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
                  </Grid>
                </Grid>
              </Grid>
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
