import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VehicleCard as PremiumVehicleCard } from '../VehicleCard';

const VehicleCardWrapper = ({ vehicle }) => {
  const navigate = useNavigate();
  const vehicleId = vehicle.slug || vehicle._id || vehicle.id;

  // Extract make and model from make_model or name
  const nameString = vehicle.make_model || vehicle.name || 'Unknown Vehicle';
  const nameParts = nameString.split(' ');
  const make = vehicle.make || nameParts[0] || 'Unknown';
  const model = vehicle.model || nameParts.slice(1).join(' ') || '';

  // Map API data to the Premium VehicleCard format
  const mappedVehicle = {
    id: vehicleId,
    make: make,
    model: model,
    variant: vehicle.variant || '',
    year: vehicle.year || vehicle.modelYear || 'N/A',
    price: vehicle.price || 0,
    priceFormatted: `Ksh ${vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}`,
    mileage: vehicle.mileage || 0,
    primaryImage: vehicle.images?.[0] || vehicle.primaryImage || "https://via.placeholder.com/800x600?text=No+Image+Available",
    bodyType: vehicle.bodyType || vehicle.body_type || 'SUV',
    stockId: vehicle.stockId || vehicleId?.slice?.(-6)?.toUpperCase() || 'N/A',
    location: vehicle.location || 'Kisumu',
    status: vehicle.status || 'Available',
    drive: vehicle.driveType || vehicle.drive || '4WD',
    fuel: vehicle.fuel_type || vehicle.fuelType || vehicle.fuel || 'Petrol',
    transmission: vehicle.transmission || 'Auto',
    engineCapacity: vehicle.engine_size || vehicle.engineCapacity || vehicle.ccRating || 'N/A',
    color: vehicle.color || vehicle.exteriorColor || 'N/A'
  };

  return (
    <PremiumVehicleCard
      vehicle={mappedVehicle}
      currency="KES"
      isFavorite={false}
      isCompared={false}
      onToggleFavorite={() => {}}
      onToggleCompare={() => {}}
      onOpenDetails={() => navigate(`/vehicle/${vehicleId}`)}
      onInquire={() => {
        // Prepare WhatsApp message
        const message = `Hello, I'm interested in the ${make} ${model} (Stock: ${mappedVehicle.stockId}) listed for ${mappedVehicle.priceFormatted}.`;
        const phone = "254700000000"; // Default, could be env variable
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }} 
    />
  );
};

export default memo(VehicleCardWrapper);