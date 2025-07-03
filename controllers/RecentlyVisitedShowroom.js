import RecentlyVisitedShowroom from "../models/RecentlyVisitedShowroom.js";
import mongoose from "mongoose";

export const newVisit = async (req, res) => {
  try {
    const customerId = req.user?.userId;
    const { ownerId } = req.body;

    if (!customerId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Invalid token" });
    }
    if (!ownerId) {
      return res
        .status(400)
        .json({ success: false, message: "Owner ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer or owner ID" });
    }

    let showroom = await RecentlyVisitedShowroom.findOne({ customerId });

    if (showroom) {
      showroom = await showroom.addShowroom(ownerId);
    } else {
      showroom = await RecentlyVisitedShowroom.create({
        customerId,
        visitedShowrooms: [{ ownerId }],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Showroom visit saved successfully",
      visitedShowrooms: showroom.visitedShowrooms,
    });
  } catch (error) {
    console.error("Failed to save showroom visit:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to save showroom visit" });
  }
};

export const getMyAllVisits = async (req, res) => {
  try {
    const customerId = req.user.userId;

    const visitedShowrooms = await RecentlyVisitedShowroom.findOne({
      customerId,
    }).populate({
      path: "visitedShowrooms.ownerId",
      select: "email firstName lastName profilePic showroomDetails",
    });

    return res.status(200).json({ visitedShowrooms });
  } catch (error) {
    console.error("Failed to fetch history of visited showroom due to:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch history of visited showroom" });
  }
};

export const deleteMyOneVisit = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { ownerId } = req.query;

    const showroom = await RecentlyVisitedShowroom.findOne({
      customerId,
    }).populate("visitedShowrooms.ownerId");

    if (!showroom) {
      return res.status(404).json({
        message: "Showroom history not found for this customer.",
      });
    }

    const visitedShowrooms = showroom.visitedShowrooms.filter(
      (visit) => visit.ownerId._id.toString() !== ownerId.toString()
    );

    showroom.visitedShowrooms = visitedShowrooms;

    await showroom.save();

    return res.status(200).json({
      visitedShowrooms: showroom.visitedShowrooms,
      message: "The visit for showroom has been deleted successfully!",
    });
  } catch (err) {
    console.error("Failed to delete history of visited showroom due to:", err);
    return res.status(500).json({
      message: "Failed to remove this showroom from history, please try again",
    });
  }
};
