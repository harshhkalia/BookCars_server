import Car from "../models/Car.js";
import CarBookings from "../models/CarBooking.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const SaveCarBooking = async (req, res) => {
  try {
    const { customerId, carId, ownerId } = req.query;
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
        message: "Your booking has been send to owner successfully!!",
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
    const { ownerId } = req.query;

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
    const { bookingId, carId } = req.query;
    const { ownerReplyToCustomer } = req.body;

    if (!ownerReplyToCustomer || ownerReplyToCustomer.trim().length < 5) {
      return res
        .status(400)
        .json({ message: "Owner reply must be at least 5 characters long." });
    }

    const booking = await CarBookings.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found!" });
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

export const rejectPendingBooking = async (req, res) => {
  try {
    const { bookingId } = req.query;
    const { reasonforRejection } = req.body;

    if (!reasonforRejection || reasonforRejection.trim().length < 5) {
      return res.status(400).json({
        message: "Reason for rejection must be at least 5 characters long.",
      });
    }

    const booking = await CarBookings.findById(bookingId);
    if (!booking) {
      return res.status(400).json({ message: "Booking not found!!" });
    }
    booking.bookingStatus = "Rejected";
    booking.whyRejected = reasonforRejection;
    await booking.save();
    return res
      .status(200)
      .json({ message: "Booking has been rejected successfully!!", booking });
  } catch (error) {
    console.error("Failed to reject booking due to:", error);
    return res
      .status(500)
      .json({ message: "Failed to reject booking, please try again!!" });
  }
};

export const fetchCompletedBookingsForOwner = async (req, res) => {
  try {
    const { ownerId } = req.query;

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
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        const owner = await User.findById(booking.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Owner not found!!" });
        }

        const car = await Car.findById(booking.carId);
        if (!car) {
          return res.status(400).json({ message: "Car not found!!" });
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

    return res.status(200).json({ bookings: bookingsWithDetails });
  } catch (error) {
    console.error(
      "Failed to fetch all completed bookings for owner due to : ",
      error
    );
    return res
      .status(500)
      .json({ message: "Failed to fetch completed bookings!!" });
  }
};

export const fetchSpecificCarPendingDetails = async (req, res) => {
  try {
    const { carId } = req.query;

    if (!carId || !mongoose.Types.ObjectId.isValid(carId)) {
      return res
        .status(400)
        .json({ message: "Invalid or missing carId parameter!" });
    }

    const bookings = await CarBookings.find({
      carId: carId,
      bookingStatus: "Pending",
    });

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        return {
          ...booking.toObject(),
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          customerName: customer.firstName + " " + customer.lastName,
        };
      })
    );

    if (bookings.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No pending bookings found for this car!!" });
    }
  } catch (error) {
    console.error(
      "Failed to fetch pending bookings for this car due to : ",
      error
    );
    return res
      .status(500)
      .json({ message: "Failed to fetch pending bookings for this car!!" });
  }
};

export const fetchPendingBookingsForOtherCars = async (req, res) => {
  try {
    const { carId, ownerId } = req.query;
    const bookings = await CarBookings.find({
      ownerId: ownerId,
      bookingStatus: "Pending",
      carId: { $not: { $eq: carId } },
    });
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        const car = await Car.findById(booking.carId);
        if (!car) {
          return res.status(400).json({ message: "Car not found!!" });
        }

        return {
          ...booking.toObject(),
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          customerName: customer.firstName + " " + customer.lastName,
          carPFP: car.carImages || null,
          carName: car.modelName,
          carCount: car.carsCount,
          carPrice: car.price,
        };
      })
    );

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    }
  } catch (error) {
    console.error(
      "Failed to get pending bookings for other cars due to : ",
      error
    );
    return res
      .status(500)
      .json({ message: "Failed to get pending bookings for other cars!!" });
  }
};

export const fetchPendingBookingsForCustomer = async (req, res) => {
  try {
    const { customerId } = req.query;
    const bookings = await CarBookings.find({
      customerId: customerId,
      bookingStatus: "Pending",
    });

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        const car = await Car.findById(booking.carId);
        if (!car) {
          return res.status(400).json({ message: "Car not found!!" });
        }

        const owner = await User.findById(booking.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Owner not found!!" });
        }

        return {
          ...booking.toObject(),
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          customerName: customer.firstName + " " + customer.lastName,
          carPFP: car.carImages || null,
          carName: car.modelName,
          carCount: car.carsCount,
          carPrice: car.price,
          ownerPFP: owner.profilePic || null,
          ownerEmail: owner.email,
          ownerName: owner.firstName + " " + owner.lastName,
        };
      })
    );

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No pending bookings found for this customer!!" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Failed to get pending bookings for customer!!" });
  }
};

export const fetchAcceptedBookingsForCustomer = async (req, res) => {
  try {
    const { customerId } = req.query;
    const bookings = await CarBookings.find({
      customerId: customerId,
      bookingStatus: "Accepted",
    });

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        const car = await Car.findById(booking.carId);
        if (!car) {
          return res.status(400).json({ message: "Car not found!!" });
        }

        const owner = await User.findById(booking.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Owner not found!!" });
        }

        return {
          ...booking.toObject(),
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          customerName: customer.firstName + " " + customer.lastName,
          carPFP: car.carImages || null,
          carName: car.modelName,
          carCount: car.carsCount,
          carPrice: car.price,
          ownerPFP: owner.profilePic || null,
          ownerEmail: owner.email,
          ownerName: owner.firstName + " " + owner.lastName,
        };
      })
    );

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No accepted bookings found for this customer!!" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Failed to get accepted bookings for customer!!" });
  }
};

export const fetchRejectedBookingsForCustomer = async (req, res) => {
  try {
    const { customerId } = req.query;
    const bookings = await CarBookings.find({
      customerId: customerId,
      bookingStatus: "Rejected",
    });

    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const customer = await User.findById(booking.customerId);
        if (!customer) {
          return res.status(400).json({ message: "Customer not found!!" });
        }

        const car = await Car.findById(booking.carId);
        if (!car) {
          return res.status(400).json({ message: "Car not found!!" });
        }

        const owner = await User.findById(booking.ownerId);
        if (!owner) {
          return res.status(400).json({ message: "Owner not found!!" });
        }

        return {
          ...booking.toObject(),
          customerPFP: customer.profilePic || null,
          customerEmail: customer.email,
          customerName: customer.firstName + " " + customer.lastName,
          carPFP: car.carImages || null,
          carName: car.modelName,
          carCount: car.carsCount,
          carPrice: car.price,
          ownerPFP: owner.profilePic || null,
          ownerEmail: owner.email,
          ownerName: owner.firstName + " " + owner.lastName,
        };
      })
    );

    if (bookingsWithDetails.length > 0) {
      return res.status(200).json({ bookings: bookingsWithDetails });
    } else {
      return res
        .status(404)
        .json({ message: "No Rejected bookings found for this customer!!" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Failed to get Rejected bookings for customer!!" });
  }
};
