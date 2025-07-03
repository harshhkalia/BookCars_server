import Car from "../models/Car.js";
import CarBookings from "../models/CarBooking.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const SaveCarBooking = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { carId, ownerId } = req.query;
    const { bookingContent } = req.body;

    const carBooking = await CarBookings.create({
      customerId: customerId,
      carId: carId,
      ownerId: ownerId,
      bookingText: bookingContent,
    });

    const savedCarBooking = await carBooking.save();

    if (savedCarBooking) {
      return res.status(200).json({
        message: "Your booking has been sent to owner successfully!!",
        carBooking: savedCarBooking,
      });
    }
  } catch (error) {
    console.error("Error saving car booking:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed due to some errors.",
        errors,
      });
    }

    return res
      .status(500)
      .json({ message: "An error occurred while sending your booking!!" });
  }
};

export const fetchAllPendingBookingsForOwner = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const carBookings = await CarBookings.find({
      ownerId: ownerId,
      bookingStatus: "Pending",
    });

    if (!carBookings.length) {
      return res
        .status(404)
        .json({ message: "No pending bookings found for this owner!" });
    }

    const bookingsWithDetails = await Promise.all(
      carBookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          throw new Error(`Customer not found for ID: ${booking.customerId}`);
        }

        const owner = await User.findById(booking.ownerId);
        if (!owner) {
          throw new Error(`Owner not found for ID: ${booking.ownerId}`);
        }

        return {
          ...booking.toObject(),
          customerFullName: `${customer.firstName} ${customer.lastName}`,
          customerPFP: customer.profilePic || null,
          ownerFullName: `${owner.firstName} ${owner.lastName}`,
          ownerPFP: owner.profilePic || null,
        };
      })
    );

    return res.status(200).json({ bookings: bookingsWithDetails });
  } catch (error) {
    console.error(
      "Failed to fetch all pending bookings for owner due to:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch pending bookings!",
      error: error.message,
    });
  }
};

export const changeBookingStatusToComplete = async (req, res) => {
  try {
    const { bookingId, carId, ownerReplyToCustomer } = req.body;
    const ownerId = req.user.userId;

    if (!ownerReplyToCustomer || ownerReplyToCustomer.trim().length < 5) {
      return res
        .status(400)
        .json({ message: "Owner reply must be at least 5 characters long." });
    }

    const booking = await CarBookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found!" });
    }

    if (booking.ownerId.toString() !== ownerId) {
      return res.status(403).json({ message: "Unauthorized access!" });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ message: "Car not found!" });
    }

    if (car.carsCount <= 0) {
      return res.status(400).json({
        message: "You don't have enough cars available to accept this booking!",
      });
    }

    car.carsCount -= 1;
    await car.save();

    booking.bookingStatus = "Accepted";
    booking.ownerReplyToBookingDate = new Date();
    booking.ownerReplyToBooking = ownerReplyToCustomer;
    await booking.save();

    return res.status(200).json({
      message:
        "Booking has been accepted successfully. The customer will be notified soon.",
      booking,
    });
  } catch (error) {
    console.error("Error while accepting booking:", error);
    return res.status(500).json({
      message: "Something went wrong. Unable to accept the booking.",
      error: error.message,
    });
  }
};

export const changeBookingStatusToReject = async (req, res) => {
  try {
    const { bookingId, reasonforRejection } = req.body;

    if (!bookingId || !reasonforRejection || reasonforRejection.trim().length < 5) {
      return res.status(400).json({
        message: "Booking ID and valid rejection reason (min 5 characters) are required.",
      });
    }

    const booking = await CarBookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found!" });
    }

    booking.bookingStatus = "Rejected";
    booking.ownerReplyToBooking = reasonforRejection;
    booking.ownerReplyToBookingDate = new Date();
    await booking.save();

    return res.status(200).json({
      message: "Booking has been rejected successfully.",
      booking,
    });
  } catch (error) {
    console.error("Error while rejecting booking:", error);
    return res.status(500).json({
      message: "Something went wrong. Unable to reject the booking.",
      error: error.message,
    });
  }
};

export const fetchCompletedBookingsForOwner = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const carBookings = await CarBookings.find({
      ownerId: ownerId,
      bookingStatus: "Accepted",
    });

    if (!carBookings.length) {
      return res
        .status(404)
        .json({ message: "No completed bookings found for this owner!" });
    }

    const bookingsWithDetails = await Promise.all(
      carBookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        const owner = await User.findById(booking.ownerId);
        const car = await Car.findById(booking.carId);

        if (!customer || !owner || !car) {
          return null;
        }

        return {
          ...booking.toObject(),
          customerFullName: `${customer.firstName} ${customer.lastName}`,
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          ownerFullName: `${owner.firstName} ${owner.lastName}`,
          ownerPFP: owner.profilePic || null,
          ownerEmail: owner.email,
          carName: car.modelName,
          carPrice: car.price,
          carCount: car.carsCount,
        };
      })
    );

    return res.status(200).json({
      bookings: bookingsWithDetails.filter(Boolean),
    });
  } catch (error) {
    console.error(
      "Failed to fetch all completed bookings for owner due to: ",
      error
    );
    return res
      .status(500)
      .json({ message: "Failed to fetch completed bookings!!" });
  }
};

