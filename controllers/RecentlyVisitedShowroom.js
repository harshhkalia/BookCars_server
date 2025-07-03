import RecentlyVisitedShowroom from "../models/RecentlyVisitedShowroom.js";

export const newVisit = async (req, res) => {
  try {
    const { customerId } = req.query;
    const { ownerId } = req.body;

    let showroom = await RecentlyVisitedShowroom.findOne({ customerId });

    if (showroom) {
      await showroom.addShowroom(ownerId);
    } else {
      showroom = await RecentlyVisitedShowroom.create({
        customerId: customerId,
        visitedShowrooms: [{ ownerId: ownerId }],
      });
    }

    return res.status(200).json({
      message: "Showroom Visited Successfully",
      visitedShowrooms: showroom.visitedShowrooms,
    });
  } catch (error) {
    console.error("Failed to save history of visited showroom due to:", error);
    return res
      .status(500)
      .json({ message: "Failed to save history of visited showroom" });
  }
};

export const getMyAllVisits = async (req, res) => {
  try {
    const { customerId } = req.query;
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
    const { customerId, ownerId } = req.query;

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
