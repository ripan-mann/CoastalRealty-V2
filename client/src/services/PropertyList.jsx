// client/src/components/PropertyList.jsx
import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CardActions,
  Button,
  CircularProgress,
  Container,
} from "@mui/material";
import { getProperties } from "../state/api";
import { normalizeUrl, isResolvableUrl } from "../utils/url";

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getProperties();
        setProperties(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching properties", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Container sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Property Listings
      </Typography>
      <Grid container columns={12} columnSpacing={3} rowSpacing={3}>
        {properties.map((properties) => {
          const imageUrl = isResolvableUrl(properties?.Media?.[0]?.MediaURL)
            ? properties.Media[0].MediaURL
            : "https://via.placeholder.com/400";
          const listingHref = isResolvableUrl(properties.ListingURL)
            ? normalizeUrl(properties.ListingURL)
            : undefined;
          return (
            <Grid xs={12} sm={6} md={4} key={properties.ListingKey}>
              <Card
                sx={{ height: "100%", display: "flex", flexDirection: "column" }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={imageUrl}
                  alt="Property Image"
                />
                <CardContent>
                  <Typography variant="h6">
                    {properties.UnparsedAddress || "No Address"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    ${properties.ListPrice?.toLocaleString() || "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {properties.BedroomsTotal || 0} Beds •{" "}
                    {properties.BathroomsTotalInteger || 0} Baths •{" "}
                    {properties.LivingArea || "N/A"} sqft
                  </Typography>
                </CardContent>
                <CardActions>
                  {listingHref && (
                    <Button
                      size="small"
                      href={listingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Listing
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default PropertyList;
