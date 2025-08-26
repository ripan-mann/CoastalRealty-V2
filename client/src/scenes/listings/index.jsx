import React from "react";
import PropertyList from "../../services/PropertyList";

const Listings = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Active Listings</h1>
      <PropertyList />
    </div>
  );
};

export default Listings;
