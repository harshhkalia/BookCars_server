import Car from "../models/Car.js";
import User from "../models/User.js";

export const createCar = async (req, res) => {
  try {
    const {
      modelName,
      engineType,
      carPrice,
      carColor,
      seatingCapacity,
      carMileage,
      carTransmission,
      carDescription,
      emiCount,
      carsCount,
    } = req.body;

    const carImages = req.files.map((file) => `/CarImages/${file.filename}`);
    const userId = req.user.userId;

    if (carImages.length > 4) {
      return res
        .status(400)
        .json({ message: "You can upload maximum 4 images" });
    }

    const checkCarLimitation = await Car.find({ ownerId: userId });
    if (checkCarLimitation.length >= 5) {
      return res
        .status(400)
        .json({ message: "You can only add maximum 5 cars " });
    }

    const newCar = await Car.create({
      ownerId: userId,
      modelName: modelName,
      engineType: engineType,
      price: carPrice,
      color: carColor,
      seatingCapacity: seatingCapacity,
      mileage: carMileage,
      transmissionType: carTransmission,
      description: carDescription,
      emiPerMonth: emiCount,
      carsCount: carsCount,
      carImages: carImages,
    });
    const savedCar = await newCar.save();
    if (savedCar) {
      return res.status(201).json({
        message: "This car model has been saved successfully!!",
        car: savedCar,
      });
    } else {
      return res
        .status(400)
        .json({ message: "An error occurred while saving your car!!" });
    }
  } catch (error) {
    console.error("Error saving new model:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while saving new model!!" });
  }
};

export const getMyCars = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cars = await Car.find({ ownerId: userId });
    if (cars.length > 0) {
      return res.status(200).json({ cars });
    } else {
      return res
        .status(404)
        .json({ message: "No cars found related with your showroom!!" });
    }
  } catch (error) {
    console.error("Error fetching cars:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching your cars!!" });
  }
};

export const updateCar = async (req, res) => {
  try {
    const { carPrice, carCount, carDescription } = req.body;
    const userId = req.user.userId;
    const carId = req.body.carId;

    const carImages = req.files.map((file) => `/CarImages/${file.filename}`);

    if (carImages.length > 4) {
      return res
        .status(400)
        .json({ message: "You can upload maximum 4 images" });
    }

    const car = await Car.findOne({ _id: carId, ownerId: userId });
    if (!car) {
      return res.status(400).json({
        message: "The car you're trying to update doesn't exist or is not yours!",
      });
    }

    if (carPrice) car.price = carPrice;
    if (carCount) car.carsCount = carCount;
    if (carDescription) car.description = carDescription;
    if (carImages.length > 0) car.carImages = carImages;

    const updatedCar = await car.save();
    return res.status(200).json({
      message:
        "This car's details have been updated successfully! We'll reload the page to reflect the changes.",
      car: updatedCar,
    });
  } catch (error) {
    console.error("Error updating the car details:", error);
    return res.status(500).json({
      message: "Something went wrong while updating the car. Please try again!",
    });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const carId = req.params.id;
    const userId = req.user.userId;

    const car = await Car.findOne({ _id: carId, ownerId: userId });
    if (!car) {
      return res.status(400).json({
        message: "This car does not exist or you are not authorized to delete it!",
      });
    }

    const deletedCar = await Car.findByIdAndDelete(carId);
    if (deletedCar) {
      return res.status(200).json({
        message:
          "The car has been deleted successfully and its data erased. We will refresh the page once to ensure the changes!",
      });
    } else {
      return res
        .status(400)
        .json({ message: "An error occurred while deleting your car!" });
    }
  } catch (error) {
    console.error("Error deleting the car:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while deleting your car!" });
  }
};

export const getAllShowrooms = async (req, res) => {
  try {
    const owners = await User.find({ userType: "Owner" }).lean();

    const countOwnerDocuments = await Promise.all(
      owners.map(async (owner) => {
        const count = await Car.countDocuments({ ownerId: owner._id });
        return { ...owner, count };
      })
    );

    return res.status(200).json({ owners: countOwnerDocuments });
  } catch (error) {
    console.error("Error in fetching all the showrooms :", error);
    return res.status(500).json({
      message: "An error occurred while fetching all the showrooms!!",
    });
  }
};

export const searchForShowrooms = async (req, res) => {
  try {
    const searchTerm = req.params.searchTerm;

    const searchWords = searchTerm.split(",").map((word) => word.trim());
    const lastWord = searchWords[searchWords.length - 1];

    const capitalizeSearchTerm =
      lastWord.charAt(0).toUpperCase() + lastWord.slice(1);

    const showRooms = await User.find({
      "showroomDetails.location": {
        $regex: new RegExp(capitalizeSearchTerm, "i"),
      },
    }).lean();

    if (showRooms.length > 0) {
      const showroomsWithCarCount = await Promise.all(
        showRooms.map(async (showroom) => {
          const modelCount = await Car.countDocuments({
            ownerId: showroom._id,
          });
          return { ...showroom, modelCount };
        })
      );

      return res.status(200).json({ showRooms: showroomsWithCarCount });
    } else {
      return res
        .status(404)
        .json({ message: "No showroom founded for this location!!" });
    }
  } catch (error) {
    console.error("Error in searching for showrooms :", error);
    return res.status(500).json({
      message: "An error occurred while searching for showrooms!!",
    });
  }
};

export const searchCarData = async (req, res) => {
  try {
    const { carId } = req.query;
    const car = await Car.findById(carId);
    if (car) {
      return res.status(200).json({ car });
    } else {
      return res.status(404).json({ message: "Car not found!!" });
    }
  } catch (error) {
    console.error("Error in searching for car data :", error);
    return res.status(500).json({
      message: "An error occurred while searching for car data!!",
    });
  }
};

export const fetchPendingBookingUserData = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findById(id);
    if (user) {
      return res.status(200).json({ user });
    } else {
      return res.status(404).json({ message: "User not found!!" });
    }
  } catch (error) {
    console.error("Error in searching for user data :", error);
    return res.status(500).json({
      message: "An error occurred while searching for user data!!",
    });
  }
};
