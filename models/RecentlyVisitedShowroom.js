import mongoose from "mongoose";

const RecentlyVisitedShowroomSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  visitedShowrooms: [
    {
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      visitedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

RecentlyVisitedShowroomSchema.methods.addShowroom = async function (ownerId) {
  const updatedShowrooms = this.visitedShowrooms.filter(
    (visit) => visit.ownerId.toString() !== ownerId.toString()
  );

  updatedShowrooms.unshift({ ownerId });

  if (updatedShowrooms.length > 5) {
    updatedShowrooms.pop();
  }

  await RecentlyVisitedShowroom.findOneAndUpdate(
    { _id: this._id },
    { $set: { visitedShowrooms: updatedShowrooms } },
    { new: true, useFindAndModify: false }
  );
};

const RecentlyVisitedShowroom = mongoose.model(
  "RecentlyVisitedShowroom",
  RecentlyVisitedShowroomSchema
);

export default RecentlyVisitedShowroom;
