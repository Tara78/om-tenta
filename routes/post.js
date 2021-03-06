const router = require('express').Router();
const mongoose = require('mongoose');

//Imports
const User = require('../model/user')
const jwt = require('jsonwebtoken')

// cookie parser
const cookieParser = require('cookie-parser')

// Required to use req.cookies as middleware
router.use(cookieParser())

const bcrypt = require('bcrypt')
// Give value 10 to saltRounds 
// Controls how long is needed to calculate a single BCrypt hash
const salt = 10


// Route for login to have a new token
router.post('/auth', async (req, res) => {

    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send('User does not exists!');
    if (await bcrypt.compare(req.body.password, user.password) &&
     user.email === req.body.email) {

        const payload = {
            admin: user.admin,
            iss: "EC",
            exp: Math.floor(Date.now() / 1000) + (60 * 60)
        }

        const options = {
            algorithm: "HS256"
        }

        const secret = process.env.SECRET
        let token = jwt.sign(payload, secret, options)
        res.cookie("auth", token)

        // res.send(req.cookies["auth"])
        res.json(token)
 
    } else {
        res.status(401).send('Invalid request')
    }

})


// Register a new User
router.post('/register', async (req, res) => {

    //  Check if USER is already exist in our database
    const emailExist = await User.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).send('This Email is alreday exists!');
    // Adding salt-variable and returns an encrypted password: 'hash'
    const hashPassword = await bcrypt.hash(req.body.password, salt)


    // Creat a New User
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        admin: req.body.admin,
        password: hashPassword,

    });
    try {
        const savedUser = await user.save()
        res.json(savedUser)

    } catch (err) {
        res.status(400).send('Problem with saving in database')
    }

})


// Get back all users
//Find Users, use empty object to find a user and save
router.get('/', async (req, res) => {
    const Users = await User.find({})
    res.json(Users)
})


// Show info about an specefic user by ID
router.get('/:id', async (req, res) => {
    const result = await User.findById(req.params.id)
    res.json(result)

})


// Delet an user, Only Admin can do based on the role saved on cookies.
router.delete('/:id', async (req, res) => {
    const decode = jwt.verify(req.cookies['auth'], process.env.SECRET);

      // If admin, find user by :id and delete it
    if (decode.exp) {
        const result = await User.deleteOne({ _id: req.params.id })

         // Check if user is an admin (role)
        if (decode.admin === true) {

            res.send(result)
        }
        else {
            res.status(400).send('You are not an admin')
        }
    }
    else {
        res.send('Please log in!')
    }

})


// Update a User
// Put for uppdating, admin can access only.
router.put('/:id', async (req, res) => {

    const decode = jwt.verify(req.cookies['auth'], process.env.SECRET);
    console.log(decode)
    if (decode.exp) {

        if (decode.admin === true) {
            // create an Object with some value that we wanna update them
            let updateObject = {}
            for (property in req.body) {
                updateObject[property] = req.body[property]
            }
            // Using FindByID and update method
            const result = await User.updateOne({
                _id: req.params.id
            },
                { $set: updateObject }
            )
            res.json(updateObject)
        }
        else {
            res.status(400).send('You are not an admin')
        }
    }
    else {
        res.send('please log in!')
    }


})




module.exports = router;