export const fetchSpecificCarPendingDetails = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { carId } = req.query;

    if (!carId || !mongoose.Types.ObjectId.isValid(carId)) {
      return res
        .status(400)
        .json({ message: "Invalid or missing carId parameter!" });
    }

    const bookings = await CarBookings.find({
      carId,
      ownerId,
      bookingStatus: "Pending",
    });

    if (!bookings.length) {
      return res
        .status(404)
        .json({ message: "No pending bookings found for this car!!" });
    }

    const bookingsWithDetails = [];

    for (const booking of bookings) {
      const customer = await User.findById(booking.customerId);
      if (!customer) continue; // Skip if customer not found

      bookingsWithDetails.push({
        ...booking.toObject(),
        customerPFP: customer.profilePic || null,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
      });
    }

    return res.status(200).json({ bookings: bookingsWithDetails });
  } catch (error) {
    console.error(
      "Failed to fetch pending bookings for this car due to:",
      error
    );
    return res.status(500).json({
      message: "Failed to fetch pending bookings for this car!!",
    });
  }
};

export const fetchPendingBookingsForOtherCars = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { carId } = req.query;

    const bookings = await CarBookings.find({
      ownerId,
      bookingStatus: "Pending",
      carId: { $ne: carId },
    });

    const bookingsWithDetails = [];

    for (const booking of bookings) {
      const customer = await User.findById(booking.customerId);
      const car = await Car.findById(booking.carId);

      if (!customer || !car) continue; // Skip if either is missing

      bookingsWithDetails.push({
        ...booking.toObject(),
        customerPFP: customer.profilePic || null,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        carPFP: car.carImages || null,
        carName: car.modelName,
        carCount: car.carsCount,
        carPrice: car.price,
      });
    }

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No pending bookings for other cars found!" });
    }
  } catch (error) {
    console.error(
      "Failed to get pending bookings for other cars due to: ",
      error
    );
    return res.status(500).json({
      message: "Failed to get pending bookings for other cars!!",
    });
  }
};

export const fetchPendingBookingsForCustomer = async (req, res) => {
  try {
    const customerId = req.user.userId; // ✅ From JWT token

    const bookings = await CarBookings.find({
      customerId,
      bookingStatus: "Pending",
    });

    const bookingsWithDetails = [];

    for (const booking of bookings) {
      const customer = await User.findById(booking.customerId);
      const car = await Car.findById(booking.carId);
      const owner = await User.findById(booking.ownerId);

      // Skip this booking if any detail is missing
      if (!customer || !car || !owner) continue;

      bookingsWithDetails.push({
        ...booking.toObject(),
        customerPFP: customer.profilePic || null,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        carPFP: car.carImages || null,
        carName: car.modelName,
        carCount: car.carsCount,
        carPrice: car.price,
        ownerPFP: owner.profilePic || null,
        ownerEmail: owner.email,
        ownerName: `${owner.firstName} ${owner.lastName}`,
      });
    }

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No pending bookings found for this customer!!" });
    }
  } catch (error) {
    console.error("Error in fetchPendingBookingsForCustomer:", error);
    return res
      .status(500)
      .json({ message: "Failed to get pending bookings for customer!!" });
  }
};

export const fetchAcceptedBookingsForCustomer = async (req, res) => {
  try {
    const customerId = req.user.userId; // ✅ Extracted from JWT

    const bookings = await CarBookings.find({
      customerId,
      bookingStatus: "Accepted",
    });

    const bookingsWithDetails = [];

    for (const booking of bookings) {
      const customer = await User.findById(booking.customerId);
      const car = await Car.findById(booking.carId);
      const owner = await User.findById(booking.ownerId);

      // Skip this booking if any of the required data is missing
      if (!customer || !car || !owner) continue;

      bookingsWithDetails.push({
        ...booking.toObject(),
        customerPFP: customer.profilePic || null,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        carPFP: car.carImages || null,
        carName: car.modelName,
        carCount: car.carsCount,
        carPrice: car.price,
        ownerPFP: owner.profilePic || null,
        ownerEmail: owner.email,
        ownerName: `${owner.firstName} ${owner.lastName}`,
      });
    }

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res.status(404).json({
        message: "No accepted bookings found for this customer!!",
      });
    }
  } catch (error) {
    console.error("Error in fetchAcceptedBookingsForCustomer:", error);
    return res.status(500).json({
      message: "Failed to get accepted bookings for customer!!",
    });
  }
};

export const fetchRejectedBookingsForCustomer = async (req, res) => {
  try {
    const customerId = req.user.userId; // ✅ From token

    const bookings = await CarBookings.find({
      customerId,
      bookingStatus: "Rejected",
    });

    const bookingsWithDetails = [];

    for (const booking of bookings) {
      const customer = await User.findById(booking.customerId);
      const car = await Car.findById(booking.carId);
      const owner = await User.findById(booking.ownerId);

      // Skip this booking if any data is missing
      if (!customer || !car || !owner) continue;

      bookingsWithDetails.push({
        ...booking.toObject(),
        customerPFP: customer.profilePic || null,
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        carPFP: car.carImages || null,
        carName: car.modelName,
        carCount: car.carsCount,
        carPrice: car.price,
        ownerPFP: owner.profilePic || null,
        ownerEmail: owner.email,
        ownerName: `${owner.firstName} ${owner.lastName}`,
      });
    }

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res.status(404).json({
        message: "No Rejected bookings found for this customer!!",
      });
    }
  } catch (error) {
    console.error("Error in fetchRejectedBookingsForCustomer:", error);
    return res.status(500).json({
      message: "Failed to get Rejected bookings for customer!!",
    });
  }
};
