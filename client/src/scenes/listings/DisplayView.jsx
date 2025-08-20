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

import { getProperties, getMemberByAgentKey } from "../../state/api";
import realtyImage from "assets/c21-logo.png";
import { QRCodeCanvas } from "qrcode.react";
import { useOutletContext } from "react-router-dom";
import NewsFeed from "../../components/NewsFeed";

// const DISPLAY_DURATION = 6000; // 60 sec
const IMAGE_ROTATE_INTERVAL = 10000; // 10 sec

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
        setTimeout(() => {
          setCurrentPhotoSetIndex((prev) => prev + 1);
        }, 500);
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
      <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
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
            <Grid item sx={{ flexGrow: 1, overflow: "hidden", minHeight: 0 }}>
              <Grid container spacing={2} wrap="nowrap">
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
                          src={
                            agentInfo?.Media?.[0]?.MediaURL ||
                            "/images/default-agent.png"
                          }
                          sx={{ width: 100, height: 100, mb: 1 }}
                        />
                        <Typography
                          fontWeight="bold"
                          variant="h6"
                          sx={{ color: theme.palette.secondary[200] }}
                        >
                          {`${agentInfo?.MemberFirstName || ""} ${
                            agentInfo?.MemberLastName || ""
                          }`}
                        </Typography>
                        {/* <Typography variant="body2">
                        {agentInfo?.JobTitle || "Real Estate Agent"}
                      </Typography> */}
                        <Typography variant="body2">
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
                          mb: 6,
                        }}
                      >
                        <Typography
                          variant="h6"
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
                        <Typography variant="body2">
                          {`${currentListing.City || ""}, ${
                            currentListing.StateOrProvince || ""
                          } `}
                        </Typography>

                        <Stack spacing={0.5} mt={4}>
                          <Box display="flex" alignItems="center">
                            <BedIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              {currentListing.BedroomsTotal || 0} Bedrooms
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <BathtubIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              {currentListing.BathroomsTotalInteger || 0}{" "}
                              Bathrooms
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center">
                            <SquareFootIcon fontSize="large" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              {currentListing.LivingArea || "N/A"} Sq. Ft.
                            </Typography>
                          </Box>
                          {currentListing.YearBuilt && (
                            <Box display="flex" alignItems="center">
                              <CalendarMonthIcon
                                fontSize="large"
                                sx={{ mr: 1 }}
                              />
                              <Typography variant="body2">
                                Built in {currentListing.YearBuilt}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.LotSizeDimensions && (
                            <Box display="flex" alignItems="center">
                              <StraightenIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="body2">
                                Lot Size: {currentListing.LotSizeDimensions}{" "}
                                {currentListing.LotSizeUnits || ""}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.StructureType?.[0] && (
                            <Box display="flex" alignItems="center">
                              <HomeIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="body2">
                                Type: {currentListing.StructureType[0]}
                              </Typography>
                            </Box>
                          )}
                          {currentListing.ArchitecturalStyle?.[0] && (
                            <Box display="flex" alignItems="center">
                              <CategoryIcon fontSize="large" sx={{ mr: 1 }} />
                              <Typography variant="body2">
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
                              <Typography variant="body2">
                                Parking:{" "}
                                {currentListing.ParkingFeatures.join(", ")}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography
                          variant="h5"
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
                          pt: 5,
                          width: "100%",
                          textAlign: "center",
                          boxShadow: 0,
                          // backgroundColor: theme.palette.grey[100],
                        }}
                      >
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{
                            mb: 1,
                          }}
                        >
                          Mortgage Estimate
                        </Typography>
                        <Typography
                          variant="h5"
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
                    height: { xs: "60vh", md: "70vh", lg: "78vh" },
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
                pt: 2,
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
                    sx={{ maxHeight: { xs: 150, lg: 220 } }}
                  />
                </Box>

                <NewsFeed />
                <Paper
                  elevation={3}
                  sx={{
                    mr: 8,
                    ml: 8,
                    p: 2,
                    textAlign: "center",
                    boxShadow: 0,
                    // backgroundColor: theme.palette.grey[100],
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <QRCodeCanvas
                      value={`https://${currentListing.ListingURL}`}
                      size={150}
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
              ? theme.palette.grey[0]
              : theme.palette.primary[300],
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
