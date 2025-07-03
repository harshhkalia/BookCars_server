import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType, showroomDetails } =
      req.body;

    if (!email || !password || !firstName) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided!" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "This email is already in use. Try a different one!",
      });
    }

    const profilePic = req.file
      ? `/UserPFPs/${req.file.filename}`
      : "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg";

    const newUser = await User.create({
      email,
      password,
      firstName,
      lastName,
      userType,
      showroomDetails,
      profilePic,
    });

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, userType: newUser.userType },
      process.env.JWT_TOKEN,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Account has been set up successfully, now you can login!",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userType: newUser.userType,
        showroomDetails: newUser.showroomDetails,
        profilePic: newUser.profilePic,
      },
      token,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ message: "An error occurred while creating the account." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ message: "The account you are looking for does not exist!" });
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid)
      return res
        .status(401)
        .json({ message: "Wrong email or password entered!!" });
    const token = jwt.sign(
      { userId: user._id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.status(200).json({ message: "successfully logged in!!", user, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "An error occurred while logging in." });
  }
};

export const completeOwnerDetails = async (req, res) => {
  try {
    const { id, location, companyName } = req.body;
    const showRoomPFP = req.file ? `/ShowroomPFPs/${req.file.filename}` : null;

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "It seems account does not exist!!" });
    }
    user.showroomDetails.location = location;
    user.showroomDetails.carName = companyName;
    user.showroomDetails.coverPFP = showRoomPFP;
    const updatedUser = await user.save();
    if (updatedUser) {
      return res.status(200).json({
        message: "Your details has been saved successfully!!",
        user: updatedUser,
      });
    } else {
      return res
        .status(400)
        .json({ message: "An error occurred while saving your details!!" });
    }
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(500)
      .json({ message: "An error occurred while saving details you entered." });
  }
};

export const changeUserDetails = async (req, res) => {
  try {
    const { id, firstName, lastName, password, newLocation, confirmPassword } =
      req.body;

    const newProfilePic = req.files?.newProfilePic?.[0]?.filename
      ? `/UserPFPs/${req.files.newProfilePic[0].filename}`
      : undefined;

    const newShowroomCover = req.files?.newShowroomCover?.[0]?.filename
      ? `/ShowroomPFPs/${req.files.newShowroomCover[0].filename}`
      : undefined;

    const user = await User.findById(id);

    if (!user) {
      return res
        .status(400)
        .json({ message: "Failed to find the account related to this user!!" });
    }

    const isPasswordMatch = await user.comparePassword(confirmPassword);
    if (!isPasswordMatch) {
      return res.status(400).json({
        message:
          "You entered a wrong password. Unable to change details of your account!!",
      });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (password) user.password = password;
    if (newLocation) user.showroomDetails.location = newLocation;
    if (newShowroomCover) user.showroomDetails.coverPFP = newShowroomCover;
    if (newProfilePic) user.profilePic = newProfilePic;

    const updatedUser = await user.save();
    if (updatedUser) {
      return res.status(200).json({
        message:
          "The details have been saved successfully, We will reload once to display new changes!!",
        user: updatedUser,
      });
    } else {
      return res
        .status(400)
        .json({ message: "An error occurred while saving your details!!" });
    }
  } catch (error) {
    console.error("Error while changing details of your account:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while saving details you entered." });
  }
};
