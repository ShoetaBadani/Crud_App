const express = require("express");
const router = express.Router();
const User = require('../models/users');
const multer = require('multer');
const fs = require('fs'); 
const path = require("path");

//image upload
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.filename + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: storage,
}).single('image');

//insert an user into database route
router.post('/add', upload, async(req, res) => {
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    image: req.file.filename,
  });
  //this save function is from mongoose library
  try {
  await user.save();
  req.session.message = {
    type: 'success',
    message: 'User added successfully!'
  };
  res.redirect('/');
} catch (err) {
  res.json({ message: err.message, type: 'danger' });
}
});


//Define the route and render the EJS template with a dynamic title
//Get all users route
router.get("/", (req, res) => {
  User.find()
    .then(users => {
      res.render('index', {
        title: 'Home Page',
        users: users,
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to retrieve users. Please try again later.'
      });
    });
});

// Delete user route
router.delete('/delete/:id', async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (result) {
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.json({ success: false, message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.get("/add", (req, res) => {
  res.render("add_users", { title: "Add users" });
});

// Edit user route (GET)
router.get("/edit/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findById(id);

    if (!user) {
      req.session.message = {
        type: "error",
        message: "User not found"
      };
      return res.redirect("/");
    }

    res.render("edit_users", {
      title: "Edit User",
      user: user,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    req.session.message = {
      type: "error",
      message: "An error occurred while fetching the user"
    };
    res.redirect("/");
  }
});

// Update user route (POST)
router.post('/update/:id', upload, async (req, res) => {
  const id = req.params.id;
  let new_image = '';

  try {
    if (req.file) {
      new_image = req.file.filename;
      try {
        fs.unlinkSync("./uploads/" + req.body.old_image);
      } catch(err) {
        console.error("Error deleting old image:", err);
      }
    } else {
      new_image = req.body.old_image;
    }

    const updatedUser = await User.findByIdAndUpdate(id, {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      image: new_image,
    }, { new: true });

    if (!updatedUser) {
      req.session.message = {
        type: 'error',
        message: 'User not found',
      };
      return res.redirect("/");
    }

    req.session.message = {
      type: 'success',
      message: 'User updated successfully!',
    };
    res.redirect("/");
  } catch (err) {
    console.error("Error updating user:", err);
    req.session.message = {
      type: 'error',
      message: 'An error occurred while updating the user',
    };
    res.redirect("/");
  }
});

// Delete user route
router.get("/delete/:id", async (req, res) => {
  let id = req.params.id;

  try {
    const result = await User.findByIdAndDelete(id);

    if (result && result.image) {
      try {
        const imagePath = path.join(__dirname, "../uploads", result.image);
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.log("Error deleting image:", err);
      }
    }

    req.session.message = {
      type: "info",
      message: "User deleted successfully!",
    };

    // Save the session
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Send JSON response
    res.json({
      success: true,
      message: "User deleted successfully!",
    });
  } catch (err) {
    console.log("Error deleting user:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the user.",
    });
  }
});

module.exports = router;
